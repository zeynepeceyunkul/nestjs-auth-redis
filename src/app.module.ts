import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { RedisModule } from './redis/redis.module';

function getTypeOrmConfig() {
  const isE2E = process.env.E2E_TEST === '1';
  return isE2E
    ? {
        type: 'better-sqlite3' as const,
        database: ':memory:',
        autoLoadEntities: true,
        synchronize: true,
      }
    : {
        type: 'postgres' as const,
        host: 'localhost',
        port: 5433,
        username: 'postgres',
        password: 'postgres',
        database: 'authdb',
        autoLoadEntities: true,
        synchronize: true,
      };
}

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: () => getTypeOrmConfig(),
    }),
    UsersModule,
    AuthModule,
    RedisModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
