import { type FormEvent, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation() as any;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    const dest = location.state?.from?.pathname || "/";
    if (data.session) navigate(dest, { replace: true });
  }

  async function sendMagicLink() {
    setLoading(true);
    setMessage(null);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });
    setLoading(false);
    setMessage(error ? error.message : "Magic link sent. Check your email.");
  }

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Sign in</h1>
      <form onSubmit={onSubmit} className="space-y-3">
        <div>
          <label className="block text-sm mb-1">Email</label>
          <input
            className="w-full border rounded-md px-3 py-2"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Password</label>
          <input
            className="w-full border rounded-md px-3 py-2"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button
          disabled={loading}
          className="w-full rounded-md bg-gray-900 text-white px-3 py-2 disabled:opacity-50"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <div className="flex items-center gap-2 my-4">
        <div className="h-px bg-gray-200 flex-1" />
        <span className="text-xs text-gray-500">OR</span>
        <div className="h-px bg-gray-200 flex-1" />
      </div>
      <button
        onClick={sendMagicLink}
        className="w-full rounded-md border px-3 py-2"
      >
        Send magic link
      </button>
      {message && <p className="text-sm text-gray-600 mt-3">{message}</p>}
      <p className="text-sm mt-4">
        No account?{" "}
        <Link className="underline" to="/signup">
          Sign up
        </Link>
      </p>
    </div>
  );
}
