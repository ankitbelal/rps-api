import { Entity,Column,PrimaryGeneratedColumn,CreateDateColumn,ManyToOne } from "typeorm";
import { User } from "./user.entity";

@Entity('user_activity')
export class UserActivity{

@PrimaryGeneratedColumn()
id:number;

@ManyToOne(() => User, (user) => user.activities, { onDelete: 'CASCADE' })
user: User; // This is the foreign key column in the UserActivity table
@Column({nullable:true})
action:string;

@Column({type:"varchar",length:255,nullable:true})
platform:string;

@Column({type:"varchar",length:45,nullable:true})
ipAddress:string;

@CreateDateColumn({type:"timestamp"})
createdAt:Date;
}