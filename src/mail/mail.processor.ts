import { Processor, WorkerHost } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';
import {
  createTransport,
  type Transporter,
  type TransportOptions,
} from 'nodemailer';
import * as Handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';
import type { SendVerificationEmailJob } from './mail.service';

@Processor('mail')
export class MailProcessor extends WorkerHost {
  private transporter: Transporter;

  constructor(private readonly config: ConfigService) {
    super();
    const makeTransport: (opts: TransportOptions) => Transporter =
      createTransport;
    this.transporter = makeTransport({
      host: this.config.get<string>('mailer.host')!,
      port: this.config.get<number>('mailer.port')!,
      auth: {
        user: this.config.get<string>('mailer.user')!,
        pass: this.config.get<string>('mailer.pass')!,
      },
    });
  }

  async process(job: Job<SendVerificationEmailJob>): Promise<void> {
    if (job.name === 'sendVerificationEmail') {
      await this.handleSendVerification(job.data);
    }
  }

  private async handleSendVerification(
    data: SendVerificationEmailJob,
  ): Promise<void> {
    const templatePath = path.join(
      process.cwd(),
      'src',
      'mail',
      'mail-templates',
      'verify-email.hbs',
    );
    const templateSource = fs.readFileSync(templatePath, 'utf8');
    const compileTemplate: typeof Handlebars.compile = Handlebars.compile;
    const template = compileTemplate<{ verifyUrl: string }>(templateSource);
    const html = template({ verifyUrl: data.verifyUrl });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    const send: Transporter['sendMail'] = this.transporter.sendMail.bind(
      this.transporter,
    );
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    await send({
      from: `${this.config.get<string>('mailer.fromName')} <${this.config.get<string>('mailer.fromEmail')}>`,
      to: data.toEmail,
      subject: 'Verify your email',
      html,
    });
  }
}
