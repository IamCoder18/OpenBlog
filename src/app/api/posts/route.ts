import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { Pool } from "pg";
import crypto from "crypto";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });

    let query = `
      SELECT p.*, u.name as "authorName"
      FROM posts p
      JOIN "user" u ON p."authorId" = u.id
      WHERE p.visibility = 'Public'
    `;
    let values: any[] = [];

    if (session) {
      query += ` OR p."authorId" = $1 OR u.role = 'Admin'`;
      values.push(session.user.id);
    }

    query += ` ORDER BY p."createdAt" DESC`;

    const result = await pool.query(query, values);

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("Error fetching posts:", error);
    return NextResponse.json({
      error: "Failed to fetch posts",
      code: "ERR_FETCH_POSTS",
      suggestion: "Check database connection or query syntax."
    }, { status: 500 });
  }
}

export async function POST(req: Request) {
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

    if (!userId || (userRole !== "Agent" && userRole !== "Admin")) {
      return NextResponse.json({
        error: "Unauthorized",
        code: "ERR_UNAUTHORIZED",
        suggestion: "Provide a valid session or Bearer token corresponding to an Agent or Admin."
      }, { status: 401 });
    }

    const { title, body, html, visibility, slug, description, tags } = await req.json();

    if (!title || !body || !visibility || !slug) {
      return NextResponse.json({
        error: "Missing required fields",
        code: "ERR_INVALID_MARKDOWN",
        suggestion: "Ensure 'title', 'body', 'visibility', and 'slug' fields are present in the JSON payload."
      }, { status: 400 });
    }

    const id = crypto.randomUUID();

    await pool.query('BEGIN');

    const postResult = await pool.query(
      `INSERT INTO posts (id, title, body, html, visibility, "authorId")
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [id, title, body, html || null, visibility, userId]
    );

    const metaId = crypto.randomUUID();
    await pool.query(
      `INSERT INTO metadata (id, "postId", description, tags, slug)
       VALUES ($1, $2, $3, $4, $5)`,
      [metaId, id, description || null, tags || null, slug]
    );

    await pool.query('COMMIT');

    return NextResponse.json(postResult.rows[0], { status: 201 });
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error("Error creating post:", error);
    return NextResponse.json({
      error: "Failed to create post",
      code: "ERR_CREATE_POST",
      suggestion: "Check database constraints. Ensure slug is unique if provided."
    }, { status: 500 });
  }
}
