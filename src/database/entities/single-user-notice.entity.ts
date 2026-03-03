import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';
import { NoticeUserType, SingleNoticeStatus } from 'utils/enums/general-enums';

@Entity('single_user_notices')
export class SingleUserNotice {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'publisher_type', type: 'enum', enum: NoticeUserType })
  publisherType: NoticeUserType;

  @Column({ name: 'publisher_id' })
  publisherId: number;

  @Column({ name: 'recipient_type', type: 'enum', enum: NoticeUserType })
  recipientType: NoticeUserType;

  @Column({ name: 'recipient_id' })
  recipientId: number;

  @Column({ length: 255 })
  subject: string;

  @Column({ type: 'text' })
  description: string;

  @Column({
    type: 'enum',
    enum: SingleNoticeStatus,
    default: SingleNoticeStatus.UNREAD,
  })
  status: SingleNoticeStatus;

  @Column({ type: 'datetime', nullable: true })
  expireAt: Date | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;
}
