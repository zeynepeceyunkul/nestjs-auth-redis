/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { Controller, Post, Body, Get, UseGuards, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { AuthGuard } from '@nestjs/passport';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ✅ REGISTER
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto.email, dto.password);
  }

  // ✅ LOGIN
  @Post('login')
  login(@Body() dto: RegisterDto) {
    return this.authService.login(dto.email, dto.password);
  }

  // ♻️ REFRESH TOKEN (ROTATE) ✅ DTO KULLANILIYOR
  @Post('refresh')
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshRotate(dto.refreshToken);
  }

  // 🚪 LOGOUT ✅ DTO KULLANILIYOR
  @Post('logout')
  logout(@Body() dto: RefreshTokenDto) {
    return this.authService.logout(dto.refreshToken);
  }

  // 🔒 PROTECTED
  @UseGuards(AuthGuard('jwt'))
  @Get('profile')
  profile(@Req() req: any) {
    return req.user;
  }
}
