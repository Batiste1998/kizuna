import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { type Transporter } from 'nodemailer';

export interface MailMessage {
  to: string;
  subject: string;
  html?: string;
  text?: string;
}

/**
 * Transactional email sender. Uses SMTP when configured (SMTP_HOST), otherwise
 * falls back to a JSON transport that logs the rendered message — so password
 * resets and email verification work in development without a mail server.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter;
  private readonly from: string;
  private readonly smtpConfigured: boolean;

  constructor(config: ConfigService) {
    this.from = config.get<string>('MAIL_FROM') ?? 'Kizuna <no-reply@kizuna.dev>';
    const host = config.get<string>('SMTP_HOST');
    if (host) {
      this.smtpConfigured = true;
      const user = config.get<string>('SMTP_USER');
      this.transporter = nodemailer.createTransport({
        host,
        port: config.get<number>('SMTP_PORT') ?? 587,
        secure: config.get<boolean>('SMTP_SECURE') ?? false,
        auth: user ? { user, pass: config.get<string>('SMTP_PASS') } : undefined,
      });
    } else {
      this.smtpConfigured = false;
      this.transporter = nodemailer.createTransport({ jsonTransport: true });
    }
  }

  /** True when a real SMTP transport is configured (emails actually leave the server). */
  get isConfigured(): boolean {
    return this.smtpConfigured;
  }

  async sendMail(message: MailMessage): Promise<void> {
    try {
      const info = await this.transporter.sendMail({ from: this.from, ...message });
      if (!this.smtpConfigured) {
        this.logger.warn(
          `✉️  [DEV — pas de SMTP] email simulé pour ${message.to} — « ${message.subject} »\n` +
            `${(info as { message?: string }).message ?? message.text ?? ''}`,
        );
      }
    } catch (err) {
      this.logger.error(`Échec d'envoi d'email à ${message.to}: ${(err as Error).message}`);
    }
  }
}
