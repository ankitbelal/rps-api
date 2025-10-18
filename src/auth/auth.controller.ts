import { Body, Controller, HttpCode, Post, Req, Res} from '@nestjs/common';
import { loginDTO } from './dto/login.dto';
import { AuthService } from './auth.service';
import { Public } from './jwt/public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(200)
 async login(@Body() loginDTO: loginDTO, @Req() req:Request, @Res({passthrough:true}) res:Response) {
    return await this.authService.login(loginDTO, req, res);
  }

  @Post('refresh-token')
  async refreshToken(@Body('refreshToken') refreshToken: string) {
    return await this.authService.refreshToken(refreshToken);
  }
  
  @Post('logout')
  @HttpCode(200)
  async logout(@Req() req:Request, @Res({passthrough:true}) res:Response){
   return await this.authService.logout(req, res);


  }
}
