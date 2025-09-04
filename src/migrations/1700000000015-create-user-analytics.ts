import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUserAnalytics1700000000015 implements MigrationInterface {
  name = 'CreateUserAnalytics1700000000015';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public.user_analytics (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
        total_cv_uploads integer NOT NULL DEFAULT 0,
        total_job_descriptions integer NOT NULL DEFAULT 0,
        total_analyses integer NOT NULL DEFAULT 0,
        successful_analyses integer NOT NULL DEFAULT 0,
        failed_analyses integer NOT NULL DEFAULT 0,
        average_analysis_score decimal(5,2) NULL,
        last_analysis_date timestamptz NULL,
        total_storage_used_bytes bigint NOT NULL DEFAULT 0,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_user_analytics_user_id ON public.user_analytics (user_id);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_user_analytics_total_cv_uploads ON public.user_analytics (total_cv_uploads);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_user_analytics_total_analyses ON public.user_analytics (total_analyses);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_user_analytics_average_analysis_score ON public.user_analytics (average_analysis_score);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_user_analytics_updated_at ON public.user_analytics (updated_at);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS public.user_analytics;`);
  }
}
