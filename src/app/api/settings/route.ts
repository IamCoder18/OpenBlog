import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { Pool } from "pg";
import crypto from "crypto";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET(req: Request) {
  try {
    const result = await pool.query(`SELECT "key", "value" FROM settings`);
    const settings: Record<string, string> = {};
    for (const row of result.rows) {
       settings[row.key] = row.value;
    }
    return NextResponse.json(settings);
  } catch (error) {
    console.error("Error fetching settings:", error);
    return NextResponse.json({
      error: "Failed to fetch settings",
      code: "ERR_FETCH_SETTINGS",
      suggestion: "Check database connection."
    }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const authHeader = req.headers.get("Authorization");
    let userId = null;
    let userRole = null;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const apiKey = authHeader.split(" ")[1];
      const hashedKey = crypto.createHash('sha256').update(apiKey).digest('hex');
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

    if (!userId || userRole !== 'Admin') {
      return NextResponse.json({
        error: "Unauthorized",
        code: "ERR_UNAUTHORIZED",
        suggestion: "Only authenticated Admins can update site-wide settings."
      }, { status: 401 });
    }

    const { theme } = await req.json();

    if (!theme) {
      return NextResponse.json({
        error: "Missing fields",
        code: "ERR_MISSING_FIELD",
        suggestion: "Provide 'theme' in JSON body."
      }, { status: 400 });
    }

    await pool.query(
      `INSERT INTO settings ("key", "value") VALUES ('theme', $1)
       ON CONFLICT ("key") DO UPDATE SET "value" = EXCLUDED."value", "updatedAt" = CURRENT_TIMESTAMP`,
      [theme]
    );

    return NextResponse.json({ success: true, theme });
  } catch (error) {
    console.error("Error updating settings:", error);
    return NextResponse.json({
      error: "Failed to update settings",
      code: "ERR_UPDATE_SETTINGS",
      suggestion: "Verify JSON schema and database constraints."
    }, { status: 500 });
  }
}
