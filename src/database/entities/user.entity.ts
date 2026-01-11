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
  Admin,
} from 'typeorm';
import { UserOTP } from './user-otps.entity';
import { UserStatus, UserType } from 'utils/enums/general-enums';
import { AuditTrails } from './audit-trails.entity';
import { AdminUsers } from './admin-users.entity';

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

  @Column({
    name: 'user_type',
    type: 'enum',
    enum: UserType,
    default: UserType.TEACHER,
  })
  userType: UserType;

  @Column({ type: 'enum', enum: UserStatus, default: UserStatus.PENDING })
  status: UserStatus;

  @OneToOne(() => Teacher, (teacher) => teacher.user)
  teacher: Teacher;

  @OneToOne(() => Student, (student) => student.user)
  student: Student;

  @OneToOne(() => AdminUsers, (admin) => admin.user)
  admin: Admin;

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

  @OneToMany(() => AuditTrails, (logs) => logs.user, {
    cascade: true,
    onDelete: 'CASCADE',
  })
  auditTrails: AuditTrails;
}
