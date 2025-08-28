import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUsers1700000000002 implements MigrationInterface {
  name = 'CreateUsers1700000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public.users (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        email varchar(320) NOT NULL UNIQUE,
        password_hash varchar(255) NOT NULL,
        role varchar(50) NOT NULL DEFAULT 'user',
        verified boolean NOT NULL DEFAULT false,
        lockout_attempts int NOT NULL DEFAULT 0,
        locked_until timestamptz NULL,
        token_version int NOT NULL DEFAULT 1,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz NULL
      );
    `);

    // Defensive alignment in case a prior init script created a different `users` table shape
    await queryRunner.query(`
      ALTER TABLE public.users
        ADD COLUMN IF NOT EXISTS password_hash varchar(255),
        ADD COLUMN IF NOT EXISTS role varchar(50) DEFAULT 'user' NOT NULL,
        ADD COLUMN IF NOT EXISTS verified boolean DEFAULT false NOT NULL,
        ADD COLUMN IF NOT EXISTS lockout_attempts int DEFAULT 0 NOT NULL,
        ADD COLUMN IF NOT EXISTS locked_until timestamptz NULL,
        ADD COLUMN IF NOT EXISTS token_version int DEFAULT 1 NOT NULL,
        ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now() NOT NULL,
        ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now() NOT NULL,
        ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON public.users (email);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_users_locked_until ON public.users (locked_until);
    `);

    // updated_at trigger
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION public.set_timestamp()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = now();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await queryRunner.query(`
      DROP TRIGGER IF EXISTS set_timestamp_on_users ON public.users;
      CREATE TRIGGER set_timestamp_on_users
      BEFORE UPDATE ON public.users
      FOR EACH ROW
      EXECUTE FUNCTION public.set_timestamp();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS set_timestamp_on_users ON public.users;`,
    );
    // Do not drop the function if used elsewhere; attempt safe drop
    await queryRunner.query(`DROP FUNCTION IF EXISTS public.set_timestamp();`);
    await queryRunner.query(`DROP TABLE IF EXISTS public.users;`);
  }
}
