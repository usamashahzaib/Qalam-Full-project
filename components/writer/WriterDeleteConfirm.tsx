"use client"

interface Props {
  versionIdx: number
  onConfirm: (idx: number) => void
  onClose: () => void
}

export function WriterDeleteConfirm({ versionIdx, onConfirm, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl">
        <h2 className="text-base font-bold text-zinc-900">Delete Version {versionIdx + 1}?</h2>
        <p className="mt-1.5 text-sm text-zinc-500">This cannot be undone. The content in the editor will stay as-is.</p>
        <div className="mt-5 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 cursor-pointer rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(versionIdx)}
            className="flex-1 cursor-pointer rounded-xl bg-red-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-600"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}
