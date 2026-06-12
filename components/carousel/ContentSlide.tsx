import { CANVAS, type CarouselTheme } from "@/lib/carousel-design"

type ContentSlideProps = {
  title: string
  body: string
  slideNumber: number
  totalSlides: number
  authorName?: string
  theme: CarouselTheme
}

export function ContentSlide({ title, body, slideNumber, totalSlides, authorName, theme: t }: ContentSlideProps) {
  const W = CANVAS.width
  const H = CANVAS.height
  const P = CANVAS.padding
  const font = CANVAS.fontFamily
  const isDark = t.textPrimary === "#FFFFFF" || t.textPrimary === "#FFFBF0"
  const initials = authorName ? authorName.split(" ").map((w: string) => w[0]).slice(0, 2).join("") : null

  return (
    <div style={{ width: W, height: H, background: t.bgGradient, position: "relative", overflow: "hidden", fontFamily: font, display: "flex", flexDirection: "column", justifyContent: "space-between", padding: P, boxSizing: "border-box" }}>

      {/* ── Background: top-right corner orb ── */}
      <div style={{ position: "absolute", width: 360, height: 360, borderRadius: "50%", background: `radial-gradient(circle, ${t.circleColorAlt}, transparent 68%)`, top: -140, right: -100, opacity: isDark ? 0.28 : 0.2 }} />
      <div style={{ position: "absolute", width: 500, height: 500, borderRadius: "50%", border: `1px solid ${t.counterRing}`, top: -200, right: -160 }} />

      {/* ── Bottom-left small orb ── */}
      <div style={{ position: "absolute", width: 220, height: 220, borderRadius: "50%", background: `radial-gradient(circle, ${t.accentColor}, transparent 70%)`, bottom: -80, left: -60, opacity: 0.10 }} />

      {/* ── Vertical accent line left edge ── */}
      <div style={{ position: "absolute", left: 0, top: "15%", height: "70%", width: 5, background: `linear-gradient(to bottom, transparent, ${t.accentColor}, transparent)`, borderRadius: "0 3px 3px 0" }} />

      {/* ── Top: slide counter ── */}
      <div style={{ position: "relative", zIndex: 2, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 58, height: 58, borderRadius: "50%", background: t.badgeBg, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 0 0 4px ${t.counterRing}` }}>
            <span style={{ color: t.badgeText, fontSize: "22px", fontWeight: 800 }}>{slideNumber}</span>
          </div>
          <div>
            <span style={{ color: t.textMuted, fontSize: "18px", fontWeight: 500 }}>of {totalSlides} slides</span>
          </div>
        </div>
        {initials && (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 38, height: 38, borderRadius: "50%", background: t.accentColor, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: isDark ? "#000" : "#fff", fontSize: "14px", fontWeight: 800 }}>{initials}</span>
            </div>
            <span style={{ color: t.textMuted, fontSize: "18px", fontWeight: 500 }}>{authorName}</span>
          </div>
        )}
      </div>

      {/* ── Middle: content ── */}
      <div style={{ position: "relative", zIndex: 2, flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", paddingTop: 52, paddingBottom: 52 }}>
        {/* Accent bar + dot */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 36 }}>
          <div style={{ width: 52, height: 5, background: t.accentColor, borderRadius: 3 }} />
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: t.accentColor, opacity: 0.5 }} />
          <div style={{ width: 5, height: 5, borderRadius: "50%", background: t.accentColor, opacity: 0.3 }} />
        </div>

        <h2 style={{ color: t.textPrimary, fontSize: "44px", fontWeight: 800, lineHeight: 1.15, margin: "0 0 32px", letterSpacing: "-0.015em", maxWidth: 870 }}>
          {title}
        </h2>

        <p style={{ color: t.textSecondary, fontSize: "32px", lineHeight: 1.7, margin: 0, maxWidth: 870 }}>
          {body}
        </p>
      </div>

      {/* ── Bottom: divider + progress dots ── */}
      <div style={{ position: "relative", zIndex: 2, borderTop: `1px solid ${t.dividerColor}`, paddingTop: 28, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: 8 }}>
          {Array.from({ length: totalSlides }).map((_, i) => (
            <div key={i} style={{ width: i === slideNumber - 1 ? 28 : 8, height: 8, borderRadius: 4, background: i === slideNumber - 1 ? t.accentColor : t.dividerColor, transition: "width 0.2s" }} />
          ))}
        </div>
        <span style={{ color: t.textMuted, fontSize: "18px", fontWeight: 400, letterSpacing: "0.02em" }}>
          Swipe for more
        </span>
      </div>
    </div>
  )
}
