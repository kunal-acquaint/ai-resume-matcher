import { ConflictException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { Env } from '../../config/env.schema.js';
import { AdminSeeder, SeedConfigError } from './admin-seeder.js';
import type { UsersService } from './users.service.js';

describe('AdminSeeder', () => {
  const create = vi.fn();

  function seederWith(
    values: Partial<Record<'ADMIN_NAME' | 'ADMIN_EMAIL' | 'ADMIN_PASSWORD', string>>,
  ) {
    const config = { get: (key: keyof typeof values) => values[key] };
    return new AdminSeeder(
      { create } as unknown as UsersService,
      config as unknown as ConfigService<Env, true>,
    );
  }

  const valid = {
    ADMIN_NAME: 'Admin',
    ADMIN_EMAIL: 'Admin@Example.com',
    ADMIN_PASSWORD: 'a-strong-password',
  };

  beforeEach(() => {
    create.mockReset();
  });

  it('creates the admin with a lowercased email', async () => {
    create.mockResolvedValue({});

    await expect(seederWith(valid).seed()).resolves.toEqual({
      status: 'created',
      email: 'admin@example.com',
    });
    expect(create).toHaveBeenCalledWith({
      name: 'Admin',
      email: 'admin@example.com',
      password: 'a-strong-password',
    });
  });

  it('is idempotent when the admin already exists', async () => {
    create.mockRejectedValue(new ConflictException());

    await expect(seederWith(valid).seed()).resolves.toMatchObject({ status: 'exists' });
  });

  it.each([
    [{ ...valid, ADMIN_NAME: undefined }, 'ADMIN_NAME'],
    [{ ...valid, ADMIN_EMAIL: 'not-an-email' }, 'ADMIN_EMAIL'],
    [{ ...valid, ADMIN_PASSWORD: 'short' }, 'ADMIN_PASSWORD'],
    [{ ...valid, ADMIN_PASSWORD: 'change-me-now' }, 'example value'],
  ])('refuses invalid configuration %o', async (values, message) => {
    await expect(seederWith(values).seed()).rejects.toThrow(SeedConfigError);
    await expect(seederWith(values).seed()).rejects.toThrow(message);
    expect(create).not.toHaveBeenCalled();
  });
});
