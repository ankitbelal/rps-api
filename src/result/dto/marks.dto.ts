import { Type } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsOptional } from 'class-validator';
import { ExamTerm } from 'src/database/entities/student-marks.entity';

export class MarkFetchQueryDto {
  @IsNotEmpty({ message: 'Student is required.' })
  @Type(() => Number)
  studentId?: number;

  @IsOptional()
  semester?: number;

  @IsOptional()
  @IsEnum(ExamTerm, { message: 'Exam term must be a valid.' })
  examTerm?: ExamTerm;
}
