/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */

import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    @Inject('REDIS') private readonly redis: any,
  ) {}

  // ✅ REGISTER
  async register(email: string, password: string) {
    const exists = await this.usersService.findByEmail(email);
    if (exists) {
      throw new BadRequestException('Email already exists');
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await this.usersService.create(email, hashed);

    return {
      message: 'User registered successfully',
      userId: user.id,
    };
  }

  // ✅ LOGIN
  async login(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new BadRequestException('Invalid credentials');
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      throw new BadRequestException('Invalid credentials');
    }

    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
    });

    const refreshToken = randomUUID();

    await this.redis.set(
      `refresh:${refreshToken}`,
      user.id,
      'EX',
      60 * 60 * 24 * 7,
    );

    return {
      accessToken,
      refreshToken,
    };
  }

  // 🔁 REFRESH TOKEN ROTATE
  async refreshRotate(oldRefreshToken: string) {
    const userId = await this.redis.get(`refresh:${oldRefreshToken}`);
    if (!userId) {
      throw new BadRequestException('Invalid refresh token');
    }

    // eski refresh token silinir
    await this.redis.del(`refresh:${oldRefreshToken}`);

    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
    });

    const newRefreshToken = randomUUID();

    await this.redis.set(
      `refresh:${newRefreshToken}`,
      user.id,
      'EX',
      60 * 60 * 24 * 7,
    );

    return {
      accessToken,
      refreshToken: newRefreshToken,
    };
  }

  // 🚪 LOGOUT (YENİ EKLENDİ)
  async logout(refreshToken: string) {
    if (!refreshToken) {
      throw new BadRequestException('Refresh token is required');
    }

    await this.redis.del(`refresh:${refreshToken}`);

    return {
      message: 'Logged out successfully',
    };
  }
}
