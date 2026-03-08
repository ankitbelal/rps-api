import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ExtraParametersMarks } from 'src/database/entities/extra-parameters-marks.entity';
import { StudentSubjectMarks } from 'src/database/entities/student-marks.entity';
import { Repository } from 'typeorm';
import { AddMarksDTO, MarkFetchQueryDto } from './dto/marks.dto';
import { SubjectService } from 'src/subject/subject.service';
import { StudentService } from 'src/student/student.service';
import PDFDocument from 'pdfkit';
import {
  AuditActCodes,
  ExamTerm,
  StudentStatus,
  UserType,
} from 'utils/enums/general-enums';
import { PublishedResult } from 'src/database/entities/published-result.entity';
import { UserService } from 'src/user/user.service';
import { TeacherService } from 'src/teacher/teacher.service';
import {
  CreateGradingSystemDto,
  GetClassResultsDto,
  TopStudentQueryDto,
} from './dto/result.dto';
import { GradingSystem } from 'src/database/entities/grading-system.entity';
import {
  BulkPublishResultEmail,
  StudentResultEmail,
} from 'src/mailing/interfaces/mailing-interface';
import { MailingService } from 'src/mailing/mailing.service';
import {
  GetPublishedResultDto,
  GradeSheetQueryDto,
  PublishBulkDto,
} from './dto/result-publish.dto';
import { Student } from 'src/database/entities/student.entity';
import type { Response } from 'express';
import pLimit from 'p-limit';
import { AuditLogs } from 'src/audit-trail/interfaces/audit-trails-interface';
import { AuditTrailService } from 'src/audit-trail/audit-trail.service';
import { ProgramService } from 'src/program/program.service';
import { Program } from 'src/database/entities/program.entity';

@Injectable()
export class ResultService {
  examNameMap = {
    [ExamTerm.FIRST]: 'First Term',
    [ExamTerm.SECOND]: 'Second Term',
    [ExamTerm.FINAL]: 'Final',
  };
  public constructor(
    @InjectRepository(StudentSubjectMarks)
    private readonly studentSubjectMarks: Repository<StudentSubjectMarks>,

    @InjectRepository(ExtraParametersMarks)
    private readonly extraParametersMarks: Repository<ExtraParametersMarks>,

    @InjectRepository(PublishedResult)
    private readonly publishedResultRepo: Repository<PublishedResult>,

    @InjectRepository(GradingSystem)
    private readonly gradingSystemRepo: Repository<GradingSystem>,

    private readonly subjectService: SubjectService,
    private readonly studentService: StudentService,
    private readonly userService: UserService,
    private readonly teacherService: TeacherService,
    private readonly mailingService: MailingService,
    private readonly logService: AuditTrailService,
    private readonly programService: ProgramService,
  ) {}

  async getMarks(
    markFetchQueryDto: MarkFetchQueryDto,
  ): Promise<{ data: StudentSubjectMarks[] }> {
    const { studentId, semester, examTerm, userId } = markFetchQueryDto;

    const query = this.studentSubjectMarks
      .createQueryBuilder('sm')
      .where('sm.student_id = :studentId', { studentId });

    const query2 = this.extraParametersMarks
      .createQueryBuilder('ep')
      .where('ep.student_id = :studentId', { studentId });

    if (markFetchQueryDto.semester) {
      query.andWhere('sm.semester = :semester', { semester });
      query2.andWhere('ep.semester = :semester', { semester });
    }

    if (markFetchQueryDto.examTerm) {
      query.andWhere('sm.exam_term = :examTerm', { examTerm });
      query2.andWhere('ep.exam_term = :examTerm', { examTerm });
    }

    if (userId) {
      const user = await this.userService.findUserById(userId);
      if (user?.userType === UserType.TEACHER) {
        const teacher = await this.teacherService.findTeacherByUserId(userId);
        const assignedSubjects =
          await this.subjectService.getAssignedSubjectsId(teacher?.id);
        if (assignedSubjects.length) {
          const subjectIds = assignedSubjects.map((s) => s.subjectId);

          query.andWhere('sm.subject_id IN (:...subjectIds)', { subjectIds });
          query2.andWhere('ep.subject_id IN (:...subjectIds)', { subjectIds });
        }
      }
    }

    const [subjectMarks, extraMarks] = await Promise.all([
      query
        .select([
          'sm.id',
          // 'sm.studentId',
          'sm.subjectId',
          'sm.examTerm',
          'sm.semester',
          'sm.obtainedMarks',
          'sm.fullMarks',
          'sm.createdAt',
        ])
        .getMany(),

      query2
        .select([
          'ep.id',
          // 'ep.studentId',
          'ep.subjectId',
          'ep.evaluationParameterId',
          'ep.obtainedMarks',
          'ep.fullMarks',
          // 'ep.semester',
          // 'ep.examTerm',
          // 'ep.createdAt',
        ])
        .getMany(),
    ]);

    const merged = subjectMarks.map((subject) => ({
      ...subject,
      extraParametersMarks: extraMarks.filter(
        (ep) =>
          // ep.studentId === subject.studentId &&
          ep.subjectId === subject.subjectId,
        // ep.semester === subject.semester &&
        // ep.examTerm === subject.examTerm,
      ),
    }));

    return { data: merged };
  }

  async addMarks(addMarksDto: AddMarksDTO) {
    const { studentId, semester, examTerm, marks } = addMarksDto;

    const [existingSubjectMarks, existingExtraMarks] = await Promise.all([
      this.studentSubjectMarks.find({
        where: { studentId, semester, examTerm },
      }),
      this.extraParametersMarks.find({
        where: {
          studentId,
          semester,
          examTerm,
        },
      }),
    ]);

    const subjectMarksInsert: StudentSubjectMarks[] = [];
    const subjectMarksUpdate: StudentSubjectMarks[] = [];
    const extraMarksInsert: ExtraParametersMarks[] = [];
    const extraMarksUpdate: ExtraParametersMarks[] = [];

    marks.map((subject) => {
      const existing = existingSubjectMarks.find(
        (s) => s.subjectId === subject.subjectId,
      );

      if (existing && existing.obtainedMarks !== subject.obtainedMarks) {
        existing.obtainedMarks = subject.obtainedMarks!;
        subjectMarksUpdate.push(existing);
      } else {
        subjectMarksInsert.push(
          this.studentSubjectMarks.create({
            studentId,
            semester,
            examTerm,
            subjectId: subject.subjectId,
            obtainedMarks: subject.obtainedMarks,
          }),
        );
      }

      if (subject.parameters?.length) {
        subject.parameters.map((params) => {
          const existingParamMarks = existingExtraMarks.find(
            (ep) =>
              ep.subjectId === subject.subjectId &&
              ep.evaluationParameterId === params.parameterId,
          );

          if (
            existingParamMarks &&
            existingParamMarks.obtainedMarks !== params.mark
          ) {
            existingParamMarks.obtainedMarks = params.mark;
            extraMarksUpdate.push(existingParamMarks);
          } else {
            extraMarksInsert.push(
              this.extraParametersMarks.create({
                studentId,
                semester,
                examTerm,
                subjectId: subject.subjectId,
                evaluationParameterId: params.parameterId,
                obtainedMarks: params.mark,
              }),
            );
          }
        });
      }
    });

    return !!(await Promise.all([
      subjectMarksUpdate.length
        ? this.studentSubjectMarks.save(subjectMarksUpdate)
        : Promise.resolve(),
      subjectMarksInsert.length
        ? this.studentSubjectMarks.insert(subjectMarksInsert)
        : Promise.resolve(),
      extraMarksUpdate.length
        ? this.extraParametersMarks.save(extraMarksUpdate)
        : Promise.resolve(),
      extraMarksInsert.length
        ? this.extraParametersMarks.insert(extraMarksInsert)
        : Promise.resolve(),
    ]));
  }

