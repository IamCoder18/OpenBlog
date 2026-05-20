const { PrismaPg } = require("@prisma/adapter-pg");
const { scryptSync } = require("crypto");
const { randomBytes } = require("crypto");

// Password hashing function matching Better Auth's implementation
function hashPassword(password) {
  const config = {
    N: 16384,
    r: 16,
    p: 1,
    dkLen: 64
  };
  
  const salt = randomBytes(16).toString('hex');
  const key = scryptSync(password.normalize("NFKC"), salt, {
    N: config.N,
    p: config.p,
    r: config.r,
    maxmem: 128 * config.N * config.r * 2
  });
  
  return `${salt}:${key.toString('hex')}`;
}

const [,, email, password] = process.argv;

if (!email) {
  console.error("Usage: node scripts/change-password.js <email> <password>");
  process.exit(1);
}

if (!password) {
  console.error("Password is required");
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
    include: { accounts: true }
  });

  if (!user) {
    console.error(`No user found with email: ${email}`);
    process.exit(1);
  }

  const hashedPassword = hashPassword(password);

  // Update or create credential account
  const credentialAccount = user.accounts.find(
    acc => acc.providerId === "credential"
  );

  if (credentialAccount) {
    await prisma.account.update({
      where: { id: credentialAccount.id },
      data: { password: hashedPassword }
    });
    console.log(`Password updated for ${email}.`);
  } else {
    await prisma.account.create({
      data: {
        userId: user.id,
        providerId: "credential",
        password: hashedPassword
      }
    });
    console.log(`Credential account created and password set for ${email}.`);
  }
}

main().catch(err => {
  console.error("Error:", err.message);
  process.exit(1);
}).finally(() => prisma.$disconnect());