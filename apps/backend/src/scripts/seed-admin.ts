import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module.js';
import { AdminSeeder, SeedConfigError } from '../modules/users/admin-seeder.js';

/** `npm run seed:admin`: creates the first admin from the ADMIN_* variables in `.env`. */
async function main(): Promise<void> {
  const logger = new Logger('SeedAdmin');
  // Hide Nest's bootstrap logs, then re-enable normal logging for the script's own output.
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  Logger.overrideLogger(['log', 'warn', 'error']);

  try {
    const result = await app.get(AdminSeeder).seed();
    logger.log(
      result.status === 'created'
        ? `Admin ${result.email} created. You can now log in.`
        : `Admin ${result.email} already exists. Nothing to do.`,
    );
  } catch (error) {
    if (error instanceof SeedConfigError) {
      logger.error(`Cannot seed admin. Fix these values in apps/backend/.env:\n${error.message}`);
    } else {
      logger.error('Seeding failed', error instanceof Error ? error.stack : String(error));
    }
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

await main();
