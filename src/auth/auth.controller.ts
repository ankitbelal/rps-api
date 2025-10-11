import { Body, Controller, Post } from '@nestjs/common';
import { loginDTO } from './dto/login.dto';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
constructor(private readonly authService:AuthService){}
@Post('login')
login(@Body() loginDTO:loginDTO){
    return {
        message:"logged in"
    }
}
}
