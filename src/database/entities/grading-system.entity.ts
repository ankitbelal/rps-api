import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('grading_system')
export class GradingSystem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    name: 'min_gpa',
    type: 'decimal',
    precision: 3,
    scale: 2,
    nullable: false,
  })
  minGPA: Number;

  @Column({
    name: 'max_gpa',
    type: 'decimal',
    precision: 3,
    scale: 2,
    nullable: false,
  })
  maxGPA: Number;

  @Column({ length: 5 })
  grade: string;

  @Column({ nullable: true })
  remarks: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp', nullable: true })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp', nullable: true })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamp', nullable: true })
  DeletedAt: Date;
}
