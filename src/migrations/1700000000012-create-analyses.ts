import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAnalyses1700000000012 implements MigrationInterface {
  name = 'CreateAnalyses1700000000012';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public.analyses (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        cv_upload_id uuid NOT NULL REFERENCES public.cv_uploads(id) ON DELETE CASCADE,
        job_description_id uuid NOT NULL REFERENCES public.job_descriptions(id) ON DELETE CASCADE,
        status varchar(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
        ai_model_version varchar(50) NOT NULL,
        ai_model_name varchar(100) NOT NULL,
        processing_started_at timestamptz NULL,
        processing_completed_at timestamptz NULL,
        error_message text NULL,
        metadata jsonb NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_analyses_cv_upload_id ON public.analyses (cv_upload_id);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_analyses_job_description_id ON public.analyses (job_description_id);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_analyses_status ON public.analyses (status);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_analyses_ai_model_version ON public.analyses (ai_model_version);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_analyses_created_at ON public.analyses (created_at);
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_analyses_cv_job_unique ON public.analyses (cv_upload_id, job_description_id, ai_model_version);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS public.analyses;`);
  }
}
