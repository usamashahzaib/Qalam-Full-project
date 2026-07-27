import Image from "next/image"
import { CANVAS, fitFont, type CarouselTheme } from "@/lib/carousel-design"

type CTASlideProps = {
  title: string
  body?: string
  authorName?: string
  authorHandle?: string
  designation?: string
  authorPhotoUrl?: string
  theme: CarouselTheme
  backgroundPhoto?: string
  totalSlides?: number
  slideNumber?: number
}

function Avatar({ name, photoUrl, size, bg, color }: { name: string; photoUrl?: string; size: number; bg: string; color: string }) {
  if (photoUrl) {
    return <Image src={photoUrl} alt={name} width={size} height={size} unoptimized crossOrigin="anonymous" style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
  }
  const letters = name.split(" ").map((w: string) => w[0]).slice(0, 2).join("")
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <span style={{ color, fontSize: size * 0.35, fontWeight: 800 }}>{letters}</span>
    </div>
  )
}

function BgPhoto({ src, overlay }: { src: string; overlay: string }) {
  return (
    <>
      <div style={{ position: "absolute", inset: 0, backgroundImage: `url(${src})`, backgroundSize: "cover", backgroundPosition: "center", backgroundRepeat: "no-repeat" }} />
      <div style={{ position: "absolute", inset: 0, background: overlay }} />
    </>
  )
}

