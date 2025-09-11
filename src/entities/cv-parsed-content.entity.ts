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
import { CvUploadEntity } from './cv-upload.entity';

export type ContentType = 'plain_text' | 'markdown';

@Entity({ name: 'cv_parsed_content' })
export class CvParsedContentEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => CvUploadEntity, cvUpload => cvUpload.parsedContents, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'cv_upload_id' })
  cvUpload!: CvUploadEntity;

  @Index('idx_cv_parsed_content_cv_upload_id')
  @Column({ name: 'cv_upload_id', type: 'uuid' })
  cvUploadId!: string;

  @Index('idx_cv_parsed_content_content_type')
  @Column({
    name: 'content_type',
    type: 'varchar',
    length: 20,
    default: 'plain_text',
  })
  contentType!: ContentType;

  @Column({ name: 'parsed_text', type: 'text' })
  parsedText!: string;

  @Column({
    name: 'confidence_score',
    type: 'decimal',
    precision: 3,
    scale: 2,
  })
  confidenceScore!: number;

  @Column({ name: 'parsing_metadata', type: 'jsonb', nullable: true })
  parsingMetadata!: Record<string, any> | null;

  @Index('idx_cv_parsed_content_version')
  @Column({ name: 'version', type: 'int', default: 1 })
  version!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
