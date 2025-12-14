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

    const { emailUsed, phoneUsed, valid } = await this.validateTeacherContact({
      email: createTeacherDto.email,
      phone: createTeacherDto.phone,
    });

    if (!valid) {
      const errors: any = {};
      if (emailUsed) errors.email = 'Already used.';
      if (phoneUsed) errors.phone = 'Alread used.';

      throw new ConflictException({
        success: false,
        statusCode: 409,
        message: 'Validation failed',
        errors,
      });
    }
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

  async update(id: number, updateTeacherDto: UpdateTeacherDto) {
    const teacher = await this.teacherRepo.findOne({ where: { id } });
    if (!teacher) {
      throw new NotFoundException({
        status: 'false',
        statusCode: 404,
        message: `Teacher with id: ${id} does not exists.`,
      });
    }

    if (updateTeacherDto.email || updateTeacherDto.phone) {
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

    Object.assign(teacher, updateTeacherDto);
    return await this.teacherRepo.save(teacher);
  }

  async remove(id: number) {
    const teacher = await this.teacherRepo.findOne({ where: { id } });
    if (!teacher)
      throw new NotFoundException({
        status: 'false',
        statusCode: 404,
        message: `Teacher with id: ${id} does not exists.`,
      });
    this.teacherRepo.remove(teacher);
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
  ): Promise<{ teachersList: Teacher[] }> {
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
    const teachersList = await query.getRawMany();
    return { teachersList };
  }

  async getTeachersCount(): Promise<number> {
    return await this.teacherRepo.count();
  }
}