  // ─── CORE CALCULATION (reusable private method) ─────────────────────

  private async calculateResult(
    studentId: number,
    programId: number,
    semester: number,
    examTerm: ExamTerm,
  ) {
    // fetch subjects for this specific semester only
    const subjects = await this.subjectService.getSubjectsInternal({
      programId,
      semester,
    });

    // fetch marks filtered by semester AND examTerm
    const [subjectMarks, extraMarks] = await Promise.all([
      this.studentSubjectMarks.find({
        where: { studentId, semester, examTerm },
      }),
      this.extraParametersMarks.find({
        where: { studentId, semester, examTerm },
      }),
    ]);

    const subjectBreakdown: PublishedResult['subjectBreakdown'] = [];

    for (const subject of subjects) {
      const subjectMark = subjectMarks.find(
        (sm) => sm.subjectId === subject.id,
      );

      let subjectObtainedOutOf50 = 0;
      if (subjectMark && subjectMark.fullMarks) {
        subjectObtainedOutOf50 =
          (Number(subjectMark.obtainedMarks) / Number(subjectMark.fullMarks)) *
          50;
      }

      const subjectExtraMarks = extraMarks.filter(
        (ep) => ep.subjectId === subject.id,
      );

      // ✅ AFTER — scale total ep marks to 50 regardless of param count
      const extraTotalObtained = subjectExtraMarks.reduce(
        (sum, ep) => sum + Number(ep.obtainedMarks),
        0,
      );
      const extraTotalFull = subjectExtraMarks.reduce(
        (sum, ep) => sum + Number(ep.fullMarks),
        0,
      );

      const extraObtained =
        extraTotalFull > 0 ? (extraTotalObtained / extraTotalFull) * 50 : 0;

      const finalMarkOutOf100 = subjectObtainedOutOf50 + extraObtained;

      subjectBreakdown.push({
        subjectId: subject.id!,
        subjectName: subject.name!,
        subjectCode: subject.code!,
        subjectObtainedOutOf50: parseFloat(subjectObtainedOutOf50.toFixed(2)),
        extraParamObtainedOutOf50: parseFloat(extraObtained.toFixed(2)),
        grade: await this.calculateGrade(this.calculateGPA(finalMarkOutOf100)),
        finalMarkOutOf100: parseFloat(finalMarkOutOf100.toFixed(2)),
      });
    }

    const totalObtained = subjectBreakdown.reduce(
      (sum, s) => sum + s.finalMarkOutOf100,
      0,
    );
    const totalFull = subjectBreakdown.length * 100;
    const percentage =
      totalFull > 0
        ? parseFloat(((totalObtained / totalFull) * 100).toFixed(2))
        : 0;

    return {
      subjectBreakdown,
      totalObtained: parseFloat(totalObtained.toFixed(2)),
      totalFull,
      percentage,
      gpa: this.calculateGPA(percentage),
    };
  }

  async publishSingle(
    studentId: number,
    semester: number,
    examTerm: ExamTerm,
    publishedBy: number,
  ): Promise<boolean> {
    const student = await this.studentService.findStudentById(studentId);
    if (!student)
      throw new NotFoundException({
        success: false,
        statusCode: 404,
        message: 'Student does not exists.',
      });

    if (examTerm == ExamTerm.FINAL) {
      await this.finalizeSingle(studentId, semester, publishedBy);
    } else {
      const studentsBySemester = new Map<number, Student[]>();
      studentsBySemester.set(semester, [student]);

      const incomplete = await this.collectIncompleteMarks(
        studentsBySemester,
        student.programId,
        examTerm,
      );

      if (incomplete.length) {
        throw new ConflictException({
          success: false,
          statusCode: 409,
          message: `Failed to publish result. Missing marks entry for some subjects.`,
        });
      }
      const calculated = await this.calculateResult(
        studentId,
        student.programId,
        semester,
        examTerm,
      );

      // ✅ manual upsert — find existing to get id, then save
      const existing = await this.publishedResultRepo.findOne({
        where: { studentId, semester, examTerm },
      });

      await this.publishedResultRepo.save({
        ...(existing ?? {}), // spreads id if exists → update, else insert
        studentId,
        programId: student.programId,
        semester,
        examTerm,
        publishedBy: await this.getUserName(publishedBy),
        ...calculated,
      });
    }

    const examNameMap = {
      [ExamTerm.FIRST]: 'First Term Examination',
      [ExamTerm.SECOND]: 'Second Term Examination',
      [ExamTerm.FINAL]: 'Finalized (First + Second term)',
    };
    const emailData: StudentResultEmail = {
      student: {
        name: `${student.firstName} ${student.lastName}`,
        rollNumber: student.rollNumber,
        registrationNumber: student.registrationNumber,
        email: student.email,
      },
      result: {
        examName: examNameMap[examTerm],
        semester: `Semester ${semester}`,
      },
    };

    this.mailingService.sendStudentsResultEmail(emailData).catch(() => {});

    return true;
  }

