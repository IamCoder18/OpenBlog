export const config = {
  get BLOG_NAME() {
    return process.env.NEXT_PUBLIC_BLOG_NAME || "OpenBlog";
  },
  get BASE_URL() {
    return process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  },
  get PORT() {
    return parseInt(process.env.PORT || "3000", 10);
  },
  get DATABASE_URL() {
    return process.env.DATABASE_URL || "";
  },
  get AUTH_SECRET() {
    return process.env.AUTH_SECRET || "";
  },
  get NODE_ENV() {
    return process.env.NODE_ENV || "development";
  },
  get SIGN_UP_ENABLED() {
    return process.env.SIGN_UP_ENABLED === "true";
  },
};

export type Config = typeof config;

export async function getSiteSettings() {
  const { prisma } = await import("./db");
  return await prisma.siteSettings.findFirst();
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
  if (!rawValue || typeof rawValue !== "string") return 0.3;
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
