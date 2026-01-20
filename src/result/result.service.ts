import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ExtraParametersMarks } from 'src/database/entities/extra-parameters-marks.entity';
import {
  ExamTerm,
  StudentSubjectMarks,
} from 'src/database/entities/student-marks.entity';
import { Repository } from 'typeorm';
import { markFetchData } from './interfaces/marks.interface';

@Injectable()
export class ResultService {
  public constructor(
    @InjectRepository(StudentSubjectMarks)
    private readonly studentSubjectMarks: Repository<StudentSubjectMarks>,

    @InjectRepository(ExtraParametersMarks)
    private readonly extraParametersMarks: Repository<ExtraParametersMarks>,
  ) {}

  async getMarks(markFetchData: markFetchData) {
    const { studentId, semester, subjectId, examTerm } = markFetchData;
    const query = this.studentSubjectMarks
      .createQueryBuilder('sm')
      .where('sm.student_id = :studentId ', { studentId: studentId })
      .andWhere('sm.semester = :semester', { semester: semester })
      .andWhere('sm.subject_id IN(:...ids)', { ids: subjectId })
      .andWhere('sm.exam_term = :examTerm', { examTerm: examTerm })
      .leftJoin('sm.extraParametersMarks', 'ep')
      .select([
        'sm.id',
        'sm.examTerm',
        'sm.semester',
        'sm.subjectId',
        'sm.obtainedMarks',
        'sm.fullMarks',
        'ep.id',
        'ep.studentSubjectMarksId',
        'ep.subjectEvaluationParametersId',
        'ep.marks',
      ]);
    return await query.getMany();
  }
}
