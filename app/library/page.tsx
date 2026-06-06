"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Post {
  id: string;
  title: string;
  content: string;
  status: string;
  role_profile: string;
  engagement_score: number | null;
  created_at: string;
  hook: string | null;
}

export default function LibraryPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPosts();
  }, []);

  async function loadPosts() {
    try {
      const res = await fetch("/api/posts");
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setPosts(data.posts || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const roles = ["all", "ai_engineer", "ceo", "hr", "sales", "designer", "founder", "consultant"];

  const filtered = posts
    .filter((p) => {
      if (filter !== "all" && p.role_profile !== filter) return false;
      if (search) {
        const s = search.toLowerCase();
        return (
          (p.title || "").toLowerCase().includes(s) ||
          (p.content || "").toLowerCase().includes(s) ||
          (p.hook || "").toLowerCase().includes(s)
        );
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "newest") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortBy === "oldest") return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (sortBy === "score") return (b.engagement_score || 0) - (a.engagement_score || 0);
      return 0;
    });

  const roleLabels: Record<string, string> = {
    ai_engineer: "AI Engineer",
    ceo: "CEO",
    hr: "HR",
    sales: "Sales",
    designer: "Designer",
    founder: "Founder",
    consultant: "Consultant",
  };

  const statusColors: Record<string, string> = {
    draft: "bg-yellow-100 text-yellow-800",
    published: "bg-green-100 text-green-800",
    scheduled: "bg-blue-100 text-blue-800",
    archived: "bg-gray-100 text-gray-800",
  };

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
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <h1 className="text-3xl font-bold">Post Library</h1>
          <button
            onClick={() => router.push("/write")}
            className="bg-black text-white px-6 py-2 rounded-lg hover:bg-gray-800"
          >
            + New Post
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg p-4 mb-6 shadow-sm">
          <div className="flex flex-col md:flex-row gap-4">
            <input
              type="text"
              placeholder="Search posts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 border rounded-lg px-4 py-2"
            />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="border rounded-lg px-4 py-2"
            >
              {roles.map((r) => (
                <option key={r} value={r}>
                  {r === "all" ? "All Roles" : roleLabels[r] || r}
                </option>
              ))}
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="border rounded-lg px-4 py-2"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="score">Highest Score</option>
            </select>
          </div>
        </div>

        {/* Posts Grid */}
        {filtered.length === 0 ? (
          <div className="bg-white rounded-lg p-12 text-center shadow-sm">
            <p className="text-gray-500 text-lg mb-4">No posts found.</p>
            <button
              onClick={() => router.push("/write")}
              className="text-blue-600 hover:underline"
            >
              Go to Write to create your first post
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((post) => (
              <div
                key={post.id}
                className="bg-white rounded-lg p-6 shadow-sm hover:shadow-md transition cursor-pointer"
                onClick={() => router.push(`/write?edit=${post.id}`)}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-xs px-2 py-1 rounded-full ${statusColors[post.status] || "bg-gray-100"}`}>
                    {post.status}
                  </span>
                  <span className="text-xs text-gray-500">
                    {roleLabels[post.role_profile] || post.role_profile}
                  </span>
                </div>
                <h3 className="font-semibold mb-2 line-clamp-2">
                  {post.title || "Untitled Post"}
                </h3>
                <p className="text-gray-600 text-sm mb-3 line-clamp-3">
                  {post.hook || post.content.substring(0, 120) + "..."}
                </p>
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>{new Date(post.created_at).toLocaleDateString()}</span>
                  {post.engagement_score && (
                    <span className="text-green-600 font-medium">
                      Score: {post.engagement_score}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
