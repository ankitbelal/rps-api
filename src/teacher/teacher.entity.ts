import { User } from 'src/user/user.entity';
import { Subject } from 'src/subject/subject.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany
} from 'typeorm';
@Entity('teachers')
export class Teacher {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'first_name' })
  firstName: string;

  @Column({ name: 'last_name' })
  lastName: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true, unique: true })
  phone: string;

  @Column({ nullable: false, type: 'varchar' })
  address1: string;

  @Column({ nullable: true })
  address2: string;

  @OneToOne(() => User, (user) => user.teacher, {
    cascade: true,
    onDelete: 'CASCADE',
  })

  @OneToMany(() => Subject, (subject) => subject.teacher, { cascade: true })
  subjects: Subject[];

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updatedAt: Date;
}
