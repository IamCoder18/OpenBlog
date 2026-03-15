import { NextResponse } from "next/server";
import { auth, getUserFromRequest } from "@/lib/auth";
import { Pool } from "pg";
import crypto from "crypto";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const postResult = await pool.query(`
      SELECT p.*, m.description, m.tags, m.slug, u.name as "authorName"
      FROM posts p
      LEFT JOIN metadata m ON p.id = m."postId"
      JOIN "user" u ON p."authorId" = u.id
      WHERE p.id = $1 OR m.slug = $1
    `, [resolvedParams.id]);

    if (postResult.rows.length === 0) {
      return NextResponse.json({
        error: "Post not found",
        code: "ERR_POST_NOT_FOUND",
        suggestion: "Verify the ID or slug matches an existing post."
       }, { status: 404 });
    }

    const post = postResult.rows[0];

    if (post.visibility === 'Private') {
      const session = await auth.api.getSession({ headers: req.headers });

      let isAuthorized = false;

      if (session) {
         if (session.user.id === post.authorId || (session.user as any).role === 'Admin') {
             isAuthorized = true;
         }
      } else {
        const authHeader = req.headers.get("Authorization");
        if (authHeader && authHeader.startsWith("Bearer ")) {
          const apiKey = authHeader.split(" ")[1];
          const hashedKey = crypto.createHash('sha256').update(apiKey).digest('hex');
          const apiKeyResult = await pool.query(`SELECT "userId" FROM apikeys WHERE "key" = $1`, [hashedKey]);
          if (apiKeyResult.rows.length > 0 && (apiKeyResult.rows[0].userId === post.authorId)) {
            isAuthorized = true;
          }
        }
      }

      if (!isAuthorized) {
        return NextResponse.json({
          error: "Unauthorized",
          code: "ERR_UNAUTHORIZED",
          suggestion: "You must be authenticated as the author or an Admin to view private posts."
        }, { status: 401 });
      }
    }

    return NextResponse.json(post);
  } catch (error) {
    console.error("Error fetching post:", error);
    return NextResponse.json({
      error: "Failed to fetch post",
      code: "ERR_FETCH_POST",
      suggestion: "Server error occurred while fetching the post."
    }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const { userId, userRole } = await getUserFromRequest(req);

    if (!userId) {
      return NextResponse.json({
        error: "Unauthorized",
        code: "ERR_UNAUTHORIZED",
        suggestion: "Please authenticate with a session or API key."
      }, { status: 401 });
    }

    const postResult = await pool.query(`SELECT "authorId" FROM posts WHERE id = $1`, [resolvedParams.id]);

    if (postResult.rows.length === 0) {
      return NextResponse.json({
        error: "Post not found",
        code: "ERR_POST_NOT_FOUND",
        suggestion: "Verify the ID matches an existing post."
      }, { status: 404 });
    }

    if (postResult.rows[0].authorId !== userId && userRole !== 'Admin') {
      return NextResponse.json({
        error: "Forbidden",
        code: "ERR_FORBIDDEN",
        suggestion: "You do not have permission to modify this post."
      }, { status: 403 });
    }

    const updates = await req.json();
    const setClauses = [];
    const values = [];
    let i = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (['title', 'body', 'html', 'visibility'].includes(key)) {
        setClauses.push(`"${key}" = $${i}`);
        values.push(value);
        i++;
      }
    }

    if (setClauses.length > 0) {
       values.push(resolvedParams.id);
       await pool.query(
        `UPDATE posts SET ${setClauses.join(', ')}, "updatedAt" = CURRENT_TIMESTAMP WHERE id = $${i}`,
        values
      );
    }

    const metaUpdates = await req.json();
    const metaSetClauses = [];
    const metaValues = [];
    let j = 1;

    for (const [key, value] of Object.entries(metaUpdates)) {
      if (['description', 'tags', 'slug'].includes(key)) {
        metaSetClauses.push(`"${key}" = $${j}`);
        metaValues.push(value);
        j++;
      }
    }

    if (metaSetClauses.length > 0) {
       metaValues.push(resolvedParams.id);
       await pool.query(
        `UPDATE metadata SET ${metaSetClauses.join(', ')} WHERE "postId" = $${j}`,
        metaValues
       );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating post:", error);
    return NextResponse.json({
      error: "Failed to update post",
      code: "ERR_UPDATE_POST",
      suggestion: "Check the provided JSON schema."
    }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const { userId, userRole } = await getUserFromRequest(req);

    if (!userId) {
      return NextResponse.json({
        error: "Unauthorized",
        code: "ERR_UNAUTHORIZED",
        suggestion: "Please authenticate with a session or API key."
      }, { status: 401 });
    }

    const postResult = await pool.query(`SELECT "authorId" FROM posts WHERE id = $1`, [resolvedParams.id]);

    if (postResult.rows.length === 0) {
      return NextResponse.json({
        error: "Post not found",
        code: "ERR_POST_NOT_FOUND",
        suggestion: "Verify the ID matches an existing post."
      }, { status: 404 });
    }

    if (postResult.rows[0].authorId !== userId && userRole !== 'Admin') {
      return NextResponse.json({
        error: "Forbidden",
        code: "ERR_FORBIDDEN",
        suggestion: "You do not have permission to delete this post."
      }, { status: 403 });
    }

    await pool.query(`DELETE FROM posts WHERE id = $1`, [resolvedParams.id]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting post:", error);
    return NextResponse.json({
      error: "Failed to delete post",
      code: "ERR_DELETE_POST",
      suggestion: "Server error occurred while attempting deletion."
    }, { status: 500 });
  }
}
