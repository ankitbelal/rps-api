import { UserActivity } from './user-activity.entity';
import { Student } from './student.entity';
import { Teacher } from './teacher.entity';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  OneToOne,
  JoinColumn,
  PrimaryColumn,
} from 'typeorm';
import { UserOTP } from './user-otps.entity';
import { UserStatus, UserType } from 'utils/enums/general-enums';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, nullable: false })
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

  @Column({ type: 'enum', enum: UserStatus, default: UserStatus.PENDING })
  status: UserStatus;

  @Column({ name: 'student_id', nullable: true })
  studentId: number | null;

  @OneToOne(() => Student, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student?: Student;

  @Column({ name: 'teacher_id', nullable: true })
  teacherId: number | null;

  @OneToOne(() => Teacher, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'teacher_id' })
  teacher?: Teacher;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => UserActivity, (activity) => activity.user, {
    cascade: true,
    onDelete: 'CASCADE',
  })
  activities: UserActivity[];

  @OneToMany(() => UserOTP, (otp) => otp.user, {
    cascade: true,
    onDelete: 'CASCADE',
  })
  userOtp: UserOTP;
}
