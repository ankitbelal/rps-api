import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CreateTeacherDto,
  TeacherQueryDto,
  UpdateTeacherDto,
} from './dto/teacher.dto';
import { Teacher } from 'src/database/entities/teacher.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserService } from 'src/user/user.service';
import { UserStatus, UserType } from 'utils/enums/general-enums';
import { SelectQueryBuilder } from 'typeorm/browser';

@Injectable()
export class TeacherService {
  constructor(
    @InjectRepository(Teacher)
    private readonly teacherRepo: Repository<Teacher>,
    private readonly userService: UserService,
  ) {}
  async create(createTeacherDto: CreateTeacherDto): Promise<Teacher> {
    const exists = await this.teacherRepo.findOne({
      where: [
        { email: createTeacherDto.email },
        { phone: createTeacherDto.phone },
      ],
    });

    const emailUsed = exists?.email == createTeacherDto.email;
    const phoneUsed = exists?.phone == createTeacherDto.phone;
    if (emailUsed && phoneUsed)
      throw new ConflictException({
        success: false,
        statusCode: 409,
        message: 'Validation failed',
        errors: {
          phone: 'Already Used',
          email: 'Already Used',
        },
      });
    if (emailUsed && !phoneUsed)
      throw new ConflictException({
        success: false,
        statusCode: 409,
        message: 'Validation failed',
        errors: {
          email: 'Already Used',
        },
      });
    if (phoneUsed && !emailUsed)
      if (emailUsed && !phoneUsed)
        throw new ConflictException({
          success: false,
          statusCode: 409,
          message: 'Validation failed',
          errors: {
            phone: 'Already Used',
          },
        });

    const teacher = await this.teacherRepo.save(
      this.teacherRepo.create(createTeacherDto),
    );
    await this.userService.createUser(
      teacher.id,
      teacher.firstName + '' + teacher.lastName,
      createTeacherDto.email,
      createTeacherDto.phone,
      UserType.TEACHER,
      UserStatus.ACTIVE,
    );
    return teacher;
  }

  async findAll(teacherQueryDto: TeacherQueryDto): Promise<{
    data: Teacher[];
    total?: number;
    page?: number;
    lastPage?: number;
  }> {
    const { page = 1, limit = 10, ...filters } = teacherQueryDto;
    const query = this.teacherRepo.createQueryBuilder('teacher');
    if (filters?.id) {
      query.andWhere('');
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
    filteredquery.select(Teacher.ALLOWED_FIELDS_LIST);
    filteredquery.skip((page - 1) * limit).take(limit);
    filteredquery.orderBy('teacher.first_name', 'ASC');
    const [data, total] = await filteredquery.getManyAndCount();
    const lastPage = Math.ceil(total / limit);
    return { data, total, page, lastPage };
  }

  private applyFilters(
    query: SelectQueryBuilder<Teacher>,
    filters: Partial<TeacherQueryDto>,
  ): SelectQueryBuilder<Teacher> {
    if (filters?.firstName) {
      query.andWhere('teacher.first_name = :firstName', {
        firstName: filters.firstName,
      });
    }

    if (filters?.lastName) {
      query.andWhere('teacher.last_name = :lastName', {
        lastName: filters.lastName,
      });
    }

    if (filters?.email) {
      query.andWhere('teacher.email = :email', { email: filters.email });
    }

    if (filters?.gender) {
      query.andWhere('teacher.gender = :gender', { gender: filters.gender });
    }
    if (filters.phone) {
      query.andWhere('teacher.phone = :phone', { phone: filters.phone });
    }

    if (filters?.search) {
      query
        .orWhere('teacher.first_name= :firstName', {
          firstName: `%${filters.search}%`,
        })
        .orWhere('teacher.last_name = :lastName', {
          lastName: `%${filters.lastName}%`,
        })
        .orWhere('teacher.email = :email', { email: filters.email })
        .orWhere('teacher.phone = :phone', { phone: filters.phone });
    }
    return query;
  }

  update(id: number, updateTeacherDto: UpdateTeacherDto) {
    return `This action updates a #${id} teacher`;
  }

  remove(id: number) {
    return `This action removes a #${id} teacher`;
  }
}
