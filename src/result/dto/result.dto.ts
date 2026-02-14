import { Type } from 'class-transformer';
import { IsNotEmpty } from 'class-validator';

export class ResultDto {
  @IsNotEmpty({ message: 'Student Id is required.' })
  @Type(() => Number)
  studentId: number;
}