  // ─── FINALIZE SINGLE ─────────────────────────────────────────
  private async finalizeSingle(
    studentId: number,
    semester: number,
    publishedBy: number,
  ): Promise<boolean> {
    const [firstTerm, secondTerm] = await Promise.all([
      this.publishedResultRepo.findOne({
        where: { studentId, semester, examTerm: ExamTerm.FIRST },
      }),
      this.publishedResultRepo.findOne({
        where: { studentId, semester, examTerm: ExamTerm.SECOND },
      }),
    ]);

    if (!firstTerm)
      throw new NotFoundException({
        success: false,
        statusCode: 404,
        message: `First term result not published yet.`,
      });

    if (!secondTerm)
      throw new NotFoundException({
        success: false,
        statusCode: 404,
        message: `Second term result not published yet.`,
      });

    const finalPercentage = parseFloat(
      (
        (Number(firstTerm.percentage) + Number(secondTerm.percentage)) /
        2
      ).toFixed(2),
    );
    const finalTotalObtained = parseFloat(
      (
        (Number(firstTerm.totalObtained) + Number(secondTerm.totalObtained)) /
        2
      ).toFixed(2),
    );
    const finalTotalFull = Number(firstTerm.totalFull);

    const subjectBreakdown = await Promise.all(
      firstTerm.subjectBreakdown.map(async (fs) => {
        const ss = secondTerm.subjectBreakdown.find(
          (s) => s.subjectId === fs.subjectId,
        );

        const finalMarkOutOf100 = parseFloat(
          (
            (Number(fs.finalMarkOutOf100) +
              Number(ss?.finalMarkOutOf100 ?? 0)) /
            2
          ).toFixed(2),
        );

        const gpa = this.calculateGPA(finalMarkOutOf100);
        const grade = await this.calculateGrade(gpa);

        return {
          subjectId: fs.subjectId,
          subjectName: fs.subjectName,
          subjectCode: fs.subjectCode,
          firstTermMark: Number(fs.finalMarkOutOf100),
          secondTermMark: Number(ss?.finalMarkOutOf100 ?? 0),
          finalMarkOutOf100,
          grade,
          subjectObtainedOutOf50: Number(fs.subjectObtainedOutOf50),
          extraParamObtainedOutOf50: Number(fs.extraParamObtainedOutOf50),
        };
      }),
    );

    await this.publishedResultRepo.upsert(
      {
        studentId,
        programId: firstTerm.programId,
        semester,
        examTerm: ExamTerm.FINAL,
        totalObtained: finalTotalObtained,
        totalFull: finalTotalFull,
        percentage: finalPercentage,
        gpa: this.calculateGPA(finalPercentage),
        subjectBreakdown,
        publishedBy: await this.getUserName(publishedBy),
      },
      ['studentId', 'semester', 'examTerm'],
    );

    return true;
  }

  /* 
  publish bulk will handle bulk publish for both terminal and also
  for final terminal if passed terminal as final
  */
  async publishBulk(dto: PublishBulkDto, res: Response) {
    const {
      programId,
      semesters,
      examTerm,
      publishedBy,
      withReport = false,
    } = dto;

    const program = await this.programService.findProgramById(programId);
    if (!program)
      throw new NotFoundException({
        success: false,
        statusCode: 404,
        message: 'Program does not exists.',
      });
    const studentsBySemester = await this.studentService.findActiveStudents({
      programId,
      semesters,
    });

    // Check if the Map has any students at all
    let hasAnyStudents = false;
    for (const [semester, students] of studentsBySemester.entries()) {
      if (students && students.length > 0) {
        hasAnyStudents = true;
        break;
      }
    }

    if (!hasAnyStudents) {
      throw new BadRequestException({
        success: false,
        statusCode: 404,
        message: 'There are no students found to publish result.',
      });
    }

    const allMissingTerms =
      examTerm === ExamTerm.FINAL
        ? await this.collectMissingTermResults(studentsBySemester)
        : [];

    if (allMissingTerms.length) {
      if (withReport)
        return this.generateMissingResultReport(allMissingTerms, res);
      else
        throw new ConflictException({
          success: false,
          statusCode: 409,
          message:
            'Failed to publish result. Some students are missing term results.',
          missingCount: allMissingTerms.length,
        });
    }

    const allIncomplete = await this.collectIncompleteMarks(
      studentsBySemester,
      programId,
      examTerm,
    );

    if (allIncomplete.length) {
      if (withReport) {
        return this.generateIncompleteMarksReport(allIncomplete, examTerm, res);
      } else {
        throw new ConflictException({
          success: false,
          statusCode: 409,
          message:
            'Failed to publish result. Some students have incomplete marks.',
          incompleteCount: allIncomplete.length,
        });
      }
    }

    this.firePublishAll(studentsBySemester, examTerm, publishedBy!, program);

    return {
      success: true,
      statusCode: 200,
      message: 'Result publish started. You will be notified when completed.',
    };
  }

  private async collectIncompleteMarks(
    studentsBySemester: Map<number, Student[]>,
    programId: number,
    examTerm: ExamTerm,
  ): Promise<{ student: any; missingSubjects: string[]; semester: number }[]> {
    const allIncomplete: {
      student: any;
      missingSubjects: string[];
      semester: number;
    }[] = [];

    for (const [semester, students] of studentsBySemester) {
      if (!students.length) continue;

      const incomplete = await this.checkIncompleteMarks(
        students,
        programId,
        semester,
        examTerm,
      );

      incomplete.forEach((item) => allIncomplete.push({ ...item, semester }));
    }

    return allIncomplete;
  }

  private async checkIncompleteMarks(
    students: Student[],
    programId: number,
    semester: number,
    examTerm: ExamTerm,
  ): Promise<{ student: Student; missingSubjects: string[] }[]> {
    const subjects = await this.subjectService.getSubjectsInternal({
      programId,
      semester,
    });

    if (!subjects.length) return [];

    const incomplete: { student: Student; missingSubjects: string[] }[] = [];

    await Promise.all(
      students.map(async (student) => {
        const enteredMarks = await this.studentSubjectMarks.find({
          where: { studentId: student.id, semester, examTerm },
        });

        const enteredSubjectIds = new Set(enteredMarks.map((m) => m.subjectId));

        const missingSubjects = subjects
          .filter((sub) => !enteredSubjectIds.has(sub.id!))
          .map((sub) => `${sub.name} (${sub.code})`);

        if (missingSubjects.length) {
          incomplete.push({ student, missingSubjects });
        }
      }),
    );

    return incomplete;
  }

  // ─── COLLECT MISSING TERM RESULTS (FINAL only) ───────────────────────────────
  private async collectMissingTermResults(
    studentsBySemester: Map<number, Student[]>,
  ): Promise<
    {
      student: any;
      missingFirst: boolean;
      missingSecond: boolean;
      semester: number;
    }[]
  > {
    const allMissing: {
      student: any;
      missingFirst: boolean;
      missingSecond: boolean;
      semester: number;
    }[] = [];

    for (const [semester, students] of studentsBySemester) {
      if (!students.length) continue;

      await Promise.all(
        students.map(async (student) => {
          const [firstTerm, secondTerm] = await Promise.all([
            this.publishedResultRepo.findOne({
              where: {
                studentId: student.id,
                semester,
                examTerm: ExamTerm.FIRST,
              },
            }),
            this.publishedResultRepo.findOne({
              where: {
                studentId: student.id,
                semester,
                examTerm: ExamTerm.SECOND,
              },
            }),
          ]);

          if (!firstTerm || !secondTerm) {
            allMissing.push({
              student,
              semester,
              missingFirst: !firstTerm,
              missingSecond: !secondTerm,
            });
          }
        }),
      );
    }

    return allMissing;
  }

