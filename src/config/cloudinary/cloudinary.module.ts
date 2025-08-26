import { DynamicModule, Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigType } from '@nestjs/config';
import { v2 as cloudinary, type ConfigOptions } from 'cloudinary';
import { cloudinaryConfig } from './cloudinary.config';
import { LoggerModule } from '../../utils/logger.module';
import { Logger } from '../../utils/logger';

export const CLOUDINARY_TOKEN = 'CLOUDINARY';

type CloudinaryClient = {
  config: (config: ConfigOptions) => void;
  api: { ping: () => Promise<unknown> };
};

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

@Global()
@Module({})
export class CloudinaryModule {
  static register(): DynamicModule {
    return {
      module: CloudinaryModule,
      imports: [ConfigModule.forFeature(cloudinaryConfig), LoggerModule],
      providers: [
        {
          provide: CLOUDINARY_TOKEN,
          inject: [cloudinaryConfig.KEY, Logger],
          useFactory: async (
            cfg: ConfigType<typeof cloudinaryConfig>,
            logger: Logger,
          ) => {
            const context = 'CloudinaryProvider';

            const config: ConfigOptions = {
              cloud_name: cfg.cloudName,
              api_key: cfg.apiKey,
              api_secret: cfg.apiSecret,
              secure: cfg.secure,
            };

            if (cfg.apiBaseUrl) {
              // cloudinary v2 supports `api_url` override for some operations via env
              process.env.CLOUDINARY_API_BASE_URL = cfg.apiBaseUrl;
            }

            // Configure SDK (idempotent)
            const cl = cloudinary as unknown as CloudinaryClient;
            cl.config(config);

            // Simple connectivity check with retry: fetch account usage
            const attempts = Math.max(0, cfg.retryAttempts);
            const delay = Math.max(0, cfg.retryDelayMs);
            for (let attempt = 0; attempt <= attempts; attempt++) {
              try {
                // A lightweight call to validate credentials
                await cl.api.ping();
                if (attempt > 0) {
                  logger.warn(
                    `Cloudinary connected after retry #${attempt}`,
                    context,
                  );
                } else {
                  logger.log('Cloudinary connected', context);
                }
                break;
              } catch (error) {
                const isLast = attempt === attempts;
                logger.error(
                  `Cloudinary connection failed (attempt ${attempt + 1}/${attempts + 1})`,
                  (error as Error).stack,
                  context,
                );
                if (isLast) {
                  if (cfg.failFast) {
                    const err =
                      error instanceof Error ? error : new Error(String(error));
                    throw err;
                  } else {
                    logger.warn(
                      'Continuing without verified Cloudinary connection',
                      context,
                    );
                  }
                } else if (delay > 0) {
                  await sleep(delay);
                }
              }
            }

            return cl;
          },
        },
      ],
      exports: [CLOUDINARY_TOKEN],
    };
  }
}
