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

    @Column({type:'int',nullable:true})
    totalSubjects:number

    @Column()
    totalSemester:number;

    @Column({type:'int',nullable:true})
    totalCredits:number;

    @Column({type:'int',default:4})
    durationInYears:number;

    @CreateDateColumn({type:'timestamp'})
    createdAt:Date;
}
