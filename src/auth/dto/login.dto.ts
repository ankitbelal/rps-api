import { IsEmail, IsNotEmpty } from "class-validator";
export class loginDTO{
    @IsEmail({},{message:'invalid email format'})
    @IsNotEmpty({message:'Email is required'})
    email:string;

    @IsNotEmpty({message:'Password is required'})
    password:string;
}