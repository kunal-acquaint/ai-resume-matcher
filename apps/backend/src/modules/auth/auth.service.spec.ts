import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PasswordService } from '../users/password.service.js';
import type { UserDocument } from '../users/schemas/user.schema.js';
import type { UsersService } from '../users/users.service.js';
import { AuthService } from './auth.service.js';

const USER_ID = '6720f1c2a1b2c3d4e5f60718';

function fakeUser(overrides: Partial<UserDocument> = {}): UserDocument {
  return {
    id: USER_ID,
    name: 'Jane',
    email: 'jane@example.com',
    tokenVersion: 0,
    lastLoginAt: null,
    ...overrides,
  } as UserDocument;
}

describe('AuthService', () => {
  const passwords = new PasswordService();
  const jwt = new JwtService({
    secret: 'unit-test-secret-at-least-32-characters',
    signOptions: { expiresIn: 3600 },
  });
  let users: {
    findById: ReturnType<typeof vi.fn>;
    findByIdWithPassword: ReturnType<typeof vi.fn>;
    findByEmailWithPassword: ReturnType<typeof vi.fn>;
    recordLogin: ReturnType<typeof vi.fn>;
    setPassword: ReturnType<typeof vi.fn>;
  };
  let service: AuthService;
  let passwordHash: string;

  beforeAll(async () => {
    passwordHash = await passwords.hash('correct-password');
  });

  beforeEach(async () => {
    users = {
      findById: vi.fn(),
      findByIdWithPassword: vi.fn(),
      findByEmailWithPassword: vi.fn(),
      recordLogin: vi.fn().mockResolvedValue(undefined),
      setPassword: vi.fn(),
    };
    service = new AuthService(users as unknown as UsersService, passwords, jwt);
    await service.onModuleInit();
  });

  describe('login', () => {
    it('returns the user and records the login for valid credentials', async () => {
      users.findByEmailWithPassword.mockResolvedValue(fakeUser({ passwordHash }));

      const user = await service.login('jane@example.com', 'correct-password');

      expect(user.id).toBe(USER_ID);
      expect(user.lastLoginAt).toBeInstanceOf(Date);
      expect(users.recordLogin).toHaveBeenCalledWith(USER_ID);
    });

    it('rejects a wrong password with a generic message', async () => {
      users.findByEmailWithPassword.mockResolvedValue(fakeUser({ passwordHash }));

      await expect(service.login('jane@example.com', 'wrong-password')).rejects.toThrow(
        new UnauthorizedException('Invalid email or password'),
      );
      expect(users.recordLogin).not.toHaveBeenCalled();
    });

    it('rejects an unknown email with the same message, still verifying a hash', async () => {
      users.findByEmailWithPassword.mockResolvedValue(null);
      const verifySpy = vi.spyOn(passwords, 'verify');

      await expect(service.login('nobody@example.com', 'whatever')).rejects.toThrow(
        new UnauthorizedException('Invalid email or password'),
      );
      // Constant-work path: a hash is verified even though the user doesn't exist.
      expect(verifySpy).toHaveBeenCalledOnce();
      verifySpy.mockRestore();
    });
  });

  describe('sessions', () => {
    it('accepts a token whose tokenVersion matches the user', async () => {
      const user = fakeUser({ tokenVersion: 3 });
      users.findById.mockResolvedValue(user);

      const token = await service.createSessionToken(user);

      await expect(service.verifySession(token)).resolves.toBe(user);
    });

    it('rejects a token issued before a password change', async () => {
      const token = await service.createSessionToken(fakeUser({ tokenVersion: 1 }));
      users.findById.mockResolvedValue(fakeUser({ tokenVersion: 2 }));

      await expect(service.verifySession(token)).resolves.toBeNull();
    });

    it('rejects a token of a removed admin', async () => {
      const token = await service.createSessionToken(fakeUser());
      users.findById.mockResolvedValue(null);

      await expect(service.verifySession(token)).resolves.toBeNull();
    });

    it('rejects tokens signed with another secret, expired or malformed', async () => {
      const foreign = await new JwtService({
        secret: 'some-other-secret-at-least-32-characters',
      }).signAsync({
        sub: USER_ID,
        tv: 0,
      });
      const expired = await jwt.signAsync({ sub: USER_ID, tv: 0 }, { expiresIn: -10 });
      const wrongShape = await jwt.signAsync({ sub: 42 });

      for (const token of [foreign, expired, wrongShape, 'not-a-jwt']) {
        await expect(service.verifySession(token)).resolves.toBeNull();
      }
      expect(users.findById).not.toHaveBeenCalled();
    });
  });

  describe('changePassword', () => {
    it('rejects an incorrect current password with 400 (not 401)', async () => {
      users.findByIdWithPassword.mockResolvedValue(fakeUser({ passwordHash }));

      await expect(
        service.changePassword(USER_ID, 'wrong-password', 'new-password-123'),
      ).rejects.toThrow(new BadRequestException('Current password is incorrect'));
      expect(users.setPassword).not.toHaveBeenCalled();
    });

    it('rejects reusing the current password', async () => {
      users.findByIdWithPassword.mockResolvedValue(fakeUser({ passwordHash }));

      await expect(
        service.changePassword(USER_ID, 'correct-password', 'correct-password'),
      ).rejects.toThrow(BadRequestException);
    });

    it('sets the new password when the current one is correct', async () => {
      users.findByIdWithPassword.mockResolvedValue(fakeUser({ passwordHash }));
      users.setPassword.mockResolvedValue(fakeUser({ tokenVersion: 1 }));

      const updated = await service.changePassword(USER_ID, 'correct-password', 'new-password-123');

      expect(users.setPassword).toHaveBeenCalledWith(USER_ID, 'new-password-123');
      expect(updated.tokenVersion).toBe(1);
    });
  });
});
