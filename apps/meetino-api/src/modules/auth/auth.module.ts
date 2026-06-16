import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import type { AppConfig } from '../../config/configuration';
import { UsersModule } from '../users/users.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { IrnoSsoService } from './irno-sso.service';
import { IrnoSsoController } from './irno-sso.controller';

@Module({
  imports: [
    UsersModule,
    PrismaModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppConfig, true>) => ({
        secret: config.get('jwt', { infer: true }).accessSecret,
        signOptions: {
          expiresIn: config.get('jwt', { infer: true }).accessExpiresIn,
        },
      }),
    }),
  ],
  controllers: [AuthController, IrnoSsoController],
  providers: [AuthService, JwtStrategy, IrnoSsoService],
  exports: [AuthService, IrnoSsoService],
})
export class AuthModule {}
