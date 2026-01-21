import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ExtraParametersMarks } from 'src/database/entities/extra-parameters-marks.entity';
import { StudentSubjectMarks } from 'src/database/entities/student-marks.entity';
import { Repository } from 'typeorm';
import { AddMarksDTO, MarkFetchQueryDto } from './dto/marks.dto';

@Injectable()
export class ResultService {
  public constructor(
    @InjectRepository(StudentSubjectMarks)
    private readonly studentSubjectMarks: Repository<StudentSubjectMarks>,

    @InjectRepository(ExtraParametersMarks)
    private readonly extraParametersMarks: Repository<ExtraParametersMarks>,
  ) {}

  async getMarks(
    markFetchQueryDto: MarkFetchQueryDto,
  ): Promise<{ data: StudentSubjectMarks[] }> {
    const { studentId, semester, examTerm } = markFetchQueryDto;

    const subjectMarks = await this.studentSubjectMarks
      .createQueryBuilder('sm')
      .where('sm.student_id = :studentId', { studentId })
      .andWhere('sm.semester = :semester', { semester })
      .andWhere('sm.exam_term = :examTerm', { examTerm })
      .select([
        'sm.id',
        'sm.studentId',
        'sm.subjectId',
        'sm.examTerm',
        'sm.semester',
        'sm.obtainedMarks',
        'sm.fullMarks',
        'sm.createdAt',
      ])
      .getMany();

    const extraMarks = await this.extraParametersMarks
      .createQueryBuilder('ep')
      .where('ep.student_id = :studentId', { studentId })
      .andWhere('ep.semester = :semester', { semester })
      .andWhere('ep.exam_term = :examTerm', { examTerm })
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
      .getMany();

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

  // async addMarks(addMarksDto: AddMarksDTO): Promise<boolean> {
  //   const { studentId, semester, examTerm, marks } = addMarksDto;
  //   await Promise.all(
  //     marks.map(async (subject) => {
  //       let subjectMarks = await this.studentSubjectMarks.findOne({
  //         where: {
  //           studentId,
  //           semester,
  //           examTerm,
  //           subjectId: subject.subjectId,
  //         },
  //       });
  //       if (!subjectMarks) {
  //         subjectMarks = this.studentSubjectMarks.create({
  //           studentId,
  //           semester,
  //           examTerm,
  //           subjectId: subject.subjectId,
  //           obtainedMarks: subject.obtainedMarks,
  //         });
  //       } else {
  //         subjectMarks.obtainedMarks = subject.obtainedMarks!;
  //       }

  //       await this.studentSubjectMarks.save(subjectMarks);

  //       if (subject.parameters?.length) {
  //         await Promise.all(
  //           subject.parameters.map(async (param) => {
  //             let extra = await this.extraParametersMarks.findOne({
  //               where: {
  //                 studentId,
  //                 semester,
  //                 examTerm,
  //                 subjectId: subject.subjectId,
  //                 evaluationParameterId: param.parameterId,
  //               },
  //             });

  //             if (!extra) {
  //               extra = this.extraParametersMarks.create({
  //                 studentId,
  //                 semester,
  //                 examTerm,
  //                 subjectId: subject.subjectId,
  //                 evaluationParameterId: param.parameterId,
  //                 obtainedMarks: param.mark,
  //               });
  //             } else {
  //               extra.obtainedMarks = param.mark;
  //             }

  //             await this.extraParametersMarks.save(extra);
  //           }),
  //         );
  //       }
  //     }),
  //   );
  //   return true;
  // }

  async addMarks(addMarksDto: AddMarksDTO) {
    const { studentId, semester, examTerm, marks } = addMarksDto;

    const [existingSubjectMarks, existingExtraMarks] = await Promise.all([
      await this.studentSubjectMarks.find({
        where: { studentId, semester, examTerm },
      }),
      await this.extraParametersMarks.find({
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
}
