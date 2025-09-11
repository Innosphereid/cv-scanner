import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserEntity } from './user.entity';
import { CvParsedContentEntity } from './cv-parsed-content.entity';
import { AnalysisEntity } from './analysis.entity';

export type ParsingStatus = 'pending' | 'processing' | 'completed' | 'failed';

@Entity({ name: 'cv_uploads' })
export class CvUploadEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;

  @Index('idx_cv_uploads_user_id')
  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ name: 'original_filename', type: 'varchar', length: 255 })
  originalFilename!: string;

  @Column({ name: 'file_size_bytes', type: 'bigint' })
  fileSizeBytes!: number;

  @Column({ name: 'cloudinary_public_id', type: 'varchar', length: 255 })
  cloudinaryPublicId!: string;

  @Column({ name: 'cloudinary_url', type: 'text' })
  cloudinaryUrl!: string;

  @Column({ name: 'cloudinary_secure_url', type: 'text' })
  cloudinarySecureUrl!: string;

  @Column({ name: 'file_hash', type: 'varchar', length: 255 })
  fileHash!: string;

  @Index('idx_cv_uploads_parsing_status')
  @Column({
    name: 'parsing_status',
    type: 'varchar',
    length: 20,
    default: 'pending',
  })
  parsingStatus!: ParsingStatus;

  @Column({ name: 'parsing_error_message', type: 'text', nullable: true })
  parsingErrorMessage!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @Index('idx_cv_uploads_deleted_at')
  @Column({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt!: Date | null;

  // Relations
  @OneToMany(
    () => CvParsedContentEntity,
    parsedContent => parsedContent.cvUpload,
  )
  parsedContents!: CvParsedContentEntity[];

  @OneToMany(() => AnalysisEntity, analysis => analysis.cvUpload)
  analyses!: AnalysisEntity[];
}
