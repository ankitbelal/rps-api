import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  OneToMany,
} from "typeorm";

import { Subject } from "src/subject/subject.entity";
import { Student } from "src/student/student.entity";

@Entity("programs")
export class Program {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ type: "varchar", length: 10 })
  code: string;

  @Column()
  faculty: string;

  @Column({ type: "int", nullable: true, name: "total_subjects" })
  totalSubjects: number;

  @Column()
  totalSemester: number;

  @Column({ type: "int", nullable: true, name: "total_credits" })
  totalCredits: number;

  @Column({ type: "int", default: 4, name: "duration_in_years" })
  durationInYears: number;

  @CreateDateColumn({ type: "timestamp", name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamp", name: "updated_at" })
  updatedAt: Date;

  @OneToMany(() => Subject, (subject) => subject.program)
  subjects: Subject[];

  @OneToMany(() => Student, (student) => student.program)
  students: Student[];

}
