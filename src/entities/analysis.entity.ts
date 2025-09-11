import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CvUploadEntity } from './cv-upload.entity';
import { JobDescriptionEntity } from './job-description.entity';
import { AnalysisResultEntity } from './analysis-result.entity';
import { AnalysisSkillEntity } from './analysis-skill.entity';

export type AnalysisStatus = 'pending' | 'processing' | 'completed' | 'failed';

@Entity({ name: 'analyses' })
export class AnalysisEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => CvUploadEntity, cvUpload => cvUpload.analyses, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'cv_upload_id' })
  cvUpload!: CvUploadEntity;

  @Index('idx_analyses_cv_upload_id')
  @Column({ name: 'cv_upload_id', type: 'uuid' })
  cvUploadId!: string;

  @ManyToOne(
    () => JobDescriptionEntity,
    jobDescription => jobDescription.analyses,
    { onDelete: 'CASCADE' },
  )
  @JoinColumn({ name: 'job_description_id' })
  jobDescription!: JobDescriptionEntity;

  @Index('idx_analyses_job_description_id')
  @Column({ name: 'job_description_id', type: 'uuid' })
  jobDescriptionId!: string;

  @Index('idx_analyses_status')
  @Column({
    name: 'status',
    type: 'varchar',
    length: 20,
    default: 'pending',
  })
  status!: AnalysisStatus;

  @Index('idx_analyses_ai_model_version')
  @Column({ name: 'ai_model_version', type: 'varchar', length: 50 })
  aiModelVersion!: string;

  @Column({ name: 'ai_model_name', type: 'varchar', length: 100 })
  aiModelName!: string;

  @Column({
    name: 'processing_started_at',
    type: 'timestamptz',
    nullable: true,
  })
  processingStartedAt!: Date | null;

  @Column({
    name: 'processing_completed_at',
    type: 'timestamptz',
    nullable: true,
  })
  processingCompletedAt!: Date | null;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage!: string | null;

  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata!: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  // Relations
  @OneToOne(() => AnalysisResultEntity, result => result.analysis)
  result!: AnalysisResultEntity;

  @OneToMany(() => AnalysisSkillEntity, analysisSkill => analysisSkill.analysis)
  analysisSkills!: AnalysisSkillEntity[];
}
