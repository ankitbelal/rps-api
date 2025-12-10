import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Student } from 'src/database/entities/student.entity';
import { Repository } from 'typeorm';
import { UserService } from 'src/user/user.service';
import { UserStatus, UserType } from 'utils/enums/general-enums';

@Injectable()
export class StudentService {
  constructor(
    @InjectRepository(Student)
    private readonly studentRepo: Repository<Student>,
    private readonly userService: UserService,
  ) {}

  async create(createStudentDto: CreateStudentDto): Promise<Student> {
    const exists = await this.studentRepo.findOne({
      where: [
        { email: createStudentDto.email },
        { phone: createStudentDto.phone },
      ],
    });

    const { emailUsed, phoneUsed, valid } = await this.validateStudentContact({
      email: createStudentDto.email,
      phone: createStudentDto.phone,
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
    const student = await this.studentRepo.save(
      this.studentRepo.create(createStudentDto),
    );
    await this.userService.createUser(
      student.id,
      student.firstName + '' + student.lastName,
      createStudentDto.email,
      createStudentDto.phone,
      UserType.STUDENT,
      UserStatus.ACTIVE,
    );
    return student;
  }

  findAll() {
    return `This action returns all student`;
  }

  findOne(id: number) {
    return `This action returns a #${id} student`;
  }

  async update(id: number, updateStudentDto: UpdateStudentDto) {
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
    return await this.studentRepo.save(teacher);
  }

  async remove(id: number) {
    const student = await this.studentRepo.findOne({ where: { id } });
    if (!student)
      throw new NotFoundException({
        status: 'false',
        statusCode: 404,
        message: `Teacher with id: ${id} does not exists.`,
      });
    this.studentRepo.remove(student);
  }

  async validateStudentContact(data: {
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
    const valid = !emailUsed && !phoneUsed;
    return { emailUsed, phoneUsed, valid };
  }
}
