import { Program } from 'src/program/program.entity';
import {
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum Gender {
  MALE = 'M',
  FEMALE = 'F',
  OTHER = 'O',
}
@Entity('Student')
export class Student {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'first_name' })
  firstName: string;

  @Column({ name: 'last_name' })
  lastName: string;

  @Column({ unique: true })
  email: string;

  @Column({ type: 'varchar', length: 15, unique: true })
  phone: string;

  @Column({ name: 'roll_no', type: 'varchar', length: 50, unique: true })
  rollNumber: string;

  @Column({ name: 'enrollment_date', type: 'date' })
  enrollmentDate: Date;

  @Column({ type: 'text', nullable: true })
  address: string;

  @Column({
    name: 'registration_no',
    type: 'varchar',
    length: 50,
    unique: true,
  })
  registrationNumber: string;

  @Column({ type: 'int' })
  age: number;

  @Column({ type: 'enum', enum: Gender })
  gender: Gender;

  @Column({ type: 'date', name: 'dob' })
  DOB: Date;

  @Column({ name: 'program_id' })
  programId: number;

  @ManyToOne(() => Program, (program) => program.students, {
    onDelete: 'CASCADE',
  })
  program: Program;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updatedAt: Date;
}
