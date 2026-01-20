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
          ep.subjectId === subject.subjectId
          // ep.semester === subject.semester &&
          // ep.examTerm === subject.examTerm,
      ),
    }));

    return { data: merged };
  }

  async addMarks(addMarksDto: AddMarksDTO): Promise<boolean> {
    const { studentId, semester, examTerm, marks } = addMarksDto;
    const toInsert: Partial<StudentSubjectMarks>[] = [];
    return true;
  }
}
