import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CreateStudentDto,
  SearchStudentListDto,
  StudentQueryDto,
} from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Student } from 'src/database/entities/student.entity';
import { Repository } from 'typeorm';
import { UserService } from 'src/user/user.service';
import { UserStatus, UserType } from 'utils/enums/general-enums';
import { SelectQueryBuilder } from 'typeorm/browser';

@Injectable()
export class StudentService {
  constructor(
    @InjectRepository(Student)
    private readonly studentRepo: Repository<Student>,
    private readonly userService: UserService,
  ) {}

  async create(createStudentDto: CreateStudentDto): Promise<Boolean> {
    const exists = await this.studentRepo.findOne({
      where: [
        { email: createStudentDto.email },
        { phone: createStudentDto.phone },
      ],
    });

    const {
      emailUsed,
      phoneUsed,
      rollNumberExists,
      registrationNumberExists,
      valid,
    } = await this.validateStudentContact({
      email: createStudentDto.email,
      phone: createStudentDto.phone,
      rollNumber: createStudentDto.rollNumber,
      registrationNumber: createStudentDto.registrationNumber,
    });

    if (!valid) {
      const errors: any = {};
      if (emailUsed) errors.email = 'Already used.';
      if (phoneUsed) errors.phone = 'Alread used.';
      if (rollNumberExists) errors.rollNumber = 'Already exists.';
      if (registrationNumberExists)
        errors.registrationNumber = 'Already exists,';

      throw new ConflictException({
        success: false,
        statusCode: 409,
        message: 'Validation failed',
        errors,
      });
    }
    const student = await this.studentRepo.save(
      this.studentRepo.create(createStudentDto),
    );
    this.userService.createUser(
      student.id,
      student.firstName + '' + student.lastName,
      createStudentDto.email,
      createStudentDto.phone,
      UserType.STUDENT,
      UserStatus.ACTIVE,
    );
    return true;
  }

  async findAll(studentQueryDto: StudentQueryDto) {
    const { page = 1, limit = 10, ...filters } = studentQueryDto;
    const query = this.studentRepo.createQueryBuilder('student');
    if (filters?.id) {
      query.andWhere('');
      query.select(Student.ALLOWED_DETAILS);
      const data = await query.getOne();
      if (!data)
        throw new NotFoundException({
          statusCode: 404,
          message: `Student with id: ${filters.id} does not exists`,
        });
      return { data: [data] };
    }

    const filteredquery = this.applyFilters(query, filters);
    filteredquery.select(Student.ALLOWED_FIELDS_LIST);
    filteredquery.skip((page - 1) * limit).take(limit);
    filteredquery.orderBy('student.first_name', 'ASC');
    const [data, total] = await filteredquery.getManyAndCount();
    const lastPage = Math.ceil(total / limit);
    return { data, total, page, lastPage };
  }
  private applyFilters(
    query: SelectQueryBuilder<Student>,
    filters: Partial<StudentQueryDto>,
  ): SelectQueryBuilder<Student> {
    if (filters?.firstName) {
      query.andWhere('student.first_name = :firstName', {
        firstName: filters.firstName,
      });
    }

    if (filters?.lastName) {
      query.andWhere('student.last_name = :lastName', {
        lastName: filters.lastName,
      });
    }

    if (filters?.email) {
      query.andWhere('student.email = :email', { email: filters.email });
    }

    if (filters?.gender) {
      query.andWhere('student.gender = :gender', { gender: filters.gender });
    }
    if (filters.phone) {
      query.andWhere('student.phone = :phone', { phone: filters.phone });
    }

    if (filters?.search) {
      query
        .orWhere('student.first_name= :firstName', {
          firstName: `%${filters.search}%`,
        })
        .orWhere('student.last_name = :lastName', {
          lastName: `%${filters.lastName}%`,
        })
        .orWhere('student.email = :email', { email: filters.email })
        .orWhere('student.phone = :phone', { phone: filters.phone });
    }
    return query;
  }

  async update(
    id: number,
    updateStudentDto: UpdateStudentDto,
  ): Promise<Boolean> {
    const teacher = await this.studentRepo.findOne({ where: { id } });
    if (!teacher) {
      throw new NotFoundException({
        status: 'false',
        statusCode: 404,
        message: `Student with id: ${id} does not exists.`,
      });
    }

    if (updateStudentDto.email || updateStudentDto.phone) {
      const { emailUsed, phoneUsed, valid } =
        await this.validateStudentContact(updateStudentDto);

      if (!valid) {
        const errors: any = {};
        if (emailUsed && updateStudentDto.email !== teacher.email)
          errors.email = 'Already used';
        if (phoneUsed && updateStudentDto.phone !== teacher.phone)
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
    Object.assign(teacher, updateStudentDto);
    await this.studentRepo.save(teacher);
    return true;
  }

  async remove(id: number) {
    const student = await this.studentRepo.findOne({ where: { id } });
    if (!student)
      throw new NotFoundException({
        status: 'false',
        statusCode: 404,
        message: `Student with id: ${id} does not exists.`,
      });
    this.studentRepo.remove(student);
  }

  async validateStudentContact(data: {
    email?: string;
    phone?: string;
    rollNumber?: string;
    registrationNumber?: string;
  }): Promise<{
    emailUsed: boolean;
    phoneUsed: boolean;
    rollNumberExists: boolean;
    registrationNumberExists: boolean;
    valid: boolean;
  }> {
    let emailUsed = false;
    let phoneUsed = false;
    let rollNumberExists = false;
    let registrationNumberExists = false;

    if (data.email) {
      const email = await this.studentRepo.findOne({
        where: { email: data.email },
      });
      emailUsed = !!email;
    }

    if (data.phone) {
      const phone = await this.studentRepo.findOne({
        where: { phone: data.phone },
      });
      phoneUsed = !!phone;
    }

    if (data.rollNumber) {
      const rollNumber = await this.studentRepo.findOne({
        where: { rollNumber: data.rollNumber },
      });

      rollNumberExists = !!rollNumber;
    }

    if (data.registrationNumber) {
      const registrationNumber = await this.studentRepo.findOne({
        where: { registrationNumber: data.registrationNumber },
      });
      registrationNumberExists = !!registrationNumber;
    }
    const valid = !emailUsed && !phoneUsed;
    return {
      emailUsed,
      phoneUsed,
      rollNumberExists,
      registrationNumberExists,
      valid,
    };
  }

  async getAllStudentList(
    searchStudentListDto: SearchStudentListDto,
  ): Promise<{ studentList: Student[] }> {
    const query = this.studentRepo
      .createQueryBuilder('student')
      .select('student.id', 'id')
      .addSelect("CONCAT(student.first_name, ' ', student.last_name)", 'name');

    if (searchStudentListDto.name) {
      const parts = searchStudentListDto.name.trim().split(/\s+/);
      if (parts.length === 1) {
        query.andWhere(
          '(student.first_name LIKE :name OR student.last_name LIKE :name)',
          { name: `%${parts[0]}%` },
        );
      } else {
        query.andWhere(
          '(student.first_name LIKE :first and student.last_name LIKE :last)',
          {
            first: `%${parts[0]}$`,
            last: `%${parts[1]}%`,
          },
        );
      }
    }

    const studentList = await query.getRawMany();
    return { studentList };
  }

  async getStudentsCount(): Promise<number> {
    return await this.studentRepo.count();
  }
}
