import { Subject } from './subject.entity';
import { Student } from './student.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  JoinColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { ExtraParametersMarks } from './extra-parameters-marks.entity';
import { ExamTerm } from 'utils/enums/general-enums';


@Entity('students_subjects_marks')
export class StudentSubjectMarks {
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

  @Column({
    name: 'exam_term',
    type: 'enum',
    enum: ExamTerm,
  })
  examTerm: ExamTerm;

  @Column()
  semester: number;

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

  @OneToMany(() => ExtraParametersMarks, (ep) => ep.studentId)
  extraParametersMarks: ExtraParametersMarks[];


  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updatedAt: Date;
}
