import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { SubjectsEvaluationParameter } from './subject-evaluation-parameter.entity';

@Entity('evaluation_parameters')
export class EvaluationParameter {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'code', unique: true })
  code: string;

  @Column({ name: 'name', nullable: false })
  name: string;

  @OneToMany(
    () => SubjectsEvaluationParameter,
    (marks) => marks.evaluationParameter,
    {
      cascade: true,
    },
  )
  studentSubjectMarks: SubjectsEvaluationParameter[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;

  static readonly ALLOWED_FIELDS_LIST = [
    'parameter.id',
    'parameter.name',
    'parameter.code',
  ];
}
