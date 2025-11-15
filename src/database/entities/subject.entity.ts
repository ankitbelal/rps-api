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
import { StudentAttendance } from './student-attendance';

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

  @ManyToOne(() => Teacher, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'teacher_id' })
  teacher: Teacher;

  @OneToMany(() => StudentSubjectMarks, (marks) => marks.subject, {
    cascade: true,
  })
  studentSubjectMarks: StudentSubjectMarks[];

  @OneToMany(() => StudentAttendance, (attentance) => attentance.subject, {
    cascade: true,
  })
  studentAttendance: StudentAttendance[];

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updatedAt: Date;
}
