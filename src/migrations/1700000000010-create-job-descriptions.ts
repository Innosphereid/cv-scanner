import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateJobDescriptions1700000000010 implements MigrationInterface {
  name = 'CreateJobDescriptions1700000000010';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public.job_descriptions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
        title varchar(255) NOT NULL,
        description_text text NOT NULL,
        company_name varchar(255) NULL,
        position_title varchar(255) NULL,
        version integer NOT NULL DEFAULT 1,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        deleted_at timestamptz NULL
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_job_descriptions_user_id ON public.job_descriptions (user_id);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_job_descriptions_title ON public.job_descriptions (title);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_job_descriptions_company_name ON public.job_descriptions (company_name);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_job_descriptions_position_title ON public.job_descriptions (position_title);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_job_descriptions_created_at ON public.job_descriptions (created_at);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_job_descriptions_deleted_at ON public.job_descriptions (deleted_at);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS public.job_descriptions;`);
  }
}
