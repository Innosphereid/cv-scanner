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
import { UserEntity } from './user.entity';

@Entity({ name: 'user_analytics' })
export class UserAnalyticsEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;

  @Index('idx_user_analytics_user_id')
  @Column({ name: 'user_id', type: 'uuid', unique: true })
  userId!: string;

  @Index('idx_user_analytics_total_cv_uploads')
  @Column({ name: 'total_cv_uploads', type: 'int', default: 0 })
  totalCvUploads!: number;

  @Column({ name: 'total_job_descriptions', type: 'int', default: 0 })
  totalJobDescriptions!: number;

  @Index('idx_user_analytics_total_analyses')
  @Column({ name: 'total_analyses', type: 'int', default: 0 })
  totalAnalyses!: number;

  @Column({ name: 'successful_analyses', type: 'int', default: 0 })
  successfulAnalyses!: number;

  @Column({ name: 'failed_analyses', type: 'int', default: 0 })
  failedAnalyses!: number;

  @Index('idx_user_analytics_average_analysis_score')
  @Column({
    name: 'average_analysis_score',
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
  })
  averageAnalysisScore!: number | null;

  @Column({ name: 'last_analysis_date', type: 'timestamptz', nullable: true })
  lastAnalysisDate!: Date | null;

  @Column({ name: 'total_storage_used_bytes', type: 'bigint', default: 0 })
  totalStorageUsedBytes!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
