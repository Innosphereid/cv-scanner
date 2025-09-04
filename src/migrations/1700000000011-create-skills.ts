import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSkills1700000000011 implements MigrationInterface {
  name = 'CreateSkills1700000000011';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public.skills (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name varchar(100) NOT NULL UNIQUE,
        category varchar(20) NOT NULL CHECK (category IN ('hard_skill', 'soft_skill')),
        description text NULL,
        synonyms text[] NULL,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_skills_name ON public.skills (name);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_skills_category ON public.skills (category);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_skills_is_active ON public.skills (is_active);
    `);

    // Insert common skills
    await queryRunner.query(`
      INSERT INTO public.skills (name, category, description) VALUES
      ('JavaScript', 'hard_skill', 'Programming language for web development'),
      ('Python', 'hard_skill', 'Programming language for various applications'),
      ('Java', 'hard_skill', 'Object-oriented programming language'),
      ('React', 'hard_skill', 'JavaScript library for building user interfaces'),
      ('Node.js', 'hard_skill', 'JavaScript runtime for server-side development'),
      ('SQL', 'hard_skill', 'Structured Query Language for databases'),
      ('Git', 'hard_skill', 'Version control system'),
      ('Docker', 'hard_skill', 'Containerization platform'),
      ('AWS', 'hard_skill', 'Amazon Web Services cloud platform'),
      ('Communication', 'soft_skill', 'Ability to convey information effectively'),
      ('Leadership', 'soft_skill', 'Ability to guide and motivate others'),
      ('Problem Solving', 'soft_skill', 'Ability to find solutions to complex issues'),
      ('Teamwork', 'soft_skill', 'Ability to work collaboratively with others'),
      ('Time Management', 'soft_skill', 'Ability to manage time effectively'),
      ('Adaptability', 'soft_skill', 'Ability to adjust to new conditions')
      ON CONFLICT (name) DO NOTHING;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS public.skills;`);
  }
}
