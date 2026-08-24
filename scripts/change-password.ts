import "dotenv/config";
import { randomBytes, scryptSync } from "crypto";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/lib/prisma/client";

// Password hashing function matching Better Auth's implementation
function hashPassword(password: string): string {
  const config = { N: 16384, r: 16, p: 1, dkLen: 64 };
  const salt = randomBytes(16).toString("hex");
  const key = scryptSync(password.normalize("NFKC"), salt, config.dkLen, {
    N: config.N,
    p: config.p,
    r: config.r,
    maxmem: 128 * config.N * config.r * 2,
  });
  return `${salt}:${key.toString("hex")}`;
}

const [, , email, password] = process.argv;

if (!email) {
  // eslint-disable-next-line no-console
  console.error("Usage: tsx scripts/change-password.ts <email> <password>");
  process.exit(1);
}

if (!password) {
  // eslint-disable-next-line no-console
  console.error("Password is required");
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
  const user = await prisma.user.findFirst({
    where: { email: { mode: "insensitive", equals: email } },
    include: { accounts: true },
  });

  if (!user) {
    // eslint-disable-next-line no-console
    console.error(`No user found with email: ${email}`);
    process.exit(1);
  }

  const hashedPassword = hashPassword(password);

  const credentialAccount = user.accounts.find(
    acc => acc.providerId === "credential"
  );

  if (credentialAccount) {
    await prisma.account.update({
      where: { id: credentialAccount.id },
      data: { password: hashedPassword },
    });
    // eslint-disable-next-line no-console
    console.log(`Password updated for ${email}.`);
  } else {
    await prisma.account.create({
      data: {
        userId: user.id,
        providerId: "credential",
        accountId: user.id,
        password: hashedPassword,
      },
    });
    // eslint-disable-next-line no-console
    console.log(`Credential account created and password set for ${email}.`);
  }
}

main()
  .catch(err => {
    // eslint-disable-next-line no-console
    console.error("Error:", err instanceof Error ? err.message : err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
