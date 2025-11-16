import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import { IsOptional } from 'class-validator';
import { CreateFacultyDto } from './create-faculty-dto';

export class UpdateFacultyDto extends PartialType(CreateFacultyDto){
  @IsOptional()
  name: string;

  @IsOptional()
  @Type(() => Text)
  description: string;
}
