import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import {
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";

type Project = {
  id: string;
  name: string;
  description: string | null;
  status: "active" | "paused" | "completed";
  progress: number;
  created_at: string;
  image_url?: string | null;
};

type Step = {
  id: string;
  project_id: string;
  title: string;
  is_done: boolean;
  position: number;
};

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [stepsOpen, setStepsOpen] = useState(false);
  const [stepsProjectId, setStepsProjectId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .order("created_at", { ascending: false });
    setLoading(false);
    if (!error && data) setProjects(data as Project[]);
  }

  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }
  function openEdit(p: Project) {
    setEditing(p);
    setModalOpen(true);
  }

  async function remove(id: string) {
    await supabase.from("projects").delete().eq("id", id);
    await load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Projects</h1>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-md bg-gray-900 text-white px-3 py-2"
        >
          <PlusIcon className="size-5" /> New Project
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading && (
          <div className="border rounded-lg bg-white p-4">Loading…</div>
        )}
        {!loading && projects.length === 0 && (
          <div className="border rounded-lg bg-white p-4">No projects yet.</div>
        )}
        {projects.map((p) => (
          <div
            key={p.id}
            className="border border-transparent rounded-xl bg-white overflow-hidden shadow-md hover:shadow-lg transition-transform transition-shadow hover:-translate-y-0.5"
          >
            {p.image_url ? (
              <img
                src={p.image_url}
                alt=""
                className="h-36 w-full object-cover"
              />
            ) : (
              <div className="h-36 bg-gray-100" />
            )}
            <div className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="font-medium truncate" title={p.name}>
                  {p.name}
                </div>
                <span className="text-xs capitalize text-gray-600">
                  {p.status}
                </span>
              </div>
              {p.description && (
                <div className="text-sm text-gray-600 line-clamp-2">
                  {p.description}
                </div>
              )}
              <div>
                <div className="h-2 rounded-full bg-gray-100">
                  <div
                    className="h-2 rounded-full bg-gray-900"
                    style={{
                      width: `${Math.min(Math.max(p.progress, 0), 100)}%`,
                    }}
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  title="Steps"
                  onClick={() => {
                    setStepsProjectId(p.id);
                    setStepsOpen(true);
                  }}
                  className="rounded border px-2 py-1 text-sm"
                >
                  Steps
                </button>
                <a
                  href={`/projects/${p.id}`}
                  className="rounded border px-2 py-1 text-sm"
                >
                  View
                </a>
                <button
                  title="Edit"
                  onClick={() => openEdit(p)}
                  className="rounded border px-2 py-1 text-sm"
                >
                  Edit
                </button>
                <button
                  title="Delete"
                  onClick={() => remove(p.id)}
                  className="rounded border px-2 py-1 text-sm"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {modalOpen && (
        <ProjectModal
          project={editing}
          onClose={() => setModalOpen(false)}
          onSaved={async () => {
            setModalOpen(false);
            await load();
          }}
        />
      )}
      {stepsOpen && stepsProjectId && (
        <StepsModal
          projectId={stepsProjectId}
          onClose={() => setStepsOpen(false)}
          onChanged={load}
        />
      )}
    </div>
  );
}

function ProjectModal({
  project,
  onClose,
  onSaved,
}: {
  project: Project | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(project?.name ?? "");
  const [description, setDescription] = useState(project?.description ?? "");
  const [status, setStatus] = useState<Project["status"]>(
    project?.status ?? "active"
  );
  const [saving, setSaving] = useState(false);
  const [steps, setSteps] = useState<
    Array<Pick<Step, "title" | "is_done"> & { id?: string }>
  >([]);
  const [error, setError] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Load existing steps when editing
  useEffect(() => {
    if (!project) return;
    (async () => {
      const { data } = await supabase
        .from("project_steps")
        .select("id,title,is_done,position")
        .eq("project_id", project.id)
        .order("position", { ascending: true });
      if (data)
        setSteps(
          data.map((s: any) => ({
            id: s.id,
            title: s.title,
            is_done: s.is_done,
          }))
        );
    })();
  }, [project]);

  function addStepField() {
    setSteps((prev) => [...prev, { title: "", is_done: false }]);
  }
  function updateStepField(idx: number, title: string) {
    setSteps((prev) => prev.map((s, i) => (i === idx ? { ...s, title } : s)));
  }
  function removeStepField(idx: number) {
    setSteps((prev) => prev.filter((_, i) => i !== idx));
  }

  function onSelectImage(file: File | null) {
    setImageFile(file);
    if (file) setImagePreview(URL.createObjectURL(file));
    else setImagePreview(null);
  }

  async function save() {
    if (steps.length < 1) {
      setError("Add at least one step.");
      return;
    }
    setSaving(true);
    setError(null);
    if (project) {
      await supabase
        .from("projects")
        .update({ name, description, status })
        .eq("id", project.id);
      // Upload image if provided
      let uploadedUrl: string | null = null;
      if (imageFile) {
        const { data: user } = await supabase.auth.getUser();
        const ext = imageFile.name.split(".").pop() || "jpg";
        const path = `${user.user?.id}/${crypto.randomUUID()}.${ext}`;
        const { data: up, error: upErr } = await supabase.storage
          .from("project-images")
          .upload(path, imageFile, {
            upsert: true,
            contentType: imageFile.type,
            cacheControl: "3600",
          });
        if (upErr) {
          setError(`Image upload failed: ${upErr.message}`);
        } else if (up) {
          const { data: pub } = supabase.storage
            .from("project-images")
            .getPublicUrl(up.path);
          uploadedUrl = pub.publicUrl;
          await supabase
            .from("projects")
            .update({ image_url: uploadedUrl })
            .eq("id", project.id);
        }
      }
      // Upsert steps list: delete missing titles, insert/update provided
      const { data: existing } = await supabase
        .from("project_steps")
        .select("id")
        .eq("project_id", project.id);
      const existingIds = new Set((existing ?? []).map((s: any) => s.id));
      const keepIds = new Set(
        steps.filter((s) => s.id).map((s) => s.id as string)
      );
      const toDelete = [...existingIds].filter((id) => !keepIds.has(id));
      if (toDelete.length) {
        await supabase.from("project_steps").delete().in("id", toDelete);
      }
      if (steps.length) {
        await supabase.from("project_steps").upsert(
          steps.map((s, i) => ({
            id: s.id,
            project_id: project.id,
            title: s.title,
            is_done: !!s.is_done,
            position: i,
          })),
          { onConflict: "id" }
        );
      }
      // Recalculate project progress from steps
      const total = steps.length;
      const completed = steps.filter((s) => s.is_done).length;
      const pct = total === 0 ? 0 : Math.round((completed / total) * 100);
      await supabase
        .from("projects")
        .update({ progress: pct })
        .eq("id", project.id);
    } else {
      const { data: inserted, error } = await supabase
        .from("projects")
        .insert({ name, description, status, progress: 0 })
        .select("id")
        .single();
      if (!error && inserted && steps.length) {
        await supabase.from("project_steps").insert(
          steps.map((s, i) => ({
            project_id: inserted.id,
            title: s.title,
            is_done: !!s.is_done,
            position: i,
          }))
        );
      }
      if (!error && inserted && imageFile) {
        const { data: user } = await supabase.auth.getUser();
        const ext = imageFile.name.split(".").pop() || "jpg";
        const path = `${user.user?.id}/${crypto.randomUUID()}.${ext}`;
        const { data: up, error: upErr } = await supabase.storage
          .from("project-images")
          .upload(path, imageFile, {
            upsert: true,
            contentType: imageFile.type,
            cacheControl: "3600",
          });
        if (upErr) {
          setError(`Image upload failed: ${upErr.message}`);
        } else if (up) {
          const { data: pub } = supabase.storage
            .from("project-images")
            .getPublicUrl(up.path);
          await supabase
            .from("projects")
            .update({ image_url: pub.publicUrl })
            .eq("id", inserted.id);
        }
      }
    }
    setSaving(false);
    onSaved();
  }

  return (
    <div className="fixed inset-0 bg-black/30 grid place-items-center p-4">
      <div className="w-full max-w-2xl bg-white rounded-xl p-6 space-y-4 shadow-lg">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">
            {project ? "Edit project" : "New project"}
          </h2>
          <button onClick={onClose} className="text-sm">
            Close
          </button>
        </div>
        <div className="grid gap-4">
          <div>
            <label className="block text-sm mb-1">Name</label>
            <input
              className="w-full border rounded-md px-3 py-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Description</label>
            <textarea
              className="w-full border rounded-md px-3 py-2"
              rows={3}
              value={description ?? ""}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm mb-1">Status</label>
              <select
                className="w-full border rounded-md px-3 py-2"
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
              >
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm mb-1">Cover image</label>
              <div className="flex items-center gap-3">
                <input
                  className="w-full border rounded-md px-3 py-2"
                  type="file"
                  accept="image/*"
                  onChange={(e) => onSelectImage(e.target.files?.[0] ?? null)}
                />
                {imagePreview && (
                  <img
                    src={imagePreview}
                    alt="preview"
                    className="h-16 w-24 object-cover rounded border"
                  />
                )}
              </div>
            </div>
          </div>
          <div className="border-t pt-3">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium">Steps</label>
              <button
                type="button"
                onClick={addStepField}
                className="text-sm underline"
              >
                Add step
              </button>
            </div>
            <div className="grid gap-2">
              {steps.map((s, idx) => (
                <div key={s.id ?? idx} className="flex gap-2">
                  <input
                    className="flex-1 border rounded-md px-3 py-2"
                    placeholder={`Step ${idx + 1}`}
                    value={s.title}
                    onChange={(e) => updateStepField(idx, e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => removeStepField(idx)}
                    className="rounded-md border px-3"
                  >
                    Remove
                  </button>
                </div>
              ))}
              {steps.length === 0 && (
                <div className="text-sm text-gray-600">
                  No steps yet. Add the steps for this project.
                </div>
              )}
              {error && <div className="text-sm text-red-600">{error}</div>}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button onClick={onClose} className="rounded-md border px-4 py-2">
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="rounded-md bg-indigo-600 text-white px-4 py-2 disabled:opacity-50 shadow-sm hover:bg-indigo-700"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

function StepsModal({
  projectId,
  onClose,
  onChanged,
}: {
  projectId: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [steps, setSteps] = useState<Step[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("project_steps")
        .select("id,title,is_done,position")
        .eq("project_id", projectId)
        .order("position", { ascending: true });
      setSteps((data as any) ?? []);
      setLoading(false);
    })();
  }, [projectId]);

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
    // Recalculate project progress
    const total = nextSteps.length;
    const completed = nextSteps.filter((s) => s.is_done).length;
    const pct = total === 0 ? 0 : Math.round((completed / total) * 100);
    await supabase
      .from("projects")
      .update({ progress: pct })
      .eq("id", projectId);
    onChanged();
  }

  return (
    <div className="fixed inset-0 bg-black/30 grid place-items-center p-4">
      <div className="w-full max-w-md bg-white rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Project steps</h2>
          <button onClick={onClose} className="text-sm">
            Close
          </button>
        </div>
        {loading ? (
          <div>Loading…</div>
        ) : (
          <div className="grid gap-2">
            {steps.length === 0 && (
              <div className="text-sm text-gray-600">
                No steps yet. Add steps when editing the project.
              </div>
            )}
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
          </div>
        )}
      </div>
    </div>
  );
}
