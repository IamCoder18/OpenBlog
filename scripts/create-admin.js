const { PrismaPg } = require("@prisma/adapter-pg");
const { scryptSync, randomBytes } = require("crypto");

function hashPassword(password) {
  const config = {
    N: 16384,
    r: 16,
    p: 1
  };

  const salt = randomBytes(16).toString('hex');
  const key = scryptSync(password.normalize("NFKC"), salt, 64, {
    N: config.N,
    p: config.p,
    r: config.r,
    maxmem: 128 * config.N * config.r * 2
  });

  return `${salt}:${key.toString('hex')}`;
}

const [,, email, name, password] = process.argv;

if (!email) {
  console.error("Usage: node scripts/create-admin.js <email> [name] [password]");
  process.exit(1);
}

if (!password) {
  console.error("Password is required for creating admin user");
  process.exit(1);
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL environment variable is not set");
  process.exit(1);
}

const adapter = new PrismaPg({ connectionString });
const { PrismaClient } = require("../src/lib/prisma/index.js");
const prisma = new PrismaClient({ adapter });

async function main() {
  const resolvedName = name || email;
  const hashedPassword = hashPassword(password);

  const existingUser = await prisma.user.findUnique({
    where: { email },
    include: { profile: true, accounts: true }
  });

  if (existingUser) {
    if (existingUser.profile?.role === "ADMIN") {
      console.log(`${email} is already an ADMIN.`);
      process.exit(0);
    }

    if (name && existingUser.name !== name) {
      await prisma.user.update({
        where: { id: existingUser.id },
        data: { name }
      });
    }

    if (!existingUser.emailVerified) {
      await prisma.user.update({
        where: { id: existingUser.id },
        data: { emailVerified: true }
      });
    }

    if (!existingUser.profile) {
      await prisma.userProfile.create({
        data: { userId: existingUser.id, role: "ADMIN" }
      });
      console.log(`Created missing profile for ${email} and set role to ADMIN.`);
    } else if (existingUser.profile.role !== "ADMIN") {
      await prisma.userProfile.update({
        where: { userId: existingUser.id },
        data: { role: "ADMIN" }
      });
      console.log(`Promoted ${email} to ADMIN.`);
    } else {
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
          password: hashedPassword
        }
      });
      console.log(`Added credential account for ${email}.`);
    } else {
      await prisma.account.updateMany({
        where: {
          userId: existingUser.id,
          providerId: "credential"
        },
        data: {
          password: hashedPassword
        }
      });
      console.log(`Updated password for ${email}.`);
    }

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
        emailVerified: true
      }
    }),
    prisma.userProfile.create({
      data: {
        userId: userId,
        role: "ADMIN"
      }
    }),
    prisma.account.create({
      data: {
        userId: userId,
        providerId: "credential",
        accountId: userId,
        password: hashedPassword
      }
    })
  ]);

  console.log(`Created admin user ${email} ("${resolvedName}") with password set.`);
}

main().catch(err => {
  console.error("Error:", err.message);
  process.exit(1);
}).finally(() => prisma.$disconnect());