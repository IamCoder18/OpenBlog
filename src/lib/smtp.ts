import "server-only";

import nodemailer, { type Transporter } from "nodemailer";
import { config } from "@/lib/config";

export interface SmtpConfiguration {
  host: string;
  port: number;
  secure: boolean;
  from: string;
  auth?: {
    user: string;
    pass: string;
  };
}

const SMTP_VARIABLES = [
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_SECURE",
  "SMTP_USER",
  "SMTP_PASSWORD",
  "SMTP_FROM",
] as const;

export function parseSmtpConfiguration(
  environment: NodeJS.ProcessEnv = process.env
): SmtpConfiguration | null {
  const hasAnyConfiguration = SMTP_VARIABLES.some(variable =>
    Boolean(environment[variable]?.trim())
  );
  if (!hasAnyConfiguration) return null;

  const host = environment.SMTP_HOST?.trim();
  const from = environment.SMTP_FROM?.trim();
  if (!host || !from) {
    throw new Error(
      "Incomplete SMTP configuration: SMTP_HOST and SMTP_FROM are required"
    );
  }

  const rawPort = environment.SMTP_PORT?.trim() || "587";
  const port = Number(rawPort);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error("SMTP_PORT must be an integer between 1 and 65535");
  }

  const rawSecure = environment.SMTP_SECURE?.trim().toLowerCase();
  if (rawSecure && rawSecure !== "true" && rawSecure !== "false") {
    throw new Error('SMTP_SECURE must be either "true" or "false"');
  }

  const user = environment.SMTP_USER?.trim();
  const password = environment.SMTP_PASSWORD;
  if (Boolean(user) !== Boolean(password)) {
    throw new Error(
      "Incomplete SMTP authentication: SMTP_USER and SMTP_PASSWORD must be provided together"
    );
  }

  return {
    host,
    port,
    secure: rawSecure ? rawSecure === "true" : port === 465,
    from,
    ...(user && password ? { auth: { user, pass: password } } : {}),
  };
}

export const smtpConfiguration = parseSmtpConfiguration();

let transporter: Transporter | undefined;

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    character =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      })[character] ?? character
  );
}

export async function sendPasswordResetEmail(
  recipient: string,
  resetUrl: string
): Promise<void> {
  if (!smtpConfiguration) {
    throw new Error("Password reset email is not configured");
  }

  const parsedUrl = new URL(resetUrl);
  if (parsedUrl.origin !== config.BASE_URL) {
    throw new Error("Password reset URL has an unexpected origin");
  }

  const mailer = (transporter ??= nodemailer.createTransport({
    pool: true,
    host: smtpConfiguration.host,
    port: smtpConfiguration.port,
    secure: smtpConfiguration.secure,
    auth: smtpConfiguration.auth,
  }));

  const blogName = config.BLOG_NAME;
  await mailer.sendMail({
    from: smtpConfiguration.from,
    to: recipient,
    subject: `Reset your ${blogName} password`,
    text: `Reset your password within one hour: ${resetUrl}`,
    html: `<p>You requested a password reset for ${escapeHtml(blogName)}.</p><p><a href="${escapeHtml(resetUrl)}">Reset your password</a></p><p>This link expires in one hour. If you did not request it, you can safely ignore this email.</p>`,
  });
}
