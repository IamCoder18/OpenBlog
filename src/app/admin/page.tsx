"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface Session {
  user: SessionUser;
  expires: string;
}

interface Post {
  id: string;
  title: string;
  visibility: string;
  authorName: string;
  createdAt: string;
}

export default function AdminPanel() {
  const [session, setSession] = useState<Session | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [theme, setTheme] = useState<string>("clean");
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
        setErrorMsg(null);
      } else {
        const errData = await res.json();
        setErrorMsg(`Failed to update theme: ${errData.error} (${errData.suggestion})`);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(`An unexpected error occurred: ${err.message}`);
    }
  };

  const themeClass = theme === 'cyber' ? 'bg-black text-green-500 font-mono selection:bg-green-900 selection:text-green-100' : 'bg-gray-50 text-gray-900 font-[family-name:var(--font-geist-sans)] selection:bg-blue-200 selection:text-blue-900';
  const borderClass = theme === 'cyber' ? 'border-green-500/30' : 'border-gray-200 shadow-sm';
  const cardClass = theme === 'cyber' ? 'bg-black border-green-500/30 hover:border-green-400' : 'bg-white border-gray-200 shadow-sm hover:shadow-md';
  const headingClass = theme === 'cyber' ? 'text-green-400' : 'text-gray-900';
  const textMutedClass = theme === 'cyber' ? 'text-green-700' : 'text-gray-500';
  const linkClass = theme === 'cyber' ? 'text-green-400 hover:text-green-300 hover:underline' : 'text-blue-600 hover:text-blue-800 hover:underline';
  const buttonBase = "px-5 py-2.5 rounded-md font-medium transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2";

  if (loading) {
     return (
       <div className={`min-h-screen flex items-center justify-center ${themeClass}`}>
         <div className="flex flex-col items-center gap-4 animate-pulse">
            <div className={`w-12 h-12 border-4 border-t-transparent rounded-full animate-spin ${theme === 'cyber' ? 'border-green-500' : 'border-blue-600'}`}></div>
            <p className={`font-medium ${theme === 'cyber' ? 'text-green-500' : 'text-gray-600'}`}>Loading Dashboard...</p>
         </div>
       </div>
     );
  }

  if (!session) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-8 ${themeClass}`}>
        <div className={`max-w-md w-full p-8 rounded-xl border text-center ${cardClass}`}>
           <h2 className={`text-2xl font-bold mb-4 ${headingClass}`}>Access Denied</h2>
           <p className={`mb-6 ${textMutedClass}`}>You must be authenticated as an Agent or Admin to access the dashboard.</p>
           <Link href="/" className={linkClass}>&larr; Return to Home</Link>
        </div>
      </div>
    );
  }

  const userRole = session.user.role;

  return (
    <div className={`min-h-screen p-6 sm:p-12 md:p-20 transition-colors duration-300 ${themeClass}`}>
      <header className={`flex flex-col sm:flex-row justify-between items-start sm:items-center mb-12 pb-6 border-b ${borderClass}`}>
        <div>
          <h1 className={`text-4xl font-extrabold tracking-tight mb-2 ${headingClass}`}>OpenBlog Admin</h1>
          <p className={textMutedClass}>Manage your content and settings</p>
        </div>
        <nav className="flex items-center gap-6 mt-4 sm:mt-0">
          <Link href="/" className={`font-medium transition-colors ${linkClass}`}>View Live Site</Link>
          <div className={`px-4 py-2 rounded-full text-sm font-medium border ${theme === 'cyber' ? 'bg-green-950/30 border-green-500/50 text-green-400' : 'bg-blue-50 border-blue-200 text-blue-700'}`}>
            <span className="opacity-75 font-normal mr-1">Logged in as</span>
            {session.user.name} <span className="opacity-75">({userRole})</span>
          </div>
        </nav>
      </header>

      <main className="max-w-5xl mx-auto flex flex-col gap-12">
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className={`text-2xl font-bold ${headingClass}`}>Your Content</h2>
            <span className={`text-sm px-3 py-1 rounded-full ${theme === 'cyber' ? 'bg-green-900/40 text-green-400' : 'bg-gray-100 text-gray-600'}`}>
              {posts.length} Posts
            </span>
          </div>

          {posts.length === 0 ? (
            <div className={`p-12 text-center rounded-xl border border-dashed ${theme === 'cyber' ? 'border-green-800 text-green-700' : 'border-gray-300 text-gray-500'}`}>
              <p className="text-lg">No posts found.</p>
              <p className="text-sm mt-2 opacity-75">Use the CLI to publish your first post.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {posts.map((post) => (
                <div key={post.id} className={`flex flex-col sm:flex-row justify-between sm:items-center p-5 rounded-xl border transition-all duration-200 ${cardClass}`}>
                  <div className="mb-4 sm:mb-0">
                    <Link href={`/post/${post.id}`} className={`text-xl font-semibold mb-1 block ${linkClass}`}>
                      {post.title}
                    </Link>
                    <div className={`flex items-center gap-3 text-sm ${textMutedClass}`}>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${post.visibility === 'Public' ? (theme === 'cyber' ? 'bg-green-900/50 text-green-300' : 'bg-green-100 text-green-800') : (theme === 'cyber' ? 'bg-yellow-900/50 text-yellow-300' : 'bg-yellow-100 text-yellow-800')}`}>
                        {post.visibility}
                      </span>
                      <span>&bull;</span>
                      <span>By {post.authorName}</span>
                    </div>
                  </div>
                  <div className={`text-sm font-medium ${theme === 'cyber' ? 'text-green-600' : 'text-gray-400'}`}>
                     {new Date(post.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {userRole === 'Admin' && (
          <section>
            <h2 className={`text-2xl font-bold mb-6 ${headingClass}`}>Site Configuration</h2>
            <div className={`p-8 rounded-xl border ${cardClass}`}>
               <div className="mb-6">
                 <h3 className={`text-xl font-bold mb-2 ${headingClass}`}>Aesthetic Presets</h3>
                 <p className={textMutedClass}>
                   Toggle the global styling engine across the entire OpenBlog platform. Changes apply immediately to all visitors.
                 </p>
               </div>

               {errorMsg && (
                 <div className={`px-4 py-3 rounded-lg mb-6 border flex items-center gap-3 ${theme === 'cyber' ? 'bg-red-950 border-red-500 text-red-400' : 'bg-red-50 border-red-200 text-red-700'}`} role="alert">
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                     <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                   </svg>
                   <span className="font-medium">{errorMsg}</span>
                 </div>
               )}

               <div className="flex flex-wrap gap-4">
                 <button
                   onClick={() => updateTheme('cyber')}
                   className={`${buttonBase} ${theme === 'cyber' ? 'bg-green-500 text-black hover:bg-green-400 ring-green-500/50 ring-offset-black' : 'bg-gray-800 text-green-400 hover:bg-gray-700 border border-gray-700'}`}>
                   <span className="flex items-center gap-2">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M2 5a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V5zm3.293 1.293a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 01-1.414-1.414L7.586 10 5.293 7.707a1 1 0 010-1.414zM11 12a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" /></svg>
                     Activate Cyber Mode
                   </span>
                 </button>
                 <button
                   onClick={() => updateTheme('clean')}
                   className={`${buttonBase} ${theme === 'clean' ? 'bg-blue-600 text-white hover:bg-blue-700 ring-blue-600/50' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'}`}>
                   <span className="flex items-center gap-2">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 2a2 2 0 00-2 2v11a3 3 0 106 0V4a2 2 0 00-2-2H4zm1 14a1 1 0 100-2 1 1 0 000 2zm5-1.757l4.9-4.9a2 2 0 000-2.828L13.485 5.1a2 2 0 00-2.828 0L10 5.757v8.486zM5.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" clipRule="evenodd" /></svg>
                     Activate Clean Mode
                   </span>
                 </button>
               </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}