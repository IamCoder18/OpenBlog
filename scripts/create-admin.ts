import "dotenv/config";
import { randomBytes, scryptSync } from "crypto";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/lib/prisma";

function hashPassword(password: string): string {
  const config = { N: 16384, r: 16, p: 1 };
  const salt = randomBytes(16).toString("hex");
  const key = scryptSync(password.normalize("NFKC"), salt, 64, {
    N: config.N,
    p: config.p,
    r: config.r,
    maxmem: 128 * config.N * config.r * 2,
  });
  return `${salt}:${key.toString("hex")}`;
}

const [, , email, name, password] = process.argv;

if (!email) {
  // eslint-disable-next-line no-console
  console.error("Usage: tsx scripts/create-admin.ts <email> [name] [password]");
  process.exit(1);
}

if (!password) {
  // eslint-disable-next-line no-console
  console.error("Password is required for creating admin user");
  process.exit(1);
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  // eslint-disable-next-line no-console
  console.error("DATABASE_URL environment variable is not set");
  process.exit(1);
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main(): Promise<void> {
  const resolvedName = name || email;
  const hashedPassword = hashPassword(password);

  const existingUser = await prisma.user.findUnique({
    where: { email },
    include: { profile: true, accounts: true },
  });

  if (existingUser) {
    if (existingUser.profile?.role === "ADMIN") {
      // eslint-disable-next-line no-console
      console.log(`${email} is already an ADMIN.`);
      process.exit(0);
    }

    if (name && existingUser.name !== name) {
      await prisma.user.update({
        where: { id: existingUser.id },
        data: { name },
      });
    }

    if (!existingUser.emailVerified) {
      await prisma.user.update({
        where: { id: existingUser.id },
        data: { emailVerified: true },
      });
    }

    if (!existingUser.profile) {
      await prisma.userProfile.create({
        data: { userId: existingUser.id, role: "ADMIN" },
      });
      // eslint-disable-next-line no-console
      console.log(
        `Created missing profile for ${email} and set role to ADMIN.`
      );
    } else if (existingUser.profile.role !== "ADMIN") {
      await prisma.userProfile.update({
        where: { userId: existingUser.id },
        data: { role: "ADMIN" },
      });
      // eslint-disable-next-line no-console
      console.log(`Promoted ${email} to ADMIN.`);
    } else {
      // eslint-disable-next-line no-console
      console.log(`${email} is already an ADMIN.`);
      process.exit(0);
    }

    const hasCredentialAccount = existingUser.accounts.some(
      acc => acc.providerId === "credential"
    );

    if (!hasCredentialAccount) {
      await prisma.account.create({
        data: {
          userId: existingUser.id,
          providerId: "credential",
          password: hashedPassword,
        },
      });
      // eslint-disable-next-line no-console
      console.log(`Added credential account for ${email}.`);
    } else {
      await prisma.account.updateMany({
        where: { userId: existingUser.id, providerId: "credential" },
        data: { password: hashedPassword },
      });
      // eslint-disable-next-line no-console
      console.log(`Updated password for ${email}.`);
    }

    // eslint-disable-next-line no-console
    console.log(`Admin user ${email} is ready.`);
    process.exit(0);
  }

  const userId = crypto.randomUUID();

  await prisma.$transaction([
    prisma.user.create({
      data: {
        id: userId,
        email,
        name: resolvedName,
        emailVerified: true,
      },
    }),
    prisma.userProfile.create({
      data: { userId, role: "ADMIN" },
    }),
    prisma.account.create({
      data: {
        userId,
        providerId: "credential",
        accountId: userId,
        password: hashedPassword,
      },
    }),
  ]);

  // eslint-disable-next-line no-console
  console.log(
    `Created admin user ${email} ("${resolvedName}") with password set.`
  );
}

main()
  .catch(err => {
    // eslint-disable-next-line no-console
    console.error("Error:", err instanceof Error ? err.message : err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
