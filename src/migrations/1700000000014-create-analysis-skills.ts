import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAnalysisSkills1700000000014 implements MigrationInterface {
  name = 'CreateAnalysisSkills1700000000014';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public.analysis_skills (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        analysis_id uuid NOT NULL REFERENCES public.analyses(id) ON DELETE CASCADE,
        skill_id uuid NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
        is_required boolean NOT NULL DEFAULT false,
        is_found boolean NOT NULL DEFAULT false,
        confidence_score decimal(3,2) NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
        relevance_score decimal(3,2) NOT NULL CHECK (relevance_score >= 0 AND relevance_score <= 1),
        match_score decimal(3,2) NOT NULL CHECK (match_score >= 0 AND match_score <= 1),
        evidence_text text[] NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_analysis_skills_analysis_id ON public.analysis_skills (analysis_id);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_analysis_skills_skill_id ON public.analysis_skills (skill_id);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_analysis_skills_is_required ON public.analysis_skills (is_required);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_analysis_skills_is_found ON public.analysis_skills (is_found);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_analysis_skills_match_score ON public.analysis_skills (match_score);
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_analysis_skills_analysis_skill_unique ON public.analysis_skills (analysis_id, skill_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS public.analysis_skills;`);
  }
}
