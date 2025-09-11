import { Module } from '@nestjs/common';
import { RouterModule } from '@nestjs/core';
import { CvUploadModule } from '../../../cv/upload/cv-upload.module';

@Module({
  imports: [
    CvUploadModule,
    RouterModule.register([
      {
        path: 'api/v1',
        children: [
          {
            path: 'cv',
            module: CvUploadModule,
          },
        ],
      },
    ]),
  ],
})
export class CvRoutesV1Module {}
