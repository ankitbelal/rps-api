import { UserActivity } from './user-activity.entity';
import { Student } from 'src/student/student.entity';
import { Teacher } from 'src/teacher/teacher.entity';
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

  @Column({ type: 'enum', enum: Status, default: Status.PENDING })
  status: Status;

  @OneToOne(() => Student, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student?: Student;

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
  s;
}
