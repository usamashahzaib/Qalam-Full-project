import { CANVAS, type CarouselTheme } from "@/lib/carousel-design"

type CTASlideProps = {
  title: string
  body?: string
  authorName?: string
  authorHandle?: string
  designation?: string
  theme: CarouselTheme
}

export function CTASlide({ title, body, authorName, authorHandle, designation, theme: t }: CTASlideProps) {
  const W = CANVAS.width
  const H = CANVAS.height
  const P = CANVAS.padding
  const font = CANVAS.fontFamily
  const isDark = t.textPrimary === "#FFFFFF" || t.textPrimary === "#FFFBF0"
  const initials = authorName ? authorName.split(" ").map((w: string) => w[0]).slice(0, 2).join("") : null

  return (
    <div style={{ width: W, height: H, background: t.bgGradient, position: "relative", overflow: "hidden", fontFamily: font, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: P, boxSizing: "border-box", textAlign: "center" }}>

      {/* ── Background: layered concentric rings centered ── */}
      <div style={{ position: "absolute", width: 720, height: 720, borderRadius: "50%", background: `radial-gradient(circle at 50% 50%, ${t.circleColor}55, transparent 65%)`, top: "50%", left: "50%", transform: "translate(-50%, -50%)" }} />
      <div style={{ position: "absolute", width: 820, height: 820, borderRadius: "50%", border: `1.5px solid ${t.counterRing}`, top: "50%", left: "50%", transform: "translate(-50%, -50%)" }} />
      <div style={{ position: "absolute", width: 940, height: 940, borderRadius: "50%", border: `1px solid ${t.counterRing.replace("0.35", "0.18")}`, top: "50%", left: "50%", transform: "translate(-50%, -50%)" }} />
      <div style={{ position: "absolute", width: 1060, height: 1060, borderRadius: "50%", border: `0.5px solid ${t.counterRing.replace("0.35", "0.08")}`, top: "50%", left: "50%", transform: "translate(-50%, -50%)" }} />

      {/* ── Corner accent orbs ── */}
      <div style={{ position: "absolute", width: 140, height: 140, borderRadius: "50%", background: t.accentColor, top: 40, left: 40, opacity: 0.15, filter: "blur(2px)" }} />
      <div style={{ position: "absolute", width: 100, height: 100, borderRadius: "50%", background: t.circleColorAlt, bottom: 40, right: 40, opacity: 0.2, filter: "blur(2px)" }} />
      <div style={{ position: "absolute", width: 60, height: 60, borderRadius: "50%", background: t.accentColor, bottom: 120, left: 60, opacity: 0.12 }} />

      {/* ── Dot constellation top-left ── */}
      <svg style={{ position: "absolute", top: 30, right: 30, opacity: isDark ? 0.08 : 0.06, pointerEvents: "none" }} width={200} height={200}>
        {[0,1,2,3,4].map(row => [0,1,2,3,4].map(col => (
          <circle key={`${row}-${col}`} cx={col * 40 + 10} cy={row * 40 + 10} r={2} fill={t.textPrimary} />
        )))}
      </svg>

      {/* ── Content ── */}
      <div style={{ position: "relative", zIndex: 2, maxWidth: 820, width: "100%" }}>
        {/* Chip */}
        <div style={{ display: "inline-flex", alignItems: "center", background: t.chipBg, border: `1px solid ${t.chipBorder}`, borderRadius: 100, padding: "10px 28px", marginBottom: 44 }}>
          <span style={{ color: t.accentColor, fontSize: "21px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>
            Key Takeaway
          </span>
        </div>

        <h2 style={{ color: t.textPrimary, fontSize: "46px", fontWeight: 800, lineHeight: 1.12, margin: "0 0 32px", letterSpacing: "-0.015em" }}>
          {title}
        </h2>

        {body && (
          <p style={{ color: t.textSecondary, fontSize: "30px", lineHeight: 1.65, margin: "0 0 52px" }}>
            {body}
          </p>
        )}

        {/* Divider */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 48 }}>
          <div style={{ width: 40, height: 1, background: t.dividerColor }} />
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: t.accentColor }} />
          <div style={{ width: 60, height: 3, background: t.accentColor, borderRadius: 2 }} />
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: t.accentColor }} />
          <div style={{ width: 40, height: 1, background: t.dividerColor }} />
        </div>

        {/* Follow CTA button */}
        <div style={{ display: "inline-flex", alignItems: "center", gap: 12, background: t.badgeBg, borderRadius: 100, padding: "18px 52px", marginBottom: 44, boxShadow: `0 0 0 1px ${t.counterRing}` }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
            <path d="M4 12h16m0 0l-6-6m6 6l-6 6" stroke={t.badgeText} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span style={{ color: t.badgeText, fontSize: "28px", fontWeight: 700 }}>
            {authorName ? `Follow ${authorName.split(" ")[0]}` : "Follow for more"}
          </span>
        </div>

        {/* Author block */}
        {(authorName || authorHandle || designation) && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 18, marginTop: 8 }}>
            {initials && (
              <div style={{ width: 64, height: 64, borderRadius: "50%", background: t.accentColor, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ color: isDark ? "#000" : "#fff", fontSize: "22px", fontWeight: 800 }}>{initials}</span>
              </div>
            )}
            <div style={{ textAlign: "left" }}>
              {authorName && <p style={{ color: t.textPrimary, fontSize: "24px", fontWeight: 700, margin: 0 }}>{authorName}</p>}
              {(designation || authorHandle) && (
                <p style={{ color: t.textSecondary, fontSize: "19px", margin: "4px 0 0" }}>{designation || authorHandle}</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
