import {
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { EvaluationParameter } from './evaliation-parameter.entity';
import { Subject } from './subject.entity';
import { ExtraParametersMarks } from './extra-parameters-marks.entity';

@Entity('subjects_evaluation_parameters')
export class SubjectsEvaluationParameter {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'evaluation_parameter_id' })
  evaluationParameterId: number;

  @ManyToOne(() => EvaluationParameter, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'evaluation_parameter_id' })
  evaluationParameter: EvaluationParameter;

  @ManyToOne(() => Subject, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'subject_id' })
  subject: Subject;

  @OneToMany(() => ExtraParametersMarks, (marks) => marks.subjectsEvaluationParameter, {
    cascade: true,
  })
  extraParametersMarks: ExtraParametersMarks[];

  @Column()
  weight: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
