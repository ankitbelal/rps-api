import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AdminUsers } from 'src/database/entities/admin-users.entity';
import { Admin, Brackets, Not, Repository } from 'typeorm';
import {
  AdminQueryDto,
  CreateAdminDto,
  UpdateAdminDto,
} from '../dto/admin.dto';
import { Gender, UserStatus, UserType } from 'utils/enums/general-enums';
import { SuperAdmin, UserSync } from '../interfaces/user-interface';
import { UserService } from '../user.service';
import { SelectQueryBuilder } from 'typeorm/browser';
import { User } from 'src/database/entities/user.entity';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(AdminUsers)
    private readonly adminRepo: Repository<AdminUsers>,
    private readonly userService: UserService,
    private readonly configService: ConfigService,
  ) {}

  async create(createAdminDto: CreateAdminDto) {
    const { emailUsed, phoneUsed, valid } =
      await this.validateAdminContact(createAdminDto);

    if (!valid) {
      const errors: any = {};
      if (emailUsed) errors.email = 'Email is already used.';
      if (phoneUsed) errors.phone = 'Phone is already used.';

      throw new ConflictException({
        success: false,
        statusCode: 409,
        message: 'Validation failed',
        errors,
      });
    }
    const adminData: Partial<AdminUsers> = { ...createAdminDto };

    const user = await this.createUser(createAdminDto);
    adminData.userId = user?.id;
    return !!(await this.adminRepo.save(this.adminRepo.create(adminData)));
  }

  async findAll(adminQueryDto: AdminQueryDto): Promise<{
    data: AdminUsers[];
    total?: number;
    page?: number;
    lastPage?: number;
    limit?: number;
  }> {
    const { page = 1, limit = 10, ...filters } = adminQueryDto;
    const query = this.adminRepo
      .createQueryBuilder('admin')
      .innerJoin('admin.user', 'user');
    if (filters?.id || filters?.self) {
      filters.id
        ? query.andWhere('admin.id = :id', { id: filters.id })
        : query.andWhere('admin.user_id = :userId', { userId: filters.userId });

      query.select(AdminUsers.ALLOWED_DETAILS);
      const data = await query.getOne();
      if (!data)
        throw new NotFoundException({
          success: true,
          statusCode: 404,
          message: `Admin with id: ${filters.id} does not exists`,
        });
      return { data: [data] };
    }

    query
      .andWhere('admin.user_id != :userId', { userId: filters.userId })
      .andWhere('user.user_type != :userType', {
        userType: UserType.SUPERADMIN,
      });
    const filteredquery = this.applyFilters(query, filters);
    filteredquery.select(AdminUsers.ALLOWED_FIELDS_LIST);
    filteredquery.skip((page - 1) * limit).take(limit);
    filteredquery.orderBy('admin.firstName', 'ASC');
    const [data, total] = await filteredquery.getManyAndCount();
    const lastPage = Math.ceil(total / limit);
    return { data, total, page, lastPage, limit };
  }

  private applyFilters(
    query: SelectQueryBuilder<AdminUsers>,
    filters: Partial<AdminQueryDto>,
  ): SelectQueryBuilder<AdminUsers> {
    if (filters?.gender) {
      query.andWhere('admin.gender = :gender', { gender: filters.gender });
    }
    if (filters?.search) {
      query.andWhere(
        new Brackets((qb) => {
          qb.where('admin.first_name LIKE :search', {
            search: `%${filters.search}%`,
          })
            .orWhere('admin.last_name LIKE :search', {
              search: `%${filters.search}%`,
            })
            .orWhere('admin.email = :search', {
              search: `%${filters.search}%`,
            })
            .orWhere('admin.phone = :search', {
              search: `%${filters.search}%`,
            });
        }),
      );
    }
    return query;
  }

  async update(id: number, updateAdminDto: UpdateAdminDto): Promise<Boolean> {
    const admin = await this.adminRepo.findOne({ where: { id } });
    if (!admin) {
      throw new NotFoundException({
        status: false,
        statusCode: 404,
        message: `Admin with id: ${id} does not exists.`,
      });
    }

    const changedData = await this.detectChangeValidate(updateAdminDto, admin);

    if (changedData) {
      const { emailUsed, phoneUsed, valid } =
        await this.validateAdminContact(changedData);

      if (!valid) {
        const errors: any = {};
        if (emailUsed && updateAdminDto.email !== admin.email)
          errors.email = 'Email is already used.';
        if (phoneUsed && updateAdminDto.phone !== admin.phone)
          errors.phone = 'Phone is already used.';

        if (Object.keys(errors).length > 0) {
          throw new ConflictException({
            success: false,
            statusCode: 409,
            message: 'Validation failed',
            errors,
          });
        }
      }
    }

    await this.syncWithUser(updateAdminDto, admin);

    Object.assign(admin, updateAdminDto);
    return !!(await this.adminRepo.save(admin));
  }

  private async detectChangeValidate(
    updateAdminDto: UpdateAdminDto,
    adminUsers: AdminUsers,
  ) {
    const changedFields: any = { id: adminUsers.id };

    if (updateAdminDto.email && updateAdminDto.email !== adminUsers.email) {
      changedFields.email = updateAdminDto.email;
    }

    if (updateAdminDto.phone && updateAdminDto.phone !== adminUsers.phone) {
      changedFields.phone = updateAdminDto.phone;
    }

    return Object.keys(changedFields).length > 1 ? changedFields : null;
  }

  async validateAdminContact(data: {
    email?: string;
    phone?: string;
    id?: number;
  }): Promise<{
    emailUsed: boolean;
    phoneUsed: boolean;
    valid: boolean;
  }> {
    let emailUsed = false;
    let phoneUsed = false;

    if (data.email) {
      emailUsed = !!(await this.adminRepo.findOne({
        where: {
          email: data.email,
          ...(data.id ? { id: Not(data.id) } : {}),
        },
        withDeleted: true,
      }));
    }

    if (data.phone) {
      phoneUsed = !!(await this.adminRepo.findOne({
        where: {
          phone: data.phone,
          ...(data.id ? { id: Not(data.id) } : {}),
        },
        withDeleted: true,
      }));
    }
    const valid = !emailUsed && !phoneUsed;
    return { emailUsed, phoneUsed, valid };
  }

  async remove(id: number): Promise<Boolean> {
    const admin = await this.adminRepo.findOne({ where: { id } });
    if (!admin)
      throw new NotFoundException({
        status: false,
        statusCode: 404,
        message: `Admin with id: ${id} does not exists.`,
      });
    return !!(await this.adminRepo.remove(admin));
  }

  async syncWithUser(
    dto: UpdateAdminDto,
    admin?: AdminUsers,
  ): Promise<boolean> {
    const userSync: UserSync = {};
    userSync.id = admin?.userId;

    if (
      (dto.firstName || dto.lastName) &&
      (dto.firstName !== admin?.firstName || dto.lastName !== admin?.lastName)
    ) {
      userSync.name = dto.firstName + ' ' + dto.lastName;
    }

    if (dto.email && dto.email !== admin?.email) {
      userSync.email = dto.email;
    }

    if (dto.status && dto.status !== admin?.status) {
      userSync.status = dto.status;
    }
    if (Object.keys(userSync).length > 1) {
      return !!(await this.userService.createUser(userSync));
    }
    return true;
  }

  async createUser(dto: CreateAdminDto): Promise<User> {
    const userSync: UserSync = {
      name: dto.firstName + ' ' + dto.lastName,
      email: dto.email,
      userType: dto.userType ?? UserType.ADMIN,
      status: UserStatus.ACTIVE,
    };
    return await this.userService.createUser(userSync);
  }

  async onBoardingSuperAdmin() {
    const alreadyExists = await this.adminRepo.findOne({ where: { id: 1 } });
    if (alreadyExists) {
      throw new ConflictException('SuperAdmin already created.');
    }

    const superAdmin: SuperAdmin = {
      firstName: this.configService.get<string>('FIRST_NAME', 'Super'),
      lastName: this.configService.get<string>('LAST_NAME', 'Admin'),
      email: this.configService.get<string>('EMAIL', 'admin@example.com'),
      phone: this.configService.get<string>('PHONE', '0000000000'),
      gender:
        this.configService.get<string>('GENDER', 'M').toUpperCase() === 'M'
          ? Gender.MALE
          : Gender.FEMALE,
      address1: this.configService.get<string>('ADDRESS', 'Default Address'),
      address2: this.configService.get<string>('ADDRESS', 'Default Address'),
      status: UserStatus.ACTIVE,
      DOB: new Date('2000-01-01'),
      userType: UserType.SUPERADMIN,
    };

    const user = await this.createUser(superAdmin);

    const adminEntity = this.adminRepo.create({
      userId: user.id,
      ...superAdmin,
    });

    const savedAdmin = await this.adminRepo.save(adminEntity);

    return !!savedAdmin;
  }

  async selfEdit(updateAdminDto: UpdateAdminDto): Promise<Boolean> {
    const admin = await this.adminRepo.findOne({
      where: { userId: updateAdminDto.userId },
    });

    if (!admin)
      throw new NotFoundException({
        success: false,
        statusCode: 404,
        message: `Admin with userId: ${updateAdminDto.userId} does not exists.`,
      });

    return await this.update(admin.id, updateAdminDto);
  }
}
