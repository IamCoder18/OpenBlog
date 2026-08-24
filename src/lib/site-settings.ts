import "server-only";

import { cache } from "react";
import { prisma } from "@/lib/db";
import { config } from "@/lib/config";
import {
  DEFAULT_PUBLICATION_SETTINGS,
  normalizePublicationSettings,
  type PublicationSettings,
} from "@/lib/publication-settings.shared";

export interface SiteProfile {
  name: string;
  description: string;
  logoUrl: string;
  contactEmail: string;
  socialUrl: string;
}

export type SiteProfileField = keyof SiteProfile;

const FIELD_ENV: Record<SiteProfileField, string | null> = {
  name: "BLOG_NAME",
  description: "BLOG_DESCRIPTION",
  logoUrl: "SITE_LOGO_URL",
  contactEmail: "SITE_CONTACT_EMAIL",
  socialUrl: "SITE_SOCIAL_URL",
};

function readEnv(field: SiteProfileField): string {
  const key = FIELD_ENV[field];
  if (!key) return "";
  const raw = process.env[key];
  return typeof raw === "string" ? raw.trim() : "";
}

export interface EnvOverrides {
  name: boolean;
  description: boolean;
  logoUrl: boolean;
  contactEmail: boolean;
  socialUrl: boolean;
}

export function getSiteProfileEnvOverrides(): EnvOverrides {
  return {
    name: readEnv("name").length > 0,
    description: readEnv("description").length > 0,
    logoUrl: readEnv("logoUrl").length > 0,
    contactEmail: readEnv("contactEmail").length > 0,
    socialUrl: readEnv("socialUrl").length > 0,
  };
}

function envValue(field: SiteProfileField): string {
  return readEnv(field);
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function safePublicUrl(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) return "";
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.toString()
      : "";
  } catch {
    return "";
  }
}

function normalizeSiteProfile(value: unknown): SiteProfile | null {
  if (!value || typeof value !== "object") return null;
  const profile = value as Partial<SiteProfile>;
  if (
    typeof profile.name !== "string" ||
    typeof profile.description !== "string"
  )
    return null;
  return {
    name: profile.name.trim().slice(0, 80),
    description: profile.description.trim().slice(0, 240),
    logoUrl: safePublicUrl(profile.logoUrl),
    contactEmail:
      typeof profile.contactEmail === "string"
        ? profile.contactEmail.trim().slice(0, 254)
        : "",
    socialUrl: safePublicUrl(profile.socialUrl),
  };
}

export const getSiteProfile = cache(async (): Promise<SiteProfile> => {
  let stored: SiteProfile | null = null;
  try {
    const setting = await prisma.siteSettings.findUnique({
      where: { key: "site_profile" },
    });
    if (setting) stored = normalizeSiteProfile(JSON.parse(setting.value));
  } catch {
    /* Builds can run without an attached database. */
  }
  const fallbackName = stored?.name || config.BLOG_NAME;
  return {
    name: envValue("name") || fallbackName,
    description:
      envValue("description") ||
      stored?.description ||
      `Independent stories from ${fallbackName}.`,
    logoUrl: envValue("logoUrl") || stored?.logoUrl || "",
    contactEmail:
      envValue("contactEmail") ||
      (stored?.contactEmail && isValidEmail(stored.contactEmail)
        ? stored.contactEmail
        : ""),
    socialUrl: envValue("socialUrl") || stored?.socialUrl || "",
  };
});

export interface SiteProfileEnvSnapshot {
  profile: SiteProfile;
  overrides: EnvOverrides;
  envValues: SiteProfile;
}

export async function getSiteProfileWithEnv(): Promise<SiteProfileEnvSnapshot> {
  const [profile, overrides] = await Promise.all([
    getSiteProfile(),
    Promise.resolve(getSiteProfileEnvOverrides()),
  ]);
  const envValues: SiteProfile = {
    name: envValue("name"),
    description: envValue("description"),
    logoUrl: envValue("logoUrl"),
    contactEmail: envValue("contactEmail"),
    socialUrl: envValue("socialUrl"),
  };
  return { profile, overrides, envValues };
}

export function isFieldEnvLocked(
  field: SiteProfileField,
  overrides: EnvOverrides
): boolean {
  return overrides[field];
}

export const getPublicationSettings = cache(
  async (): Promise<PublicationSettings> => {
    try {
      const setting = await prisma.siteSettings.findUnique({
        where: { key: "publication_experience" },
      });
      return setting
        ? normalizePublicationSettings(JSON.parse(setting.value))
        : DEFAULT_PUBLICATION_SETTINGS;
    } catch {
      return DEFAULT_PUBLICATION_SETTINGS;
    }
  }
);
