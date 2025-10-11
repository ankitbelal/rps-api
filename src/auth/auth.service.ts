import { Injectable } from '@nestjs/common';
import { loginDTO } from './dto/login.dto';

@Injectable()
export class AuthService {
    login(loginDTO:loginDTO){

    }
}
