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
  login(@Body() loginDTO: loginDTO, @Req() req:Request, @Res({passthrough:true}) res:Response) {
    return this.authService.login(loginDTO, req, res);
  }

  @Post('refresh-token')
  async refreshToken(@Body('refreshToken') refreshToken: string) {
    return this.authService.refreshToken(refreshToken);
  }
  

}
