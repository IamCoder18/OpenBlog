import { afterEach, describe, expect, it } from "vitest";
import { config } from "@/lib/config";
import { parseSmtpConfiguration } from "@/lib/smtp";

const originalBaseUrl = process.env.BASE_URL;

afterEach(() => {
  if (originalBaseUrl === undefined) delete process.env.BASE_URL;
  else process.env.BASE_URL = originalBaseUrl;
});

describe("canonical origin configuration", () => {
  it("normalizes an absolute URL to its origin", () => {
    process.env.BASE_URL = "https://blog.example.com/path";
    expect(config.BASE_URL).toBe("https://blog.example.com");
  });

  it("never exposes a relative or malformed canonical URL", () => {
    process.env.BASE_URL = "/";
    expect(config.BASE_URL).toBe("http://localhost:3000");
  });
});

describe("SMTP configuration", () => {
  it("treats a completely absent SMTP server as a supported configuration", () => {
    expect(parseSmtpConfiguration({})).toBeNull();
  });

  it("supports authenticated STARTTLS and unauthenticated implicit TLS relays", () => {
    expect(
      parseSmtpConfiguration({
        SMTP_HOST: "smtp.example.com",
        SMTP_FROM: "OpenBlog <noreply@example.com>",
        SMTP_USER: "openblog",
        SMTP_PASSWORD: "secret",
      })
    ).toEqual({
      host: "smtp.example.com",
      port: 587,
      secure: false,
      from: "OpenBlog <noreply@example.com>",
      auth: { user: "openblog", pass: "secret" },
    });
    const relay = parseSmtpConfiguration({
      SMTP_HOST: "relay.internal",
      SMTP_PORT: "465",
      SMTP_FROM: "noreply@example.com",
    });
    expect(relay).toMatchObject({ port: 465, secure: true });
    expect(relay).not.toHaveProperty("auth");
  });

  it("rejects partial or unsafe-to-guess SMTP settings", () => {
    expect(() =>
      parseSmtpConfiguration({ SMTP_HOST: "smtp.example.com" })
    ).toThrow(/SMTP_HOST and SMTP_FROM/);
    expect(() =>
      parseSmtpConfiguration({
        SMTP_HOST: "smtp.example.com",
        SMTP_FROM: "noreply@example.com",
        SMTP_USER: "openblog",
      })
    ).toThrow(/must be provided together/);
    expect(() =>
      parseSmtpConfiguration({
        SMTP_HOST: "smtp.example.com",
        SMTP_FROM: "noreply@example.com",
        SMTP_PORT: "70000",
      })
    ).toThrow(/between 1 and 65535/);
  });
});
