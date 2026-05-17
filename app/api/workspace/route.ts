import { NextRequest, NextResponse } from "next/server"
import { resolveWorkspaceKey } from "@/lib/server/app-session"
import { supabaseInsert, supabaseSelect } from "@/lib/server/supabase-rest"

type WorkspaceRow = {
  state: Record<string, unknown> | null
  updated_at: string | null
}

export async function GET(request: NextRequest) {
  try {
    const workspaceKey = resolveWorkspaceKey(request)
    
    // Attempt to read from the new relational schema
    try {
      const workspaces = await supabaseSelect<{ id: string }>("workspaces", `owner_email=eq.${encodeURIComponent(workspaceKey)}&limit=1`)
      const workspaceId = workspaces?.[0]?.id

      if (workspaceId) {
        const posts = await supabaseSelect<Record<string, unknown>>("posts", `workspace_id=eq.${workspaceId}`)
        return NextResponse.json({
          state: { posts: posts || [] },
          updatedAt: new Date().toISOString(),
        })
      }
    } catch (e) {
      // Fallback to legacy if migration hasn't run yet
      console.warn("Relational tables not found, falling back to legacy JSON blob", e);
    }

    const query = `workspace_key=eq.${encodeURIComponent(workspaceKey)}&select=state,updated_at&limit=1`
    const rows = await supabaseSelect<WorkspaceRow>("workspace_snapshots", query)
    const row = rows?.[0]
    return NextResponse.json({
      state: row?.state || null,
      updatedAt: row?.updated_at || null,
    })
  } catch (error) {
    const message = (error as Error).message || "server_error"
    return NextResponse.json({ error: message }, { status: message === "auth_required" ? 401 : 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = (await request.json()) as { workspaceKey?: string; state?: { posts?: any[] } }
    const workspaceKey = resolveWorkspaceKey(request)
    
    try {
      // Ensure workspace exists
      await supabaseInsert("workspaces", { owner_email: workspaceKey }, "resolution=ignore-duplicates")
      const workspaces = await supabaseSelect<{ id: string }>("workspaces", `owner_email=eq.${encodeURIComponent(workspaceKey)}&limit=1`)
      const workspaceId = workspaces?.[0]?.id

      if (workspaceId && body.state?.posts) {
        // Upsert posts relationally
        for (const post of body.state.posts) {
          await supabaseInsert("posts", {
            id: post.id,
            workspace_id: workspaceId,
            title: post.title || 'Untitled',
            content: post.content || '',
            post_type: post.type || 'text',
            status: post.status || 'draft',
            scheduled_time: post.scheduledTime || null,
            publish_date: post.date || null,
            updated_at: new Date().toISOString()
          }, "resolution=merge-duplicates")
        }
        return NextResponse.json({ saved: true, message: "Relational sync complete" })
      }
    } catch (e) {
       console.warn("Relational tables not found, falling back to legacy JSON blob", e);
    }

    // Legacy Fallback
    const rows = await supabaseInsert<WorkspaceRow>(
      "workspace_snapshots",
      {
        workspace_key: workspaceKey,
        state: body.state || {},
        updated_at: new Date().toISOString(),
      },
      "resolution=merge-duplicates,return=representation"
    )
    return NextResponse.json({ saved: true, row: rows?.[0] || null })
  } catch (error) {
    const message = (error as Error).message || "server_error"
    return NextResponse.json({ error: message }, { status: message === "auth_required" ? 401 : 500 })
  }
}
