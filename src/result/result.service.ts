import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ExtraParametersMarks } from 'src/database/entities/extra-parameters-marks.entity';
import {
  ExamTerm,
  StudentSubjectMarks,
} from 'src/database/entities/student-marks.entity';
import { Repository } from 'typeorm';
import { markFetchData } from './interfaces/marks.interface';
import { MarkFetchQueryDto } from './dto/marks.dto';

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
    const query = this.studentSubjectMarks
      .createQueryBuilder('sm')
      .where('sm.student_id = :studentId ', { studentId: studentId })
      .andWhere('sm.semester = :semester', { semester: semester })
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
    const result = await query.getMany();
    return { data: result };
  }
}
