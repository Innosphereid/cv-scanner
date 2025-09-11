import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { AnalysisEntity } from './analysis.entity';

@Entity({ name: 'analysis_results' })
export class AnalysisResultEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @OneToOne(() => AnalysisEntity, analysis => analysis.result, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'analysis_id' })
  analysis!: AnalysisEntity;

  @Index('idx_analysis_results_analysis_id')
  @Column({ name: 'analysis_id', type: 'uuid' })
  analysisId!: string;

  @Index('idx_analysis_results_overall_score')
  @Column({
    name: 'overall_score',
    type: 'decimal',
    precision: 5,
    scale: 2,
  })
  overallScore!: number;

  @Column({
    name: 'hard_skills_score',
    type: 'decimal',
    precision: 5,
    scale: 2,
  })
  hardSkillsScore!: number;

  @Column({
    name: 'soft_skills_score',
    type: 'decimal',
    precision: 5,
    scale: 2,
  })
  softSkillsScore!: number;

  @Column({
    name: 'experience_score',
    type: 'decimal',
    precision: 5,
    scale: 2,
  })
  experienceScore!: number;

  @Column({
    name: 'education_score',
    type: 'decimal',
    precision: 5,
    scale: 2,
  })
  educationScore!: number;

  @Column({ name: 'feedback', type: 'text' })
  feedback!: string;

  @Column({
    name: 'recommendations',
    type: 'text',
    array: true,
    nullable: true,
  })
  recommendations!: string[] | null;

  @Column({ name: 'strengths', type: 'text', array: true, nullable: true })
  strengths!: string[] | null;

  @Column({ name: 'weaknesses', type: 'text', array: true, nullable: true })
  weaknesses!: string[] | null;

  @Column({
    name: 'missing_requirements',
    type: 'text',
    array: true,
    nullable: true,
  })
  missingRequirements!: string[] | null;

  @Column({ name: 'additional_notes', type: 'text', nullable: true })
  additionalNotes!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
