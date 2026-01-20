import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  JoinColumn,
  ManyToOne,
} from 'typeorm';

import { EvaluationParameter } from './evaluation-parameter.entity';
import { Subject } from './subject.entity';
import { ExamTerm } from 'utils/enums/general-enums';
import { Student } from './student.entity';

@Entity('extra_parameters_marks')
export class ExtraParametersMarks {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Student, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student: Student;

  @Column({ name: 'student_id' })
  studentId: number;

  @ManyToOne(() => Subject, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'subject_id' })
  subject: Subject;

  @Column({ name: 'subject_id' })
  subjectId: number;

  @Column({ name: 'evaluation_parameter_id' })
  evaluationParameterId: number;

  @Column({
    name: 'exam_term',
    type: 'enum',
    enum: ExamTerm,
  })
  examTerm: ExamTerm;

  @Column()
  semester: number;

  @ManyToOne(() => EvaluationParameter, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'evaluation_parameter_id' })
  evaluationParameter: EvaluationParameter;

  @Column({
    name: 'obtained_marks',
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 0,
    nullable: true,
  })
  obtainedMarks: number;

  @Column({
    name: 'full_marks',
    type: 'decimal',
    default: 100.0,
  })
  fullMarks: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
