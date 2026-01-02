import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  JoinColumn,
  ManyToOne,
} from 'typeorm';
import { StudentSubjectMarks } from './student-marks.entity';
import { SubjectsEvaluationParameter } from './subject-evaluation-parameter.entity';

@Entity('extra_parameters_marks')
export class ExtraParametersMarks {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => StudentSubjectMarks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_subject_marks_id' })
  studentSubjectMarks: StudentSubjectMarks;

  @Column({ name: 'student_subject_marks_id', nullable: true })
  studentSubjectMarksId?: number;

  @ManyToOne(() => SubjectsEvaluationParameter, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'subject_evaluation_parameters_id' })
  subjectsEvaluationParameter: SubjectsEvaluationParameter;

  @Column({ name: 'subject_evaluation_parameters_id', nullable: true })
  subjectEvaluationParametersId?: number;

  @Column({ default: 0 })
  marks: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
