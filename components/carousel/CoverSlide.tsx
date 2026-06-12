import { CANVAS, type CarouselTheme } from "@/lib/carousel-design"

type CoverSlideProps = {
  title: string
  accentLabel?: string
  authorName?: string
  authorHandle?: string
  designation?: string
  theme: CarouselTheme
}

export function CoverSlide({ title, accentLabel, authorName, authorHandle, designation, theme: t }: CoverSlideProps) {
  const W = CANVAS.width
  const H = CANVAS.height
  const P = CANVAS.padding
  const font = CANVAS.fontFamily
  const isDark = t.textPrimary === "#FFFFFF" || t.textPrimary === "#FFFBF0"

  return (
    <div style={{ width: W, height: H, background: t.bgGradient, position: "relative", overflow: "hidden", fontFamily: font, display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: P, boxSizing: "border-box" }}>

      {/* ── Decorative layer 1: large hero circle top-right ── */}
      <div style={{ position: "absolute", width: 580, height: 580, borderRadius: "50%", background: `radial-gradient(circle at 38% 38%, ${t.circleColorAlt}, ${t.circleColor} 55%, transparent 75%)`, top: -160, right: -140, opacity: isDark ? 0.9 : 0.55 }} />

      {/* ── Decorative layer 2: glow halo rings ── */}
      <div style={{ position: "absolute", width: 700, height: 700, borderRadius: "50%", border: `1.5px solid ${t.counterRing}`, top: -220, right: -200 }} />
      <div style={{ position: "absolute", width: 860, height: 860, borderRadius: "50%", border: `1px solid ${t.counterRing.replace("0.35", "0.15")}`, top: -300, right: -280 }} />

      {/* ── Decorative layer 3: small accent orbs ── */}
      <div style={{ position: "absolute", width: 180, height: 180, borderRadius: "50%", background: `radial-gradient(circle, ${t.accentColor}, transparent 70%)`, bottom: 220, right: 80, opacity: 0.18 }} />
      <div style={{ position: "absolute", width: 90, height: 90, borderRadius: "50%", background: t.accentColor, bottom: 300, right: 160, opacity: 0.08 }} />

      {/* ── Decorative layer 4: dot grid pattern ── */}
      <svg style={{ position: "absolute", top: 0, left: 0, opacity: isDark ? 0.04 : 0.06, pointerEvents: "none" }} width={W} height={H}>
        {Array.from({ length: 18 }).map((_, row) =>
          Array.from({ length: 18 }).map((_, col) => (
            <circle key={`${row}-${col}`} cx={col * 62 + 30} cy={row * 62 + 30} r={2.5} fill={t.textPrimary} />
          ))
        )}
      </svg>

      {/* ── Diagonal accent line ── */}
      <svg style={{ position: "absolute", top: 0, right: 0, opacity: 0.12, pointerEvents: "none" }} width={300} height={300}>
        <line x1="300" y1="0" x2="0" y2="300" stroke={t.accentColor} strokeWidth="1" />
        <line x1="300" y1="50" x2="50" y2="300" stroke={t.accentColor} strokeWidth="0.5" />
      </svg>

      {/* ── Content ── */}
      <div style={{ position: "relative", zIndex: 2 }}>
        {accentLabel && (
          <div style={{ display: "inline-flex", alignItems: "center", background: t.chipBg, border: `1px solid ${t.chipBorder}`, borderRadius: 100, padding: "10px 26px", marginBottom: 38 }}>
            <span style={{ color: t.accentColor, fontSize: "22px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
              {accentLabel}
            </span>
          </div>
        )}

        <h1 style={{ color: t.textPrimary, fontSize: "66px", fontWeight: 800, lineHeight: 1.08, margin: 0, marginBottom: 56, maxWidth: 830, letterSpacing: "-0.025em" }}>
          {title}
        </h1>

        {/* Accent bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 44 }}>
          <div style={{ width: 64, height: 5, background: t.accentColor, borderRadius: 3 }} />
          <div style={{ width: 14, height: 14, borderRadius: "50%", background: t.accentColor, opacity: 0.6 }} />
        </div>

        {/* Author row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {authorName ? (
            <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
              {/* Avatar circle with initials */}
              <div style={{ width: 62, height: 62, borderRadius: "50%", background: t.accentColor, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ color: isDark ? "#000" : "#fff", fontSize: "22px", fontWeight: 800 }}>
                  {authorName.split(" ").map((w: string) => w[0]).slice(0, 2).join("")}
                </span>
              </div>
              <div>
                <p style={{ color: t.textPrimary, fontSize: "24px", fontWeight: 700, margin: 0, lineHeight: 1.2 }}>{authorName}</p>
                {(designation || authorHandle) && (
                  <p style={{ color: t.textSecondary, fontSize: "19px", margin: "5px 0 0", lineHeight: 1.3 }}>{designation || authorHandle}</p>
                )}
              </div>
            </div>
          ) : <div />}

          {/* Slide badge */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", opacity: 0.5 }}>
            <div style={{ width: 44, height: 44, borderRadius: "50%", border: `1.5px solid ${t.textMuted}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: t.textMuted, fontSize: "16px", fontWeight: 600 }}>1</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