export function CTASlide({ title, body, authorName, authorHandle, designation, authorPhotoUrl, theme: t, backgroundPhoto, totalSlides, slideNumber }: CTASlideProps) {
  const W = CANVAS.width
  const H = CANVAS.height
  const P = CANVAS.padding
  const font = CANVAS.fontFamily
  const isDark = t.textPrimary === "#FFFFFF" || t.textPrimary === "#FFFBF0" || t.textPrimary === "#F0EDD8"
  const initials = authorName ? authorName.split(" ").map((w: string) => w[0]).slice(0, 2).join("") : null
  const v = t.variant
  const firstName = authorName ? authorName.split(" ")[0] : null

  // ── VARIANT: editorial ─────────────────────────────────────────────────
  if (v === "editorial") {
    const bgColor = t.bgGradient.startsWith("#") ? t.bgGradient : "#FFFFFF"
    return (
      <div style={{ width: W, height: H, background: backgroundPhoto ? undefined : bgColor, position: "relative", overflow: "hidden", fontFamily: font, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "flex-start", padding: `${P * 1.2}px ${P}px`, boxSizing: "border-box" }}>
        {backgroundPhoto && <BgPhoto src={backgroundPhoto} overlay="rgba(255,255,255,0.92)" />}
        {!backgroundPhoto && <div style={{ position: "absolute", inset: 0, backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 79px, ${t.dividerColor} 79px, ${t.dividerColor} 80px)`, opacity: 0.3 }} />}

        {totalSlides && slideNumber && (
          <p style={{ position: "absolute", top: P, right: P, color: t.textMuted, fontSize: "17px", letterSpacing: "0.08em", margin: 0, zIndex: 2 }}>
            {String(slideNumber).padStart(2, "0")} / {String(totalSlides).padStart(2, "0")}
          </p>
        )}

        <div style={{ position: "relative", zIndex: 2, maxWidth: 860, width: "100%" }}>
          <div style={{ width: "100%", height: 1, background: t.dividerColor, marginBottom: 48 }} />

          <p style={{ color: t.textMuted, fontSize: "18px", fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", margin: "0 0 32px" }}>
            Key Takeaway
          </p>

          <h2 style={{ color: t.textPrimary, fontSize: fitFont(title, 56, 30, 60), fontWeight: 800, lineHeight: 1.10, margin: "0 0 36px", letterSpacing: "-0.025em" }}>
            {title}
          </h2>

          {body && <p style={{ color: t.textSecondary, fontSize: fitFont(body, 30, 18, 200), lineHeight: 1.68, margin: "0 0 52px" }}>{body}</p>}

          <div style={{ width: "100%", height: 1, background: t.dividerColor, marginBottom: 36 }} />

          {/* Follow CTA */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: 16, background: t.badgeBg, borderRadius: 8, padding: "18px 48px" }}>
            <span style={{ color: t.badgeText, fontSize: "26px", fontWeight: 700 }}>
              {firstName ? `Follow ${firstName}` : "Follow for more"}
            </span>
          </div>

          {authorName && (
            <p style={{ color: t.textMuted, fontSize: "17px", fontWeight: 600, letterSpacing: "0.10em", textTransform: "uppercase", margin: "32px 0 0" }}>
              {authorName}{designation ? ` · ${designation}` : ""}
            </p>
          )}
        </div>
      </div>
    )
  }

  // ── VARIANT: thread ────────────────────────────────────────────────────
  if (v === "thread") {
    const bgColor = t.bgGradient.startsWith("#") ? t.bgGradient : "#F5F3EE"
    return (
      <div style={{ width: W, height: H, background: backgroundPhoto ? undefined : bgColor, position: "relative", overflow: "hidden", fontFamily: font, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "flex-start", padding: `${P}px ${P}px`, boxSizing: "border-box" }}>
        {backgroundPhoto && <BgPhoto src={backgroundPhoto} overlay="rgba(245,243,238,0.92)" />}

        <div style={{ position: "relative", zIndex: 2, maxWidth: 860, width: "100%" }}>
          <h2 style={{ color: t.textPrimary, fontSize: fitFont(title, 58, 30, 55), fontWeight: 800, lineHeight: 1.08, margin: "0 0 36px", letterSpacing: "-0.02em" }}>
            {title}
          </h2>

          {body && <p style={{ color: t.textSecondary, fontSize: fitFont(body, 30, 18, 200), lineHeight: 1.68, margin: "0 0 52px" }}>{body}</p>}

          <div style={{ display: "inline-flex", alignItems: "center", gap: 16, background: t.badgeBg, borderRadius: 8, padding: "18px 48px", marginBottom: 44 }}>
            <span style={{ color: t.badgeText, fontSize: "26px", fontWeight: 700 }}>
              {firstName ? `Follow ${firstName}` : "Follow for more"}
            </span>
          </div>

          <div style={{ height: 1, background: t.dividerColor, margin: "0 0 28px" }} />
          {authorName && (
            <p style={{ color: t.textSecondary, fontSize: "19px", margin: 0 }}>{authorName}{designation ? ` · ${designation}` : ""}</p>
          )}
        </div>
      </div>
    )
  }

  // ── VARIANT: dark-bold ─────────────────────────────────────────────────
  if (v === "dark-bold") {
    const bgColor = t.bgGradient.startsWith("#") ? t.bgGradient : "#12161F"
    return (
      <div style={{ width: W, height: H, background: backgroundPhoto ? undefined : bgColor, position: "relative", overflow: "hidden", fontFamily: font, display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: `${P * 1.1}px ${P}px`, boxSizing: "border-box" }}>
        {backgroundPhoto && <BgPhoto src={backgroundPhoto} overlay="rgba(10,10,10,0.82)" />}

        {totalSlides && slideNumber && (
          <p style={{ position: "absolute", top: P, right: P, color: t.textMuted, fontSize: "19px", letterSpacing: "0.10em", margin: 0, zIndex: 2 }}>
            {String(slideNumber).padStart(2, "0")} / {String(totalSlides).padStart(2, "0")}
          </p>
        )}

        <div style={{ position: "relative", zIndex: 2 }}>
          {/* Accent lines */}
          <div style={{ display: "flex", gap: 4, marginBottom: 40 }}>
            <div style={{ width: 48, height: 4, background: t.accentColor, borderRadius: 2 }} />
            <div style={{ width: 28, height: 4, background: t.accentColor, opacity: 0.4, borderRadius: 2 }} />
          </div>

          <h2 style={{ color: t.textPrimary, fontSize: fitFont(title, 62, 30, 55), fontWeight: 900, lineHeight: 1.05, margin: "0 0 30px", letterSpacing: "-0.025em", maxWidth: 860 }}>
            {title}
          </h2>

          {body && <p style={{ color: t.textSecondary, fontSize: fitFont(body, 28, 18, 200), lineHeight: 1.68, margin: "0 0 48px" }}>{body}</p>}

          <div style={{ display: "inline-flex", alignItems: "center", gap: 14, background: "transparent", border: `1.5px solid ${t.accentColor}`, borderRadius: 8, padding: "16px 44px", marginBottom: 40 }}>
            <span style={{ color: t.accentColor, fontSize: "24px", fontWeight: 700 }}>
              {firstName ? `Follow ${firstName}` : "Follow for more"}
            </span>
          </div>

          {authorName && (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: t.accentColor }} />
              <p style={{ color: t.textMuted, fontSize: "17px", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", margin: 0 }}>
                {authorName}
              </p>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── VARIANT: warm-story ────────────────────────────────────────────────
  if (v === "warm-story") {
    const bgColor = t.bgGradient.startsWith("#") ? t.bgGradient : "#FBF5EE"
    return (
      <div style={{ width: W, height: H, background: backgroundPhoto ? undefined : bgColor, position: "relative", overflow: "hidden", fontFamily: font, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "flex-start", padding: `${P}px ${P}px`, boxSizing: "border-box" }}>
        {backgroundPhoto && <BgPhoto src={backgroundPhoto} overlay="rgba(251,245,238,0.90)" />}

        <div style={{ position: "relative", zIndex: 2, maxWidth: 860, width: "100%" }}>
          <div style={{ width: 48, height: 4, background: t.accentColor, borderRadius: 2, marginBottom: 40 }} />

          <h2 style={{ color: t.accentColor, fontSize: fitFont(title, 60, 30, 55), fontWeight: 900, lineHeight: 1.05, margin: "0 0 32px", letterSpacing: "-0.025em" }}>
            {title}
          </h2>

          {body && <p style={{ color: t.textSecondary, fontSize: fitFont(body, 30, 18, 200), lineHeight: 1.68, margin: "0 0 48px" }}>{body}</p>}

          <div style={{ display: "inline-flex", alignItems: "center", gap: 14, background: t.badgeBg, borderRadius: 8, padding: "18px 48px", marginBottom: 44 }}>
            <span style={{ color: t.badgeText, fontSize: "26px", fontWeight: 700 }}>
              {firstName ? `Follow ${firstName}` : "Follow for more"}
            </span>
          </div>

          {authorName && (
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <Avatar name={authorName} photoUrl={authorPhotoUrl} size={52} bg={t.accentColor} color="#FFFFFF" />
              <div>
                <p style={{ color: t.textPrimary, fontSize: "22px", fontWeight: 700, margin: 0 }}>{authorName}</p>
                {designation && <p style={{ color: t.textSecondary, fontSize: "18px", margin: "4px 0 0" }}>{designation}</p>}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── VARIANT: split ─────────────────────────────────────────────────────
  if (v === "split") {
    const leftBg = t.splitPanelBg ?? "#1B2B5E"
    const leftText = t.splitPanelText ?? "#FFFFFF"
    const rightBg = t.bgGradient.startsWith("#") ? t.bgGradient : "#FFFFFF"
    const leftW = 340
    return (
      <div style={{ width: W, height: H, position: "relative", overflow: "hidden", fontFamily: font, display: "flex" }}>
        {backgroundPhoto && <BgPhoto src={backgroundPhoto} overlay="rgba(0,0,0,0.65)" />}

        <div style={{ width: leftW, height: H, background: leftBg, flexShrink: 0, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "stretch", padding: "0 44px", boxSizing: "border-box", position: "relative", zIndex: 2 }}>
          <h2 style={{ color: leftText, fontSize: fitFont(title, 52, 26, 20), fontWeight: 900, lineHeight: 1.08, margin: "0 0 20px", overflowWrap: "break-word", wordBreak: "break-word" }}>
            {title}
          </h2>
          <div style={{ width: 40, height: 3, background: t.accentColor, borderRadius: 2 }} />
        </div>

        <div style={{ flex: 1, height: H, background: backgroundPhoto ? "transparent" : rightBg, display: "flex", flexDirection: "column", justifyContent: "center", padding: `${P}px ${P * 0.9}px`, boxSizing: "border-box", position: "relative", zIndex: 2 }}>
          {body && <p style={{ color: t.textSecondary, fontSize: fitFont(body, 28, 16, 200), lineHeight: 1.65, margin: "0 0 44px" }}>{body}</p>}

          <div style={{ display: "inline-flex", alignItems: "center", gap: 14, background: t.badgeBg, borderRadius: 8, padding: "16px 40px" }}>
            <span style={{ color: t.badgeText, fontSize: "24px", fontWeight: 700 }}>
              {firstName ? `Follow ${firstName}` : "Follow for more"}
            </span>
          </div>

          {authorName && (
            <p style={{ color: t.textMuted, fontSize: "17px", margin: "28px 0 0" }}>{authorName}</p>
          )}
        </div>
      </div>
    )
  }

  // ── VARIANT: quote ─────────────────────────────────────────────────────
  if (v === "quote") {
    const bgColor = t.bgGradient.startsWith("#") ? t.bgGradient : "#F9EDE4"
    return (
      <div style={{ width: W, height: H, background: backgroundPhoto ? undefined : bgColor, position: "relative", overflow: "hidden", fontFamily: font, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: `${P}px ${P * 1.2}px`, boxSizing: "border-box", textAlign: "center" }}>
        {backgroundPhoto && <BgPhoto src={backgroundPhoto} overlay="rgba(249,237,228,0.92)" />}

        {totalSlides && slideNumber && (
          <p style={{ position: "absolute", top: P, right: P, color: t.textMuted, fontSize: "17px", letterSpacing: "0.08em", margin: 0, zIndex: 2 }}>
            {slideNumber} / {totalSlides}
          </p>
        )}

        <div style={{ position: "relative", zIndex: 2, maxWidth: 780, width: "100%" }}>
          <h2 style={{ color: t.textPrimary, fontSize: fitFont(title, 52, 26, 90), fontWeight: 700, lineHeight: 1.28, margin: "0 0 44px", fontStyle: "italic" }}>
            {title}
          </h2>

          {body && <p style={{ color: t.textSecondary, fontSize: fitFont(body, 28, 18, 200), lineHeight: 1.68, margin: "0 0 44px" }}>{body}</p>}

          <div style={{ width: 52, height: 3, background: t.accentColor, borderRadius: 2, margin: "0 auto 40px" }} />

          <div style={{ display: "inline-flex", alignItems: "center", gap: 12, background: t.badgeBg, borderRadius: 8, padding: "16px 44px", marginBottom: 36 }}>
            <span style={{ color: t.badgeText, fontSize: "24px", fontWeight: 700 }}>
              {firstName ? `Follow ${firstName}` : "Follow for more"}
            </span>
          </div>

          {authorName && (
            <div>
              <p style={{ color: t.textPrimary, fontSize: "20px", fontWeight: 700, margin: 0 }}>{authorName}</p>
              {designation && <p style={{ color: t.textSecondary, fontSize: "17px", margin: "5px 0 0" }}>{designation}</p>}
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── VARIANT: standard (default) ───────────────────────────────────────
  return (
    <div style={{ width: W, height: H, background: backgroundPhoto ? undefined : t.bgGradient, position: "relative", overflow: "hidden", fontFamily: font, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: P, boxSizing: "border-box", textAlign: "center" }}>
      {backgroundPhoto && <BgPhoto src={backgroundPhoto} overlay={isDark ? "rgba(0,0,0,0.78)" : "rgba(255,255,255,0.85)"} />}

      {/* Concentric rings */}
      <div style={{ position: "absolute", width: 720, height: 720, borderRadius: "50%", background: `radial-gradient(circle at 50% 50%, ${t.circleColor}55, transparent 65%)`, top: "50%", left: "50%", transform: "translate(-50%, -50%)" }} />
      <div style={{ position: "absolute", width: 820, height: 820, borderRadius: "50%", border: `1.5px solid ${t.counterRing}`, top: "50%", left: "50%", transform: "translate(-50%, -50%)" }} />
      <div style={{ position: "absolute", width: 940, height: 940, borderRadius: "50%", border: `1px solid ${t.counterRing.replace("0.35", "0.18")}`, top: "50%", left: "50%", transform: "translate(-50%, -50%)" }} />

      <div style={{ position: "relative", zIndex: 2, maxWidth: 820, width: "100%" }}>
        <div style={{ display: "inline-flex", alignItems: "center", background: t.chipBg, border: `1px solid ${t.chipBorder}`, borderRadius: 100, padding: "10px 28px", marginBottom: 44 }}>
          <span style={{ color: t.accentColor, fontSize: "21px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>
            Key Takeaway
          </span>
        </div>

        <h2 style={{ color: t.textPrimary, fontSize: fitFont(title, 46, 28, 70), fontWeight: 800, lineHeight: 1.12, margin: "0 0 32px", letterSpacing: "-0.015em" }}>
          {title}
        </h2>

        {body && <p style={{ color: t.textSecondary, fontSize: fitFont(body, 30, 18, 200), lineHeight: 1.65, margin: "0 0 52px" }}>{body}</p>}

        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 48 }}>
          <div style={{ width: 40, height: 1, background: t.dividerColor }} />
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: t.accentColor }} />
          <div style={{ width: 60, height: 3, background: t.accentColor, borderRadius: 2 }} />
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: t.accentColor }} />
          <div style={{ width: 40, height: 1, background: t.dividerColor }} />
        </div>

        <div style={{ display: "inline-flex", alignItems: "center", gap: 12, background: t.badgeBg, borderRadius: 100, padding: "18px 52px", marginBottom: 44 }}>
          <span style={{ color: t.badgeText, fontSize: "28px", fontWeight: 700 }}>
            {firstName ? `Follow ${firstName}` : "Follow for more"}
          </span>
        </div>

        {(authorName || designation) && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 18 }}>
            {initials && (
              <Avatar name={authorName!} photoUrl={authorPhotoUrl} size={64} bg={t.accentColor} color={isDark ? "#000" : "#fff"} />
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
