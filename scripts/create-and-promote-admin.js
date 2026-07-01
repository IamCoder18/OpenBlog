const { PrismaPg } = require("@prisma/adapter-pg");

const [, , email, name] = process.argv;

if (!email) {
  console.error(
    "Usage: node scripts/create-and-promote-admin.js <email> [name]"
  );
  process.exit(1);
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL environment variable is not set");
  process.exit(1);
}

const adapter = new PrismaPg({ connectionString });
const { PrismaClient } = require("../src/lib/prisma");
const prisma = new PrismaClient({ adapter });

async function main() {
  const resolvedName = name || email;

  const user = await prisma.user.findUnique({
    where: { email: { mode: "insensitive", equals: email } },
    include: { profile: true },
  });

  if (user) {
    if (user.profile?.role === "ADMIN") {
      console.log(`${email} is already an ADMIN.`);
      process.exit(0);
    }

    if (!user.profile) {
      console.error(`User ${email} has no profile. Creating one...`);
      await prisma.userProfile.create({
        data: { userId: user.id, role: "ADMIN" },
      });
      console.log(`Created profile and promoted ${email} to ADMIN.`);
      process.exit(0);
    }

    await prisma.userProfile.update({
      where: { userId: user.id },
      data: { role: "ADMIN" },
    });
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
  console.log(
    `Created user ${email} ("${resolvedName}") and promoted to ADMIN.`
  );
}

main()
  .catch(err => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
