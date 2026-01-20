import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ExtraParametersMarks } from 'src/database/entities/extra-parameters-marks.entity';
import { StudentSubjectMarks } from 'src/database/entities/student-marks.entity';
import { Repository } from 'typeorm';

@Injectable()
export class ResultService {
  public constructor(
    @InjectRepository(StudentSubjectMarks)
    private readonly studentSubjectMarks: Repository<StudentSubjectMarks>,

    @InjectRepository(ExtraParametersMarks)
    private readonly extraParametersMarks: Repository<ExtraParametersMarks>,
  ) {}
  
  
}
