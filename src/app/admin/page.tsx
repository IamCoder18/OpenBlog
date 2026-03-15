"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function AdminPanel() {
  const [session, setSession] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [theme, setTheme] = useState<string>("clean");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const sessionRes = await fetch("/api/auth/session");
        if (sessionRes.ok) {
           const sessionData = await sessionRes.json();
           setSession(sessionData);
        }

        const settingsRes = await fetch("/api/settings");
        if (settingsRes.ok) {
           const settingsData = await settingsRes.json();
           setTheme(settingsData.theme || "clean");
        }

        const postsRes = await fetch("/api/posts");
        if (postsRes.ok) {
           const postsData = await postsRes.json();
           setPosts(postsData);
        }

      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const updateTheme = async (newTheme: string) => {
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ theme: newTheme })
      });
      if (res.ok) {
        setTheme(newTheme);
      } else {
        const errData = await res.json();
        alert(`Failed to update theme: ${errData.error} (${errData.suggestion})`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
     return <div>Loading...</div>;
  }

  if (!session) {
    return <div>Not authorized. Please login.</div>;
  }

  const userRole = session.user.role;
  const themeClass = theme === 'cyber' ? 'bg-black text-green-500 font-mono' : 'bg-white text-black font-[family-name:var(--font-geist-sans)]';
  const borderClass = theme === 'cyber' ? 'border-green-500' : 'border-gray-200 dark:border-gray-800';

  return (
    <div className={`min-h-screen p-8 pb-20 sm:p-20 ${themeClass}`}>
      <header className={`flex justify-between items-center mb-12 border-b pb-4 ${borderClass}`}>
        <h1 className="text-3xl font-bold">Admin Panel</h1>
        <nav className="flex gap-4">
          <Link href="/" className="hover:underline">Home</Link>
          <span className={theme === 'cyber' ? 'text-green-800' : 'text-gray-500'}>Logged in as {session.user.name} ({userRole})</span>
        </nav>
      </header>

      <main className="max-w-4xl mx-auto flex flex-col gap-8">
        <section>
          <h2 className={`text-2xl font-semibold border-b pb-2 mb-4 ${borderClass}`}>All Visible Posts</h2>
          {posts.length === 0 ? (
            <p className={theme === 'cyber' ? 'text-green-800' : 'text-gray-500'}>No posts found.</p>
          ) : (
            <div className="flex flex-col gap-4">
              {posts.map((post) => (
                <div key={post.id} className={`flex justify-between items-center border p-4 rounded-lg ${borderClass}`}>
                  <div>
                    <Link href={`/post/${post.id}`} className="font-medium hover:underline text-lg">
                      {post.title}
                    </Link>
                    <div className={`text-sm ${theme === 'cyber' ? 'text-green-800' : 'text-gray-500'}`}>
                      Visibility: {post.visibility} | By {post.authorName}
                    </div>
                  </div>
                  <div className="flex gap-2">
                     <span className={`text-xs ${theme === 'cyber' ? 'text-green-900' : 'text-gray-400'}`}>{new Date(post.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {userRole === 'Admin' && (
          <section className="mt-8">
            <h2 className={`text-2xl font-semibold border-b pb-2 mb-4 ${borderClass}`}>Site-Wide Settings</h2>
            <div className={`p-4 border rounded-lg ${borderClass}`}>
               <h3 className="text-lg font-medium mb-2">Theme Presets</h3>
               <p className={`text-sm mb-4 ${theme === 'cyber' ? 'text-green-700' : 'text-gray-600 dark:text-gray-400'}`}>
                 Toggle between aesthetic presets. Implementation of a robust theming engine to balance a high-tech "cyber" aesthetic with a clean feel.
               </p>
               <div className="flex gap-4">
                 <button
                   onClick={() => updateTheme('cyber')}
                   className={`px-4 py-2 rounded ${theme === 'cyber' ? 'bg-green-700 text-black' : 'bg-gray-200 text-black hover:bg-gray-300'}`}>
                   Cyber Mode
                 </button>
                 <button
                   onClick={() => updateTheme('clean')}
                   className={`px-4 py-2 rounded ${theme === 'clean' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-black hover:bg-gray-300'}`}>
                   Clean Mode
                 </button>
               </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}