import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('programs')
export class program {
    @PrimaryGeneratedColumn()
    id:number;

    @Column()
    name:string

    @Column({type:'varchar',length:10})
    code:string;

    @Column()
    faculty:string;

    @Column({type:'int',nullable:true,name:'total_subjects'})
    totalSubjects:number

    @Column()
    totalSemester:number;

    @Column({type:'int',nullable:true, name:'total_credits'})
    totalCredits:number;

    @Column({type:'int',default:4,name:'duration_in_years'})
    durationInYears:number;

    @CreateDateColumn({type:'timestamp',name:'created_at'})
    createdAt:Date;
}
