import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePasswordResetOtps1700000000004
  implements MigrationInterface
{
  name = 'CreatePasswordResetOtps1700000000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public.password_reset_otps (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
        otp_hash varchar(255) NOT NULL,
        expires_at timestamptz NOT NULL,
        used_at timestamptz NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_pro_user_id ON public.password_reset_otps (user_id);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_pro_otp_hash ON public.password_reset_otps (otp_hash);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_pro_expires_at ON public.password_reset_otps (expires_at);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS public.password_reset_otps;`);
  }
}
