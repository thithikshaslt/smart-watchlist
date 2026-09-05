import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User } from '@prisma/client';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let authService: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let jwtService: jest.Mocked<JwtService>;

  const buildUser = (overrides: Partial<User> = {}): User => ({
    id: 'user-1',
    email: 'user@example.com',
    passwordHash: 'irrelevant',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  beforeEach(() => {
    usersService = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      toSafeUser: jest.fn((user: User) => ({
        id: user.id,
        email: user.email,
        createdAt: user.createdAt,
      })),
    } as unknown as jest.Mocked<UsersService>;

    jwtService = {
      signAsync: jest.fn().mockResolvedValue('signed.jwt.token'),
    } as unknown as jest.Mocked<JwtService>;

    authService = new AuthService(usersService, jwtService);
  });

  describe('register', () => {
    it('creates a user when the email is unused', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      const created = buildUser();
      usersService.create.mockResolvedValue(created);

      const result = await authService.register(
        'user@example.com',
        'password123',
      );

      expect(usersService.create).toHaveBeenCalledWith(
        'user@example.com',
        expect.any(String),
      );
      const [, storedHash] = usersService.create.mock.calls[0];
      expect(storedHash).not.toBe('password123');
      expect(result).toEqual({
        id: created.id,
        email: created.email,
        createdAt: created.createdAt,
      });
    });

    it('rejects registration when the email already has an account', async () => {
      usersService.findByEmail.mockResolvedValue(buildUser());

      await expect(
        authService.register('user@example.com', 'password123'),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(usersService.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('issues a token for correct credentials', async () => {
      const passwordHash = await bcrypt.hash('password123', 4);
      usersService.findByEmail.mockResolvedValue(buildUser({ passwordHash }));

      const result = await authService.login('user@example.com', 'password123');

      expect(result).toEqual({ accessToken: 'signed.jwt.token' });
      expect(jwtService.signAsync).toHaveBeenCalledWith({
        sub: 'user-1',
        email: 'user@example.com',
      });
    });

    it('rejects login for an unknown email', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(
        authService.login('unknown@example.com', 'password123'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects login for an incorrect password', async () => {
      const passwordHash = await bcrypt.hash('correct-password', 4);
      usersService.findByEmail.mockResolvedValue(buildUser({ passwordHash }));

      await expect(
        authService.login('user@example.com', 'wrong-password'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });
});
