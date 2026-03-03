import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
} from 'class-validator';
import { NoticeType, NoticeUserType } from 'utils/enums/general-enums';

export class SingleNoticeDto {
  @IsNotEmpty({ message: 'Subject is required.' })
  subject: string;

  @IsNotEmpty({ message: 'Descriptioin is required.' })
  description: string;
  
  @IsNotEmpty({ message: 'Recipient user type is required.' })
  @IsEnum(NoticeUserType, { message: 'Recipient user type must be valid.' })
  recipientType: NoticeUserType;

  @IsNotEmpty({ message: 'Receipent is required.' })
  recipientId: number;

  @IsOptional()
  publisherType?: NoticeUserType;

  @IsOptional()
  publisherId?: number;

  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: 'DOB must be a valid date.' })
  expiredAt?: Date;

  @IsOptional()
  @Type(() => Boolean)
  sendEmail?: boolean;

  @IsOptional()
  email?: string;
}

export class NoticeQueryDto {
  @IsOptional()
  @IsEnum(NoticeType, { message: 'Notice type must be valid.' })
  type?: NoticeType;

  @IsOptional()
  userId: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number = 10;
}
