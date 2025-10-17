import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { User } from "./user.entity";

@Entity("user_activity")
export class UserActivity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "user_id" })
  userId: number;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user: User;

  @Column({ nullable: true })
  action: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  platform: string;

  @Column({ type: "varchar", length: 45, nullable: true , name:"ip_address"})
  ipAddress: string;

  @CreateDateColumn({ type: "timestamp", name: "created_at" })
  createdAt: Date;
}
