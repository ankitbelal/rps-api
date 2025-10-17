import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
@Entity('teachers')
export class Teacher {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  department: string; // optional, if you want

}
