"use client"

interface QueueOverlayProps {
  position: number
  message: string
  plan: string
  onUpgrade?: () => void
}

export function QueueOverlay({ position, message, plan, onUpgrade }: QueueOverlayProps) {
  if (plan !== "Free") {
    return (
      <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-700">
        <p className="font-medium">{message}</p>
        <p className="mt-1 text-neutral-500">Processing your request...</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-700">
      <p className="font-medium">{message}</p>

      {position > 3 && (
        <p className="mt-1 text-orange-600">High demand right now. Consider upgrading for priority access.</p>
      )}

      <div className="mt-4 rounded-lg border border-teal/20 bg-teal-50 p-4">
        <p className="font-semibold text-teal-800">Skip the queue forever</p>
        <p className="mt-1 text-teal-700">
          Free plan: 5 generations/hour - Solo: 15/hour with no queue wait
        </p>
        <button
          onClick={onUpgrade}
          className="mt-3 w-full rounded-lg bg-teal px-4 py-2 text-white hover:bg-teal-600 transition-colors"
        >
          Upgrade to Solo - PKR 499/mo
        </button>
        <p className="mt-2 text-xs text-teal-600">15 generations/hour + priority processing</p>
      </div>
    </div>
  )
}
