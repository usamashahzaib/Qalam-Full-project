import { CAROUSEL_TOKENS } from "@/lib/carousel-design"

type ContentSlideProps = {
  title: string
  body: string
  slideNumber: number
  totalSlides: number
}

export function ContentSlide({ title, body, slideNumber, totalSlides }: ContentSlideProps) {
  const t = CAROUSEL_TOKENS

  return (
    <div
      style={{
        width: t.canvasWidth,
        height: t.canvasHeight,
        background: t.bgColor,
        position: "relative",
        overflow: "hidden",
        fontFamily: t.fontFamily,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: t.padding,
        boxSizing: "border-box",
      }}
    >
      {/* Subtle background circle - top right */}
      <div
        style={{
          position: "absolute",
          width: 340,
          height: 340,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${t.circleColor}, transparent 70%)`,
          top: -120,
          right: -80,
          opacity: 0.25,
        }}
      />

      {/* Bottom left glow */}
      <div
        style={{
          position: "absolute",
          width: 260,
          height: 260,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${t.accentColor}, transparent 70%)`,
          bottom: -80,
          left: -60,
          opacity: 0.08,
        }}
      />

      {/* Top: slide number */}
      <div style={{ position: "relative", zIndex: 2 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: t.circleColor,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span style={{ color: "#fff", fontSize: "22px", fontWeight: 800 }}>{slideNumber}</span>
          </div>
          <span style={{ color: t.textMuted, fontSize: t.captionSize, fontWeight: 500 }}>
            of {totalSlides}
          </span>
        </div>
      </div>

      {/* Middle: content */}
      <div style={{ position: "relative", zIndex: 2, flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", paddingTop: 48, paddingBottom: 48 }}>
        {/* Gold accent bar */}
        <div style={{ width: 56, height: 5, background: t.accentColor, borderRadius: 3, marginBottom: 40 }} />

        <h2
          style={{
            color: t.textPrimary,
            fontSize: t.subtitleSize,
            fontWeight: 800,
            lineHeight: 1.15,
            margin: "0 0 36px",
            letterSpacing: "-0.01em",
            maxWidth: 860,
          }}
        >
          {title}
        </h2>

        <p
          style={{
            color: t.textSecondary,
            fontSize: t.bodySize,
            lineHeight: 1.65,
            margin: 0,
            maxWidth: 880,
          }}
        >
          {body}
        </p>
      </div>

      {/* Bottom: brand */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderTop: `1px solid ${t.dividerColor}`,
          paddingTop: 32,
        }}
      >
        <span style={{ color: t.textMuted, fontSize: t.captionSize }}>{t.brandUrl}</span>
        <span style={{ color: t.accentColor, fontSize: t.captionSize, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>
          {t.brandName}
        </span>
      </div>
    </div>
  )
}
