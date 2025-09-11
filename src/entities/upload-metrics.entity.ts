import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'upload_metrics' })
export class UploadMetricsEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('idx_upload_metrics_date_hour')
  @Column({ name: 'metric_date', type: 'date' })
  metricDate!: Date;

  @Column({ name: 'metric_hour', type: 'int' })
  metricHour!: number;

  @Index('idx_upload_metrics_total_uploads')
  @Column({ name: 'total_uploads', type: 'int', default: 0 })
  totalUploads!: number;

  @Column({ name: 'successful_uploads', type: 'int', default: 0 })
  successfulUploads!: number;

  @Column({ name: 'failed_uploads', type: 'int', default: 0 })
  failedUploads!: number;

  @Index('idx_upload_metrics_total_analyses')
  @Column({ name: 'total_analyses', type: 'int', default: 0 })
  totalAnalyses!: number;

  @Column({ name: 'successful_analyses', type: 'int', default: 0 })
  successfulAnalyses!: number;

  @Column({ name: 'failed_analyses', type: 'int', default: 0 })
  failedAnalyses!: number;

  @Column({ name: 'total_storage_used_bytes', type: 'bigint', default: 0 })
  totalStorageUsedBytes!: number;

  @Column({
    name: 'average_analysis_score',
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
  })
  averageAnalysisScore!: number | null;

  @Column({ name: 'unique_users', type: 'int', default: 0 })
  uniqueUsers!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
