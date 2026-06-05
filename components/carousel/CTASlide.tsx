import { CAROUSEL_TOKENS } from "@/lib/carousel-design"

type CTASlideProps = {
  title: string
  body?: string
  authorName?: string
  authorHandle?: string
}

export function CTASlide({ title, body, authorName, authorHandle }: CTASlideProps) {
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
        justifyContent: "center",
        alignItems: "center",
        padding: t.padding,
        boxSizing: "border-box",
        textAlign: "center",
      }}
    >
      {/* Large glowing blue circle - center background */}
      <div
        style={{
          position: "absolute",
          width: 700,
          height: 700,
          borderRadius: "50%",
          background: `radial-gradient(circle at 50% 50%, rgba(29,78,216,0.5) 0%, transparent 70%)`,
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
        }}
      />
      {/* Ring 1 */}
      <div
        style={{
          position: "absolute",
          width: 760,
          height: 760,
          borderRadius: "50%",
          border: `1px solid rgba(29,78,216,0.2)`,
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
        }}
      />
      {/* Ring 2 */}
      <div
        style={{
          position: "absolute",
          width: 900,
          height: 900,
          borderRadius: "50%",
          border: `1px solid rgba(29,78,216,0.1)`,
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
        }}
      />

      {/* Content */}
      <div style={{ position: "relative", zIndex: 2, maxWidth: 820 }}>
        {/* Gold chip */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            background: `rgba(245,158,11,0.15)`,
            border: `1px solid rgba(245,158,11,0.4)`,
            borderRadius: 100,
            padding: "10px 28px",
            marginBottom: 44,
          }}
        >
          <span style={{ color: t.accentColor, fontSize: t.labelSize, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>
            Key Takeaway
          </span>
        </div>

        {/* Title */}
        <h2
          style={{
            color: t.textPrimary,
            fontSize: t.subtitleSize,
            fontWeight: 800,
            lineHeight: 1.15,
            margin: "0 0 36px",
            letterSpacing: "-0.01em",
          }}
        >
          {title}
        </h2>

        {body && (
          <p
            style={{
              color: t.textSecondary,
              fontSize: t.bodySize,
              lineHeight: 1.6,
              margin: "0 0 60px",
            }}
          >
            {body}
          </p>
        )}

        {/* Divider */}
        <div style={{ width: 80, height: 4, background: t.accentColor, borderRadius: 2, margin: "0 auto 48px" }} />

        {/* Follow CTA */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            background: t.circleColor,
            borderRadius: 100,
            padding: "18px 48px",
            marginBottom: 40,
          }}
        >
          <span style={{ color: "#fff", fontSize: t.bodySize, fontWeight: 700 }}>
            Follow for more
          </span>
        </div>

        {/* Author */}
        {authorName && (
          <div style={{ marginTop: 8 }}>
            <p style={{ color: t.textPrimary, fontSize: t.labelSize, fontWeight: 700, margin: 0 }}>{authorName}</p>
            {authorHandle && (
              <p style={{ color: t.textMuted, fontSize: t.captionSize, margin: "6px 0 0" }}>{authorHandle}</p>
            )}
          </div>
        )}
      </div>

      {/* Brand watermark */}
      <div
        style={{
          position: "absolute",
          bottom: t.padding,
          right: t.padding,
          textAlign: "right",
        }}
      >
        <p style={{ color: t.accentColor, fontSize: t.labelSize, fontWeight: 800, margin: 0 }}>{t.brandName}</p>
        <p style={{ color: t.textMuted, fontSize: t.captionSize, margin: "4px 0 0" }}>{t.brandUrl}</p>
      </div>
    </div>
  )
}
