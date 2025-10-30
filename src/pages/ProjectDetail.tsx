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
type StepNote = {
  id: string;
  step_id: string;
  note_text: string | null;
  image_url: string | null;
  created_at: string;
};

export default function ProjectDetail() {
  const { id } = useParams();
  const [project, setProject] = useState<Project | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);
  const [notesByStep, setNotesByStep] = useState<Record<string, StepNote[]>>(
    {}
  );
  const [noteDraft, setNoteDraft] = useState<
    Record<string, { text: string; file: File | null }>
  >({});
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
      const stepList = (s as any) ?? [];
      setSteps(stepList);
      // preload notes for all steps
      if (stepList.length) {
        const { data: notes } = await supabase
          .from("project_step_notes")
          .select("id,step_id,note_text,image_url,created_at")
          .in(
            "step_id",
            stepList.map((x: Step) => x.id)
          )
          .order("created_at", { ascending: false });
        const map: Record<string, StepNote[]> = {};
        (notes as any[] | null)?.forEach((n) => {
          map[n.step_id] = map[n.step_id] ? [...map[n.step_id], n] : [n];
        });
        setNotesByStep(map);
      }
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

  async function addNote(stepId: string) {
    const draft = noteDraft[stepId] || { text: "", file: null };
    if (!draft.text && !draft.file) return;
    let imageUrl: string | null = null;
    if (draft.file) {
      const { data: user } = await supabase.auth.getUser();
      const ext = draft.file.name.split(".").pop() || "jpg";
      const path = `${user.user?.id}/notes/${crypto.randomUUID()}.${ext}`;
      const { data: up } = await supabase.storage
        .from("project-images")
        .upload(path, draft.file, {
          upsert: true,
          contentType: draft.file.type,
          cacheControl: "3600",
        });
      if (up) {
        const { data: pub } = supabase.storage
          .from("project-images")
          .getPublicUrl(up.path);
        imageUrl = pub.publicUrl;
      }
    }
    const { data: inserted } = await supabase
      .from("project_step_notes")
      .insert({
        step_id: stepId,
        note_text: draft.text || null,
        image_url: imageUrl,
      })
      .select("*")
      .single();
    setNotesByStep((prev) => ({
      ...prev,
      [stepId]: [inserted as any, ...(prev[stepId] || [])],
    }));
    setNoteDraft((prev) => ({ ...prev, [stepId]: { text: "", file: null } }));
  }

  if (loading) return <div>Loading…</div>;
  if (!project) return <div>Not found</div>;

  return (
    <div className="space-y-5">
      <Link to="/projects" className="text-sm underline">
        ← Back to projects
      </Link>
      <div className="w-full rounded-2xl overflow-hidden shadow-md">
        {project.image_url ? (
          <img
            src={project.image_url}
            alt=""
            className="w-full h-72 md:h-80 object-cover"
          />
        ) : (
          <div className="w-full h-72 md:h-80 bg-gradient-to-r from-indigo-50 to-violet-50" />
        )}
      </div>
      <h1 className="text-2xl font-semibold">{project.name}</h1>
      {project.description && (
        <p className="text-gray-700 -mt-1">{project.description}</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border border-transparent rounded-xl p-4 bg-white shadow-md">
          <div className="text-sm text-gray-600">Status</div>
          <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-indigo-50 text-indigo-700 px-3 py-1 capitalize">
            <span className="h-2 w-2 rounded-full bg-indigo-600" />{" "}
            {project.status}
          </div>
        </div>
        <div className="border border-transparent rounded-xl p-4 bg-white shadow-md">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">Progress</div>
            <div className="text-sm font-medium text-indigo-700">
              {project.progress}%
            </div>
          </div>
          <div className="mt-2 h-3 rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-3 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
              style={{ width: `${project.progress}%` }}
            />
          </div>
        </div>
      </div>

      <div className="border border-transparent rounded-xl p-4 bg-white shadow-md">
        <div className="font-medium mb-3">Steps</div>
        <div className="grid gap-3">
          {steps.map((s, idx) => (
            <div
              key={s.id}
              className="rounded-lg border border-gray-100 shadow-sm"
            >
              <button
                onClick={() => toggle(idx)}
                className="w-full flex items-center justify-between px-3 py-3 text-left"
              >
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={s.is_done}
                    readOnly
                    className="pointer-events-none"
                  />
                  <span className="font-medium">{s.title}</span>
                </div>
                <span className="text-xs text-gray-500">
                  {s.is_done ? "Done" : "Pending"}
                </span>
              </button>
              <div className="px-3 pb-3">
                <div className="text-sm text-gray-600 mb-2">Notes</div>
                <div className="grid gap-2 mb-3">
                  {(notesByStep[s.id] ?? []).map((n) => (
                    <div key={n.id} className="rounded-md bg-gray-50 p-2">
                      {n.note_text && (
                        <p className="text-sm text-gray-800">{n.note_text}</p>
                      )}
                      {n.image_url && (
                        <img
                          src={n.image_url}
                          alt="note"
                          className="mt-2 h-28 w-full object-cover rounded"
                        />
                      )}
                      <div className="text-[11px] text-gray-500 mt-1">
                        {new Date(n.created_at).toLocaleString()}
                      </div>
                    </div>
                  ))}
                  {(notesByStep[s.id] ?? []).length === 0 && (
                    <div className="text-xs text-gray-500">No notes yet.</div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    className="flex-1 border rounded-md px-3 py-2"
                    placeholder="Add a note..."
                    value={noteDraft[s.id]?.text ?? ""}
                    onChange={(e) =>
                      setNoteDraft((prev) => ({
                        ...prev,
                        [s.id]: {
                          ...(prev[s.id] || { text: "", file: null }),
                          text: e.target.value,
                        },
                      }))
                    }
                  />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      setNoteDraft((prev) => ({
                        ...prev,
                        [s.id]: {
                          ...(prev[s.id] || { text: "", file: null }),
                          file: e.target.files?.[0] ?? null,
                        },
                      }))
                    }
                  />
                  <button
                    onClick={() => addNote(s.id)}
                    className="rounded-md bg-indigo-600 text-white px-3 py-2 text-sm"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          ))}
          {steps.length === 0 && (
            <div className="text-sm text-gray-600">No steps</div>
          )}
        </div>
      </div>
    </div>
  );
}
