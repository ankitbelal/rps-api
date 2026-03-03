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
import { BulkNotice } from 'src/database/entities/bulk-notice.entity';
import { User } from 'src/database/entities/user.entity';

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
    if (noticeQueryDto.type === NoticeType.BULK) {
      return await this.getBulkNotices(noticeQueryDto);
    }
    return await this.getSingleNotices(noticeQueryDto);
  }

  private async getSingleNotices(noticeQueryDto: NoticeQueryDto) {
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

  private async getBulkNotices(noticeQueryDto: NoticeQueryDto) {
    const { page = 1, limit = 10, userId } = noticeQueryDto;

    const user = await this.findUserById(userId!);
    if (!user)
      throw new UnauthorizedException({
        success: false,
        statusCode: 401,
        message: 'Unauthorized access.',
      });

    const selectedFields = [
      'notice.id',
      'notice.subject',
      'notice.description',
      'notice.publisherType',
      'notice.recipientType',
      'notice.programs',
      'notice.semesters',
      'notice.expireAt',
      'notice.createdAt',
    ];

    // ── TEACHER ──────────────────────────────────────────────────────────────
    if (user.userType === UserType.TEACHER) {
      const [data, total] = await this.bulkNoticeRepo
        .createQueryBuilder('notice')
        .select(selectedFields)
        .where(
          new Brackets((qb) => {
            qb.where('notice.recipientType = :all', {
              all: NoticeUserType.ALL,
            }).orWhere('notice.recipientType = :teacher', {
              teacher: NoticeUserType.TEACHER,
            });
          }),
        )
        .orderBy('notice.createdAt', 'DESC')
        .skip((page - 1) * limit)
        .take(limit)
        .getManyAndCount();

      return { data, total, page, limit, lastPage: Math.ceil(total / limit) };
    }

    // ── STUDENT ───────────────────────────────────────────────────────────────
    if (user.userType === UserType.STUDENT) {
      const student = await this.studentService.findStudentByUserId(userId!);
      if (!student)
        throw new NotFoundException({
          success: false,
          statusCode: 404,
          message: 'Student not found.',
        });

      const programId: number = student.programId;
      const semesterId: number = student.currentSemester;

      /**
       * recipientType = ALL                                          → always show
       *
       * recipientType = STUDENT + programs IS NULL                   → show (all students)
       * recipientType = STUDENT + programs ∋ programId
       *   + semesters IS NULL                                        → show (all semesters)
       *   + semesters ∋ semesterId                                   → show
       *
       * recipientType = PROGRAM + programs ∋ programId
       *   + semesters IS NULL                                        → show (all semesters)
       *   + semesters ∋ semesterId                                   → show
       */
      const [data, total] = await this.bulkNoticeRepo
        .createQueryBuilder('notice')
        .select(selectedFields)
        .where(
          new Brackets((qb) => {
            // Branch 1: ALL → visible to everyone
            qb.where('notice.recipientType = :all', { all: NoticeUserType.ALL })

              // Branch 2: STUDENT with no program restriction (all students)
              .orWhere(
                new Brackets((q) =>
                  q
                    .where('notice.recipientType = :student', {
                      student: NoticeUserType.STUDENT,
                    })
                    .andWhere('notice.programs IS NULL'),
                ),
              )

              // Branch 3: STUDENT → program matches → no semester restriction
              .orWhere(
                new Brackets((q) =>
                  q
                    .where('notice.recipientType = :student', {
                      student: NoticeUserType.STUDENT,
                    })
                    .andWhere('JSON_CONTAINS(notice.programs, :programId)', {
                      programId: JSON.stringify(programId),
                    })
                    .andWhere('notice.semesters IS NULL'),
                ),
              )

              // Branch 4: STUDENT → program matches → semester matches
              .orWhere(
                new Brackets((q) =>
                  q
                    .where('notice.recipientType = :student', {
                      student: NoticeUserType.STUDENT,
                    })
                    .andWhere('JSON_CONTAINS(notice.programs, :programId)', {
                      programId: JSON.stringify(programId),
                    })
                    .andWhere('JSON_CONTAINS(notice.semesters, :semesterId)', {
                      semesterId: JSON.stringify(semesterId),
                    }),
                ),
              )

              // Branch 5: PROGRAM → student must exist in BOTH programs AND semesters (strict, no nulls)
              .orWhere(
                new Brackets((q) =>
                  q
                    .where('notice.recipientType = :type', {
                      program: NoticeUserType.ALL,
                    })
                    .andWhere('JSON_CONTAINS(notice.programs, :programId)', {
                      programId: JSON.stringify(programId),
                    })
                    .andWhere('JSON_CONTAINS(notice.semesters, :semesterId)', {
                      semesterId: JSON.stringify(semesterId),
                    }),
                ),
              );
          }),
        )
        .orderBy('notice.createdAt', 'DESC')
        .skip((page - 1) * limit)
        .take(limit)
        .getManyAndCount();

      return { data, total, page, limit, lastPage: Math.ceil(total / limit) };
    }

    // ── ADMIN (sees everything) ───────────────────────────────────────────────
    const [data, total] = await this.bulkNoticeRepo
      .createQueryBuilder('notice')
      .select(selectedFields)
      .orderBy('notice.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, total, page, limit, lastPage: Math.ceil(total / limit) };
  }
}
