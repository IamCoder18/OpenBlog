const { PrismaPg } = require("@prisma/adapter-pg");

const [, , email] = process.argv;

if (!email) {
  console.error("Usage: node scripts/promote-admin.js <email>");
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
  const user = await prisma.user.findUnique({
    where: { email: { mode: "insensitive", equals: email } },
    include: { profile: true },
  });

  if (!user) {
    console.error(`No user found with email: ${email}`);
    process.exit(1);
  }

  if (!user.profile) {
    console.error(`User ${email} has no profile. Cannot set role.`);
    process.exit(1);
  }

  if (user.profile.role === "ADMIN") {
    console.log(`${email} is already an ADMIN.`);
    process.exit(0);
  }

  await prisma.userProfile.update({
    where: { userId: user.id },
    data: { role: "ADMIN" },
  });

  console.log(`Promoted ${email} to ADMIN.`);
}

main()
  .catch(err => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
