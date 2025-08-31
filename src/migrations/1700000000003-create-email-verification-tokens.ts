import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateEmailVerificationTokens1700000000003
  implements MigrationInterface
{
  name = 'CreateEmailVerificationTokens1700000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public.email_verification_tokens (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
        token_hash varchar(255) NOT NULL,
        expires_at timestamptz NOT NULL,
        used_at timestamptz NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_evt_user_id ON public.email_verification_tokens (user_id);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_evt_token_hash ON public.email_verification_tokens (token_hash);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_evt_expires_at ON public.email_verification_tokens (expires_at);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TABLE IF EXISTS public.email_verification_tokens;`,
    );
  }
}
