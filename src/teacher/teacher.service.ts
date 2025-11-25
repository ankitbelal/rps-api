import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';
import { Teacher } from 'src/database/entities/teacher.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserService } from 'src/user/user.service';
import { STATUS_CODES } from 'http';
import { UserStatus, UserType } from 'utils/enums/general-enums';

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
        statusCode: 422,
        message: 'Validation failed',
        errors: {
          phone: 'Already Used',
          email: 'Already Used',
        },
      });
    if (emailUsed && !phoneUsed)
      throw new ConflictException({
        success: false,
        statusCode: 422,
        message: 'Validation failed',
        errors: {
          email: 'Already Used',
        },
      });
    if (phoneUsed && !emailUsed)
      if (emailUsed && !phoneUsed)
        throw new ConflictException({
          success: false,
          statusCode: 422,
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

  findAll() {
    return `This action returns all teacher`;
  }

  findOne(id: number) {
    return `This action returns a #${id} teacher`;
  }

  update(id: number, updateTeacherDto: UpdateTeacherDto) {
    return `This action updates a #${id} teacher`;
  }

  remove(id: number) {
    return `This action removes a #${id} teacher`;
  }
}
