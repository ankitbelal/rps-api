import { Program } from 'src/program/program.entity';
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

@Entity('Student')
export class Student {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'program_id' })
  programId: number;

  @ManyToOne(() => Program, (program) => program.students, {
    onDelete: 'CASCADE',
  })
  program: Program;
}
