import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "../lib/supabaseClient";
import Spinner from "../components/Spinner";

export default function Profile() {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: userRes } = await supabase.auth.getUser();
      const user = userRes.user;
      if (user) {
        const { data } = await supabase
          .from("profiles")
          .select("name,avatar_url")
          .eq("user_id", user.id)
          .single();
        if (data) {
          setName((data as any).name ?? "");
          setAvatarUrl((data as any).avatar_url ?? null);
        }
      }
      setLoading(false);
    })();
  }, []);

  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    setMessage(null);
    const { data: userRes } = await supabase.auth.getUser();
    const user = userRes.user;
    if (!user) return;
    // upload avatar if provided
    let newUrl: string | null = null;
    if (avatarFile) {
      const ext = avatarFile.name.split(".").pop() || "jpg";
      const path = `${user.id}/avatar/${crypto.randomUUID()}.${ext}`;
      const { data: up } = await supabase.storage
        .from("project-images")
        .upload(path, avatarFile, {
          upsert: true,
          contentType: avatarFile.type,
          cacheControl: "3600",
        });
      if (up) {
        const { data: pub } = supabase.storage
          .from("project-images")
          .getPublicUrl(up.path);
        newUrl = pub.publicUrl;
        setAvatarUrl(newUrl);
      }
    }
    await supabase
      .from("profiles")
      .upsert({ user_id: user.id, name, avatar_url: newUrl ?? avatarUrl });
    if (newPassword) {
      const email = user.email!;
      const { error: verify } = await supabase.auth.signInWithPassword({
        email,
        password: oldPassword,
      });
      if (verify) {
        setMessage("Old password is incorrect.");
        return;
      }
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) setMessage(error.message);
      else setMessage("Profile updated");
    } else {
      setMessage("Profile updated");
    }
  }

  if (loading)
    return (
      <div className="h-64 grid place-items-center">
        <Spinner size={40} />
      </div>
    );

  return (
    <div className="max-w-4xl">
      <div className="rounded-2xl overflow-hidden shadow-md">
        <div className="bg-gradient-to-r from-indigo-500 to-violet-500 h-28" />
        <div className="bg-white p-6">
          <div className="-mt-14 mb-5 flex items-end gap-4">
            <label className="relative">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="avatar"
                  className="h-20 w-20 rounded-full object-cover shadow ring-4 ring-white"
                />
              ) : (
                <div className="h-20 w-20 rounded-full bg-indigo-600 text-white grid place-items-center text-xl shadow ring-4 ring-white">
                  {(name?.[0] || "U").toUpperCase()}
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setAvatarFile(e.target.files?.[0] ?? null)}
                className="absolute inset-0 opacity-0 cursor-pointer"
                title="Upload avatar"
              />
            </label>
            <div>
              <h1 className="text-xl font-semibold">Your profile</h1>
              <p className="text-sm text-gray-600">
                Update your name, avatar, and password
              </p>
            </div>
          </div>
          <form onSubmit={saveProfile} className="grid gap-5">
            <div>
              <label className="block text-sm mb-1">Name</label>
              <input
                className="w-full border rounded-md px-3 py-2"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-1">Old password</label>
                <input
                  className="w-full border rounded-md px-3 py-2"
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm mb-1">New password</label>
                <input
                  className="w-full border rounded-md px-3 py-2"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                <div className="text-xs text-gray-500 mt-1">
                  Leave blank to keep current password.
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <button className="rounded-md bg-indigo-600 text-white px-4 py-2 shadow-sm hover:bg-indigo-700">
                Save changes
              </button>
            </div>
          </form>
          {message && (
            <div className="text-sm text-gray-600 mt-3">{message}</div>
          )}
        </div>
      </div>
    </div>
  );
}
