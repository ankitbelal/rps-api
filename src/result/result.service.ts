import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ExtraParametersMarks } from 'src/database/entities/extra-parameters-marks.entity';
import { StudentSubjectMarks } from 'src/database/entities/student-marks.entity';
import { Repository } from 'typeorm';
import { AddMarksDTO, MarkFetchQueryDto } from './dto/marks.dto';
import { SubjectService } from 'src/subject/subject.service';
import { StudentService } from 'src/student/student.service';
import { ExamTerm } from 'utils/enums/general-enums';
import { PublishedResult } from 'src/database/entities/published-result.entity';
import { StudentQueryDto } from 'src/student/dto/create-student.dto';
import { UserService } from 'src/user/user.service';

@Injectable()
export class ResultService {
  public constructor(
    @InjectRepository(StudentSubjectMarks)
    private readonly studentSubjectMarks: Repository<StudentSubjectMarks>,

    @InjectRepository(ExtraParametersMarks)
    private readonly extraParametersMarks: Repository<ExtraParametersMarks>,

    @InjectRepository(PublishedResult)
    private readonly publishedResultRepo: Repository<PublishedResult>,

    private readonly subjectService: SubjectService,
    private readonly studentService: StudentService,
    private readonly userService: UserService,
  ) {}

  async getMarks(
    markFetchQueryDto: MarkFetchQueryDto,
  ): Promise<{ data: StudentSubjectMarks[] }> {
    const { studentId, semester, examTerm } = markFetchQueryDto;

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

  private calculateGPA(percentage: number): number {
    if (percentage >= 90) return 4.0;
    if (percentage >= 80) return 3.7;
    if (percentage >= 70) return 3.3;
    if (percentage >= 60) return 3.0;
    if (percentage >= 50) return 2.0;
    if (percentage >= 40) return 1.0;
    return 0.0;
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

      const extraObtained = subjectExtraMarks.reduce(
        (sum, ep) => sum + Number(ep.obtainedMarks),
        0,
      );

      const finalMarkOutOf100 = subjectObtainedOutOf50 + extraObtained;

      subjectBreakdown.push({
        subjectId: subject.id!,
        subjectName: subject.name!,
        subjectCode: subject.code!,
        subjectObtainedOutOf50: parseFloat(subjectObtainedOutOf50.toFixed(2)),
        extraParamObtainedOutOf50: parseFloat(extraObtained.toFixed(2)),
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

  // ─── PUBLISH SINGLE ─────────────────────────────────────────
  async publishSingle(
    studentId: number,
    semester: number,
    examTerm: ExamTerm,
    publishedBy: number,
  ): Promise<boolean> {
    const student = await this.studentService.findStudentById(studentId);
    if (!student)
      throw new NotFoundException(
        `Student with id: ${studentId} does not exist.`,
      );

    const calculated = await this.calculateResult(
      studentId,
      student.programId,
      semester,
      examTerm,
    );

    await this.publishedResultRepo.upsert(
      {
        studentId,
        programId: student.programId,
        semester,
        examTerm,
        publishedBy: await this.getUserName(publishedBy),
        ...calculated,
      },
      ['studentId', 'semester', 'examTerm'],
    );

    return true;
  }

  // ─── PUBLISH BULK ────────────────────────────────────────────
  async publishBulk(
    programId: number,
    semester: number,
    examTerm: ExamTerm,
    publishedBy: number, // ← add
  ): Promise<boolean> {
    const students = await this.studentService.findAll({
      programId: programId,
      currentSemester: semester,
      limit: 1000,
    });

    for (const student of students.data) {
      try {
        await this.publishSingle(student.id, semester, examTerm, publishedBy);
      } catch (e) {}
    }

    return true;
  }

  // ─── FINALIZE SINGLE ─────────────────────────────────────────
  async finalizeSingle(
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
      throw new NotFoundException(
        `First term result not published yet for student: ${studentId}`,
      );

    if (!secondTerm)
      throw new NotFoundException(
        `Second term result not published yet for student: ${studentId}`,
      );

    const finalPercentage = parseFloat(
      ((firstTerm.percentage + secondTerm.percentage) / 2).toFixed(2),
    );
    const finalTotalObtained = parseFloat(
      ((firstTerm.totalObtained + secondTerm.totalObtained) / 2).toFixed(2),
    );
    const finalTotalFull = firstTerm.totalFull;

    const subjectBreakdown = firstTerm.subjectBreakdown.map((fs) => {
      const ss = secondTerm.subjectBreakdown.find(
        (s) => s.subjectId === fs.subjectId,
      );
      return {
        subjectId: fs.subjectId,
        subjectName: fs.subjectName,
        subjectCode: fs.subjectCode,
        firstTermMark: fs.finalMarkOutOf100,
        secondTermMark: ss?.finalMarkOutOf100 ?? 0,
        finalMarkOutOf100: parseFloat(
          ((fs.finalMarkOutOf100 + (ss?.finalMarkOutOf100 ?? 0)) / 2).toFixed(
            2,
          ),
        ),
        subjectObtainedOutOf50: fs.subjectObtainedOutOf50,
        extraParamObtainedOutOf50: fs.extraParamObtainedOutOf50,
      };
    });

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

  // ─── FINALIZE BULK ───────────────────────────────────────────
  async finalizeBulk(
    programId: number,
    semester: number,
    publishedBy: number, // ← add
  ): Promise<boolean> {
    const studentFetchData: StudentQueryDto = {
      programId: programId,
      currentSemester: semester,
      page: 1,
      limit: 10000,
    };
    const students = await this.studentService.findAll(studentFetchData);

    for (const student of students.data) {
      try {
        await this.finalizeSingle(student.id, semester, publishedBy);
      } catch (e) {}
    }

    return true;
  }

  // ─── GET PUBLISHED RESULT ────────────────────────────────────────────

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
}
