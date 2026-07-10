import { CANVAS, type CarouselTheme } from "@/lib/carousel-design"

type ContentSlideProps = {
  title: string
  body: string
  slideNumber: number
  totalSlides: number
  authorName?: string
  authorPhotoUrl?: string
  theme: CarouselTheme
  backgroundPhoto?: string
}

function Avatar({ name, photoUrl, size, bg, color }: { name: string; photoUrl?: string; size: number; bg: string; color: string }) {
  if (photoUrl) {
    return <img src={photoUrl} alt={name} crossOrigin="anonymous" style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
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

function parseBullets(body: string): string[] {
  const lines = body.split(/\n|\r/).map((l) => l.replace(/^[-•*]\s*/, "").trim()).filter(Boolean)
  if (lines.length >= 2) return lines
  const sentences = body.split(/\.\s+/).map((s) => s.trim()).filter((s) => s.length > 8)
  if (sentences.length >= 2) return sentences.slice(0, 5)
  return [body]
}

export function ContentSlide({ title, body, slideNumber, totalSlides, authorName, authorPhotoUrl, theme: t, backgroundPhoto }: ContentSlideProps) {
  const W = CANVAS.width
  const H = CANVAS.height
  const P = CANVAS.padding
  const font = CANVAS.fontFamily
  const isDark = t.textPrimary === "#FFFFFF" || t.textPrimary === "#FFFBF0" || t.textPrimary === "#F0EDD8"
  const initials = authorName ? authorName.split(" ").map((w: string) => w[0]).slice(0, 2).join("") : null
  const v = t.variant

  // ── VARIANT: editorial ─────────────────────────────────────────────────
  if (v === "editorial") {
    const bgColor = t.bgGradient.startsWith("#") ? t.bgGradient : "#FFFFFF"
    return (
      <div style={{ width: W, height: H, background: backgroundPhoto ? undefined : bgColor, position: "relative", overflow: "hidden", fontFamily: font, display: "flex", flexDirection: "column", justifyContent: "center", padding: `${P * 1.2}px ${P}px`, boxSizing: "border-box" }}>
        {backgroundPhoto && <BgPhoto src={backgroundPhoto} overlay={isDark ? "rgba(0,0,0,0.78)" : "rgba(255,255,255,0.92)"} />}

        {/* Subtle lined texture */}
        {!backgroundPhoto && (
          <div style={{ position: "absolute", inset: 0, backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 79px, ${t.dividerColor} 79px, ${t.dividerColor} 80px)`, opacity: 0.3, pointerEvents: "none" }} />
        )}

        {/* Slide counter small top right */}
        <p style={{ position: "absolute", top: P, right: P, color: t.textMuted, fontSize: "17px", letterSpacing: "0.08em", margin: 0, zIndex: 2 }}>
          {String(slideNumber).padStart(2, "0")} / {String(totalSlides).padStart(2, "0")}
        </p>

        <div style={{ position: "relative", zIndex: 2, maxWidth: 900 }}>
          {/* Top rule */}
          <div style={{ width: "100%", height: 1, background: t.dividerColor, marginBottom: 44 }} />

          <h2 style={{ color: t.textPrimary, fontSize: "52px", fontWeight: 800, lineHeight: 1.12, margin: "0 0 36px", letterSpacing: "-0.025em" }}>
            {title}
          </h2>

          <p style={{ color: t.textSecondary, fontSize: "30px", lineHeight: 1.72, margin: "0 0 44px", maxWidth: 860 }}>
            {body}
          </p>

          {/* Bottom rule + author */}
          <div style={{ width: "100%", height: 1, background: t.dividerColor, marginBottom: 28 }} />
          {authorName && (
            <p style={{ color: t.textMuted, fontSize: "17px", fontWeight: 600, letterSpacing: "0.10em", textTransform: "uppercase", margin: 0 }}>
              {authorName}
            </p>
          )}
        </div>
      </div>
    )
  }

  // ── VARIANT: thread ────────────────────────────────────────────────────
  if (v === "thread") {
    const bgColor = t.bgGradient.startsWith("#") ? t.bgGradient : "#F5F3EE"
    const bullets = parseBullets(body)
    return (
      <div style={{ width: W, height: H, background: backgroundPhoto ? undefined : bgColor, position: "relative", overflow: "hidden", fontFamily: font, display: "flex", flexDirection: "column", justifyContent: "flex-start", padding: `${P}px ${P}px`, boxSizing: "border-box" }}>
        {backgroundPhoto && <BgPhoto src={backgroundPhoto} overlay="rgba(245,243,238,0.92)" />}

        <div style={{ position: "relative", zIndex: 2 }}>
          <h2 style={{ color: t.textPrimary, fontSize: "48px", fontWeight: 800, lineHeight: 1.12, margin: "0 0 48px", letterSpacing: "-0.02em", maxWidth: 860 }}>
            {title}
          </h2>

          {bullets.slice(0, 4).map((bullet, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 20, marginBottom: i < bullets.length - 1 ? 32 : 0 }}>
              <div style={{ width: 38, height: 38, borderRadius: "50%", background: t.badgeBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 4 }}>
                <span style={{ color: t.badgeText, fontSize: "16px", fontWeight: 800 }}>{slideNumber - 1 > 0 ? (slideNumber - 1) * 4 + i + 1 : i + 1}</span>
              </div>
              <p style={{ color: t.textPrimary, fontSize: "29px", lineHeight: 1.50, margin: 0, fontWeight: bullets.length <= 2 ? 400 : 500 }}>
                {bullet}
              </p>
            </div>
          ))}
        </div>

        {/* Divider + author, anchored to the slide's own bottom edge */}
        <div style={{ position: "absolute", zIndex: 2, bottom: P, left: P, right: P }}>
          <div style={{ height: 1, background: t.dividerColor, marginBottom: 24 }} />
          {authorName && <p style={{ color: t.textSecondary, fontSize: "19px", margin: 0 }}>{authorName}</p>}
        </div>
      </div>
    )
  }

  // ── VARIANT: dark-bold ─────────────────────────────────────────────────
  if (v === "dark-bold") {
    const bgColor = t.bgGradient.startsWith("#") ? t.bgGradient : "#12161F"
    return (
      <div style={{ width: W, height: H, background: backgroundPhoto ? undefined : bgColor, position: "relative", overflow: "hidden", fontFamily: font, display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: `${P * 1.1}px ${P}px`, boxSizing: "border-box" }}>
        {backgroundPhoto && <BgPhoto src={backgroundPhoto} overlay="rgba(10,10,10,0.80)" />}

        {/* Slide counter top right */}
        <p style={{ position: "absolute", top: P, right: P, color: t.textMuted, fontSize: "19px", letterSpacing: "0.10em", margin: 0, zIndex: 2 }}>
          {String(slideNumber).padStart(2, "0")} / {String(totalSlides).padStart(2, "0")}
        </p>

        <div style={{ position: "relative", zIndex: 2 }}>
          {/* Short accent double-line */}
          <div style={{ display: "flex", gap: 4, marginBottom: 44 }}>
            <div style={{ width: 48, height: 4, background: t.accentColor, borderRadius: 2 }} />
            <div style={{ width: 28, height: 4, background: t.accentColor, opacity: 0.4, borderRadius: 2 }} />
          </div>

          <h2 style={{ color: t.textPrimary, fontSize: "60px", fontWeight: 900, lineHeight: 1.06, margin: "0 0 32px", letterSpacing: "-0.025em", maxWidth: 860 }}>
            {title}
          </h2>

          <p style={{ color: t.textSecondary, fontSize: "28px", lineHeight: 1.68, margin: "0 0 48px", maxWidth: 860 }}>
            {body}
          </p>

          {/* Author + dot */}
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
      <div style={{ width: W, height: H, background: backgroundPhoto ? undefined : bgColor, position: "relative", overflow: "hidden", fontFamily: font, display: "flex", flexDirection: "column", justifyContent: "center", padding: `${P}px ${P}px`, boxSizing: "border-box" }}>
        {backgroundPhoto && <BgPhoto src={backgroundPhoto} overlay="rgba(251,245,238,0.90)" />}

        {/* Slide counter */}
        <p style={{ position: "absolute", top: P, right: P, color: t.textMuted, fontSize: "17px", letterSpacing: "0.08em", margin: 0, zIndex: 2 }}>
          {slideNumber} / {totalSlides}
        </p>

        <div style={{ position: "relative", zIndex: 2 }}>
          <div style={{ width: 48, height: 4, background: t.accentColor, borderRadius: 2, marginBottom: 36 }} />

          <h2 style={{ color: t.textPrimary, fontSize: "52px", fontWeight: 800, lineHeight: 1.10, margin: "0 0 32px", letterSpacing: "-0.02em", maxWidth: 860 }}>
            {title}
          </h2>

          <p style={{ color: t.textSecondary, fontSize: "30px", lineHeight: 1.72, margin: 0, maxWidth: 860 }}>
            {body}
          </p>
        </div>

        {/* Author bottom */}
        {authorName && (
          <div style={{ position: "absolute", bottom: P, left: P, display: "flex", alignItems: "center", gap: 14, zIndex: 2 }}>
            <Avatar name={authorName} photoUrl={authorPhotoUrl} size={48} bg={t.accentColor} color="#FFFFFF" />
            <p style={{ color: t.textSecondary, fontSize: "19px", margin: 0 }}>{authorName}</p>
          </div>
        )}
      </div>
    )
  }

  // ── VARIANT: split ─────────────────────────────────────────────────────
  if (v === "split") {
    const leftBg = t.splitPanelBg ?? "#1B2B5E"
    const leftText = t.splitPanelText ?? "#FFFFFF"
    const rightBg = t.bgGradient.startsWith("#") ? t.bgGradient : "#FFFFFF"
    const leftW = 340
    const bullets = parseBullets(body)
    return (
      <div style={{ width: W, height: H, position: "relative", overflow: "hidden", fontFamily: font, display: "flex" }}>
        {backgroundPhoto && <BgPhoto src={backgroundPhoto} overlay="rgba(0,0,0,0.65)" />}

        {/* Left panel */}
        <div style={{ width: leftW, height: H, background: leftBg, flexShrink: 0, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "stretch", padding: "0 44px", boxSizing: "border-box", position: "relative", zIndex: 2 }}>
          <span style={{ color: t.accentColor, fontSize: "17px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 20, display: "block" }}>
            {String(slideNumber).padStart(2, "0")}
          </span>
          <h2 style={{ color: leftText, fontSize: "52px", fontWeight: 900, lineHeight: 1.08, margin: "0 0 16px", letterSpacing: "-0.02em", overflowWrap: "break-word", wordBreak: "break-word" }}>
            {title}
          </h2>
          <div style={{ width: 40, height: 3, background: t.accentColor, borderRadius: 2 }} />
        </div>

        {/* Right panel */}
        <div style={{ flex: 1, height: H, background: backgroundPhoto ? "transparent" : rightBg, display: "flex", flexDirection: "column", justifyContent: "center", padding: `${P * 0.8}px ${P * 0.9}px`, boxSizing: "border-box", position: "relative", zIndex: 2 }}>
          {bullets.slice(0, 4).map((bullet, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 18, marginBottom: i < Math.min(bullets.length, 4) - 1 ? 28 : 0 }}>
              <div style={{ width: 30, height: 30, borderRadius: "50%", border: `1.5px solid ${t.accentColor}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 4 }}>
                <span style={{ color: t.accentColor, fontSize: "13px", fontWeight: 700 }}>{i + 1}</span>
              </div>
              <p style={{ color: t.textPrimary, fontSize: "26px", lineHeight: 1.48, margin: 0 }}>{bullet}</p>
            </div>
          ))}
          {authorName && (
            <p style={{ color: t.textMuted, fontSize: "17px", margin: `${P * 0.6}px 0 0`, position: "absolute", bottom: P * 0.7, left: P * 0.9 }}>
              {authorName}
            </p>
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

        {/* Slide counter */}
        <p style={{ position: "absolute", top: P * 0.9, right: P, color: t.textMuted, fontSize: "17px", letterSpacing: "0.08em", margin: 0, zIndex: 2 }}>
          {slideNumber} / {totalSlides}
        </p>

        <div style={{ position: "relative", zIndex: 2, maxWidth: 820, width: "100%" }}>
          <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 36 }}>
            <svg width="52" height="40" viewBox="0 0 72 56" fill={t.accentColor} opacity={0.30}>
              <path d="M0 56V34C0 15.2 10.4 4 31.2 0l4.8 8C23.6 10.8 18 17.6 16 28h16V56H0zm40 0V34C40 15.2 50.4 4 71.2 0l4.8 8C63.6 10.8 58 17.6 56 28h16V56H40z"/>
            </svg>
          </div>

          <h2 style={{ color: t.textPrimary, fontSize: "48px", fontWeight: 700, lineHeight: 1.35, margin: "0 0 40px", fontStyle: "italic" }}>
            {title}
          </h2>

          <p style={{ color: t.textSecondary, fontSize: "28px", lineHeight: 1.68, margin: "0 0 40px" }}>
            {body}
          </p>

          <div style={{ width: 52, height: 3, background: t.accentColor, borderRadius: 2, margin: "0 auto 32px" }} />

          {authorName && (
            <p style={{ color: t.textSecondary, fontSize: "18px", margin: 0 }}>{authorName}</p>
          )}
        </div>
      </div>
    )
  }

  // ── VARIANT: standard (default) ───────────────────────────────────────
  return (
    <div style={{ width: W, height: H, background: backgroundPhoto ? undefined : t.bgGradient, position: "relative", overflow: "hidden", fontFamily: font, display: "flex", flexDirection: "column", justifyContent: "space-between", padding: P, boxSizing: "border-box" }}>
      {backgroundPhoto && <BgPhoto src={backgroundPhoto} overlay={isDark ? "rgba(0,0,0,0.78)" : "rgba(255,255,255,0.88)"} />}

      {/* Top-right orb */}
      <div style={{ position: "absolute", width: 360, height: 360, borderRadius: "50%", background: `radial-gradient(circle, ${t.circleColorAlt}, transparent 68%)`, top: -140, right: -100, opacity: isDark ? 0.28 : 0.2 }} />
      <div style={{ position: "absolute", width: 500, height: 500, borderRadius: "50%", border: `1px solid ${t.counterRing}`, top: -200, right: -160 }} />
      <div style={{ position: "absolute", width: 220, height: 220, borderRadius: "50%", background: `radial-gradient(circle, ${t.accentColor}, transparent 70%)`, bottom: -80, left: -60, opacity: 0.10 }} />

      {/* Left accent line */}
      <div style={{ position: "absolute", left: 0, top: "15%", height: "70%", width: 5, background: `linear-gradient(to bottom, transparent, ${t.accentColor}, transparent)`, borderRadius: "0 3px 3px 0" }} />

      {/* Top: slide counter */}
      <div style={{ position: "relative", zIndex: 2, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 58, height: 58, borderRadius: "50%", background: t.badgeBg, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 0 0 4px ${t.counterRing}` }}>
            <span style={{ color: t.badgeText, fontSize: "22px", fontWeight: 800 }}>{slideNumber}</span>
          </div>
          <span style={{ color: t.textMuted, fontSize: "18px", fontWeight: 500 }}>of {totalSlides} slides</span>
        </div>
        {initials && (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Avatar name={authorName!} photoUrl={authorPhotoUrl} size={38} bg={t.accentColor} color={isDark ? "#000" : "#fff"} />
            <span style={{ color: t.textMuted, fontSize: "18px" }}>{authorName}</span>
          </div>
        )}
      </div>

      {/* Middle: content */}
      <div style={{ position: "relative", zIndex: 2, flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", paddingTop: 52, paddingBottom: 52 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 36 }}>
          <div style={{ width: 52, height: 5, background: t.accentColor, borderRadius: 3 }} />
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: t.accentColor, opacity: 0.5 }} />
        </div>

        <h2 style={{ color: t.textPrimary, fontSize: "44px", fontWeight: 800, lineHeight: 1.15, margin: "0 0 32px", letterSpacing: "-0.015em", maxWidth: 870 }}>
          {title}
        </h2>

        <p style={{ color: t.textSecondary, fontSize: "32px", lineHeight: 1.7, margin: 0, maxWidth: 870 }}>
          {body}
        </p>
      </div>

      {/* Bottom: progress dots */}
      <div style={{ position: "relative", zIndex: 2, borderTop: `1px solid ${t.dividerColor}`, paddingTop: 28, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: 8 }}>
          {Array.from({ length: totalSlides }).map((_, i) => (
            <div key={i} style={{ width: i === slideNumber - 1 ? 28 : 8, height: 8, borderRadius: 4, background: i === slideNumber - 1 ? t.accentColor : t.dividerColor }} />
          ))}
        </div>
        <span style={{ color: t.textMuted, fontSize: "18px" }}>Swipe for more</span>
      </div>
    </div>
  )
}

