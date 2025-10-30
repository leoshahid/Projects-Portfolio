import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

type Project = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  progress: number;
  created_at: string;
  image_url?: string | null;
};

type Step = { id: string; title: string; is_done: boolean; position: number };

export default function ProjectDetail() {
  const { id } = useParams();
  const [project, setProject] = useState<Project | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: p } = await supabase
        .from("projects")
        .select("*")
        .eq("id", id)
        .single();
      setProject(p as any);
      const { data: s } = await supabase
        .from("project_steps")
        .select("id,title,is_done,position")
        .eq("project_id", id)
        .order("position", { ascending: true });
      setSteps((s as any) ?? []);
      setLoading(false);
    })();
  }, [id]);

  async function toggle(idx: number) {
    const step = steps[idx];
    const next = !step.is_done;
    const nextSteps = steps.map((s, i) =>
      i === idx ? { ...s, is_done: next } : s
    );
    setSteps(nextSteps);
    await supabase
      .from("project_steps")
      .update({ is_done: next })
      .eq("id", step.id);
    const total = nextSteps.length;
    const completed = nextSteps.filter((s) => s.is_done).length;
    const pct = total === 0 ? 0 : Math.round((completed / total) * 100);
    await supabase
      .from("projects")
      .update({ progress: pct })
      .eq("id", id as string);
    setProject((prev) => (prev ? { ...prev, progress: pct } : prev));
  }

  if (loading) return <div>Loading…</div>;
  if (!project) return <div>Not found</div>;

  return (
    <div className="space-y-4">
      <Link to="/projects" className="text-sm underline">
        ← Back to projects
      </Link>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          {project.image_url ? (
            <img
              src={project.image_url}
              alt=""
              className="w-full h-64 object-cover rounded"
            />
          ) : (
            <div className="w-full h-64 bg-gray-100 rounded" />
          )}
          <h1 className="text-2xl font-semibold mt-3">{project.name}</h1>
          {project.description && (
            <p className="text-gray-700 mt-2">{project.description}</p>
          )}
        </div>
        <div className="space-y-3">
          <div className="border rounded-lg p-4 bg-white">
            <div className="text-sm text-gray-600">Status</div>
            <div className="capitalize">{project.status}</div>
          </div>
          <div className="border rounded-lg p-4 bg-white">
            <div className="text-sm text-gray-600">Progress</div>
            <div className="h-2 rounded-full bg-gray-100 mt-2">
              <div
                className="h-2 rounded-full bg-gray-900"
                style={{ width: `${project.progress}%` }}
              />
            </div>
          </div>
          <div className="border rounded-lg p-4 bg-white">
            <div className="font-medium mb-2">Steps</div>
            <div className="grid gap-2">
              {steps.map((s, idx) => (
                <label key={s.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={s.is_done}
                    onChange={() => toggle(idx)}
                  />
                  <span>{s.title}</span>
                </label>
              ))}
              {steps.length === 0 && (
                <div className="text-sm text-gray-600">No steps</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
