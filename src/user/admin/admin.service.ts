import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AdminUsers } from 'src/database/entities/admin-users.entity';
import { Admin, Brackets, Repository } from 'typeorm';
import {
  AdminQueryDto,
  CreateAdminDto,
  UpdateAdminDto,
} from '../dto/admin.dto';
import { UserStatus, UserType } from 'utils/enums/general-enums';
import { UserSync } from '../interfaces/user-interface';
import { UserService } from '../user.service';
import { SelectQueryBuilder } from 'typeorm/browser';
import { User } from 'src/database/entities/user.entity';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(AdminUsers)
    private readonly adminRepo: Repository<AdminUsers>,
    private readonly userService: UserService,
  ) {}

  async create(createAdminDto: CreateAdminDto) {
    const { emailUsed, phoneUsed, valid } =
      await this.validateAdminContact(createAdminDto);

    if (!valid) {
      const errors: any = {};
      if (emailUsed) errors.email = 'Already used.';
      if (phoneUsed) errors.phone = 'Already used.';

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

  async findAll(
    adminQueryDto: AdminQueryDto,
    userId: number,
  ): Promise<{
    data: AdminUsers[];
    total?: number;
    page?: number;
    lastPage?: number;
    limit?: number;
  }> {
    const { page = 1, limit = 10, ...filters } = adminQueryDto;
    const query = this.adminRepo.createQueryBuilder('admin');
    if (filters?.id) {
      query
        .andWhere('admin.id = :id', { id: filters.id })
        .select(AdminUsers.ALLOWED_DETAILS);
      const data = await query.getOne();
      if (!data)
        throw new NotFoundException({
          statusCode: 404,
          message: `Admin with id: ${filters.id} does not exists`,
        });
      return { data: [data] };
    }
    query.andWhere('admin.user_id != :userId', { userId });
    const filteredquery = this.applyFilters(query, filters);
    filteredquery.select(AdminUsers.ALLOWED_FIELDS_LIST);
    filteredquery.skip((page - 1) * limit).take(limit);
    filteredquery.orderBy('admin.first_name', 'ASC');
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
        status: 'false',
        statusCode: 404,
        message: `Admin with id: ${id} does not exists.`,
      });
    }
    const isEmailChanged =
      updateAdminDto.email && updateAdminDto.email !== admin.email;

    const isPhoneChanged =
      updateAdminDto.phone && updateAdminDto.phone !== admin.phone;
    if (isEmailChanged || isPhoneChanged) {
      const { emailUsed, phoneUsed, valid } =
        await this.validateAdminContact(updateAdminDto);

      if (!valid) {
        const errors: any = {};
        if (emailUsed && updateAdminDto.email !== admin.email)
          errors.email = 'Already used';
        if (phoneUsed && updateAdminDto.phone !== admin.phone)
          errors.phone = 'Already used';

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

  async validateAdminContact(data: {
    email?: string;
    phone?: string;
  }): Promise<{
    emailUsed: boolean;
    phoneUsed: boolean;
    valid: boolean;
  }> {
    let emailUsed = false;
    let phoneUsed = false;

    if (data.email) {
      const email = await this.adminRepo.findOne({
        where: { email: data.email },
      });
      emailUsed = !!email;
    }

    if (data.phone) {
      const phone = await this.adminRepo.findOne({
        where: { phone: data.phone },
      });
      phoneUsed = !!phone;
    }
    const valid = !emailUsed && !phoneUsed;
    return { emailUsed, phoneUsed, valid };
  }

  async remove(id: number): Promise<Boolean> {
    const admin = await this.adminRepo.findOne({ where: { id } });
    if (!admin)
      throw new NotFoundException({
        status: 'false',
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
      userType: UserType.ADMIN,
      status: UserStatus.ACTIVE,
    };
    return await this.userService.createUser(userSync);
  }
}
