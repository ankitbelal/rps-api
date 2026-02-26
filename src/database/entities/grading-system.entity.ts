import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { gradeRange } from './grade-ranges.entity';

@Entity('grading_system')
export class GradingSystem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @OneToMany(() => gradeRange, (range) => range.gradingSystem, {
    cascade: true,
  })
  gradeRanges: gradeRange[];

  @Column({ name: 'is_active', default: false })
  isActive: boolean;
  
  @CreateDateColumn({ name: 'created_at', type: 'timestamp', nullable: true })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp', nullable: true })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamp', nullable: true })
  DeletedAt: Date;
}
