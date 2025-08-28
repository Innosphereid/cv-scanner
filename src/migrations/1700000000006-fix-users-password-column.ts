import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixUsersPasswordColumn1700000000006 implements MigrationInterface {
  name = 'FixUsersPasswordColumn1700000000006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE public.users
        ADD COLUMN IF NOT EXISTS password_hash varchar(255);
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'password'
        ) THEN
          EXECUTE 'UPDATE public.users SET password_hash = password WHERE password_hash IS NULL';
        END IF;
      END$$;
    `);

    await queryRunner.query(`
      ALTER TABLE public.users
        ALTER COLUMN password_hash SET NOT NULL;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'password'
        ) THEN
          EXECUTE 'ALTER TABLE public.users DROP COLUMN password';
        END IF;
      END$$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE public.users
        ADD COLUMN IF NOT EXISTS password varchar(255) NULL;
    `);

    await queryRunner.query(`
      UPDATE public.users SET password = password_hash WHERE password IS NULL;
    `);
  }
}
