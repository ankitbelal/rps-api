import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { User } from 'src/user/user.entity';
import { UserActivity } from 'src/user/user-activity.entity';
import { Program } from 'src/program/program.entity';
import { Subject } from 'src/subject/subject.entity';
import { Student } from 'src/student/student.entity';
const entities = [User, UserActivity,Program,Subject,Student];
@Global()
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'mysql',
        host: config.get<string>('DB_HOST'),
        port: Number(config.get<string>('DB_PORT')),
        username: config.get<string>('DB_USERNAME'),
        password: config.get<string>('DB_PASSWORD'),
        database: config.get<string>('DB_NAME'),
        entities: entities,
        migrations: ['src/migrations/*.ts'],
        synchronize: true, // dev only
        ssl: { rejectUnauthorized: false },
      }),
    }),
    TypeOrmModule.forFeature(entities), //  register repositories globally
  ],
  exports: [TypeOrmModule], // exports connection + repositories
})
export class DatabaseModule {}