  private async firePublishAll(
    studentsBySemester: Map<number, Student[]>,
    examTerm: ExamTerm,
    publishedBy: number,
    program: Program,
  ): Promise<void> {
    const limit = pLimit(5);

    const tasks: Promise<void>[] = [];

    const semesters = Array.from(studentsBySemester.keys());
    const totalStudents = Array.from(studentsBySemester.values()).flat().length;
    let successCount = 0;
    let errorCount = 0;
    for (const [semester, students] of studentsBySemester) {
      for (const student of students) {
        // 2. Wrap the logic in the limit function

        const task = limit(async () => {
          try {
            await this.publishSingle(
              student.id,
              semester,
              examTerm,
              publishedBy,
            );
            successCount++;
            console.log(`Successfully processed student ${student.id}`);
          } catch (error) {
            errorCount++;
            console.error(`Failed for student ${student.id}:`, error);
          }
        });

        tasks.push(task);
      }
    }

    // 3. Wait for the limited execution to complete

    await Promise.all(tasks);

    const logData: AuditLogs = {
      actCode: AuditActCodes.RESULT_PUBLISH,
      action: ` ${program.code} ${this.examNameMap[examTerm]} result Published`,
      comment: `Program: ${program.name} | Semesters: ${semesters.join(', ')} | Total Students: ${totalStudents} | Success: ${successCount} | Failed: ${errorCount}`,
      userId: publishedBy,
    };

    this.logService.createLog(logData);

    const user = await this.userService.findUserById(publishedBy);
    const emailData: BulkPublishResultEmail = {
      email: user?.email ?? process.env.FALLBACK_NOTIFY_EMAIL ?? '',
      publisherName: user?.name ?? 'Admin',
      program: {
        name: program.name,
        code: program.code,
      },
      examName: this.examNameMap[examTerm],
      semesters: semesters.join(', '),
      totalStudents,
      successCount,
      errorCount,
      hasErrors: errorCount > 0,
    };

    this.mailingService.sendBulkPublishSummaryEmail(emailData).catch(() => {});

    console.log('Bulk publish background task completed.');
  }

  async getPublishedResult(
    studentId: number,
    examTerm?: ExamTerm,
    semester?: number,
  ): Promise<PublishedResult[]> {
    const where: any = { studentId };
    if (examTerm) where.examTerm = examTerm;
    if (semester) where.semester = semester;

    return await this.publishedResultRepo.find({
      where,
      order: { semester: 'ASC' },
    });
  }

  private async getUserName(userId: number) {
    const user = await this.userService.findUserById(userId);
    return user?.name;
  }

  async topStudentsData(topStudentQueryDto: TopStudentQueryDto) {
    const maxSemSubQuery = this.publishedResultRepo
      .createQueryBuilder('pr_sub')
      .select('pr_sub.studentId', 'studentId')
      .addSelect('MAX(pr_sub.semester)', 'maxSem')
      .groupBy('pr_sub.studentId');

    const qb = this.publishedResultRepo
      .createQueryBuilder('pr')
      .innerJoin(
        `(${maxSemSubQuery.getQuery()})`,
        'latest',
        'latest.studentId = pr.studentId AND latest.maxSem = pr.semester',
      )
      .innerJoin('pr.student', 'student')
      .select([
        'pr.studentId        AS studentId',
        'pr.programId        AS programId',
        'latest.maxSem       AS semester',
        'pr.examTerm         AS examTerm',
        'student.id          AS sId',
        'student.firstName   AS firstName',
        'student.lastName    AS lastName',
        'student.rollNumber  AS rollNumber',
        'pr.percentage       AS percentage',
        'pr.gpa              AS gpa',
        'pr.totalObtained    AS totalObtained',
        'pr.totalFull        AS totalFull',
      ])
      .orderBy('pr.gpa', 'DESC')
      .addOrderBy('pr.percentage', 'DESC')
      .limit(10);

    qb.andWhere('pr.examTerm = :examTerm', {
      examTerm: topStudentQueryDto.examTerm,
    });

    if (topStudentQueryDto.programId) {
      qb.andWhere('pr.programId = :programId', {
        programId: topStudentQueryDto.programId,
      });
    }

    const results = await qb.getRawMany();

    return results.map((r) => ({
      studentId: Number(r.sId),
      name: `${r.firstName} ${r.lastName}`,
      rollNumber: r.rollNumber,
      programId: Number(r.programId),
      semester: Number(r.semester),
      examTerm: r.examTerm,
      gpa: r.gpa ? Number(Number(r.gpa).toFixed(2)) : null,
      percentage: Number(Number(r.percentage).toFixed(2)),
      totalObtained: Number(r.totalObtained),
      totalFull: Number(r.totalFull),
    }));
  }

  private async generateIncompleteMarksReport(
    incompleteData: {
      student: Student;
      missingSubjects: string[];
      semester: number;
    }[],
    examTerm: ExamTerm,
    res: Response,
  ): Promise<void> {
    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'LMS System';
    workbook.created = new Date();

    const styleHeader = (row: any) => {
      /* same as before */
    };
    const styleCell = (cell: any, index: number, center = false) => {
      /* same as before */
    };

    const sheet = workbook.addWorksheet('Incomplete Marks', {
      properties: { tabColor: { argb: 'FF8B0000' } },
      pageSetup: { paperSize: 9, orientation: 'landscape' },
    });

    sheet.columns = [
      { key: 'id', width: 8 },
      { key: 'name', width: 24 },
      { key: 'rollNumber', width: 14 },
      { key: 'regNumber', width: 20 },
      { key: 'semester', width: 10 },
      { key: 'missingSubjects', width: 55 },
    ];

    let cr = 1;

    // ── TITLE ──
    sheet.mergeCells(`A${cr}:F${cr + 5}`);
    const titleCell = sheet.getCell(`A${cr}`);
    titleCell.value = {
      richText: [
        {
          font: {
            name: 'Calibri',
            size: 20,
            bold: true,
            color: { argb: 'FF008080' },
          },
          text: '\n\nRESULT PROCESSING SYSTEM - LMS\n',
        },
        {
          font: {
            name: 'Calibri',
            size: 15,
            bold: true,
            color: { argb: 'FF8B0000' },
          },
          text: `Incomplete Marks Report — ${this.examNameMap[examTerm]}`,
        },
      ],
    };
    titleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFF9E6' },
    };
    titleCell.alignment = {
      horizontal: 'center',
      vertical: 'bottom',
      wrapText: true,
    };
    titleCell.border = {
      top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      right: { style: 'thin', color: { argb: 'FFCCCCCC' } },
    };
    cr += 6;

