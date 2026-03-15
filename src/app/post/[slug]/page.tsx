import { notFound } from "next/navigation";
import { Pool } from "pg";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { renderMath } from "render-latex";
import Link from "next/link";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params;
  const { slug } = resolvedParams;

  const res = await pool.query(`
    SELECT p.*, m.description, m.tags, m.slug, u.name as "authorName"
    FROM posts p
    LEFT JOIN metadata m ON p.id = m."postId"
    JOIN "user" u ON p."authorId" = u.id
    WHERE p.id = $1 OR m.slug = $1
  `, [slug]);

  if (res.rows.length === 0) {
    return notFound();
  }

  const post = res.rows[0];

  if (post.visibility === 'Private') {
    const session = await auth.api.getSession({
      headers: await headers()
    });

    let isAuthorized = false;

    if (session) {
       if (session.user.id === post.authorId || (session.user as any).role === 'Admin') {
           isAuthorized = true;
       }
    }

    if (!isAuthorized) {
      return (
        <div className="min-h-screen p-8 pb-20 sm:p-20 font-[family-name:var(--font-geist-sans)] flex justify-center items-center">
          <p className="text-xl">This post is private. You must be authorized to view it.</p>
        </div>
      );
    }
  }

  // Use render-latex to pre-process the markdown body
  const bodyWithLatex = renderMath(post.body);

  const themeRes = await pool.query(`SELECT "value" FROM settings WHERE "key" = 'theme'`);
  const theme = themeRes.rows.length > 0 ? themeRes.rows[0].value : 'clean';

  const themeClass = theme === 'cyber' ? 'bg-black text-green-500 font-mono' : 'bg-white text-black font-[family-name:var(--font-geist-sans)]';
  const borderClass = theme === 'cyber' ? 'border-green-500' : 'border-gray-200 dark:border-gray-800';
  const proseClass = theme === 'cyber' ? 'prose-invert prose-p:text-green-500 prose-headings:text-green-400 prose-a:text-green-300' : 'prose dark:prose-invert';

  return (
    <div className={`min-h-screen p-8 pb-20 sm:p-20 ${themeClass}`}>
      <header className={`mb-8 border-b pb-4 ${borderClass}`}>
         <nav className="mb-4">
             <Link href="/" className={`hover:underline ${theme === 'cyber' ? 'text-green-400' : 'text-blue-500'}`}>&larr; Back to Home</Link>
         </nav>
        <h1 className="text-4xl font-bold">{post.title}</h1>
        <div className={`flex gap-4 mt-2 ${theme === 'cyber' ? 'text-green-800' : 'text-gray-500'}`}>
          <span>By {post.authorName}</span>
          <span>{new Date(post.createdAt).toLocaleDateString()}</span>
          {post.visibility === 'Private' && (
            <span className={`text-xs font-medium me-2 px-2.5 py-0.5 rounded ${theme === 'cyber' ? 'bg-green-900 text-black' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'}`}>Private</span>
          )}
        </div>
      </header>

      <main className={`max-w-3xl mx-auto prose ${proseClass}`}>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {bodyWithLatex}
        </ReactMarkdown>
      </main>
    </div>
  );
}