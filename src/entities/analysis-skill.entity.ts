import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { AnalysisEntity } from './analysis.entity';
import { SkillEntity } from './skill.entity';

@Entity({ name: 'analysis_skills' })
export class AnalysisSkillEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => AnalysisEntity, analysis => analysis.analysisSkills, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'analysis_id' })
  analysis!: AnalysisEntity;

  @Index('idx_analysis_skills_analysis_id')
  @Column({ name: 'analysis_id', type: 'uuid' })
  analysisId!: string;

  @ManyToOne(() => SkillEntity, skill => skill.analysisSkills, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'skill_id' })
  skill!: SkillEntity;

  @Index('idx_analysis_skills_skill_id')
  @Column({ name: 'skill_id', type: 'uuid' })
  skillId!: string;

  @Index('idx_analysis_skills_is_required')
  @Column({ name: 'is_required', type: 'boolean', default: false })
  isRequired!: boolean;

  @Index('idx_analysis_skills_is_found')
  @Column({ name: 'is_found', type: 'boolean', default: false })
  isFound!: boolean;

  @Column({
    name: 'confidence_score',
    type: 'decimal',
    precision: 3,
    scale: 2,
  })
  confidenceScore!: number;

  @Column({
    name: 'relevance_score',
    type: 'decimal',
    precision: 3,
    scale: 2,
  })
  relevanceScore!: number;

  @Index('idx_analysis_skills_match_score')
  @Column({
    name: 'match_score',
    type: 'decimal',
    precision: 3,
    scale: 2,
  })
  matchScore!: number;

  @Column({ name: 'evidence_text', type: 'text', array: true, nullable: true })
  evidenceText!: string[] | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
