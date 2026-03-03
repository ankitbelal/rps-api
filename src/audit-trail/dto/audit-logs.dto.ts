import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsNumber, IsOptional } from 'class-validator';
import { LogType } from 'utils/enums/general-enums';

export class AuditLogQueryDto {
  @IsOptional()
  @IsEnum(LogType, { message: 'Type must be valid.' })
  type?: LogType = LogType.MIXED;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number = 10;

  @IsOptional()
  userId?: number;

  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: 'DOB must be a valid date.' })
  dateFrom?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: 'DOB must be a valid date.' })
  dateTo?: Date;
}
