import { auth } from "@/auth"
import { redirect } from "next/navigation"

export default async function DashboardPage() {
  const session = await auth()
  if (!session) redirect("/login")

  return (
    <div className="min-h-screen p-8">
      <h1 className="text-2xl font-bold mb-8">Dashboard</h1>
      <p className="text-gray-600 mb-4">Signed in as {session.user?.name} ({session.user?.email})</p>
      <div className="grid grid-cols-4 gap-4 mb-8">
        <a href="/write" className="p-4 border rounded-lg hover:bg-gray-50"><div className="text-2xl mb-2">&#128293;</div><div className="font-medium">Write Post</div></a>
        <a href="/voice" className="p-4 border rounded-lg hover:bg-gray-50"><div className="text-2xl mb-2">&#127908;</div><div className="font-medium">Train Voice</div></a>
        <a href="/strategist" className="p-4 border rounded-lg hover:bg-gray-50"><div className="text-2xl mb-2">&#128161;</div><div className="font-medium">AI Strategist</div></a>
        <a href="/carousel" className="p-4 border rounded-lg hover:bg-gray-50"><div className="text-2xl mb-2">&#127904;</div><div className="font-medium">Carousel</div></a>
      </div>
      <div className="border rounded-lg p-4">
        <h2 className="font-semibold mb-2">Recent Posts</h2>
        <p className="text-gray-500 text-sm">No posts yet. Start writing!</p>
      </div>
    </div>
  )
}
