import { CAROUSEL_TOKENS } from "@/lib/carousel-design"

type CoverSlideProps = {
  title: string
  accentLabel?: string
  authorName?: string
  authorHandle?: string
}

export function CoverSlide({ title, accentLabel, authorName, authorHandle }: CoverSlideProps) {
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
        justifyContent: "flex-end",
        padding: t.padding,
        boxSizing: "border-box",
      }}
    >
      {/* Decorative blue circle */}
      <div
        style={{
          position: "absolute",
          width: t.circleDiameter,
          height: t.circleDiameter,
          borderRadius: "50%",
          background: `radial-gradient(circle at 40% 40%, #2563EB, ${t.circleColor})`,
          top: t.circleOffsetY,
          right: t.circleOffsetX - 580,
          opacity: 0.85,
          filter: "blur(0px)",
        }}
      />
      {/* Circle glow halo */}
      <div
        style={{
          position: "absolute",
          width: t.circleDiameter + 160,
          height: t.circleDiameter + 160,
          borderRadius: "50%",
          background: "transparent",
          border: `1px solid rgba(29,78,216,0.3)`,
          top: t.circleOffsetY - 80,
          right: t.circleOffsetX - 660,
        }}
      />

      {/* Content */}
      <div style={{ position: "relative", zIndex: 2 }}>
        {/* Accent chip */}
        {accentLabel && (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              background: t.chipBg,
              border: `1px solid ${t.chipBorder}`,
              borderRadius: 100,
              padding: "10px 24px",
              marginBottom: 36,
            }}
          >
            <span style={{ color: t.accentColor, fontSize: t.labelSize, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
              {accentLabel}
            </span>
          </div>
        )}

        {/* Title */}
        <h1
          style={{
            color: t.textPrimary,
            fontSize: t.titleSize,
            fontWeight: 800,
            lineHeight: 1.1,
            margin: 0,
            marginBottom: 60,
            maxWidth: 820,
            letterSpacing: "-0.02em",
          }}
        >
          {title}
        </h1>

        {/* Divider */}
        <div style={{ width: 80, height: 4, background: t.accentColor, borderRadius: 2, marginBottom: 40 }} />

        {/* Author + brand */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {authorName ? (
            <div>
              <p style={{ color: t.textPrimary, fontSize: t.labelSize, fontWeight: 700, margin: 0 }}>{authorName}</p>
              {authorHandle && (
                <p style={{ color: t.textMuted, fontSize: t.captionSize, margin: "6px 0 0" }}>{authorHandle}</p>
              )}
            </div>
          ) : <div />}
          <div style={{ textAlign: "right" }}>
            <p style={{ color: t.accentColor, fontSize: t.labelSize, fontWeight: 800, margin: 0 }}>{t.brandName}</p>
            <p style={{ color: t.textMuted, fontSize: t.captionSize, margin: "4px 0 0" }}>{t.brandUrl}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
