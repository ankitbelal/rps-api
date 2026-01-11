import { Program } from 'src/database/entities/program.entity';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('faculties')
export class Faculty {
  @PrimaryGeneratedColumn()
  id: Number;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @CreateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;

  @OneToMany(() => Program, (program) => program.faculty, { cascade: true })
  program: Program;

  @DeleteDateColumn({ type: 'timestamp', name: 'deleted_at' })
  deletedAt: Date;

  static readonly ALLOWED_FIELDS_LIST = [
    'faculty.id',
    'faculty.name',
    'faculty.description',
    'program.id',
    'program.code',
  ];
}
