import "dotenv/config";

function getConfig() {
  return {
    BLOG_NAME: process.env.BLOG_NAME || "OpenBlog",
    BASE_URL: process.env.BASE_URL || "http://localhost:3000",
    PORT: parseInt(process.env.PORT || "3000", 10),
    DATABASE_URL: process.env.DATABASE_URL || "",
    AUTH_SECRET: process.env.AUTH_SECRET || "",
    NODE_ENV: process.env.NODE_ENV || "development",
    SIGN_UP_ENABLED: process.env.SIGN_UP_ENABLED === "true",
  };
}

export const config = {
  get BLOG_NAME() {
    return getConfig().BLOG_NAME;
  },
  get BASE_URL() {
    return getConfig().BASE_URL;
  },
  get PORT() {
    return getConfig().PORT;
  },
  get DATABASE_URL() {
    return getConfig().DATABASE_URL;
  },
  get AUTH_SECRET() {
    return getConfig().AUTH_SECRET;
  },
  get NODE_ENV() {
    return getConfig().NODE_ENV;
  },
  get SIGN_UP_ENABLED() {
    return getConfig().SIGN_UP_ENABLED;
  },
};

export type Config = ReturnType<typeof getConfig>;

export async function getSiteSettings() {
  const { prisma } = await import("./db");
  const settings = await prisma.siteSettings.findFirst();
  return settings;
}

export async function getTheme(): Promise<string> {
  const { prisma } = await import("./db");
  const setting = await prisma.siteSettings.findUnique({
    where: { key: "theme" },
  });
  return setting?.value || "default";
}

export async function setTheme(theme: string): Promise<void> {
  const { prisma } = await import("./db");
  await prisma.siteSettings.upsert({
    where: { key: "theme" },
    update: { value: theme },
    create: { key: "theme", value: theme },
  });
}

export async function getFuzzySearchThreshold(): Promise<number> {
  const { prisma } = await import("./db");
  const setting = await prisma.siteSettings.findUnique({
    where: { key: "fuzzy_search_threshold" },
  });
  const rawValue = setting?.value;
  if (!rawValue || typeof rawValue !== "string") {
    return 0.3;
  }
  const value = parseFloat(rawValue);
  return isNaN(value) ? 0.3 : Math.max(0, Math.min(1, value));
}

export async function setFuzzySearchThreshold(
  threshold: number
): Promise<void> {
  const { prisma } = await import("./db");
  await prisma.siteSettings.upsert({
    where: { key: "fuzzy_search_threshold" },
    update: { value: threshold.toString() },
    create: { key: "fuzzy_search_threshold", value: threshold.toString() },
  });
}
