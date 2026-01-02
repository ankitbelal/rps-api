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
  JoinColumn,
} from 'typeorm';
import { StudentSubjectMarks } from './student-marks.entity';
import { Status, StudentAttendance } from './student-attendance.entity';
import { Gender, StudentStatus } from 'utils/enums/general-enums';

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

  @Column({ type: 'enum', enum: StudentStatus })
  status: StudentStatus;

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

  @Column({ name: 'is_passsed', default: 0, type: 'int' })
  isPassed: Number;

  @Column({ name: 'program_id' })
  programId: number;

  @ManyToOne(() => Program, (program) => program.students, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'program_id' })
  program: Program;

  @OneToOne(() => User, (user) => user.student)
  user: User;

  @OneToMany(() => StudentSubjectMarks, (marks) => marks.student, {
    cascade: true,
  })
  studentSubjectMarks: StudentSubjectMarks[];

  @OneToMany(() => StudentAttendance, (attentance) => attentance.student, {
    cascade: true,
  })
  studentAttendance: StudentAttendance[];

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updatedAt: Date;

  static readonly ALLOWED_FIELDS_LIST = [
    'student.id',
    'student.firstName',
    'student.lastName',
    'student.registrationNumber',
    'student.rollNumber',
    'student.currentSemester',
    'student.gender',
    'student.email',
    'student.phone',
    'student.status',
    'student.createdAt',
    'program.name',
    // reg no - roll-no
    //status
    //program
    //contact
    //
  ];
  static readonly ALLOWED_DETAILS = [
    'student.id',
    'student.firstName',
    'student.lastName',
    'student.email',
    'student.phone',
    'student.gender',
    'student.DOB',
    'student.address1',
    'student.address2',
    'student.currentSemester',
    'student.status',
    'student.rollNumber',
    'student.registrationNumber',
    'program.name',
    'program.id',
    'student.createdAt',
  ];
}
