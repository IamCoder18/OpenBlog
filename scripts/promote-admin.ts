import "dotenv/config";
import { PrismaClient } from "../src/lib/prisma";
import { PrismaPg } from "@prisma/adapter-pg";

const email = process.argv[2];

if (!email) {
  // eslint-disable-next-line no-console
  console.error("Usage: pnpm run promote-admin <email>");
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

async function main() {
  const user = await prisma.user.findUnique({
    where: { email },
    include: { profile: true },
  });

  if (!user) {
    // eslint-disable-next-line no-console
    console.error(`No user found with email: ${email}`);
    process.exit(1);
  }

  if (!user.profile) {
    // eslint-disable-next-line no-console
    console.error(`User ${email} has no profile. Cannot set role.`);
    process.exit(1);
  }

  if (user.profile.role === "ADMIN") {
    // eslint-disable-next-line no-console
    console.log(`${email} is already an ADMIN.`);
    process.exit(0);
  }

  await prisma.userProfile.update({
    where: { userId: user.id },
    data: { role: "ADMIN" },
  });

  // eslint-disable-next-line no-console
  console.log(`Promoted ${email} to ADMIN.`);
}

main()
  .catch(err => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
