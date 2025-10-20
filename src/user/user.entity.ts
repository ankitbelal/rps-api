import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { UserActivity } from './user-activity.entity';

export enum UserType {
  ADMIN = 'A',
  TEACHER = 'T',
  STUDENT = 'S',
}

export enum Status {
  ACTIVE = 'A',
  PENDING = 'P',
  DISABLED = 'D',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true, type: 'varchar' })
  name: string;

  @Column()
  password: string;

  @Column({ type: 'varchar', length: 10 })
  contact: string;

  @Column({
    name: 'user_type',
    type: 'enum',
    enum: UserType,
    default: UserType.TEACHER,
  })
  userType: UserType;

  @Column({ type: 'enum', enum: Status, default: Status.PENDING })
  status: Status;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => UserActivity, (activity) => activity.user, {
    cascade: true,
    onDelete: 'CASCADE',
  })
  activities: UserActivity[]; // Collection of all activities
}
