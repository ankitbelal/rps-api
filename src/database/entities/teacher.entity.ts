import { User } from 'src/database/entities/user.entity';
import { Subject } from 'src/database/entities/subject.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  JoinColumn,
  DeleteDateColumn,
} from 'typeorm';
import { Gender } from 'utils/enums/general-enums';
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

  @Column({ type: 'enum', enum: Gender })
  gender: Gender;

  @Column({ type: 'date', name: 'dob' })
  DOB: Date;

  @Column({ nullable: false, type: 'varchar' })
  address1: string;

  @Column({ nullable: true })
  address2: string;

  @Column({ name: 'user_id', nullable: true })
  userId: number;

  @OneToOne(() => User, (user) => user.teacher, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @OneToMany(() => Subject, (subject) => subject.teacher, { cascade: true })
  subjects: Subject[];

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ type: 'timestamp', name: 'deleted_at' })
  deletedAt: Date;

  static readonly ALLOWED_FIELDS_LIST = [
    'teacher.id',
    'teacher.firstName',
    'teacher.lastName',
    'teacher.email',
    'teacher.phone',
    'teacher.gender',
    'teacher.createdAt',
    // 'teacher.dob',
    'teacher.address1',
    // 'teacher.address2',
  ];
  static readonly ALLOWED_DETAILS = [
    'teacher.id',
    'teacher.firstName',
    'teacher.lastName',
    'teacher.email',
    'teacher.phone',
    'teacher.gender',
    'teacher.DOB',
    'teacher.address1',
    'teacher.address2',
    'teacher.createdAt',
  ];
}
