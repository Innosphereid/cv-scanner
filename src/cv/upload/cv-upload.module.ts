import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CvUploadEntity } from '../../entities/cv-upload.entity';
import { CvUploadService } from './cv-upload.service';
import { CvUploadController } from './cv-upload.controller';
import { CloudinaryModule } from '../../config/cloudinary/cloudinary.module';
import { LoginModule } from '../../auth/login/login.module';
import { FileHashService } from './services/file-hash.service';
import { DuplicateDetectionService } from './services/duplicate-detection.service';
import { CvUploadProcessorService } from './services/cv-upload-processor.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([CvUploadEntity]),
    // Register Cloudinary provider for this feature
    CloudinaryModule.register(),
    // Import login module to provide AccessTokenGuard
    LoginModule,
  ],
  controllers: [CvUploadController],
  providers: [
    CvUploadService,
    FileHashService,
    DuplicateDetectionService,
    CvUploadProcessorService,
  ],
  exports: [
    CvUploadService,
    FileHashService,
    DuplicateDetectionService,
    CvUploadProcessorService,
  ],
})
export class CvUploadModule {}
