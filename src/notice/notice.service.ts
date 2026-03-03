import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { SingleNoticeDto } from './dto/notice.dto';
import { UserService } from 'src/user/user.service';
import { InjectRepository } from '@nestjs/typeorm';
import { SingleUserNotice } from 'src/database/entities/single-user-notice.entity';
import { Repository } from 'typeorm';
import { NoticeUserType, UserType } from 'utils/enums/general-enums';
import { MailingService } from 'src/mailing/mailing.service';
import { TeacherService } from 'src/teacher/teacher.service';
import { StudentService } from 'src/student/student.service';
import { BulkNotice } from 'src/database/entities/bulk-notice.entity';

@Injectable()
export class NoticeService {
  constructor(
    @InjectRepository(SingleUserNotice)
    private readonly singleNoticeRepo: Repository<SingleUserNotice>,

    @InjectRepository(BulkNotice)
    private readonly bulkNoticeRepo: Repository<BulkNotice>,

    private readonly userService: UserService,
    private readonly mailingService: MailingService,
    private readonly teacherService: TeacherService,
    private readonly studentService: StudentService,
  ) {}
  async singleNotify(dto: SingleNoticeDto) {
    const user = await this.userService.findUserById(dto.publisherId!);
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

    if (dto.sendEmail) this.handleMailing(dto);
    await this.singleNoticeRepo.save(this.singleNoticeRepo.create(dto));
    return true;
  }

  async handleMailing(dto: SingleNoticeDto) {
    let email: string = '';
    if (dto.recipientType === NoticeUserType.TEACHER) {
      const student = await this.studentService.findStudentById(
        dto.recipientId,
      );
      email = student?.email!;
    }
    if (dto.recipientType === NoticeUserType.TEACHER) {
      const teacher = await this.teacherService.findTeacherById(
        dto.recipientId,
      );
      email = teacher?.email!;
    }

    const emailData = {};
    this.mailingService.sendNoticeEmail();
  }

  async getNoticesForMe() {}
}
