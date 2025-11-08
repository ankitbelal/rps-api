import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { entities } from './entities';
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
