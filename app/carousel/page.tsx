"use client";
import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

interface Slide {
  slide_number: number;
  title: string;
  content: string;
  visual: string;
}

export default function CarouselPage() {
  const { isLoaded, userId } = useAuth();
  const router = useRouter();
  const [topic, setTopic] = useState("");
  const [role, setRole] = useState("founder");
  const [slideCount, setSlideCount] = useState(5);
  const [loading, setLoading] = useState(false);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [projectId, setProjectId] = useState("");
  const [error, setError] = useState("");
  const [usage, setUsage] = useState<any>(null);

  const roles = [
    { value: "founder", label: "Founder" },
    { value: "ceo", label: "CEO" },
    { value: "ai_engineer", label: "AI Engineer" },
    { value: "hr", label: "HR" },
    { value: "sales", label: "Sales" },
    { value: "designer", label: "Designer" },
    { value: "consultant", label: "Consultant" },
  ];

  async function generate() {
    if (!topic.trim()) {
      setError("Enter a topic");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/carousel/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, role, slideCount }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to generate");
        if (data.limit !== undefined) {
          setUsage({ current: data.current, limit: data.limit });
        }
        return;
      }
      setSlides(data.slides || []);
      setProjectId(data.projectId || "");
    } catch (e) {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  async function downloadPDF() {
    if (!projectId) return;
    window.open(`/api/carousel/${projectId}/pdf`, "_blank");
  }

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Loading...</div>
      </div>
    );
  }

  if (!userId) {
    router.push("/login");
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-2">Carousel Builder</h1>
        <p className="text-gray-600 mb-8">Generate LinkedIn carousel slides from any topic.</p>

        <div className="bg-white rounded-lg p-6 shadow-sm mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Topic</label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., 5 Mistakes First-Time Founders Make"
                className="w-full border rounded-lg px-4 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full border rounded-lg px-4 py-2"
              >
                {roles.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-4 mb-4">
            <label className="text-sm font-medium">Slides: {slideCount}</label>
            <input
              type="range"
              min={3}
              max={10}
              value={slideCount}
              onChange={(e) => setSlideCount(Number(e.target.value))}
              className="flex-1"
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-lg mb-4">
              {error}
              {usage && (
                <div className="mt-1 text-sm">
                  Used: {usage.current} / {usage.limit}
                </div>
              )}
            </div>
          )}

          <button
            onClick={generate}
            disabled={loading}
            className="bg-black text-white px-6 py-2 rounded-lg hover:bg-gray-800 disabled:opacity-50"
          >
            {loading ? "Generating..." : "Generate Carousel"}
          </button>
        </div>

        {/* Slides Preview */}
        {slides.length > 0 && (
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Preview</h2>
              <button
                onClick={downloadPDF}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Download PDF
              </button>
            </div>

            <div className="space-y-4">
              {slides.map((slide) => (
                <div
                  key={slide.slide_number}
                  className="border rounded-lg p-6 bg-gray-50"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <span className="bg-black text-white w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">
                      {slide.slide_number}
                    </span>
                    <h3 className="font-semibold">{slide.title}</h3>
                  </div>
                  <p className="text-gray-700 mb-2">{slide.content}</p>
                  <p className="text-xs text-gray-400">Visual: {slide.visual}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
