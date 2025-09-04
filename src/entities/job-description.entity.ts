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
import { AnalysisEntity } from './analysis.entity';

@Entity({ name: 'job_descriptions' })
export class JobDescriptionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;

  @Index('idx_job_descriptions_user_id')
  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Index('idx_job_descriptions_title')
  @Column({ name: 'title', type: 'varchar', length: 255 })
  title!: string;

  @Column({ name: 'description_text', type: 'text' })
  descriptionText!: string;

  @Index('idx_job_descriptions_company_name')
  @Column({
    name: 'company_name',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  companyName!: string | null;

  @Index('idx_job_descriptions_position_title')
  @Column({
    name: 'position_title',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  positionTitle!: string | null;

  @Column({ name: 'version', type: 'int', default: 1 })
  version!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @Index('idx_job_descriptions_deleted_at')
  @Column({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt!: Date | null;

  // Relations
  @OneToMany(() => AnalysisEntity, analysis => analysis.jobDescription)
  analyses!: AnalysisEntity[];
}
