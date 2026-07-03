import { Logger } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import nodemailer, { type Transporter } from 'nodemailer';
import { MailService } from './mail.service';

vi.mock('nodemailer', () => ({
  default: { createTransport: vi.fn() },
}));

const createTransport = vi.mocked(nodemailer.createTransport);

function makeConfig(values: Record<string, unknown>): ConfigService {
  return { get: vi.fn((key: string) => values[key]) } as unknown as ConfigService;
}

function stubTransporter(sendMail = vi.fn().mockResolvedValue({})) {
  const transporter = { sendMail } as unknown as Transporter;
  createTransport.mockReturnValue(transporter);
  return sendMail;
}

describe('MailService', () => {
  beforeEach(() => {
    createTransport.mockReset();
    vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates a real SMTP transport when SMTP_HOST is set', () => {
    stubTransporter();
    const service = new MailService(
      makeConfig({
        SMTP_HOST: 'smtp.test.dev',
        SMTP_PORT: 2525,
        SMTP_SECURE: true,
        SMTP_USER: 'mailer',
        SMTP_PASS: 'secret',
      }),
    );

    expect(service.isConfigured).toBe(true);
    expect(createTransport).toHaveBeenCalledWith({
      host: 'smtp.test.dev',
      port: 2525,
      secure: true,
      auth: { user: 'mailer', pass: 'secret' },
    });
  });

  it('defaults port to 587 and omits auth without SMTP_USER', () => {
    stubTransporter();
    new MailService(makeConfig({ SMTP_HOST: 'smtp.test.dev' }));

    expect(createTransport).toHaveBeenCalledWith({
      host: 'smtp.test.dev',
      port: 587,
      secure: false,
      auth: undefined,
    });
  });

  it('falls back to the JSON log transport without SMTP_HOST', () => {
    stubTransporter();
    const service = new MailService(makeConfig({}));

    expect(service.isConfigured).toBe(false);
    expect(createTransport).toHaveBeenCalledWith({ jsonTransport: true });
  });

  it('sendMail forwards the message with the configured sender', async () => {
    const sendMail = stubTransporter();
    const service = new MailService(
      makeConfig({ SMTP_HOST: 'smtp.test.dev', MAIL_FROM: 'Kizuna <hello@kizuna.dev>' }),
    );

    await service.sendMail({ to: 'alt@test.dev', subject: 'Sujet', html: '<p>Hi</p>', text: 'Hi' });

    expect(sendMail).toHaveBeenCalledWith({
      from: 'Kizuna <hello@kizuna.dev>',
      to: 'alt@test.dev',
      subject: 'Sujet',
      html: '<p>Hi</p>',
      text: 'Hi',
    });
  });

  it('logs the simulated email in dev mode (no SMTP)', async () => {
    const warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    stubTransporter(vi.fn().mockResolvedValue({ message: '{"rendered":true}' }));
    const service = new MailService(makeConfig({}));

    await service.sendMail({ to: 'alt@test.dev', subject: 'Bienvenue' });

    expect(warn).toHaveBeenCalledTimes(1);
    const logged = warn.mock.calls[0][0] as string;
    expect(logged).toContain('alt@test.dev');
    expect(logged).toContain('Bienvenue');
    expect(logged).toContain('{"rendered":true}');
  });

  it('does not log the dev warning when SMTP is configured', async () => {
    const warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    stubTransporter();
    const service = new MailService(makeConfig({ SMTP_HOST: 'smtp.test.dev' }));

    await service.sendMail({ to: 'alt@test.dev', subject: 'Sujet' });

    expect(warn).not.toHaveBeenCalled();
  });

  it('swallows transport errors and logs them', async () => {
    const error = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    stubTransporter(vi.fn().mockRejectedValue(new Error('connection refused')));
    const service = new MailService(makeConfig({ SMTP_HOST: 'smtp.test.dev' }));

    await expect(
      service.sendMail({ to: 'alt@test.dev', subject: 'Sujet' }),
    ).resolves.toBeUndefined();

    expect(error).toHaveBeenCalledTimes(1);
    expect(error.mock.calls[0][0]).toContain('connection refused');
  });
});
