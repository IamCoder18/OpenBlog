import { betterAuth } from "better-auth";
import { Pool } from "pg";
import crypto from "crypto";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function getUserFromRequest(req: Request) {
  let userId = null;
  let userRole = null;

  const authHeader = req.headers.get("Authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const apiKey = authHeader.split(" ")[1];
    const hashedKey = crypto.createHash("sha256").update(apiKey).digest("hex");
    const apiKeyResult = await pool.query(`SELECT "userId" FROM apikeys WHERE "key" = $1`, [hashedKey]);

    if (apiKeyResult.rows.length > 0) {
      userId = apiKeyResult.rows[0].userId;
      const userResult = await pool.query(`SELECT "role" FROM "user" WHERE id = $1`, [userId]);
      if(userResult.rows.length > 0) {
         userRole = userResult.rows[0].role;
      }
    }
  }

  if (!userId) {
    const session = await auth.api.getSession({ headers: req.headers });
    if (session) {
      userId = session.user.id;
      userRole = (session.user as any).role;
    }
  }

  return { userId, userRole };
}

export const auth = betterAuth({
  database: pool,
  emailAndPassword: {
    enabled: true,
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "Agent"
      }
    }
  }
});