    sheet.getRow(cr).height = 8;
    cr++;

    // ── HEADER ROW ──
    const headerRow = sheet.getRow(cr);
    headerRow.values = [
      'ID',
      'Full Name',
      'Roll No',
      'Reg No',
      'Semester',
      'Missing Subjects',
    ];
    styleHeader(headerRow);
    sheet.autoFilter = {
      from: { row: cr, column: 1 },
      to: { row: cr, column: 6 },
    };
    sheet.views = [
      { state: 'frozen', xSplit: 0, ySplit: cr, activeCell: 'A1' },
    ];
    cr++;

    // ── DATA ROWS ──
    incompleteData.forEach((item, index) => {
      const row = sheet.getRow(cr);
      row.height = 20;
      const values = [
        item.student.id,
        `${item.student.firstName} ${item.student.lastName}`.trim(),
        item.student.rollNumber ?? '',
        item.student.registrationNumber ?? '',
        `Semester ${item.semester}`,
        item.missingSubjects.join(', '),
      ];
      values.forEach((val, colIndex) => {
        const cell = row.getCell(colIndex + 1);
        cell.value = val;
        styleCell(cell, index, colIndex === 0 || colIndex === 4);
        if (colIndex === 5) {
          cell.font = {
            color: { argb: 'FFCC0000' },
            bold: true,
            name: 'Calibri',
            size: 10,
          };
          cell.alignment = {
            horizontal: 'left',
            vertical: 'middle',
            wrapText: true,
          };
        }
      });
      cr++;
    });

