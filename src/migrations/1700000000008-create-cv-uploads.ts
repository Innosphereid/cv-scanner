import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCvUploads1700000000008 implements MigrationInterface {
  name = 'CreateCvUploads1700000000008';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public.cv_uploads (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
        original_filename varchar(255) NOT NULL,
        file_size_bytes bigint NOT NULL CHECK (file_size_bytes > 0 AND file_size_bytes <= 5242880),
        cloudinary_public_id varchar(255) NOT NULL,
        cloudinary_url text NOT NULL,
        cloudinary_secure_url text NOT NULL,
        file_hash varchar(255) NOT NULL,
        parsing_status varchar(20) NOT NULL DEFAULT 'pending' CHECK (parsing_status IN ('pending', 'processing', 'completed', 'failed')),
        parsing_error_message text NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz NULL
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_cv_uploads_user_id ON public.cv_uploads (user_id);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_cv_uploads_parsing_status ON public.cv_uploads (parsing_status);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_cv_uploads_created_at ON public.cv_uploads (created_at);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_cv_uploads_deleted_at ON public.cv_uploads (deleted_at);
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_cv_uploads_file_hash_user ON public.cv_uploads (file_hash, user_id) WHERE deleted_at IS NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS public.cv_uploads;`);
  }
}
