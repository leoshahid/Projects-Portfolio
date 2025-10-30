import { Outlet, Link, useNavigate } from "react-router-dom";
import { supabase } from "./lib/supabaseClient";
import { useEffect, useState } from "react";
import { Bars3Icon } from "@heroicons/react/24/outline";

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    async function load(session: any | null) {
      const authed = !!session;
      setIsAuthed(authed);
      if (!authed) {
        setDisplayName(null);
        setAvatarUrl(null);
        return;
      }
      const user = session.user;
      // Try profiles.name first
      const { data: profile } = await supabase
        .from("profiles")
        .select("name,avatar_url")
        .eq("user_id", user.id)
        .maybeSingle();
      const fallbackName =
        (user.user_metadata?.full_name as string | undefined) ||
        (user.email as string | undefined) ||
        null;
      setDisplayName((profile as any)?.name ?? fallbackName ?? null);
      setAvatarUrl((profile as any)?.avatar_url ?? null);
    }

    supabase.auth.getSession().then(({ data }) => load(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      load(session);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate("/signin");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-white text-slate-900">
      <header className="sticky top-0 z-10 bg-white/70 backdrop-blur shadow-sm">
        <div className="mx-auto w-full px-4 md:px-6 lg:px-10 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2 group">
              <span className="inline-grid place-items-center h-9 w-9 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-sm group-hover:shadow-md transition-shadow">
                PP
              </span>
              <span className="font-semibold tracking-tight text-indigo-700 group-hover:text-indigo-800 transition-colors">
                Project Portfolio
              </span>
            </Link>
            <nav className="hidden md:flex items-center gap-2">
              <Link
                to="/"
                className="px-3 py-1.5 rounded-full hover:text-indigo-700 hover:bg-indigo-50 transition-colors"
              >
                Dashboard
              </Link>
              <Link
                to="/projects"
                className="px-3 py-1.5 rounded-full hover:text-indigo-700 hover:bg-indigo-50 transition-colors"
              >
                Projects
              </Link>
              <Link
                to="/reports"
                className="px-3 py-1.5 rounded-full hover:text-indigo-700 hover:bg-indigo-50 transition-colors"
              >
                Reports
              </Link>
            </nav>
          </div>
          <button
            className="md:hidden p-2"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Toggle Menu"
          >
            <Bars3Icon className="size-6" />
          </button>
          <div className="hidden md:flex items-center gap-3">
            {isAuthed && (
              <Link
                to="/profile"
                className="hidden md:inline-flex items-center gap-2 px-3 py-1.5 rounded-full border hover:border-indigo-300 transition-colors"
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="avatar"
                    className="h-6 w-6 rounded-full object-cover"
                  />
                ) : (
                  <span className="inline-grid place-items-center h-6 w-6 rounded-full bg-indigo-600 text-white text-xs">
                    {(displayName?.[0] || "U").toUpperCase()}
                  </span>
                )}
                <span className="text-sm max-w-[160px] truncate">
                  {displayName ?? "Your profile"}
                </span>
              </Link>
            )}
            {isAuthed ? (
              <button
                onClick={handleSignOut}
                className="rounded-full bg-indigo-600 text-white px-4 py-1.5 shadow-sm hover:bg-indigo-700 transition-colors"
              >
                Sign out
              </button>
            ) : (
              <Link
                to="/signin"
                className="rounded-full border px-4 py-1.5 hover:border-indigo-300 transition-colors"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
        {menuOpen && (
          <div className="md:hidden border-t bg-white">
            <div className="px-4 py-2 flex flex-col gap-2">
              <Link to="/" onClick={() => setMenuOpen(false)}>
                Dashboard
              </Link>
              <Link to="/projects" onClick={() => setMenuOpen(false)}>
                Projects
              </Link>
              <Link to="/reports" onClick={() => setMenuOpen(false)}>
                Reports
              </Link>
              {isAuthed ? (
                <button
                  onClick={handleSignOut}
                  className="text-left rounded-md bg-indigo-600 text-white px-3 py-1.5"
                >
                  Sign out
                </button>
              ) : (
                <Link
                  to="/signin"
                  onClick={() => setMenuOpen(false)}
                  className="rounded-md border px-3 py-1.5"
                >
                  Sign in
                </Link>
              )}
            </div>
          </div>
        )}
      </header>
      <main className="mx-auto w-full px-4 md:px-6 lg:px-10 py-8">
        <Outlet />
      </main>
    </div>
  );
}
