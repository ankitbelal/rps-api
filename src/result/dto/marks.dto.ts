import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { ExamTerm } from 'utils/enums/general-enums';
export class MarkFetchQueryDto {
  @IsNotEmpty({ message: 'Student is required.' })
  @Type(() => Number)
  studentId?: number;

  @IsOptional()
  semester?: number;

  @IsOptional()
  @IsEnum(ExamTerm, { message: 'Exam term must be a valid.' })
  examTerm?: ExamTerm;

  @IsOptional()
  @Type(() => Number)
  userId?: number;
}

export class AddMarksDTO {
  @IsNotEmpty({ message: 'Exam term should be specified.' })
  @IsEnum(ExamTerm, { message: 'Exam term must be a valid.' })
  examTerm: ExamTerm;

  @IsNotEmpty({ message: 'Student is required.' })
  studentId: number;

  @IsNotEmpty({ message: 'Semester should be specified.' })
  semester: number;

  @ValidateNested({ each: true })
  @Type(() => SubjectMarkDTO)
  marks: SubjectMarkDTO[];
}

export class SubjectMarkDTO {
  @IsNotEmpty({ message: 'Subject ID is required.' })
  @IsNumber({}, { message: 'Subject ID must be a number.' })
  subjectId: number;

  @IsOptional()
  @IsNumber({}, { message: 'Obtained marks must be a number.' })
  obtainedMarks?: number;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ParameterMarkDTO)
  parameters?: ParameterMarkDTO[];
}

export class ParameterMarkDTO {
  @IsNotEmpty({ message: 'Parameter ID is required.' })
  @IsNumber({}, { message: 'Parameter ID must be a number.' })
  parameterId: number;

  @IsNotEmpty({ message: 'Mark is required.' })
  @IsNumber({}, { message: 'Mark must be a number.' })
  mark: number;
}
