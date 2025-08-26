import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { CLOUDINARY_TOKEN, CloudinaryModule } from './cloudinary.module';
import { cloudinaryConfig } from './cloudinary.config';
import { LoggerModule } from '../../utils/logger.module';

describe('CloudinaryModule', () => {
  it('should provide cloudinary client with valid env (no ping)', async () => {
    const prevEnv = { ...process.env };
    process.env.CLOUDINARY_CLOUD_NAME = 'demo';
    process.env.CLOUDINARY_API_KEY = 'key';
    process.env.CLOUDINARY_API_SECRET = 'secret';
    process.env.CLOUDINARY_FAIL_FAST = 'false';
    process.env.CLOUDINARY_RETRY_ATTEMPTS = '0';

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [cloudinaryConfig],
        }),
        LoggerModule,
        CloudinaryModule.register(),
      ],
    }).compile();

    const client = moduleRef.get<{ api?: { ping?: () => Promise<unknown> } }>(
      CLOUDINARY_TOKEN,
    );
    expect(client).toBeDefined();

    process.env = prevEnv;
  });
});


