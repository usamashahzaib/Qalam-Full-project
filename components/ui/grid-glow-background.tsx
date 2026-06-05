import type { CSSProperties, ReactNode } from "react"

interface GridGlowBackgroundProps {
  children: ReactNode
  backgroundColor?: string
  gridColor?: string
  gridSize?: number
  glowColors?: string[]
  glowCount?: number
}

export default function GridGlowBackground({
  children,
  backgroundColor = "#0a0a0a",
  gridColor = "rgba(255,255,255,0.05)",
  gridSize = 50,
  glowColors = ["#4A00E0", "#8E2DE2", "#4A00E0"],
}: GridGlowBackgroundProps) {
  const [g1 = glowColors[0], g2 = glowColors[1] ?? glowColors[0], g3 = glowColors[2] ?? glowColors[0]] = glowColors

  const style = {
    backgroundColor,
    backgroundImage: [
      `linear-gradient(${gridColor} 1px, transparent 1px)`,
      `linear-gradient(90deg, ${gridColor} 1px, transparent 1px)`,
      `radial-gradient(circle at 12% 18%, ${g1}26 0, transparent 22%)`,
      `radial-gradient(circle at 82% 14%, ${g2}20 0, transparent 20%)`,
      `radial-gradient(circle at 74% 76%, ${g3}22 0, transparent 24%)`,
      `radial-gradient(circle at 22% 80%, ${g1}18 0, transparent 18%)`,
    ].join(", "),
    backgroundSize: `${gridSize}px ${gridSize}px, ${gridSize}px ${gridSize}px, auto, auto, auto, auto`,
    backgroundPosition: "0 0, 0 0, 0 0, 0 0, 0 0, 0 0",
  } satisfies CSSProperties

  return (
    <div className="relative min-h-screen w-full" style={style}>
      <div className="relative z-10">{children}</div>
    </div>
  )
}
