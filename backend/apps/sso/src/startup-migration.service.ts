import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

/**
 * Runs safe, idempotent SQL migrations on every app startup.
 * Use this instead of TypeORM synchronize (which crashes on tables > 1600 columns).
 *
 * All migrations must be:
 *  - Idempotent  (IF NOT EXISTS / IF EXISTS guards)
 *  - Non-destructive (no DROP TABLE, no column removal)
 */
@Injectable()
export class StartupMigrationService implements OnModuleInit {
  private readonly logger = new Logger(StartupMigrationService.name);

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async onModuleInit() {
    this.logger.log('Running startup migrations...');
    try {
      await this.runMigrations();
      this.logger.log('Startup migrations completed successfully.');
    } catch (error) {
      // Log but never crash the app — missing columns just mean features degrade gracefully.
      this.logger.error('Startup migration failed (non-fatal):', error?.message);
    }
  }

  private async runMigrations() {
    const runner = this.dataSource.createQueryRunner();
    await runner.connect();
    try {
      // ── user table ─────────────────────────────────────────────────────────

      // KYC application snapshot — stores a JSON copy of the user's profile at
      // the moment they submitted their KYC application.  Profile updates after
      // submission do NOT touch this column (preserves the submitted snapshot).
      await runner.query(`
        ALTER TABLE "user"
        ADD COLUMN IF NOT EXISTS "kycApplicationData" jsonb NULL;
      `);

      // ── Add future migrations below ────────────────────────────────────────
      // Pattern:
      //   await runner.query(`ALTER TABLE "table" ADD COLUMN IF NOT EXISTS "col" type NULL;`);

    } finally {
      await runner.release();
    }
  }
}
