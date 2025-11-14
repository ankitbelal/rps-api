import { Subject } from './subject.entity';
import { Student } from './student.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  OneToOne,
  JoinColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum ExamTerm {
  FIRST = 'F',
  SECOND = 'S',
}

@Entity('students_subjects_marks')
export class StudentSubjectMarks {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => Student, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student: Student;

  @OneToOne(() => Subject, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'subject_id' })
  subject: Subject;

  @Column({
    name: 'exam_term',
    type: 'enum',
    enum: ExamTerm,
  })
  examTerm: ExamTerm;

  @Column({
    name: 'discipline_marks',
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 0,
    nullable: true,
  })
  disciplineMarks: number;

  @Column({
    name: 'uniform_marks',
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 0,
    nullable: true,
  })
  uniformMarks: number;

  @Column({
    name: 'punctuality_marks',
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 0,
    nullable: true,
  })
  punctualityMarks: number;

  @Column({
    name: 'attendance_marks',
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 0,
    nullable: true,
  })
  attendanceMarks: number;

  @Column({
    name: 'subject_marks',
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 0,
    nullable: true,
  })
  subjectMarks: number;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updatedAt: Date;
}
