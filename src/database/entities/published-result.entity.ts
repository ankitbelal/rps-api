import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { ExamTerm } from 'utils/enums/general-enums';
import { Student } from './student.entity';

@Entity('published_results')
@Unique(['studentId', 'semester', 'examTerm'])
export class PublishedResult {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'student_id' })
  studentId: number;

  @ManyToOne(() => Student, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student: Student;

  @Column({ name: 'program_id' })
  programId: number;

  @Column({ type: 'int' })
  semester: number;

  @Column({ type: 'enum', enum: ExamTerm })
  examTerm: ExamTerm;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  totalObtained: number;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  totalFull: number;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  percentage: number;

  @Column({ type: 'decimal', precision: 3, scale: 1, nullable: true })
  gpa: number;

  // snapshot of subject-wise breakdown
  @Column({ type: 'json', name: 'subject_breakdown' })
  subjectBreakdown: {
    subjectId: number;
    subjectName: string;
    subjectCode: string;
    grade: string;
    subjectObtainedOutOf50: number;
    extraParamObtainedOutOf50: number;
    finalMarkOutOf100: number;
  }[];

  @Column({ name: 'published_by', nullable: true })
  publishedBy: string; // userId of who published

  //   @Column({ name: 'is_active', default: true })
  //   isActive: boolean; // to handle republishing

  @CreateDateColumn({ name: 'published_at', type: 'timestamp' })
  publishedAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
