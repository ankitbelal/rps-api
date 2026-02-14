import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ExtraParametersMarks } from 'src/database/entities/extra-parameters-marks.entity';
import { StudentSubjectMarks } from 'src/database/entities/student-marks.entity';
import { Repository } from 'typeorm';
import { AddMarksDTO, MarkFetchQueryDto } from './dto/marks.dto';
import { SubjectService } from 'src/subject/subject.service';
import { StudentService } from 'src/student/student.service';
import { ResultDto } from './dto/result.dto';
import { SubjectInternalResponse } from 'src/subject/interfaces/subject.interface';

@Injectable()
export class ResultService {
  public constructor(
    @InjectRepository(StudentSubjectMarks)
    private readonly studentSubjectMarks: Repository<StudentSubjectMarks>,

    @InjectRepository(ExtraParametersMarks)
    private readonly extraParametersMarks: Repository<ExtraParametersMarks>,

    private readonly subjectService: SubjectService,
    private readonly studentService: StudentService,
  ) {}

  async getMarks(
    markFetchQueryDto: MarkFetchQueryDto,
  ): Promise<{ data: StudentSubjectMarks[] }> {
    const { studentId, semester, examTerm } = markFetchQueryDto;

    const query = this.studentSubjectMarks
      .createQueryBuilder('sm')
      .where('sm.student_id = :studentId', { studentId });

    const query2 = await this.extraParametersMarks
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

  async getFinalizedResult(resultDto: ResultDto) {
    const student = await this.studentService.findStudentById(
      resultDto.studentId,
    );
    if (!student)
      throw new NotFoundException(
        `Student with id: ${resultDto.studentId} does not exists.`,
      );

    const programId = student.programId;

    const allSemesterSubjects: SubjectInternalResponse[] =
      await this.subjectService.getSubjectsInternal({ programId });

    const result = await this.getMarks({ studentId: resultDto.studentId });
    return { result };

    //fetch all subjects that belong to particular student ->programID , using currentSemester ---
    //fetch all marks below the currentsemester

    //semesters is get from the

    /*response:[
    {
      semester:1,
      obtained:12,
      total:100,
      math: 80,
      science:12,
      gpa: 2.5
      createdAt:first term any result date ---differentiate date by fall or spring
    },

    ]



    now in the result service, there is method called getFinalizedResult, also there is commented code to get the result as required so , implement so that i can get result like that,  and formula to get is is  in the studentmarks table there is total mark , and obtained marks, and in extra param mark there is also obtained and total for each subject. by combining both the obtained should be out of 100 combining all the extra parameter marks and actual subject obtained marks. 


note the  extra parameter marks contain 50 weight no matter how many parameters are assigned, and obtained will have 50 as full, so 

if 1 subject have 5 param then 





one more addition, we should enforce only the eval param that wil give the 50 marks as total no more, and the rest 50 marks is given by the subject marks table, so 


    
    */

    return {};
  }
}
