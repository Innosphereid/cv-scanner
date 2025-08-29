import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSaltToPasswordResetOtps1700000000007
  implements MigrationInterface
{
  name = 'AddSaltToPasswordResetOtps1700000000007';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE public.password_reset_otps
      ADD COLUMN IF NOT EXISTS salt varchar(255) NOT NULL DEFAULT '';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE public.password_reset_otps
      DROP COLUMN IF EXISTS salt;
    `);
  }
}
