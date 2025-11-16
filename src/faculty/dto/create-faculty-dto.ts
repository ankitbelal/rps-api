import { Type } from 'class-transformer';
import { IsNotEmpty, IsOptional } from 'class-validator';

export class CreateFacultyDto {
  @IsNotEmpty({ message: 'Faculty Name is required' })
  name: string;

  @IsOptional()
  description: string;
}
