import { Program } from "src/program/program.entity";
import { Column, Entity, ManyToOne } from "typeorm";

@Entity("Student")
export class Student {

    @Column({name:"program_id"})
    programId:number;

    @ManyToOne(()=>Program, program=>program.students,{onDelete:"CASCADE"})
    program:Program;
}
