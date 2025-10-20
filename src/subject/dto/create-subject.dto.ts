import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber } from 'class-validator';

export class CreateSubjectDto {
  @IsNotEmpty({ message: 'subject name is required' })
  name: string;

  @IsNotEmpty({ message: 'subject code is required' })
  code: string;

  @IsNotEmpty({ message: 'credits is required' })
  @IsNumber()
  @Type(() => Number)
  credits: number;

  @IsNotEmpty({ message: 'semester is required' })
  @IsNumber()
  @Type(() => Number)
  semester: number;

  @IsNotEmpty({ message: 'type is required' })
  type: string;

  @IsNotEmpty({ message: 'programId is required' })
  @IsNumber()
  @Type(() => Number)
  programId: number;
}
