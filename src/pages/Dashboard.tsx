import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { Link } from "react-router-dom";
import { Line, Doughnut, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  BarElement,
  Tooltip as ChartTooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  BarElement,
  ChartTooltip,
  Legend
);

type Project = {
  id: string;
  name: string;
  status: string;
  progress: number;
  created_at: string;
  image_url?: string | null;
};

export default function Dashboard() {
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false });
      if (active && data) setProjects(data as Project[]);
    })();
    return () => {
      active = false;
    };
  }, []);

  const trendData = useMemo(() => {
    const pts = projects.slice(0, 10).reverse();
    return {
      labels: pts.map((p) =>
        p.name.length > 10 ? `${p.name.slice(0, 10)}…` : p.name
      ),
      datasets: [
        {
          label: "Progress",
          data: pts.map((p) => p.progress ?? 0),
          borderColor: "#4f46e5",
          backgroundColor: "rgba(79,70,229,0.15)",
          tension: 0.35,
          fill: true,
        },
      ],
    };
  }, [projects]);

  const statusData = useMemo(() => {
    const counts = {
      active: projects.filter((p) => p.status === "active").length,
      paused: projects.filter((p) => p.status === "paused").length,
      completed: projects.filter((p) => p.status === "completed").length,
    };
    return {
      labels: ["Active", "Paused", "Completed"],
      datasets: [
        {
          data: [counts.active, counts.paused, counts.completed],
          backgroundColor: ["#4f46e5", "#f59e0b", "#10b981"],
          borderWidth: 0,
        },
      ],
    };
  }, [projects]);

  const distributionData = useMemo(() => {
    const buckets = [0, 20, 40, 60, 80, 100];
    const counts = [0, 0, 0, 0, 0];
    projects.forEach((p) => {
      const v = p.progress ?? 0;
      const idx = Math.min(Math.floor(v / 20), 4);
      counts[idx] += 1;
    });
    return {
      labels: ["0-19%", "20-39%", "40-59%", "60-79%", "80-100%"],
      datasets: [
        {
          label: "Projects",
          data: counts,
          backgroundColor: "rgba(79,70,229,0.25)",
          borderColor: "#4f46e5",
        },
      ],
    };
  }, [projects]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Overview</h1>
        <Link to="/projects" className="text-sm underline">
          Manage projects
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Stat
          label="Total Projects"
          value={projects.length.toString()}
          variant="indigo"
        />
        <Stat
          label="Active"
          value={projects
            .filter((p) => p.status === "active")
            .length.toString()}
          variant="emerald"
        />
        <Stat
          label="Completed"
          value={projects
            .filter((p) => p.status === "completed")
            .length.toString()}
          variant="violet"
        />
      </div>
      {/* Full-width trend */}
      <Card title="Progress trend (last 10)">
        <div className="h-72">
          <Line
            data={trendData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              scales: { y: { min: 0, max: 100 } },
            }}
          />
        </div>
      </Card>

      {/* Two small charts in a row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card title="Status breakdown">
          <div className="max-w-xs mx-auto h-48">
            <Doughnut
              data={statusData}
              options={{ responsive: true, maintainAspectRatio: false }}
            />
          </div>
        </Card>
        <Card title="Progress distribution">
          <div className="h-48">
            <Bar
              data={distributionData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
              }}
            />
          </div>
        </Card>
      </div>

      {/* Recent projects */}
      <div className="space-y-2">
        <h2 className="font-medium">Recent projects</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {projects.slice(0, 4).map((p) => (
            <Link
              key={p.id}
              to={`/projects/${p.id}`}
              className="block border border-transparent rounded-xl bg-white shadow-md hover:shadow-lg transition-shadow"
            >
              {p.image_url ? (
                <img
                  src={p.image_url}
                  alt=""
                  className="block h-24 w-full object-cover rounded-t-xl"
                />
              ) : (
                <div className="h-24 bg-gradient-to-r from-indigo-50 to-violet-50 rounded-t-xl" />
              )}
              <div className="p-3">
                <div className="font-medium truncate" title={p.name}>
                  {p.name}
                </div>
                <div className="mt-2 h-2 rounded-full bg-gray-100">
                  <div
                    className="h-2 rounded-full bg-indigo-600"
                    style={{ width: `${p.progress ?? 0}%` }}
                  />
                </div>
              </div>
            </Link>
          ))}
          {projects.length === 0 && (
            <div className="text-sm text-gray-600">No projects yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  variant,
}: {
  label: string;
  value: string;
  variant?: "indigo" | "emerald" | "violet";
}) {
  const bg =
    variant === "emerald"
      ? "from-emerald-100"
      : variant === "violet"
      ? "from-violet-100"
      : "from-indigo-100";
  return (
    <div
      className={`border border-transparent rounded-xl p-4 shadow-md bg-gradient-to-br ${bg} to-white`}
    >
      <div className="text-sm text-gray-600">{label}</div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-transparent rounded-xl p-4 shadow-md bg-white">
      <h2 className="font-medium mb-3">{title}</h2>
      {children}
    </div>
  );
}
