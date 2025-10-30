import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

type Project = {
  id: string;
  name: string;
  status: string;
  progress: number;
  created_at: string;
};

export default function Reports() {
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false });
      if (data) setProjects(data as Project[]);
    })();
  }, []);

  function downloadCsv() {
    const rows = [
      ["Name", "Status", "Progress", "Created At"],
      ...projects.map((p) => [
        p.name,
        p.status,
        String(p.progress ?? 0),
        new Date(p.created_at).toISOString(),
      ]),
    ];
    const csv = rows
      .map((r) =>
        r.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "projects.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Reports</h1>
        <button
          onClick={downloadCsv}
          className="rounded-md bg-gray-900 text-white px-3 py-2"
        >
          Export CSV
        </button>
      </div>
      <div className="border rounded-lg bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left p-3">Name</th>
              <th className="text-left p-3">Status</th>
              <th className="text-left p-3">Progress</th>
              <th className="text-left p-3">Created</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="p-3">{p.name}</td>
                <td className="p-3 capitalize">{p.status}</td>
                <td className="p-3">{p.progress ?? 0}%</td>
                <td className="p-3">
                  {new Date(p.created_at).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
