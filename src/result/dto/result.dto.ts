import { Type } from 'class-transformer';
import { IsNotEmpty, IsOptional } from 'class-validator';
import { ExamTerm } from 'utils/enums/general-enums';

export class ResultDto {
  @IsNotEmpty({ message: 'Student Id is required.' })
  @Type(() => Number)
  studentId: number;
}

export class TopStudentQueryDto {
  @IsOptional()
  @Type(() => Number)
  programId?: number;

  @IsOptional()
  examTerm?: ExamTerm = ExamTerm.FINAL;
}
