import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCvParsedContent1700000000009 implements MigrationInterface {
  name = 'CreateCvParsedContent1700000000009';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public.cv_parsed_content (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        cv_upload_id uuid NOT NULL REFERENCES public.cv_uploads(id) ON DELETE CASCADE,
        content_type varchar(20) NOT NULL DEFAULT 'plain_text' CHECK (content_type IN ('plain_text', 'markdown')),
        parsed_text text NOT NULL,
        confidence_score decimal(3,2) NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
        parsing_metadata jsonb NULL,
        version integer NOT NULL DEFAULT 1,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_cv_parsed_content_cv_upload_id ON public.cv_parsed_content (cv_upload_id);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_cv_parsed_content_content_type ON public.cv_parsed_content (content_type);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_cv_parsed_content_version ON public.cv_parsed_content (version);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_cv_parsed_content_created_at ON public.cv_parsed_content (created_at);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS public.cv_parsed_content;`);
  }
}
