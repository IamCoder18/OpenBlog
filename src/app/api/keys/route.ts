import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { Pool } from "pg";
import crypto from "crypto";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });

    if (!session || (session.user as any).role !== "Admin") {
      return NextResponse.json({
        error: "Unauthorized",
        code: "ERR_UNAUTHORIZED",
        suggestion: "Generating API keys requires an active Admin session."
      }, { status: 401 });
    }

    const { agentId } = await req.json();

    if (!agentId) {
      return NextResponse.json({
        error: "Missing agentId",
        code: "ERR_MISSING_FIELD",
        suggestion: "Provide an 'agentId' in the JSON body."
      }, { status: 400 });
    }

    const agentResult = await pool.query(`SELECT id, role FROM "user" WHERE id = $1`, [agentId]);

    if (agentResult.rows.length === 0) {
       return NextResponse.json({
         error: "Agent not found",
         code: "ERR_AGENT_NOT_FOUND",
         suggestion: "Verify the provided agentId belongs to an existing user."
       }, { status: 404 });
    }

    if (agentResult.rows[0].role !== "Agent") {
       return NextResponse.json({
         error: "User is not an Agent",
         code: "ERR_INVALID_ROLE",
         suggestion: "The provided agentId belongs to a non-Agent user. Ensure the user role is 'Agent'."
       }, { status: 400 });
    }

    const key = crypto.randomUUID();
    const id = crypto.randomUUID();

    await pool.query(
      `INSERT INTO apikeys (id, "key", "userId") VALUES ($1, $2, $3)`,
      [id, key, agentId]
    );

    return NextResponse.json({ key }, { status: 201 });
  } catch (error) {
    console.error("Error creating API key:", error);
    return NextResponse.json({
      error: "Failed to create API key",
      code: "ERR_CREATE_API_KEY",
      suggestion: "Server error occurred."
    }, { status: 500 });
  }
}
