"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

type TableRow = { name: string; exists: boolean }
type RpcRow = { name: string; exists: boolean }

type DbStatus = {
  ok: boolean
  tables: TableRow[]
  rpcs: RpcRow[]
  missingTables: string[]
  missingRpcs: string[]
  instructions: string
}

export function MigrationsClient({ adminEmail }: { adminEmail: string }) {
  const [status, setStatus] = useState<DbStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/admin/db-status")
      .then((r) => r.json())
      .then((data: DbStatus) => setStatus(data))
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen bg-zinc-50 p-6 font-jakarta">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">DB Migration Status</h1>
            <p className="mt-1 text-sm text-zinc-500">Logged in as <span className="font-mono text-xs">{adminEmail}</span></p>
          </div>
          <Link href="/admin" className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50">
            Back to Admin
          </Link>
        </div>

        {loading && (
          <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-500">
            Checking database status...
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
            Error: {error}
          </div>
        )}

        {status && (
          <div className="space-y-6">
            <div className={`rounded-2xl border p-5 ${status.ok ? "border-teal-200 bg-teal-50" : "border-amber-200 bg-amber-50"}`}>
              <div className="flex items-center gap-3">
                <span className={`h-3 w-3 rounded-full ${status.ok ? "bg-teal-500" : "bg-amber-500"}`} />
                <p className={`text-sm font-semibold ${status.ok ? "text-teal-800" : "text-amber-800"}`}>
                  {status.ok ? "All migrations applied" : `${status.missingTables.length + status.missingRpcs.length} items missing`}
                </p>
              </div>
              {!status.ok && (
                <p className="mt-2 text-xs text-amber-700">{status.instructions}</p>
              )}
            </div>

            {!status.ok && (
              <div className="rounded-2xl border border-zinc-200 bg-white p-5 space-y-4">
                <div>
                  <h2 className="text-sm font-bold text-zinc-900">How to apply migrations</h2>
                  <ol className="mt-3 space-y-2 text-sm text-zinc-700">
                    <li className="flex gap-2"><span className="font-bold text-teal-600">1.</span> Go to <a href="https://app.supabase.com" target="_blank" rel="noreferrer" className="text-teal-600 underline">app.supabase.com</a> → Your Project → SQL Editor</li>
                    <li className="flex gap-2"><span className="font-bold text-teal-600">2.</span> Copy the contents of <code className="rounded bg-zinc-100 px-1 text-xs">supabase/migrations/COMBINED_NEW_MIGRATIONS.sql</code> from the repo</li>
                    <li className="flex gap-2"><span className="font-bold text-teal-600">3.</span> Paste it into the SQL Editor and click Run</li>
                    <li className="flex gap-2"><span className="font-bold text-teal-600">4.</span> Refresh this page to verify</li>
                  </ol>
                  <p className="mt-3 text-xs text-zinc-500">
                    Or via CLI: <code className="rounded bg-zinc-100 px-1">SUPABASE_ACCESS_TOKEN=sbp_xxx node scripts/run-migrations.mjs</code>
                  </p>
                </div>
                {status.missingTables.length >= 5 && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                    <p className="text-xs font-semibold text-amber-800">Fresh setup detected</p>
                    <p className="mt-1 text-xs text-amber-700">
                      Many tables are missing — this looks like a new database. <code className="rounded bg-amber-100 px-1">COMBINED_NEW_MIGRATIONS.sql</code> will drop and recreate all tables from scratch. This is safe on an empty database. Do not run it if you have existing data you want to keep.
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-zinc-200 bg-white p-5">
                <h2 className="mb-3 text-sm font-bold text-zinc-900">Tables</h2>
                <div className="space-y-1.5">
                  {status.tables.map((t) => (
                    <div key={t.name} className="flex items-center justify-between">
                      <span className="font-mono text-xs text-zinc-700">{t.name}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${t.exists ? "bg-teal-100 text-teal-700" : "bg-red-100 text-red-700"}`}>
                        {t.exists ? "OK" : "MISSING"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-200 bg-white p-5">
                <h2 className="mb-3 text-sm font-bold text-zinc-900">RPC Functions</h2>
                <div className="space-y-1.5">
                  {status.rpcs.map((r) => (
                    <div key={r.name} className="flex items-center justify-between">
                      <span className="font-mono text-xs text-zinc-700">{r.name}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${r.exists ? "bg-teal-100 text-teal-700" : "bg-red-100 text-red-700"}`}>
                        {r.exists ? "OK" : "MISSING"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-5">
              <h2 className="mb-2 text-sm font-bold text-zinc-900">Fallback status</h2>
              <p className="text-xs text-zinc-600">
                The app operates gracefully without the missing items:
              </p>
              <ul className="mt-2 space-y-1 text-xs text-zinc-600">
                <li className="flex gap-2"><span className="text-amber-500">!</span> Payments use direct table updates instead of the atomic RPC</li>
                <li className="flex gap-2"><span className="text-amber-500">!</span> Post versioning silently skips when post_versions table is absent</li>
                <li className="flex gap-2"><span className="text-amber-500">!</span> AI cost tracking disabled when ai_usage table is absent</li>
                <li className="flex gap-2"><span className="text-amber-500">!</span> Voice RAG examples not stored when voice_examples table is absent</li>
                <li className="flex gap-2"><span className="text-amber-500">!</span> Scheduling notifications not logged when scheduling_notifications is absent</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
