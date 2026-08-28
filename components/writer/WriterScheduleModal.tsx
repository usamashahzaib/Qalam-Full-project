"use client"

interface Props {
  scheduleDate: string
  scheduleTime: string
  setScheduleDate: (v: string) => void
  setScheduleTime: (v: string) => void
  todayInput: () => string
  nowTimeInput: () => string
  onConfirm: () => void
  onClose: () => void
}

export function WriterScheduleModal({
  scheduleDate, scheduleTime,
  setScheduleDate, setScheduleTime,
  todayInput, nowTimeInput,
  onConfirm, onClose,
}: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl">
        <h2 className="text-base font-bold text-zinc-900">Schedule post</h2>
        <p className="mt-1 text-sm text-zinc-500">Choose when this post goes live.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="relative">
            <label className="absolute -top-2 left-2.5 bg-white px-1 t-eyebrowr text-teal">Date</label>
            <input
              type="date"
              min={todayInput()}
              value={scheduleDate}
              onChange={(e) => setScheduleDate(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-teal focus:ring-4 focus:ring-teal/10"
            />
          </div>
          <div className="relative">
            <label className="absolute -top-2 left-2.5 bg-white px-1 t-eyebrowr text-teal">Time</label>
            <input
              type="time"
              min={scheduleDate === todayInput() ? nowTimeInput() : undefined}
              value={scheduleTime}
              onChange={(e) => setScheduleTime(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-teal focus:ring-4 focus:ring-teal/10"
            />
          </div>
        </div>
        <div className="mt-5 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 cursor-pointer rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 cursor-pointer rounded-xl bg-teal px-4 py-2.5 text-sm font-bold text-white hover:bg-teal-600"
          >
            Confirm schedule
          </button>
        </div>
      </div>
    </div>
  )
}
