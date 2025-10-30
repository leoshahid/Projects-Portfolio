import { Outlet, Link, useNavigate } from "react-router-dom";
import { supabase } from "./lib/supabaseClient";
import { useEffect, useState } from "react";
import { Bars3Icon } from "@heroicons/react/24/outline";

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setIsAuthed(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) =>
      setIsAuthed(!!session)
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate("/signin");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-white text-slate-900">
      <header className="sticky top-0 z-10 bg-white/70 backdrop-blur border-b">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <span className="inline-grid place-items-center h-9 w-9 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-sm group-hover:shadow-md transition-shadow">
              PP
            </span>
            <span className="font-semibold tracking-tight text-indigo-700 group-hover:text-indigo-800 transition-colors">
              Project Portfolio
            </span>
          </Link>
          <button
            className="md:hidden p-2"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Toggle Menu"
          >
            <Bars3Icon className="size-6" />
          </button>
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
          </nav>
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
      <main className="max-w-6xl mx-auto px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
