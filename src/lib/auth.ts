import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { toNextJsHandler } from "better-auth/next-js";
import { prisma } from "./db";
import { config } from "./config";
import { sendPasswordResetEmail } from "./smtp";

export const auth = betterAuth({
  baseURL: config.BASE_URL,
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 10,
    requireEmailVerification: false,
    resetPasswordTokenExpiresIn: 60 * 60,
    sendResetPassword: async ({ user, url }) => {
      await sendPasswordResetEmail(user.email, url);
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
  },
  trustedOrigins: [
    config.BASE_URL,
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:4000",
    "http://192.168.1.82:3000",
    "http://192.168.1.82:3001",
    "http://192.168.1.82:4000",
    "http://openblogdev.aaravlabs.com",
    "https://openblogdev.aaravlabs.com",
  ],
  secret: config.AUTH_SECRET,
  plugins: [nextCookies()],
  ...(process.env.DISABLE_RATE_LIMITING === "true" && {
    rateLimit: { enabled: false },
  }),
  databaseHooks: {
    user: {
      create: {
        after: async user => {
          await prisma.userProfile.create({
            data: {
              userId: user.id,
            },
          });
        },
      },
    },
  },
});

export const { GET, POST } = toNextJsHandler(auth);
