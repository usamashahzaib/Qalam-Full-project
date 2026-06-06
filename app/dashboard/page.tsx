"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Stats {
  total: number;
  drafts: number;
  published: number;
  avgScore: number;
}

interface PlanStatus {
  plan: string;
  limits: Record<string, number>;
  used: Record<string, number>;
}

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [plan, setPlan] = useState<PlanStatus | null>(null);
  const [recentPosts, setRecentPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      const [statsRes, planRes, postsRes] = await Promise.all([
        fetch("/api/dashboard/stats"),
        fetch("/api/plan/status"),
        fetch("/api/posts"),
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (planRes.ok) setPlan(await planRes.json());
      if (postsRes.ok) {
        const data = await postsRes.json();
        setRecentPosts((data.posts || []).slice(0, 5));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const quickActions = [
    { label: "Write Post", path: "/write", icon: "✍️" },
    { label: "Train Voice", path: "/voice", icon: "🎙️" },
    { label: "AI Strategist", path: "/strategist", icon: "💬" },
    { label: "Carousel", path: "/carousel", icon: "🎠" },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Dashboard</h1>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="text-3xl font-bold">{stats.total}</div>
              <div className="text-gray-500 text-sm">Total Posts</div>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="text-3xl font-bold text-yellow-600">{stats.drafts}</div>
              <div className="text-gray-500 text-sm">Drafts</div>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="text-3xl font-bold text-green-600">{stats.published}</div>
              <div className="text-gray-500 text-sm">Published</div>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="text-3xl font-bold text-blue-600">
                {stats.avgScore > 0 ? stats.avgScore : "-"}
              </div>
              <div className="text-gray-500 text-sm">Avg Score</div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {quickActions.map((action) => (
            <button
              key={action.path}
              onClick={() => router.push(action.path)}
              className="bg-white rounded-lg p-6 shadow-sm hover:shadow-md transition text-left"
            >
              <div className="text-2xl mb-2">{action.icon}</div>
              <div className="font-medium">{action.label}</div>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Plan Usage */}
          {plan && (
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h2 className="text-xl font-semibold mb-4">
                Plan: {plan.plan.charAt(0).toUpperCase() + plan.plan.slice(1)}
              </h2>
              <div className="space-y-4">
                {Object.entries(plan.limits).map(([key, limit]) => {
                  const used = plan.used[key] || 0;
                  const pct = limit > 0 ? Math.round((used / limit) * 100) : 0;
                  return (
                    <div key={key}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="capitalize">{key.replace("_", " ")}</span>
                        <span>
                          {used} / {limit}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${pct >= 90 ? "bg-red-500" : "bg-green-500"}`}
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Recent Posts */}
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-4">Recent Posts</h2>
            {recentPosts.length === 0 ? (
              <p className="text-gray-500">No posts yet. Start writing!</p>
            ) : (
              <div className="space-y-3">
                {recentPosts.map((post) => (
                  <div
                    key={post.id}
                    className="border rounded-lg p-3 cursor-pointer hover:bg-gray-50"
                    onClick={() => router.push(`/write?edit=${post.id}`)}
                  >
                    <div className="font-medium truncate">{post.title || "Untitled"}</div>
                    <div className="text-xs text-gray-500">
                      {post.status} - {new Date(post.created_at).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
