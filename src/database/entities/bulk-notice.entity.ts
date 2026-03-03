import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';
import { NoticeUserType } from 'utils/enums/general-enums';

@Entity('bulk_notices')
export class BulkNotice {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'publisher_type', type: 'enum', enum: NoticeUserType })
  publisherType: NoticeUserType;

  @Column({ name: 'publisher_id' })
  publisherId: number;

  @Column({ name: 'recipient_type', type: 'enum', enum: NoticeUserType })
  recipientType: NoticeUserType;

  @Column({ name: 'programs', type: 'simple-json', nullable: true })
  programs: number[] | null;

  @Column({ name: 'semesters', type: 'simple-json', nullable: true })
  semesters: number[] | null;

  @Column({ length: 255 })
  subject: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'datetime', nullable: true })
  expireAt: Date | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;
}
