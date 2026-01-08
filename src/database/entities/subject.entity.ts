import { Program } from 'src/database/entities/program.entity';
import { Teacher } from 'src/database/entities/teacher.entity';
import { StudentSubjectMarks } from './student-marks.entity';
import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
  OneToMany,
} from 'typeorm';
import { StudentAttendance } from './student-attendance.entity';
import { SubjectsEvaluationParameter } from './subject-evaluation-parameter.entity';

@Entity('subjects')
@Unique(['programId', 'code']) //duplicacy of subject should be considered when program and subject are same
export class Subject {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ type: 'varchar', length: 10 })
  code: string;

  @Column({ type: 'int' })
  credits: number;

  @Column({ type: 'int' })
  semester: number;

  @Column({ type: 'varchar' })
  type: string;

  @Column({ name: 'program_id' })
  programId: number;

  @ManyToOne(() => Program, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'program_id' })
  program: Program;

  @Column({ name: 'teacher_id' })
  teacherId: number;

  @ManyToOne(() => Teacher, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'teacher_id' })
  teacher: Teacher;

  @OneToMany(() => StudentSubjectMarks, (marks) => marks.subject, {
    cascade: true,
  })
  studentSubjectMarks: StudentSubjectMarks[];

  @OneToMany(() => SubjectsEvaluationParameter, (marks) => marks.subject, {
    cascade: true,
  })
  subjectEvaluationParameter: SubjectsEvaluationParameter[];

  @OneToMany(() => StudentAttendance, (attentance) => attentance.subject, {
    cascade: true,
  })
  studentAttendance: StudentAttendance[];

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updatedAt: Date;

  static readonly ALLOWED_FIELDS_LIST = [
    'subject.id',
    'subject.name',
    'subject.code',
    'subject.semester',
    'subject.credits',
    'subject.type',
    'program.id',
    'program.code',
    'program.name',
    'teacher.id',
    'teacher.firstName',
    'teacher.lastName',
    'teacher.email',
    'subject.createdAt',
  ];

  static readonly ALLOWED_DETAILS = [
    'subject.id',
    'subject.name',
    'subject.code',
    'subject.semester',
    'subject.credits',
    'subject.type',
    'program.id',
    'program.code',
    'program.name',
    'teacher.id',
    'teacher.firstName',
    'teacher.lastName',
    'teacher.email',
    'subject.createdAt',
  ];
}
