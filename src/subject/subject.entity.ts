import { Program } from 'src/program/program.entity';
import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';

export enum TYPE {
  CORE = 'C',
  ELECTIVE = 'E',
  INTERNSHIP = 'I',
}

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
  semester: number;

  @Column({ type: 'enum', enum: TYPE, default: TYPE.CORE })
  type: TYPE;

  @Column({ name: 'program_id' })
  programId: number;

  @ManyToOne(() => Program, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'program_id' })
  program: Program;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updatedAt: Date;
}
