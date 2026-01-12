import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsNotEmpty,
  IsOptional,
  ValidateNested,
} from 'class-validator';

export class AssignSubjectEvaluationParamsDto {
  @IsNotEmpty({ message: 'Subject is required.' })
  subjectId: number;

  @ArrayNotEmpty({
    message: 'Please assign at least one evaluation parameter to proceed.',
  })
  @ValidateNested({ each: true })
  @Type(() => ParameterDto)
  parameters: ParameterDto[];
}

export class ParameterDto {
  @IsNotEmpty({ message: 'Evaluation parameter is required.' })
  evaluationParameterId: number;

  @IsNotEmpty({ message: 'Weight is required.' })
  weight: number;

  @IsOptional()
  assigned: number;
}
