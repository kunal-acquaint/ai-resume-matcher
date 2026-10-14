import { PasswordService } from './password.service.js';

describe('PasswordService', () => {
  const passwords = new PasswordService();

  it('produces an argon2id hash that does not contain the password', async () => {
    const hash = await passwords.hash('correct horse battery staple');

    expect(hash).toMatch(/^\$argon2id\$/);
    expect(hash).not.toContain('correct horse');
  });

  it('salts hashes so the same password hashes differently', async () => {
    const [a, b] = await Promise.all([
      passwords.hash('same-password'),
      passwords.hash('same-password'),
    ]);

    expect(a).not.toBe(b);
  });

  it('verifies the right password and rejects a wrong one', async () => {
    const hash = await passwords.hash('s3cret-password');

    await expect(passwords.verify(hash, 's3cret-password')).resolves.toBe(true);
    await expect(passwords.verify(hash, 'wrong-password')).resolves.toBe(false);
  });

  it('treats a malformed hash as a failed match instead of throwing', async () => {
    await expect(passwords.verify('not-a-hash', 'anything')).resolves.toBe(false);
  });
});
