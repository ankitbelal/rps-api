import { Program } from 'src/database/entities/program.entity';
import { User } from 'src/database/entities/user.entity';
import {
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  OneToMany,
} from 'typeorm';
import { StudentSubjectMarks } from './student-marks.entity';

export enum Gender {
  MALE = 'M',
  FEMALE = 'F',
  OTHER = 'O',
}

export enum Status {
  ACTIVE = 'A',
  PASSED = 'P',
  SUSPENDED = 'S',
}

@Entity('students')
export class Student {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'first_name' })
  firstName: string;

  @Column({ name: 'last_name' })
  lastName: string;

  @Column({ unique: true })
  email: string;

  @Column({ type: 'varchar', length: 15, unique: true })
  phone: string;

  @Column({ name: 'roll_no', type: 'varchar', length: 50, unique: true })
  rollNumber: string;

  @Column({ name: 'enrollment_date', type: 'date' })
  enrollmentDate: Date;

  @Column({ type: 'enum', enum: Status })
  status: Status;

  @Column({
    name: 'registration_no',
    type: 'varchar',
    length: 50,
    unique: true,
  })
  registrationNumber: string;

  @Column({ type: 'enum', enum: Gender })
  gender: Gender;

  @Column({ type: 'date', name: 'dob' })
  DOB: Date;

  @Column({ nullable: false, type: 'varchar' })
  address1: string;

  @Column({ nullable: true })
  address2: string;

  @Column({ name: 'current_semester', default: 1, type: 'int' })
  currentSemester: Number;

  @Column({ name: 'program_id' })
  programId: number;

  @ManyToOne(() => Program, (program) => program.students, {
    onDelete: 'CASCADE',
  })
  program: Program;

  @OneToOne(() => User, (user) => user.student)
  user: User;

  @OneToMany(() => StudentSubjectMarks, (marks) => marks.student, { cascade: true })
  studentSubjectMarks: StudentSubjectMarks[];

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updatedAt: Date;
}
