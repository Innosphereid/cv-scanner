import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUploadMetrics1700000000016 implements MigrationInterface {
  name = 'CreateUploadMetrics1700000000016';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public.upload_metrics (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        metric_date date NOT NULL,
        metric_hour integer NOT NULL CHECK (metric_hour >= 0 AND metric_hour <= 23),
        total_uploads integer NOT NULL DEFAULT 0,
        successful_uploads integer NOT NULL DEFAULT 0,
        failed_uploads integer NOT NULL DEFAULT 0,
        total_analyses integer NOT NULL DEFAULT 0,
        successful_analyses integer NOT NULL DEFAULT 0,
        failed_analyses integer NOT NULL DEFAULT 0,
        total_storage_used_bytes bigint NOT NULL DEFAULT 0,
        average_analysis_score decimal(5,2) NULL,
        unique_users integer NOT NULL DEFAULT 0,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_upload_metrics_date_hour ON public.upload_metrics (metric_date, metric_hour);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_upload_metrics_metric_date ON public.upload_metrics (metric_date);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_upload_metrics_total_uploads ON public.upload_metrics (total_uploads);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_upload_metrics_total_analyses ON public.upload_metrics (total_analyses);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_upload_metrics_created_at ON public.upload_metrics (created_at);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS public.upload_metrics;`);
  }
}
