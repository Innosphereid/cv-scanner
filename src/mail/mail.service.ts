import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

export interface SendVerificationEmailJob {
  toEmail: string;
  verifyUrl: string;
}

export interface SendResetOtpEmailJob {
  toEmail: string;
  otp: string;
  appName: string;
}

@Injectable()
export class MailService {
  constructor(@InjectQueue('mail') private readonly mailQueue: Queue) {}

  async enqueueVerificationEmail(job: SendVerificationEmailJob): Promise<void> {
    await this.mailQueue.add('sendVerificationEmail', job, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
      removeOnComplete: true,
      removeOnFail: false,
    });
  }

  async enqueueResetOtpEmail(job: SendResetOtpEmailJob): Promise<void> {
    await this.mailQueue.add('sendResetOtpEmail', job, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
      removeOnComplete: true,
      removeOnFail: false,
    });
  }
}
