import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

jest.mock('crypto', () => ({
  ...jest.requireActual<typeof import('crypto')>('crypto'),
  randomUUID: jest.fn(),
}));

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn((pass: string) => Promise.resolve(`hashed:${pass}`)),
}));

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let jwtService: jest.Mocked<JwtService>;
  let redis: { get: jest.Mock; set: jest.Mock; del: jest.Mock };

  const mockUser = {
    id: 'user-uuid-1',
    email: 'test@example.com',
    password: 'hashedPassword',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    redis = {
      get: jest.fn(),
      set: jest.fn().mockResolvedValue(undefined),
      del: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: {
            findByEmail: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn().mockResolvedValue('mock-access-token'),
          },
        },
        {
          provide: 'REDIS',
          useValue: redis,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get(UsersService) as jest.Mocked<UsersService>;
    jwtService = module.get(JwtService) as jest.Mocked<JwtService>;

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('login', () => {
    it('doğru email/password ile access + refresh token döndürmeli', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      const fixedRefresh = 'fixed-refresh-token-uuid';
      (crypto.randomUUID as jest.Mock).mockReturnValue(fixedRefresh);

      const result = await service.login('test@example.com', 'correctPassword');

      expect(result).toHaveProperty('accessToken', 'mock-access-token');
      expect(result).toHaveProperty('refreshToken', fixedRefresh);
      expect(usersService.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(bcrypt.compare).toHaveBeenCalledWith('correctPassword', mockUser.password);
      expect(jwtService.signAsync).toHaveBeenCalledWith({
        sub: mockUser.id,
        email: mockUser.email,
      });
      expect(redis.set).toHaveBeenCalledWith(
        `refresh:${fixedRefresh}`,
        mockUser.id,
        'EX',
        60 * 60 * 24 * 7,
      );
    });

    it('kullanıcı yoksa Invalid credentials fırlatmalı', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(service.login('unknown@example.com', 'pass')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.login('unknown@example.com', 'pass')).rejects.toThrow(
        'Invalid credentials',
      );
      expect(redis.set).not.toHaveBeenCalled();
    });

    it('şifre yanlışsa Invalid credentials fırlatmalı', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login('test@example.com', 'wrongPassword')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.login('test@example.com', 'wrongPassword')).rejects.toThrow(
        'Invalid credentials',
      );
      expect(jwtService.signAsync).not.toHaveBeenCalled();
      expect(redis.set).not.toHaveBeenCalled();
    });
  });

  describe('refreshRotate (refresh token rotation)', () => {
    it('eski token redis\'ten silinmeli, yeni token yazılmalı', async () => {
      const oldRefreshToken = 'old-refresh-uuid';
      const newRefreshToken = 'new-refresh-uuid';
      redis.get.mockResolvedValue(mockUser.id);
      usersService.findById.mockResolvedValue(mockUser);
      (crypto.randomUUID as jest.Mock).mockReturnValue(newRefreshToken);

      const result = await service.refreshRotate(oldRefreshToken);

      expect(redis.get).toHaveBeenCalledWith(`refresh:${oldRefreshToken}`);
      expect(redis.del).toHaveBeenCalledWith(`refresh:${oldRefreshToken}`);
      expect(usersService.findById).toHaveBeenCalledWith(mockUser.id);
      expect(jwtService.signAsync).toHaveBeenCalledWith({
        sub: mockUser.id,
        email: mockUser.email,
      });
      expect(redis.set).toHaveBeenCalledWith(
        `refresh:${newRefreshToken}`,
        mockUser.id,
        'EX',
        60 * 60 * 24 * 7,
      );
      expect(result).toEqual({
        accessToken: 'mock-access-token',
        refreshToken: newRefreshToken,
      });
    });

    it('geçersiz refresh token için BadRequest fırlatmalı', async () => {
      redis.get.mockResolvedValue(null);

      await expect(service.refreshRotate('invalid-token')).rejects.toThrow(BadRequestException);
      await expect(service.refreshRotate('invalid-token')).rejects.toThrow(
        'Invalid refresh token',
      );
      expect(redis.del).not.toHaveBeenCalled();
      expect(redis.set).not.toHaveBeenCalled();
    });

    it('kullanıcı bulunamazsa BadRequest fırlatmalı', async () => {
      redis.get.mockResolvedValue('non-existent-user-id');
      usersService.findById.mockResolvedValue(null);

      await expect(service.refreshRotate('valid-token')).rejects.toThrow(BadRequestException);
      await expect(service.refreshRotate('valid-token')).rejects.toThrow('User not found');
      expect(redis.del).toHaveBeenCalledWith('refresh:valid-token');
      expect(redis.set).not.toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('refresh token redis\'ten silinmeli', async () => {
      const refreshToken = 'my-refresh-token';

      const result = await service.logout(refreshToken);

      expect(redis.del).toHaveBeenCalledWith(`refresh:${refreshToken}`);
      expect(result).toEqual({ message: 'Logged out successfully' });
    });

    it('refresh token yoksa BadRequest fırlatmalı', async () => {
      await expect(service.logout('')).rejects.toThrow(BadRequestException);
      await expect(service.logout('')).rejects.toThrow('Refresh token is required');
      expect(redis.del).not.toHaveBeenCalled();
    });
  });
});
