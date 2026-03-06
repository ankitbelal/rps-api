import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { NoticeQueryDto, SingleNoticeDto } from './dto/notice.dto';
import { UserService } from 'src/user/user.service';
import { InjectRepository } from '@nestjs/typeorm';
import { SingleUserNotice } from 'src/database/entities/single-user-notice.entity';
import { Brackets, Repository } from 'typeorm';
import {
  NoticeType,
  NoticeUserType,
  UserType,
} from 'utils/enums/general-enums';
import { MailingService } from 'src/mailing/mailing.service';
import { TeacherService } from 'src/teacher/teacher.service';
import { StudentService } from 'src/student/student.service';

@Injectable()
export class NoticeService {
  constructor(
    @InjectRepository(SingleUserNotice)
    private readonly singleNoticeRepo: Repository<SingleUserNotice>,

    private readonly userService: UserService,
    private readonly mailingService: MailingService,
    private readonly teacherService: TeacherService,
    private readonly studentService: StudentService,
  ) {}

  async singleNotify(dto: SingleNoticeDto) {
    const user = await this.findUserById(dto.publisherId!);
    if (!user)
      throw new UnauthorizedException({
        success: false,
        statusCode: 401,
        message: 'Unauthorized access.',
      });

    if (user.userType === UserType.ADMIN)
      dto.publisherType = NoticeUserType.ADMIN;

    if (user.userType === UserType.TEACHER)
      dto.publisherType = NoticeUserType.TEACHER;

    if (dto.recipientType === NoticeUserType.STUDENT) {
      const student = await this.studentService.findStudentById(
        dto.recipientId,
      );
      if (!student)
        throw new NotFoundException({
          success: false,
          statusCode: 404,
          message: 'The student does not exist.',
        });

      if (!student.userId)
        throw new NotFoundException({
          success: false,
          statusCode: 404,
          message: 'Unable to send notification. User is not created yet.',
        });
      dto.email = student.email;
      dto.recipientId = student.userId;
    }

    if (dto.recipientType === NoticeUserType.TEACHER) {
      const teacher = await this.teacherService.findTeacherById(
        dto.recipientId,
      );
      if (!teacher)
        throw new NotFoundException({
          success: false,
          statusCode: 404,
          message: 'The teacher does not exist.',
        });
      dto.email = teacher.email!;
      dto.recipientId = teacher.userId;
    }

    if (dto.sendEmail) await this.handleMailing(dto);
    await this.singleNoticeRepo.save(this.singleNoticeRepo.create(dto));
    return { success: true, statusCode: 201, message: 'Notice sent.' };
  }

  async handleMailing(dto: SingleNoticeDto) {
    // await this.mailingService.sendNoticeEmail({ ... });
  }

  async findUserById(id: number) {
    return await this.userService.findUserById(id);
  }

  async getNoticesForMe(noticeQueryDto: NoticeQueryDto) {
    const { page = 1, limit = 10, userId } = noticeQueryDto;
    const query = this.singleNoticeRepo
      .createQueryBuilder('notice')
      .leftJoinAndSelect('notice.publisher', 'p')
      .select([
        'notice.id',
        'notice.subject',
        'notice.description',
        'notice.status',
        'notice.publisherType',
        'notice.recipientType',
        'notice.expireAt',
        'notice.createdAt',
        'p.id',
        'p.name',
        'p.email',
      ])
      .where('notice.recipientId = :userId', { userId })
      .orderBy('notice.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await query.getManyAndCount();
    const lastPage = Math.ceil(total / limit);
    return { data, total, page, limit, lastPage };
  }
}
