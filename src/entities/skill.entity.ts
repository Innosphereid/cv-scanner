import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { AnalysisSkillEntity } from './analysis-skill.entity';

export type SkillCategory = 'hard_skill' | 'soft_skill';

@Entity({ name: 'skills' })
export class SkillEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('idx_skills_name')
  @Column({ name: 'name', type: 'varchar', length: 100, unique: true })
  name!: string;

  @Index('idx_skills_category')
  @Column({
    name: 'category',
    type: 'varchar',
    length: 20,
  })
  category!: SkillCategory;

  @Column({ name: 'description', type: 'text', nullable: true })
  description!: string | null;

  @Column({ name: 'synonyms', type: 'text', array: true, nullable: true })
  synonyms!: string[] | null;

  @Index('idx_skills_is_active')
  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  // Relations
  @OneToMany(() => AnalysisSkillEntity, analysisSkill => analysisSkill.skill)
  analysisSkills!: AnalysisSkillEntity[];
}
