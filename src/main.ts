import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { RequestMethod, ValidationPipe } from '@nestjs/common';
import { JwtGuard } from './auth/jwt/jwt.guard';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api',{
    exclude:[{path:'/', method:RequestMethod.ALL}],
  });

  const reflector=app.get(Reflector);
  app.useGlobalGuards(new JwtGuard(app.get(JwtService),app.get(ConfigService),reflector));
  app.useGlobalPipes(new ValidationPipe({
    whitelist:true,
    transform:true
  }))
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
