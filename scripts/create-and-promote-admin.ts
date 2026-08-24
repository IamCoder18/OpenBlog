import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/lib/prisma/client";

const [, , email, name] = process.argv;

if (!email) {
  // eslint-disable-next-line no-console
  console.error(
    "Usage: tsx scripts/create-and-promote-admin.ts <email> [name]"
  );
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

  const user = await prisma.user.findFirst({
    where: { email: { mode: "insensitive", equals: email } },
    include: { profile: true },
  });

  if (user) {
    if (user.profile?.role === "ADMIN") {
      // eslint-disable-next-line no-console
      console.log(`${email} is already an ADMIN.`);
      process.exit(0);
    }

    if (!user.profile) {
      // eslint-disable-next-line no-console
      console.error(`User ${email} has no profile. Creating one...`);
      await prisma.userProfile.create({
        data: { userId: user.id, role: "ADMIN" },
      });
      // eslint-disable-next-line no-console
      console.log(`Created profile and promoted ${email} to ADMIN.`);
      process.exit(0);
    }

    await prisma.userProfile.update({
      where: { userId: user.id },
      data: { role: "ADMIN" },
    });
    // eslint-disable-next-line no-console
    console.log(`Promoted ${email} to ADMIN.`);
    process.exit(0);
  }

  const userId = crypto.randomUUID();
  await prisma.$transaction([
    prisma.user.create({
      data: { id: userId, email, name: resolvedName, emailVerified: true },
    }),
    prisma.userProfile.create({
      data: { userId, role: "ADMIN" },
    }),
  ]);
  // eslint-disable-next-line no-console
  console.log(
    `Created user ${email} ("${resolvedName}") and promoted to ADMIN.`
  );
}

main()
  .catch(err => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