    // ── FOOTER ──
    cr++;
    sheet.mergeCells(`A${cr}:C${cr}`);
    sheet.getRow(cr).getCell(1).value =
      `Total Incomplete: ${incompleteData.length} students`;
    sheet.getRow(cr).getCell(1).font = {
      bold: true,
      size: 11,
      color: { argb: 'FF1F4A7A' },
    };
    for (let i = 1; i <= 6; i++) {
      sheet.getRow(cr).getCell(i).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE6F0FA' },
      };
    }
    cr++;
    sheet.mergeCells(`A${cr}:C${cr}`);
    const now = new Date();
    sheet.getRow(cr).getCell(1).value =
      `Generated: ${now.toLocaleDateString('en-US')}, ${now.toLocaleTimeString('en-US')}`;
    sheet.getRow(cr).getCell(1).font = {
      italic: true,
      size: 10,
      color: { argb: 'FF666666' },
    };
    for (let i = 1; i <= 6; i++) {
      sheet.getRow(cr).getCell(i).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE6F0FA' },
      };
    }

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=incomplete_marks_${examTerm}_${Date.now()}.xlsx`,
    );
    await workbook.xlsx.write(res);
    res.end();
  }

  // ─── GENERATE MISSING RESULT REPORT ──────────────────────────────────────────
  // ─── GENERATE MISSING RESULT REPORT ──────────────────────────────────────────
  private async generateMissingResultReport(
    missingData: {
      student: Student;
      missingFirst: boolean;
      missingSecond: boolean;
      semester: number;
    }[],
    res: Response,
  ): Promise<void> {
    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'LMS System';
    workbook.created = new Date();

    const styleHeader = (row: any) => {
      row.height = 24;
      row.eachCell((cell: any) => {
        cell.font = {
          bold: true,
          size: 11,
          color: { argb: 'FFFFFFFF' },
          name: 'Calibri',
        };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF244062' },
        };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF000000' } },
          left: { style: 'thin', color: { argb: 'FF000000' } },
          bottom: { style: 'thin', color: { argb: 'FF000000' } },
          right: { style: 'thin', color: { argb: 'FF000000' } },
        };
      });
    };

    const styleCell = (cell: any, index: number, center = false) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: index % 2 === 0 ? 'FFF5F5F5' : 'FFFFFFFF' },
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
        left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
        bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
        right: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      };
      cell.alignment = {
        horizontal: center ? 'center' : 'left',
        vertical: 'middle',
      };
    };

    const sheet = workbook.addWorksheet('Missing Term Results', {
      properties: { tabColor: { argb: 'FF8B0000' } },
      pageSetup: { paperSize: 9, orientation: 'landscape' },
    });

    sheet.columns = [
      { key: 'id', width: 8 },
      { key: 'name', width: 24 },
      { key: 'rollNumber', width: 14 },
      { key: 'regNumber', width: 20 },
      { key: 'semester', width: 10 },
      { key: 'firstTerm', width: 14 },
      { key: 'secondTerm', width: 15 },
    ];

    let cr = 1;

    // ── TITLE ──
    sheet.mergeCells(`A${cr}:G${cr + 5}`);
    const titleCell = sheet.getCell(`A${cr}`);
    titleCell.value = {
      richText: [
        {
          font: {
            name: 'Calibri',
            size: 20,
            bold: true,
            color: { argb: 'FF008080' },
          },
          text: '\n\nRESULT PROCESSING SYSTEM - LMS\n',
        },
        {
          font: {
            name: 'Calibri',
            size: 15,
            bold: true,
            color: { argb: 'FF8B0000' },
          },
          text: 'Missing Term Results Report',
        },
      ],
    };
    titleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFF9E6' },
    };
    titleCell.alignment = {
      horizontal: 'center',
      vertical: 'bottom',
      wrapText: true,
    };
    titleCell.border = {
      top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
      right: { style: 'thin', color: { argb: 'FFCCCCCC' } },
    };
    cr += 6;

    sheet.getRow(cr).height = 8;
    cr++;

    // ── HEADER ROW ──
    const headerRow = sheet.getRow(cr);
    headerRow.values = [
      'ID',
      'Full Name',
      'Roll No',
      'Reg No',
      'Semester',
      'First Term',
      'Second Term',
    ];
    styleHeader(headerRow);
    sheet.autoFilter = {
      from: { row: cr, column: 1 },
      to: { row: cr, column: 7 },
    };
    sheet.views = [
      { state: 'frozen', xSplit: 0, ySplit: cr, activeCell: 'A1' },
    ];
    cr++;

    // ── DATA ROWS ──
    missingData.forEach((item, index) => {
      const row = sheet.getRow(cr);
      row.height = 20;
      const values = [
        item.student.id,
        `${item.student.firstName} ${item.student.lastName}`.trim(),
        item.student.rollNumber ?? '',
        item.student.registrationNumber ?? '',
        `Semester ${item.semester}`,
        item.missingFirst ? '❌ Missing' : '✅ Done',
        item.missingSecond ? '❌ Missing' : '✅ Done',
      ];
      values.forEach((val, colIndex) => {
        const cell = row.getCell(colIndex + 1);
        cell.value = val;
        styleCell(cell, index, colIndex === 0 || colIndex >= 4);

        if (colIndex === 5) {
          cell.font = {
            color: { argb: item.missingFirst ? 'FFCC0000' : 'FF16a34a' },
            bold: true,
            name: 'Calibri',
            size: 10,
          };
        }
        if (colIndex === 6) {
          cell.font = {
            color: { argb: item.missingSecond ? 'FFCC0000' : 'FF16a34a' },
            bold: true,
            name: 'Calibri',
            size: 10,
          };
        }
      });
      cr++;
    });

    // ── FOOTER ──
    cr++;
    sheet.mergeCells(`A${cr}:D${cr}`);
    sheet.getRow(cr).getCell(1).value =
      `Total Missing: ${missingData.length} students`;
    sheet.getRow(cr).getCell(1).font = {
      bold: true,
      size: 11,
      color: { argb: 'FF1F4A7A' },
    };
    for (let i = 1; i <= 7; i++) {
      sheet.getRow(cr).getCell(i).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE6F0FA' },
      };
    }

    cr++;
    sheet.mergeCells(`A${cr}:D${cr}`);
    const now = new Date();
    sheet.getRow(cr).getCell(1).value =
      `Generated: ${now.toLocaleDateString('en-US')}, ${now.toLocaleTimeString('en-US')}`;
    sheet.getRow(cr).getCell(1).font = {
      italic: true,
      size: 10,
      color: { argb: 'FF666666' },
    };
    for (let i = 1; i <= 7; i++) {
      sheet.getRow(cr).getCell(i).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE6F0FA' },
      };
    }

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=missing_results_${Date.now()}.xlsx`,
    );
    await workbook.xlsx.write(res);
    res.end();
  }

  //grading system related

  async getGradingSystem() {
    const system = await this.gradingSystemRepo.find({
      order: { maxGPA: 'DESC' },
      select: ['id', 'minGPA', 'maxGPA', 'grade', 'remarks', 'createdAt'],
    });
    return { data: system };
  }

  async addGradingSystem(dto: CreateGradingSystemDto): Promise<Boolean> {
    await this.gradingSystemRepo.deleteAll();
    const gradingSystem = this.gradingSystemRepo.create(dto.gradeRanges);
    this.gradingSystemRepo.save(gradingSystem);
    return true;
  }

  private calculateGPA(percentage: number): number {
    return Number((percentage / 25).toFixed(2));
  }

  private async calculateGrade(gpa: number): Promise<string> {
    const gradingSystem = await this.gradingSystemRepo
      .createQueryBuilder('grade')
      .where(':gpa BETWEEN grade.minGPA AND grade.maxGPA', { gpa })
      .getOne();
    return gradingSystem?.grade ?? 'F';
  }

  async getClassResults(dto: GetClassResultsDto) {
    const {
      programId,
      semester,
      examTerm = ExamTerm.FINAL,
      page = 1,
      limit = 20,
      search,
    } = dto;

    const sortMap: Record<string, string> = {
      gpa: 'pr.gpa',
      percentage: 'pr.percentage',
      rollNumber: 'student.roll_no',
      name: 'student.first_name',
    };

    const qb = this.publishedResultRepo
      .createQueryBuilder('pr')
      // ─── JOIN only active students AND match result to their current semester
      .innerJoin(
        'pr.student',
        'student',
        'student.status NOT IN (:...excluded) AND pr.semester = student.current_semester',
        { excluded: [StudentStatus.PASSED, StudentStatus.SUSPENDED] },
      )
      .select([
        'pr.id                       AS id',
        'pr.studentId                AS studentId',
        'pr.semester                 AS semester',
        'pr.examTerm                 AS examTerm',
        'pr.totalObtained            AS totalObtained',
        'pr.totalFull                AS totalFull',
        'pr.percentage               AS percentage',
        'pr.gpa                      AS gpa',
        'pr.subjectBreakdown         AS subjectBreakdown',
        'pr.publishedAt              AS publishedAt',
        'pr.programId                As programId',
        'student.firstName           AS firstName',
        'student.lastName            AS lastName',
        'student.rollNumber          AS rollNumber',
        'student.registrationNumber  AS registrationNumber',
        'student.currentSemester     AS currentSemester',
      ]);

    // ─── OPTIONAL FILTERS (all andWhere so join condition is never overridden)
    if (programId) qb.andWhere('pr.programId = :programId', { programId });
    if (semester) qb.andWhere('pr.semester = :semester', { semester });
    if (examTerm) qb.andWhere('pr.examTerm = :examTerm', { examTerm });

    // ─── SEARCH: roll number, registration number, full name
    if (search?.trim()) {
      const term = `%${search.trim()}%`;
      qb.andWhere(
        `(
          student.roll_no         LIKE :term OR
          student.registration_no LIKE :term OR
          CONCAT(student.first_name, ' ', student.last_name) LIKE :term
        )`,
        { term },
      );
    }

    // ─── ORDER: FINAL before SECOND before FIRST, then by roll number
    qb.orderBy(
      `CASE WHEN pr.examTerm = '${ExamTerm.FINAL}' THEN 0 WHEN pr.examTerm = '${ExamTerm.SECOND}' THEN 1 ELSE 2 END`,
      'ASC',
    ).addOrderBy(sortMap['rollNumber'] ?? 'student.roll_no', 'ASC');

    const total = await qb.getCount();

    const raw = await qb
      .offset((page - 1) * limit)
      .limit(limit)
      .getRawMany();

    return {
      data: raw.map((r) => ({
        studentId: Number(r.studentId),
        firstName: r.firstName,
        lastName: r.lastName,
        rollNumber: r.rollNumber,
        registrationNumber: r.registrationNumber,
        currentSemester: r.currentSemester,
        semester: Number(r.semester),
        programId: Number(r.programId),
        examTerm: r.examTerm,
        totalObtained: Number(r.totalObtained),
        totalFull: Number(r.totalFull),
        percentage: Number(r.percentage),
        gpa: Number(r.gpa),
        publishedAt: r.publishedAt,
        subjectBreakdown: r.subjectBreakdown,
      })),

      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      // ...(programId ? { programId } : {}),
      // ...(semester ? { semester } : {}),
      // ...(examTerm ? { examTerm } : {}),
    };
  }

  async getClassSemesterSummary(programId: number, examTerm: ExamTerm) {
    const rows = await this.publishedResultRepo
      .createQueryBuilder('pr')
      .select('pr.semester', 'semester')
      .addSelect('pr.examTerm', 'examTerm')
      .addSelect('COUNT(pr.id)', 'totalStudents')
      .addSelect('ROUND(AVG(pr.gpa), 2)', 'avgGpa')
      .addSelect('ROUND(AVG(pr.percentage), 2)', 'avgPercentage')
      .addSelect('MAX(pr.gpa)', 'topGpa')
      .addSelect('MIN(pr.percentage)', 'lowestPercentage')
      .addSelect(
        `SUM(CASE WHEN pr.percentage >= 60 THEN 1 ELSE 0 END)`,
        'passCount',
      )
      .where('pr.programId = :programId', { programId })
      .andWhere('pr.examTerm = :examTerm', { examTerm })
      .groupBy('pr.semester')
      .addGroupBy('pr.examTerm')
      .orderBy('pr.semester', 'ASC')
      .getRawMany();

    return rows.map((r) => ({
      semester: Number(r.semester),
      examTerm: r.examTerm,
      totalStudents: Number(r.totalStudents),
      avgGpa: Number(r.avgGpa),
      avgPercentage: Number(r.avgPercentage),
      topGpa: Number(r.topGpa),
      lowestPercentage: Number(r.lowestPercentage),
      passCount: Number(r.passCount),
      failCount: Number(r.totalStudents) - Number(r.passCount),
    }));
  }

  async generateGradeSheet(
    dto: GradeSheetQueryDto,
    res: Response,
  ): Promise<void> {
    // 1. Fetch student

    const { studentId, semester, examTerm } = dto;
    const student = await this.studentService.findStudentById(studentId);
    if (!student)
      throw new NotFoundException({
        success: false,
        statusCode: 404,
        message: 'Student does not exist.',
      });

    // 2. Fetch published result
    const result = await this.publishedResultRepo.findOne({
      where: { studentId, semester, examTerm },
    });
    if (!result)
      throw new NotFoundException({
        success: false,
        statusCode: 404,
        message: 'Published result not found for the given semester and term.',
      });

    // 3. Build PDF
    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ margin: 50, size: 'A4' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=gradesheet_${student.rollNumber ?? studentId}_sem${semester}_${examTerm}.pdf`,
    );
    doc.pipe(res);

    const pageWidth = doc.page.width - 100; // left+right margin = 100
    const LEFT = 50;

    const drawHRule = (y: number, color = '#CCCCCC') => {
      doc
        .moveTo(LEFT, y)
        .lineTo(LEFT + pageWidth, y)
        .strokeColor(color)
        .lineWidth(0.5)
        .stroke();
    };

    const examNameMap: Record<string, string> = {
      [ExamTerm.FIRST]: 'First Term Examination',
      [ExamTerm.SECOND]: 'Second Term Examination',
      [ExamTerm.FINAL]: 'Final Result (Combined)',
    };

    doc
      .fontSize(18)
      .font('Helvetica-Bold')
      .fillColor('#1a1a2e')
      .text('RESULT MANAGEMENT SYSTEM', { align: 'center' });

    doc
      .fontSize(11)
      .font('Helvetica')
      .fillColor('#555555')
      .text('Official Academic Grade Sheet', { align: 'center' });

    doc.moveDown(0.4);
    drawHRule(doc.y, '#1a1a2e');
    doc.moveDown(0.8);

    doc
      .fontSize(13)
      .font('Helvetica-Bold')
      .fillColor('#000000')
      .text(examNameMap[examTerm!] ?? examTerm, { align: 'center' });

    doc
      .fontSize(10)
      .font('Helvetica')
      .fillColor('#555555')
      .text(`Semester ${semester}`, { align: 'center' });

    doc.moveDown(1);

    const infoY = doc.y;

    doc.rect(LEFT, infoY, pageWidth, 130).fillColor('#F8F9FA').fill();

    doc
      .rect(LEFT, infoY, pageWidth, 130)
      .strokeColor('#DDDDDD')
      .lineWidth(0.8)
      .stroke();

    // Section label
    doc
      .fontSize(9)
      .font('Helvetica-Bold')
      .fillColor('#888888')
      .text('STUDENT INFORMATION', LEFT + 12, infoY + 10);

    // Two-column layout for student details
    const colLeft = LEFT + 12;
    const colRight = LEFT + pageWidth / 2 + 10;
    let infoRowY = infoY + 26;
    const rowGap = 18;

    const infoField = (label: string, value: string, x: number, y: number) => {
      doc
        .fontSize(8.5)
        .font('Helvetica-Bold')
        .fillColor('#555555')
        .text(`${label}:`, x, y, { continued: false });

      doc
        .fontSize(8.5)
        .font('Helvetica')
        .fillColor('#1a1a1a')
        .text(value || '—', x + 105, y, { width: pageWidth / 2 - 115 });
    };

    // Left column
    infoField(
      'Full Name',
      `${student.firstName ?? ''} ${student.lastName ?? ''}`.trim(),
      colLeft,
      infoRowY,
    );
    infoField(
      'Roll Number',
      student.rollNumber ?? '—',
      colLeft,
      infoRowY + rowGap,
    );
    infoField(
      'Registration No',
      student.registrationNumber ?? '—',
      colLeft,
      infoRowY + rowGap * 2,
    );
    infoField('Email', student.email ?? '—', colLeft, infoRowY + rowGap * 3);

    // Right column
    infoField('Semester', `Semester ${semester}`, colRight, infoRowY);
    infoField(
      'Exam Term',
      examNameMap[examTerm!] ?? examTerm,
      colRight,
      infoRowY + rowGap,
    );
    infoField(
      'Address',
      student.address1 ?? '—',
      colRight,
      infoRowY + rowGap * 2,
    );
    // infoField(
    //   'Published By',
    //   result.publishedBy ?? '—',
    //   colRight,
    //   infoRowY + rowGap * 3,
    // );

    doc.y = infoY + 138;
    doc.moveDown(1);

    // ─── SUBJECT MARKS TABLE ──────────────────────────────────────────────────
    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .fillColor('#1a1a1a')
      .text('SUBJECT-WISE MARKS', LEFT);

    doc.moveDown(0.5);

    const tableTop = doc.y;
    const colWidths = {
      code: 70,
      name: 185,
      written: 80,
      practical: 85,
      total: 70,
      grade: 55,
      gpa: 0, // fills remaining
    };
    colWidths.gpa =
      pageWidth - Object.values(colWidths).reduce((a, b) => a + b, 0);

    const cols = {
      code: LEFT,
      name: LEFT + colWidths.code,
      written: LEFT + colWidths.code + colWidths.name,
      practical: LEFT + colWidths.code + colWidths.name + colWidths.written,
      total:
        LEFT +
        colWidths.code +
        colWidths.name +
        colWidths.written +
        colWidths.practical,
      grade:
        LEFT +
        colWidths.code +
        colWidths.name +
        colWidths.written +
        colWidths.practical +
        colWidths.total,
      gpa:
        LEFT +
        colWidths.code +
        colWidths.name +
        colWidths.written +
        colWidths.practical +
        colWidths.total +
        colWidths.grade,
    };

    const HEADER_H = 22;

    // Table header background
    doc.rect(LEFT, tableTop, pageWidth, HEADER_H).fillColor('#2C3E50').fill();

    // Header labels
    const headerStyle = () =>
      doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#FFFFFF');

    const drawHeaderCell = (text: string, x: number, width: number) => {
      headerStyle().text(text, x + 5, tableTop + 7, {
        width: width - 10,
        align: 'center',
      });
    };

    drawHeaderCell('Code', cols.code, colWidths.code);
    drawHeaderCell('Subject Name', cols.name, colWidths.name);
    drawHeaderCell('Written (/50)', cols.written, colWidths.written);
    drawHeaderCell('Practical (/50)', cols.practical, colWidths.practical);
    drawHeaderCell('Total (/100)', cols.total, colWidths.total);
    drawHeaderCell('Grade', cols.grade, colWidths.grade);
    drawHeaderCell('GPA', cols.gpa, colWidths.gpa);

    let rowY = tableTop + HEADER_H;
    const ROW_H = 22;

    // Data rows
    result.subjectBreakdown.forEach((subject: any, idx: number) => {
      const isEven = idx % 2 === 0;
      const subjectGpa = this.calculateGPA(subject.finalMarkOutOf100);

      // Row background
      doc
        .rect(LEFT, rowY, pageWidth, ROW_H)
        .fillColor(isEven ? '#FFFFFF' : '#F6F8FA')
        .fill();

      const cellText = (
        text: string,
        x: number,
        width: number,
        bold = false,
        align: 'left' | 'center' | 'right' = 'center',
      ) => {
        doc
          .fontSize(8.5)
          .font(bold ? 'Helvetica-Bold' : 'Helvetica')
          .fillColor('#1a1a1a')
          .text(String(text ?? '—'), x + 5, rowY + 7, {
            width: width - 10,
            align,
          });
      };

      cellText(subject.subjectCode, cols.code, colWidths.code, true, 'center');
      cellText(subject.subjectName, cols.name, colWidths.name, false, 'left');
      cellText(
        subject.subjectObtainedOutOf50?.toFixed(2),
        cols.written,
        colWidths.written,
      );
      cellText(
        subject.extraParamObtainedOutOf50?.toFixed(2),
        cols.practical,
        colWidths.practical,
      );
      cellText(
        subject.finalMarkOutOf100?.toFixed(2),
        cols.total,
        colWidths.total,
        true,
      );
      cellText(subject.grade, cols.grade, colWidths.grade, true);
      cellText(subjectGpa.toFixed(2), cols.gpa, colWidths.gpa, true);

      // Row bottom border
      doc
        .moveTo(LEFT, rowY + ROW_H)
        .lineTo(LEFT + pageWidth, rowY + ROW_H)
        .strokeColor('#E5E7EB')
        .lineWidth(0.3)
        .stroke();

      // Vertical dividers
      [
        cols.name,
        cols.written,
        cols.practical,
        cols.total,
        cols.grade,
        cols.gpa,
        LEFT + pageWidth,
      ].forEach((x) => {
        doc
          .moveTo(x, tableTop)
          .lineTo(x, rowY + ROW_H)
          .strokeColor('#E5E7EB')
          .lineWidth(0.3)
          .stroke();
      });

      rowY += ROW_H;
    });

    // Table outer border
    doc
      .rect(LEFT, tableTop, pageWidth, rowY - tableTop)
      .strokeColor('#CCCCCC')
      .lineWidth(0.8)
      .stroke();

    doc.y = rowY;
    doc.moveDown(1.2);

    // ─── SUMMARY BLOCK ────────────────────────────────────────────────────────
    const summaryY = doc.y;
    const summaryW = 210;
    const summaryX = LEFT + pageWidth - summaryW;

    doc.rect(summaryX, summaryY, summaryW, 88).fillColor('#F0F4F8').fill();

    doc
      .rect(summaryX, summaryY, summaryW, 88)
      .strokeColor('#CCCCCC')
      .lineWidth(0.8)
      .stroke();

    doc
      .fontSize(9)
      .font('Helvetica-Bold')
      .fillColor('#888888')
      .text('RESULT SUMMARY', summaryX + 10, summaryY + 8);

    const summaryRow = (label: string, value: string, y: number) => {
      doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor('#555555')
        .text(label, summaryX + 10, y);
      doc
        .fontSize(9)
        .font('Helvetica-Bold')
        .fillColor('#1a1a1a')
        .text(value, summaryX + 10, y, {
          align: 'right',
          width: summaryW - 20,
        });
    };

    summaryRow(
      'Total Marks:',
      `${result.totalObtained} / ${result.totalFull}`,
      summaryY + 26,
    );
    summaryRow('Percentage:', `${result.percentage}%`, summaryY + 44);
    summaryRow(
      'GPA:',
      `${Number(result.gpa).toFixed(2)} / 4.00`,
      summaryY + 62,
    );

    // Overall grade on the left
    doc
      .fontSize(9)
      .font('Helvetica')
      .fillColor('#555555')
      .text('Overall Grade:', LEFT, summaryY + 26);

    const overallGpa = Number(result.gpa);
    const overallGrade =
      result.subjectBreakdown?.length > 0
        ? (result.subjectBreakdown[0]?.grade ?? '—')
        : '—';

    doc
      .fontSize(28)
      .font('Helvetica-Bold')
      .fillColor('#1a1a2e')
      .text(overallGrade, LEFT, summaryY + 38, { width: 80, align: 'left' });

    doc.y = summaryY + 96;
    doc.moveDown(1.5);

    // ─── FOOTER ───────────────────────────────────────────────────────────────
    drawHRule(doc.y, '#AAAAAA');
    doc.moveDown(0.5);

    const now = new Date();
    doc
      .fontSize(8)
      .font('Helvetica')
      .fillColor('#888888')
      .text(
        `Generated on: ${now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}  |  This is a system-generated document.`,
        { align: 'center' },
      );

    doc.end();
  }
}
