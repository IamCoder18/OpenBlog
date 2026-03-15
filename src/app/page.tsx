import Link from "next/link";
import { Pool } from "pg";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export default async function Home() {
  const session = await auth.api.getSession({
    headers: await headers()
  });

  const res = await pool.query(`
    SELECT p.*, m.slug, m.description, u.name as "authorName"
    FROM posts p
    LEFT JOIN metadata m ON p.id = m."postId"
    JOIN "user" u ON p."authorId" = u.id
    WHERE p.visibility = 'Public'
    ORDER BY p."createdAt" DESC
  `);

  const posts = res.rows;

  const themeRes = await pool.query(`SELECT "value" FROM settings WHERE "key" = 'theme'`);
  const theme = themeRes.rows.length > 0 ? themeRes.rows[0].value : 'clean';

  const themeClass = theme === 'cyber' ? 'bg-black text-green-500 font-mono' : 'bg-white text-black font-[family-name:var(--font-geist-sans)]';
  const borderClass = theme === 'cyber' ? 'border-green-500' : 'border-gray-200 dark:border-gray-800';

  return (
    <div className={`min-h-screen p-8 pb-20 sm:p-20 ${themeClass}`}>
      <header className={`flex justify-between items-center mb-12 border-b pb-4 ${borderClass}`}>
        <h1 className="text-3xl font-bold">OpenBlog</h1>
        <nav className="flex gap-4">
          <Link href="/" className="hover:underline">Home</Link>
          {session ? (
            <Link href="/admin" className="hover:underline">Admin Panel</Link>
          ) : (
             <span>Sign in</span>
          )}
        </nav>
      </header>

      <main className="max-w-3xl mx-auto flex flex-col gap-8">
        <h2 className={`text-2xl font-semibold border-b pb-2 ${borderClass}`}>Latest Posts</h2>

        {posts.length === 0 ? (
          <p className="text-gray-500">No posts available yet.</p>
        ) : (
          posts.map((post) => (
            <article key={post.id} className={`border ${borderClass} p-6 rounded-lg hover:opacity-80 transition-opacity`}>
              <Link href={`/post/${post.slug || post.id}`} className="flex flex-col gap-2">
                 <h3 className="text-xl font-medium">{post.title}</h3>
                 {post.description && <p className={theme === 'cyber' ? 'text-green-700' : 'text-gray-600 dark:text-gray-400'}>{post.description}</p>}
                 <div className={`flex gap-4 text-sm mt-4 ${theme === 'cyber' ? 'text-green-800' : 'text-gray-500'}`}>
                   <span>By {post.authorName}</span>
                   <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                 </div>
              </Link>
            </article>
          ))
        )}
      </main>
    </div>
  );
}