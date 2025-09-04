import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAnalysisResults1700000000013 implements MigrationInterface {
  name = 'CreateAnalysisResults1700000000013';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public.analysis_results (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        analysis_id uuid NOT NULL REFERENCES public.analyses(id) ON DELETE CASCADE,
        overall_score decimal(5,2) NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
        hard_skills_score decimal(5,2) NOT NULL CHECK (hard_skills_score >= 0 AND hard_skills_score <= 100),
        soft_skills_score decimal(5,2) NOT NULL CHECK (soft_skills_score >= 0 AND soft_skills_score <= 100),
        experience_score decimal(5,2) NOT NULL CHECK (experience_score >= 0 AND experience_score <= 100),
        education_score decimal(5,2) NOT NULL CHECK (education_score >= 0 AND education_score <= 100),
        feedback text NOT NULL,
        recommendations text[] NULL,
        strengths text[] NULL,
        weaknesses text[] NULL,
        missing_requirements text[] NULL,
        additional_notes text NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_analysis_results_analysis_id ON public.analysis_results (analysis_id);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_analysis_results_overall_score ON public.analysis_results (overall_score);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_analysis_results_created_at ON public.analysis_results (created_at);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS public.analysis_results;`);
  }
}
