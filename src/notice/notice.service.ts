import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  markAsReadDto,
  NoticeQueryDto,
  SingleNoticeDto,
} from './dto/notice.dto';
import { UserService } from 'src/user/user.service';
import { InjectRepository } from '@nestjs/typeorm';
import { SingleUserNotice } from 'src/database/entities/single-user-notice.entity';
import { Brackets, Repository } from 'typeorm';
import {
  NoticeType,
  NoticeUserType,
  SingleNoticeStatus,
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

    if (
      user.userType === UserType.ADMIN ||
      user.userType === UserType.SUPERADMIN
    )
      dto.publisherType = NoticeUserType.ADMIN;

    if (user.userType === UserType.TEACHER)
      dto.publisherType = NoticeUserType.TEACHER;

    if (user.userType === UserType.STUDENT)
      dto.publisherType = NoticeUserType.STUDENT;

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
      if (dto.sendEmail) await this.handleMailing(dto);
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

      if (dto.sendEmail) await this.handleMailing(dto);
    }

    if (dto.recipientType === NoticeUserType.ADMIN) {
      // this.handleMailing();
    }

    await this.singleNoticeRepo.save(this.singleNoticeRepo.create(dto));
    return true;
  }

  async handleMailing(dto: SingleNoticeDto) {
    const notificationData = { email: dto.email, subject: dto.subject };

    // await this.mailingService.sendNoticeEmail({ ... });
  }

  async findUserById(id: number) {
    return await this.userService.findUserById(id);
  }

  async getNoticesForMe(noticeQueryDto: NoticeQueryDto) {
    const { page = 1, limit = 10, userId, filter } = noticeQueryDto;

    const user = await this.findUserById(userId!);
    const isAdmin =
      user?.userType === UserType.ADMIN ||
      user?.userType === UserType.SUPERADMIN;
    const isStudent = user?.userType === UserType.STUDENT;

    const baseCountQuery = () =>
      this.singleNoticeRepo
        .createQueryBuilder('notice')
        .leftJoinAndSelect('notice.publisher', 'p');

    if (isAdmin)
      baseCountQuery().where('notice.recipientType = :type', {
        type: NoticeUserType.ADMIN,
      });
    else baseCountQuery().where('notice.recipientId = :userId', { userId });

    const baseDataQuery = () => {
      const qb = this.singleNoticeRepo
        .createQueryBuilder('notice')
        .leftJoinAndSelect('notice.publisher', 'p');

      if (isAdmin) {
        qb.where('notice.recipientType = :recipientType', {
          recipientType: NoticeUserType.ADMIN,
        });
      } else {
        qb.where('notice.recipientId = :userId', { userId });
      }

      return qb;
    };

    const dataQuery = baseDataQuery()
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
      .orderBy('notice.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (filter === 'unread') {
      dataQuery.andWhere('notice.status = :status', {
        status: SingleNoticeStatus.UNREAD,
      });
    } else if (filter === 'admin') {
      dataQuery.andWhere('notice.publisherType = :type', {
        type: NoticeUserType.ADMIN,
      });
    } else if (filter === 'teacher') {
      dataQuery.andWhere('notice.publisherType = :type', {
        type: NoticeUserType.TEACHER,
      });
    } else if (filter === 'student') {
      dataQuery.andWhere('notice.publisherType = :type', {
        type: NoticeUserType.STUDENT,
      });
    }

    const [data, total] = await dataQuery.getManyAndCount();

    const [unreadCount, adminCount, teacherCount, studentCount, allCount] =
      await Promise.all([
        baseCountQuery()
          .andWhere('notice.status = :status', {
            status: SingleNoticeStatus.UNREAD,
          })
          .getCount(),
        baseCountQuery()
          .andWhere('notice.publisherType = :type', {
            type: NoticeUserType.ADMIN,
          })
          .getCount(),
        baseCountQuery()
          .andWhere('notice.publisherType = :type', {
            type: NoticeUserType.TEACHER,
          })
          .getCount(),
        baseCountQuery()
          .andWhere('notice.publisherType = :type', {
            type: NoticeUserType.STUDENT,
          })
          .getCount(),
        baseCountQuery().getCount(),
      ]);

    const counts = {
      all: allCount,
      unread: unreadCount,
      ...(isAdmin && { teacher: teacherCount, student: studentCount }),
      ...(isStudent && { teacher: teacherCount, admin: adminCount }),
    };

    const lastPage = Math.ceil(total / limit);
    return { data, total, page, limit, lastPage, counts };
  }

  async markAsRead(dto: markAsReadDto) {
    const { id, all, type, userId } = dto;
    const user = await this.findUserById(userId!);
    if (all) {
      const qb = this.singleNoticeRepo
        .createQueryBuilder()
        .update(SingleUserNotice)
        .set({ status: SingleNoticeStatus.READ })
        .andWhere('status = :status', { status: SingleNoticeStatus.UNREAD });
      if (user?.userType === UserType.ADMIN)
        qb.andWhere('recipientType = :type', {
          type: NoticeUserType.ADMIN,
        }).where('recipientId = :userId', { userId });

      if (type === 'A') {
        qb.andWhere('publisherType = :pType', { pType: NoticeUserType.ADMIN });
        
      } else if (type === 'T') {
        qb.andWhere('publisherType = :pType', {
          pType: NoticeUserType.TEACHER,
        });
      }

      const result = await qb.execute();

      return {
        success: true,
        message:
          type === 'A'
            ? 'All admin notices marked as read.'
            : type === 'T'
              ? 'All teacher notices marked as read.'
              : 'All notices marked as read.',
        affected: result.affected ?? 0,
      };
    }

    if (id) {
      const notice = await this.singleNoticeRepo.findOne({
        where: { id },
      });

      if (!notice) {
        throw new NotFoundException({
          success: false,
          statusCode: 404,
          message: 'Notice not found.',
        });
      }

      notice.status = SingleNoticeStatus.READ;
      await this.singleNoticeRepo.save(notice);
      return true;
    }
  }
}
