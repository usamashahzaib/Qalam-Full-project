"use client"

interface QueueOverlayProps {
  message: string
  plan: string
  highDemand?: boolean
  position?: number
  estimatedWaitSeconds?: number
  onUpgrade?: () => void
}

export function QueueOverlay({
  message,
  plan,
  highDemand = false,
  position = 0,
  estimatedWaitSeconds = 0,
  onUpgrade,
}: QueueOverlayProps) {
  const waitLabel =
    estimatedWaitSeconds > 0
      ? estimatedWaitSeconds < 60
        ? `~${estimatedWaitSeconds}s`
        : `~${Math.ceil(estimatedWaitSeconds / 60)}min`
      : null

  if (highDemand) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800 ring-1 ring-amber-300">
            High demand
          </span>
          {waitLabel && (
            <span className="text-xs text-amber-700">Est. wait: {waitLabel}</span>
          )}
        </div>
        <p className="mt-2 font-medium text-amber-900">
          {position > 0
            ? `You're approximately #${position} in queue`
            : message}
        </p>
        <p className="mt-1 text-amber-700 text-xs">
          Our AI is processing many requests right now. Your request is in line - hang tight.
        </p>

        {plan === "Free" && (
          <div className="mt-3 rounded-lg border border-teal/20 bg-white/60 p-3">
            <p className="font-semibold text-teal-800 text-xs">Skip the queue</p>
            <p className="mt-0.5 text-teal-700 text-xs">
              Solo and Pro users get priority processing.
            </p>
            <button
              onClick={onUpgrade}
              className="mt-2 w-full rounded-lg bg-teal px-4 py-2 text-xs font-bold text-white hover:bg-teal-600 transition-colors"
            >
              Upgrade to Solo - PKR 499/mo
            </button>
          </div>
        )}
      </div>
    )
  }

  // Normal processing state
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
      <p className="mt-1 text-neutral-500">This may take a few seconds.</p>

      <div className="mt-4 rounded-lg border border-teal/20 bg-teal-50 p-4">
        <p className="font-semibold text-teal-800">Need more generations?</p>
        <p className="mt-1 text-teal-700">
          Free plan: 5 generations/hour - Solo: 15/hour
        </p>
        <button
          onClick={onUpgrade}
          className="mt-3 w-full rounded-lg bg-teal px-4 py-2 text-white hover:bg-teal-600 transition-colors"
        >
          Upgrade to Solo - PKR 499/mo
        </button>
      </div>
    </div>
  )
}
