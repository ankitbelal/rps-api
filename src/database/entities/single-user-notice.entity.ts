import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToOne,
  JoinColumn,
  ManyToOne,
} from 'typeorm';
import { NoticeUserType, SingleNoticeStatus } from 'utils/enums/general-enums';
import { User } from './user.entity';

@Entity('single_user_notices')
export class SingleUserNotice {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'publisher_type', type: 'enum', enum: NoticeUserType })
  publisherType: NoticeUserType;

  @Column({ name: 'publisher_id' })
  publisherId: number;

  @ManyToOne(() => User, { eager: false, nullable: true })
  @JoinColumn({ name: 'publisher_id' })
  publisher: User;

  @Column({ name: 'recipient_type', type: 'enum', enum: NoticeUserType })
  recipientType: NoticeUserType;

  @Column({ name: 'recipient_id', nullable: true })
  recipientId?: number;

  @ManyToOne(() => User, { eager: false, nullable: true })
  @JoinColumn({ name: 'recipient_id' })
  recipient: User;

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
