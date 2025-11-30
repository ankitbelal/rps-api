import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

import { Subject } from 'src/database/entities/subject.entity';
import { Student } from 'src/database/entities/student.entity';
import { Faculty } from 'src/database/entities/faculty.entity';

@Entity('programs')
export class Program {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ type: 'varchar', length: 10 })
  code: string;

  @Column({ type: 'int', nullable: true, name: 'total_subjects' })
  totalSubjects: number;

  @Column({ type: 'int', nullable: true, name: 'total_semesters' })
  totalSemesters: number;

  @Column({ type: 'int', nullable: true, name: 'total_credits' })
  totalCredits: number;

  @Column({ type: 'int', default: 4, name: 'duration_in_years' })
  durationInYears: number;

  @ManyToOne(() => Faculty, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'faculty_id' })
  faculty: Faculty;

  @Column({ name: 'faculty_id', nullable: true })
  facultyId?: number;

  @OneToMany(() => Subject, (subject) => subject.program, { cascade: true })
  subjects: Subject[];

  @OneToMany(() => Student, (student) => student.program, { cascade: true })
  students: Student[];

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updatedAt: Date;

  static readonly ALLOWED_FIELDS_LIST = [
    'id',
    'name',
    'code',
    'totalSubjects',
    'totalSemesters',
    'totalCredits',
    'durationInYears',
  ];
}
