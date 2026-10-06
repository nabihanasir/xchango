import nodemailer, { Transporter } from 'nodemailer';
import { logger } from '../utils/logger';

/**
 * Sends real emails through any SMTP server. The defaults target Gmail's free
 * SMTP (about 500 mails/day): set SMTP_USER to the Gmail address and SMTP_PASS
 * to a Google App Password. When SMTP_USER/SMTP_PASS are missing, emails are
 * skipped and the rest of the app keeps working.
 */

export interface EmailMessage {
  to: string | string[];
  subject: string;
  text: string;
  /** Optional call-to-action rendered as a button in the HTML version. */
  action?: { label: string; url: string };
}

let transporter: Transporter | null = null;
let warnedNotConfigured = false;

export const isEmailConfigured = () => Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);

const getTransporter = () => {
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT || 465);
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port,
      secure: port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      // Fail fast instead of nodemailer's 2-minute default when the mail server is unreachable.
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
    });
  }
  return transporter;
};

const escapeHtml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const renderHtml = ({ subject, text, action }: EmailMessage) => {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((block) => `<p style="margin:0 0 14px;line-height:1.6">${escapeHtml(block).replace(/\n/g, '<br>')}</p>`)
    .join('');
  const button = action
    ? `<p style="margin:24px 0"><a href="${escapeHtml(action.url)}" style="background:#B3202A;color:#ffffff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:bold">${escapeHtml(action.label)}</a></p>`
    : '';

  return `<div style="font-family:Arial,Helvetica,sans-serif;color:#1f2937;max-width:560px;margin:0 auto;padding:24px">
  <h2 style="color:#B3202A;margin:0 0 18px">${escapeHtml(subject)}</h2>
  ${paragraphs}${button}
  <p style="margin-top:32px;font-size:12px;color:#9ca3af">Sent by Xchango. You are receiving this because you have an account or a student enrolled in your course.</p>
</div>`;
};

/** Sends one email. Never throws: returns false when sending was skipped or failed. */
export const sendEmail = async (message: EmailMessage): Promise<boolean> => {
  const recipients = (Array.isArray(message.to) ? message.to : [message.to]).filter(Boolean);
  if (!recipients.length) {
    return false;
  }

  if (!isEmailConfigured()) {
    if (!warnedNotConfigured) {
      warnedNotConfigured = true;
      logger.warn('Email not sent: SMTP_USER and SMTP_PASS are not set');
    }
    return false;
  }

  const actionText = message.action ? `\n\n${message.action.label}: ${message.action.url}` : '';

  try {
    await getTransporter().sendMail({
      from: process.env.EMAIL_FROM || `Xchango <${process.env.SMTP_USER}>`,
      to: recipients.join(', '),
      subject: message.subject,
      text: `${message.text}${actionText}`,
      html: renderHtml(message),
    });
    return true;
  } catch (error) {
    logger.error('Email delivery failed', {
      subject: message.subject,
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
};
