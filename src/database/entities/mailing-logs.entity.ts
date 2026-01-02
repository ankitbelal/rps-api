import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum MailStatus {
  SENT = 'S',
  FAILED = 'F',
}

@Entity('mailing_logs')
export class MailingLogs {
  @PrimaryGeneratedColumn()
  id: Number;

  @Column({ type: 'enum', enum: MailStatus, default: MailStatus.SENT })
  status: MailStatus;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updatedAt: Date;
}
