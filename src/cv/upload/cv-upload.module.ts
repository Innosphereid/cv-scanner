import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CvUploadEntity } from '../../entities/cv-upload.entity';
import { CvUploadService } from './cv-upload.service';
import { CvUploadController } from './cv-upload.controller';
import { CloudinaryModule } from '../../config/cloudinary/cloudinary.module';
import { LoginModule } from '../../auth/login/login.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CvUploadEntity]),
    // Register Cloudinary provider for this feature
    CloudinaryModule.register(),
    // Import login module to provide AccessTokenGuard
    LoginModule,
  ],
  controllers: [CvUploadController],
  providers: [CvUploadService],
  exports: [CvUploadService],
})
export class CvUploadModule {}
