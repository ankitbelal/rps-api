import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Gender } from 'utils/enums/general-enums';

@Entity('admin_users')
export class AdminUsers {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'first_name' })
  firstName: string;

  @Column({ name: 'last_name' })
  lastName: string;

  @Column({ unique: true, nullable: false })
  email: string;

  @Column({ unique: true })
  phone: string;

  @Column({ type: 'enum', enum: Gender })
  gender: Gender;

  @Column()
  address1: string;

  @Column({ nullable: true })
  address2: string;

  @Column({ name: 'user_id', nullable: true })
  userId: number;

  @OneToOne(() => User, (user) => user.admin, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @CreateDateColumn({ type: 'timestamp', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp', name: 'updated_at' })
  updatedAt: Date;
}
