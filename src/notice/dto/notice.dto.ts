import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  ValidateIf,
} from 'class-validator';
import { NoticeUserType } from 'utils/enums/general-enums';

import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

export class SingleNoticeDto {
  @IsNotEmpty({ message: 'Subject is required.' })
  subject: string;

  @IsNotEmpty({ message: 'Description is required.' })
  description: string;

  @IsNotEmpty({ message: 'Recipient user type is required.' })
  @IsEnum(NoticeUserType, { message: 'Recipient user type must be valid.' })
  recipientType: NoticeUserType;

  @ValidateIf(
    (o) =>
      o.recipientType === NoticeUserType.STUDENT ||
      o.recipientType === NoticeUserType.TEACHER,
  )
  @IsNotEmpty({ message: 'Recipient is required for student or teacher.' })
  recipientId: number;

  @IsOptional()
  publisherType?: NoticeUserType;

  @IsOptional()
  publisherId?: number;

  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: 'Expired at must be a valid date.' })
  expiredAt?: Date;

  @IsOptional()
  @Type(() => Boolean)
  sendEmail?: boolean;

  @IsOptional()
  email?: string;
}

export enum NoticeFilter {
  UNREAD = 'unread',
  ADMIN = 'admin',
  TEACHER = 'teacher',
}

export class NoticeQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  userId?: number;

  @IsOptional()
  @IsEnum(NoticeFilter)
  filter?: NoticeFilter;
}

export function AtLeastOne(
  properties: string[],
  validationOptions?: ValidationOptions,
) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'atLeastOne',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(_: any, args: ValidationArguments) {
          const obj = args.object as any;
          return properties.some(
            (prop) => obj[prop] !== undefined && obj[prop] !== null,
          );
        },
        defaultMessage(args: ValidationArguments) {
          return `At least one of [${properties.join(', ')}] must be provided`;
        },
      },
    });
  };
}

export class markAsReadDto {
  @IsOptional()
  id?: number;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  all?: boolean;

  @IsOptional()
  @IsIn(['A', 'T'], {
    message: 'Type must be either A (Admin) or T (Teacher)',
  })
  type?: 'A' | 'T';

  @IsOptional()
  userId?: number;

  @AtLeastOne(['id', 'all'], {
    message: 'Either id or all must be provided.',
  })
  dummy?: any;
}
