import { ApiProperty } from '@nestjs/swagger';

export class UploadCvDto {
  @ApiProperty({ type: 'string', format: 'binary' })
  cv_file!: unknown;
}
