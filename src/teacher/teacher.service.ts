import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CreateTeacherDto,
  SearchTeacherListDto,
  TeacherQueryDto,
  UpdateTeacherDto,
} from './dto/teacher.dto';
import { Teacher } from 'src/database/entities/teacher.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { UserService } from 'src/user/user.service';
import { UserStatus, UserType } from 'utils/enums/general-enums';
import { SelectQueryBuilder } from 'typeorm/browser';
import { UserSync } from 'src/user/interfaces/user-interface';
import { User } from 'src/database/entities/user.entity';

@Injectable()
export class TeacherService {
  constructor(
    @InjectRepository(Teacher)
    private readonly teacherRepo: Repository<Teacher>,
    private readonly userService: UserService,
  ) {}
  async create(createTeacherDto: CreateTeacherDto): Promise<Boolean> {
    const { emailUsed, phoneUsed, valid } =
      await this.validateTeacherContact(createTeacherDto);

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
    const teacherData: Partial<Teacher> = { ...createTeacherDto };

    if (createTeacherDto.createUser) {
      teacherData.userId = (await this.createUser(createTeacherDto)).id;
    }
    return !!(await this.teacherRepo.save(
      this.teacherRepo.create(teacherData),
    ));
  }

  async findAll(teacherQueryDto: TeacherQueryDto): Promise<{
    data: Teacher[];
    total?: number;
    page?: number;
    lastPage?: number;
    limit?: number;
  }> {
    const { page = 1, limit = 10, ...filters } = teacherQueryDto;
    const query = this.teacherRepo.createQueryBuilder('teacher');
    if (filters?.id) {
      query.andWhere('teacher.id = :id', { id: filters.id });
      query.select(Teacher.ALLOWED_DETAILS);
      const data = await query.getOne();
      if (!data)
        throw new NotFoundException({
          statusCode: 404,
          message: `Teacher with id: ${filters.id} does not exists`,
        });
      return { data: [data] };
    }
    const filteredquery = this.applyFilters(query, filters);
    filteredquery.where('teacher.deletedAt IS NULL');
    filteredquery.select(Teacher.ALLOWED_FIELDS_LIST);
    filteredquery.skip((page - 1) * limit).take(limit);
    filteredquery.orderBy('teacher.first_name', 'ASC');
    const [data, total] = await filteredquery.getManyAndCount();
    const lastPage = Math.ceil(total / limit);
    return { data, total, page, lastPage, limit };
  }

  private applyFilters(
    query: SelectQueryBuilder<Teacher>,
    filters: Partial<TeacherQueryDto>,
  ): SelectQueryBuilder<Teacher> {
    if (filters?.gender) {
      query.andWhere('teacher.gender = :gender', { gender: filters.gender });
    }
    if (filters?.search) {
      query.andWhere(
        new Brackets((qb) => {
          qb.where('teacher.first_name LIKE :search', {
            search: `%${filters.search}%`,
          })
            .orWhere('teacher.last_name LIKE :search', {
              search: `%${filters.search}%`,
            })
            .orWhere('teacher.email = :search', {
              search: `%${filters.search}%`,
            })
            .orWhere('teacher.phone = :search', {
              search: `%${filters.search}%`,
            });
        }),
      );
    }
    return query;
  }

  async update(
    id: number,
    updateTeacherDto: UpdateTeacherDto,
  ): Promise<Boolean> {
    const teacher = await this.teacherRepo.findOne({ where: { id } });
    if (!teacher) {
      throw new NotFoundException({
        status: 'false',
        statusCode: 404,
        message: `Teacher with id: ${id} does not exists.`,
      });
    }
    const isEmailChanged =
      updateTeacherDto.email && updateTeacherDto.email !== teacher.email;

    const isPhoneChanged =
      updateTeacherDto.phone && updateTeacherDto.phone !== teacher.phone;
    if (isEmailChanged || isPhoneChanged) {
      const { emailUsed, phoneUsed, valid } =
        await this.validateTeacherContact(updateTeacherDto);

      if (!valid) {
        const errors: any = {};
        if (emailUsed && updateTeacherDto.email !== teacher.email)
          errors.email = 'Already used';
        if (phoneUsed && updateTeacherDto.phone !== teacher.phone)
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
    await this.syncWithUser(updateTeacherDto, teacher);
    Object.assign(teacher, updateTeacherDto);
    return !!(await this.teacherRepo.save(teacher));
  }

  async remove(id: number): Promise<Boolean> {
    const teacher = await this.teacherRepo.findOne({ where: { id } });
    if (!teacher)
      throw new NotFoundException({
        status: 'false',
        statusCode: 404,
        message: `Teacher with id: ${id} does not exists.`,
      });
    return !!(await this.teacherRepo.softRemove(teacher));
  }

  async validateTeacherContact(data: {
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
      const email = await this.teacherRepo.findOne({
        where: { email: data.email },
      });
      emailUsed = !!email;
    }

    if (data.phone) {
      const phone = await this.teacherRepo.findOne({
        where: { phone: data.phone },
      });
      phoneUsed = !!phone;
    }
    const valid = !emailUsed && !phoneUsed;
    return { emailUsed, phoneUsed, valid };
  }
  async getAllTeachersList(
    searchTeacherListDto: SearchTeacherListDto,
  ): Promise<{ data: Teacher[] }> {
    const query = this.teacherRepo
      .createQueryBuilder('teacher')
      .select('teacher.id', 'id')
      .addSelect("CONCAT(teacher.first_name, ' ', teacher.last_name)", 'name');

    if (searchTeacherListDto?.name) {
      const parts = searchTeacherListDto.name.trim().split(/\s+/);

      if (parts.length === 1) {
        query.andWhere(
          '(teacher.firstName LIKE :name OR teacher.lastName LIKE :name)',
          { name: `%${parts[0]}%` },
        );
      } else {
        query.andWhere(
          '(teacher.firstName LIKE :first AND teacher.lastName LIKE :last)',
          {
            first: `%${parts[0]}%`,
            last: `%${parts[1]}%`,
          },
        );
      }
    }
    const data = await query.getRawMany();
    return { data };
  }

  async getTeachersCount(): Promise<number> {
    return await this.teacherRepo.count();
  }

  async syncWithUser(
    dto: UpdateTeacherDto,
    teacher?: Teacher | null,
  ): Promise<boolean> {
    const userSync: UserSync = {};
    userSync.id = teacher?.userId;

    if (
      (dto.firstName || dto.lastName) &&
      (dto.firstName !== teacher?.firstName ||
        dto.lastName !== teacher?.lastName)
    ) {
      userSync.name = dto.firstName + ' ' + dto.lastName;
    }

    if (dto.email && dto.email !== teacher?.email) {
      userSync.email = dto.email;
    }
    if (Object.keys(userSync).length > 1)
      return !!(await this.userService.createUser(userSync));
    return true;
  }

  async createUser(dto: CreateTeacherDto): Promise<User> {
    const userSync: UserSync = {
      name: dto.firstName + ' ' + dto.lastName,
      email: dto.email,
      userType: UserType.ADMIN,
      status: UserStatus.ACTIVE,
    };
    return await this.userService.createUser(userSync);
  }
}
