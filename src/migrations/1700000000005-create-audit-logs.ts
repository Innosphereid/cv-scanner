import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAuditLogs1700000000005 implements MigrationInterface {
  name = 'CreateAuditLogs1700000000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public.audit_logs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NULL REFERENCES public.users(id) ON DELETE SET NULL,
        event varchar(100) NOT NULL,
        metadata jsonb NULL,
        ip varchar(64) NULL,
        user_agent varchar(255) NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs (user_id);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_logs_event ON public.audit_logs (event);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs (created_at);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS public.audit_logs;`);
  }
}
