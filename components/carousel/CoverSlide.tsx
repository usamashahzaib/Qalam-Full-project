import { CANVAS, type CarouselTheme } from "@/lib/carousel-design"

type CoverSlideProps = {
  title: string
  accentLabel?: string
  authorName?: string
  authorHandle?: string
  designation?: string
  authorPhotoUrl?: string
  theme: CarouselTheme
  backgroundPhoto?: string
  totalSlides?: number
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

export function CoverSlide({ title, accentLabel, authorName, authorHandle, designation, authorPhotoUrl, theme: t, backgroundPhoto, totalSlides }: CoverSlideProps) {
  const W = CANVAS.width
  const H = CANVAS.height
  const P = CANVAS.padding
  const font = CANVAS.fontFamily
  const isDark = t.textPrimary === "#FFFFFF" || t.textPrimary === "#FFFBF0" || t.textPrimary === "#F0EDD8"
  const v = t.variant

  // ── Shared author row helper ───────────────────────────────────────────
  const AuthorRow = ({ align = "left" }: { align?: "left" | "center" }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 16, justifyContent: align === "center" ? "center" : "flex-start" }}>
      {authorName && (
        <Avatar
          name={authorName}
          photoUrl={authorPhotoUrl}
          size={54}
          bg={t.accentColor}
          color={isDark ? "#000" : "#fff"}
        />
      )}
      <div>
        {authorName && <p style={{ color: t.textPrimary, fontSize: "22px", fontWeight: 700, margin: 0, lineHeight: 1.2 }}>{authorName}</p>}
        {(designation || authorHandle) && (
          <p style={{ color: t.textSecondary, fontSize: "18px", margin: "4px 0 0", lineHeight: 1.3 }}>{designation || authorHandle}</p>
        )}
      </div>
    </div>
  )

  // ── VARIANT: editorial ─────────────────────────────────────────────────
  if (v === "editorial") {
    const bgColor = t.bgGradient.startsWith("#") ? t.bgGradient : "#FFFFFF"
    return (
      <div style={{ width: W, height: H, background: backgroundPhoto ? undefined : bgColor, position: "relative", overflow: "hidden", fontFamily: font, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "flex-start", padding: `${P * 1.2}px ${P}px`, boxSizing: "border-box" }}>
        {backgroundPhoto && <BgPhoto src={backgroundPhoto} overlay={isDark ? "rgba(0,0,0,0.72)" : "rgba(255,255,255,0.88)"} />}

        {/* Subtle paper texture lines */}
        {!backgroundPhoto && (
          <div style={{ position: "absolute", inset: 0, backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 79px, ${t.dividerColor} 79px, ${t.dividerColor} 80px)`, opacity: 0.35, pointerEvents: "none" }} />
        )}

        <div style={{ position: "relative", zIndex: 2, width: "100%", maxWidth: 900 }}>
          {accentLabel && (
            <p style={{ color: t.textMuted, fontSize: "19px", fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", margin: "0 0 52px" }}>
              {accentLabel}
            </p>
          )}

          {/* Top rule */}
          <div style={{ width: "100%", height: 1, background: t.dividerColor, marginBottom: 44 }} />

          <h1 style={{ color: t.textPrimary, fontSize: "72px", fontWeight: 800, lineHeight: 1.06, margin: 0, letterSpacing: "-0.03em" }}>
            {title}
          </h1>

          {/* Bottom rule */}
          <div style={{ width: "100%", height: 1, background: t.dividerColor, margin: "44px 0 52px" }} />

          {/* Author row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            {authorName ? (
              <p style={{ color: t.textMuted, fontSize: "18px", fontWeight: 600, letterSpacing: "0.10em", textTransform: "uppercase", margin: 0 }}>
                {authorName}{designation ? ` · ${designation}` : ""}
              </p>
            ) : <span />}
            {totalSlides && <p style={{ color: t.textMuted, fontSize: "18px", letterSpacing: "0.08em", margin: 0 }}>1 / {totalSlides}</p>}
          </div>
        </div>
      </div>
    )
  }

  // ── VARIANT: thread ────────────────────────────────────────────────────
  if (v === "thread") {
    const bgColor = t.bgGradient.startsWith("#") ? t.bgGradient : "#F5F3EE"
    return (
      <div style={{ width: W, height: H, background: backgroundPhoto ? undefined : bgColor, position: "relative", overflow: "hidden", fontFamily: font, display: "flex", flexDirection: "column", justifyContent: "flex-start", padding: `${P * 1.1}px ${P}px`, boxSizing: "border-box" }}>
        {backgroundPhoto && <BgPhoto src={backgroundPhoto} overlay="rgba(245,243,238,0.90)" />}

        <div style={{ position: "relative", zIndex: 2 }}>
          <p style={{ color: t.textMuted, fontSize: "18px", fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", margin: "0 0 36px" }}>
            {accentLabel || "A Thread"}
          </p>

          <h1 style={{ color: t.textPrimary, fontSize: "64px", fontWeight: 800, lineHeight: 1.08, margin: "0 0 52px", letterSpacing: "-0.025em", maxWidth: 860 }}>
            {title}
          </h1>

          {/* 3 preview bullets */}
          {[1, 2, 3].map((n) => (
            <div key={n} style={{ display: "flex", alignItems: "flex-start", gap: 20, marginBottom: 28 }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: t.badgeBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>
                <span style={{ color: t.badgeText, fontSize: "16px", fontWeight: 800 }}>{n}</span>
              </div>
              <div style={{ height: 16, background: t.dividerColor, borderRadius: 4, width: n === 1 ? 380 : n === 2 ? 300 : 250, marginTop: 10 }} />
            </div>
          ))}

          {/* "More in full carousel" hint */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 32 }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", border: `1.5px solid ${t.dividerColor}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: t.textMuted, fontSize: "14px", lineHeight: 1 }}>+</span>
            </div>
            <span style={{ color: t.textMuted, fontSize: "19px" }}>{totalSlides ? `${totalSlides - 1} more in the full carousel` : "More in the full carousel"} →</span>
          </div>
        </div>

        {/* Divider + author, anchored to the slide's own bottom edge */}
        <div style={{ position: "absolute", zIndex: 2, bottom: P * 1.1, left: P, right: P }}>
          <div style={{ height: 1, background: t.dividerColor, marginBottom: 28 }} />
          {authorName && (
            <p style={{ color: t.textSecondary, fontSize: "19px", margin: 0 }}>
              {authorName}{designation ? ` · ${designation}` : ""}
            </p>
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
        {backgroundPhoto && <BgPhoto src={backgroundPhoto} overlay="rgba(10,10,10,0.78)" />}

        {/* Slide counter top right */}
        {totalSlides && (
          <p style={{ position: "absolute", top: P, right: P, color: t.textMuted, fontSize: "19px", letterSpacing: "0.1em", margin: 0, zIndex: 2 }}>
            01 / {String(totalSlides).padStart(2, "0")}
          </p>
        )}

        <div style={{ position: "relative", zIndex: 2 }}>
          {accentLabel && (
            <div style={{ display: "inline-flex", alignItems: "center", background: t.chipBg, border: `1.5px solid ${t.chipBorder}`, borderRadius: 6, padding: "9px 22px", marginBottom: 44 }}>
              <span style={{ color: t.accentColor, fontSize: "18px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" }}>
                {accentLabel}
              </span>
            </div>
          )}

          <h1 style={{ color: t.textPrimary, fontSize: "72px", fontWeight: 900, lineHeight: 1.05, margin: "0 0 36px", letterSpacing: "-0.03em", maxWidth: 860 }}>
            {title}
          </h1>

          {/* Short accent line */}
          <div style={{ width: 60, height: 4, background: t.accentColor, borderRadius: 2, marginBottom: 52 }} />

          {/* Author row */}
          {authorName ? (
            <p style={{ color: t.textMuted, fontSize: "17px", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", margin: 0 }}>
              {authorName}{designation ? ` · ${designation}` : ""}
            </p>
          ) : null}
        </div>
      </div>
    )
  }

  // ── VARIANT: warm-story ────────────────────────────────────────────────
  if (v === "warm-story") {
    const bgColor = t.bgGradient.startsWith("#") ? t.bgGradient : "#FBF5EE"
    return (
      <div style={{ width: W, height: H, background: backgroundPhoto ? undefined : bgColor, position: "relative", overflow: "hidden", fontFamily: font, display: "flex", flexDirection: "column", justifyContent: "flex-start", padding: `${P * 1.1}px ${P}px`, boxSizing: "border-box" }}>
        {backgroundPhoto && <BgPhoto src={backgroundPhoto} overlay="rgba(251,245,238,0.88)" />}

        <div style={{ position: "relative", zIndex: 2 }}>
          {accentLabel && (
            <p style={{ color: t.accentColor, fontSize: "19px", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", margin: "0 0 36px" }}>
              {accentLabel}
            </p>
          )}

          <h1 style={{ color: t.accentColor, fontSize: "72px", fontWeight: 900, lineHeight: 1.06, margin: 0, letterSpacing: "-0.03em", maxWidth: 860 }}>
            {title}
          </h1>
        </div>

        {/* Author with circle avatar, anchored to the slide's own bottom edge */}
        {authorName && (
          <div style={{ display: "flex", alignItems: "center", gap: 18, position: "absolute", zIndex: 2, bottom: P * 1.1, left: P }}>
            <Avatar name={authorName} photoUrl={authorPhotoUrl} size={64} bg={t.accentColor} color="#FFFFFF" />
            <div>
              <p style={{ color: t.textPrimary, fontSize: "24px", fontWeight: 700, margin: 0, lineHeight: 1.2 }}>{authorName}</p>
              {designation && <p style={{ color: t.textSecondary, fontSize: "19px", margin: "4px 0 0" }}>{designation}</p>}
            </div>
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
    return (
      <div style={{ width: W, height: H, position: "relative", overflow: "hidden", fontFamily: font, display: "flex" }}>
        {backgroundPhoto && <BgPhoto src={backgroundPhoto} overlay="rgba(0,0,0,0.60)" />}

        {/* Left dark panel */}
        <div style={{ width: leftW, height: H, background: leftBg, flexShrink: 0, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "stretch", padding: "0 44px", boxSizing: "border-box", position: "relative", zIndex: 2 }}>
          {accentLabel && (
            <p style={{ color: t.accentColor, fontSize: "17px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", margin: "0 0 28px" }}>{accentLabel}</p>
          )}
          <h1 style={{ color: leftText, fontSize: "64px", fontWeight: 900, lineHeight: 1.05, margin: "0 0 20px", letterSpacing: "-0.025em", overflowWrap: "break-word", wordBreak: "break-word" }}>
            {title}
          </h1>
          {/* Accent underline */}
          <div style={{ width: 48, height: 3, background: t.accentColor, borderRadius: 2, marginBottom: 24 }} />
        </div>

        {/* Right light panel */}
        <div style={{ flex: 1, height: H, background: backgroundPhoto ? "transparent" : rightBg, display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: `${P}px ${P}px ${P * 1.1}px`, boxSizing: "border-box", position: "relative", zIndex: 2 }}>
          {authorName && (
            <p style={{ color: t.textMuted, fontSize: "19px", margin: 0 }}>{authorName}</p>
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
        {backgroundPhoto && <BgPhoto src={backgroundPhoto} overlay="rgba(249,237,228,0.90)" />}

        <div style={{ position: "relative", zIndex: 2, maxWidth: 820, width: "100%" }}>
          {/* Decorative quote marks */}
          <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 48 }}>
            <svg width="72" height="56" viewBox="0 0 72 56" fill={t.accentColor} opacity={0.35}>
              <path d="M0 56V34C0 15.2 10.4 4 31.2 0l4.8 8C23.6 10.8 18 17.6 16 28h16V56H0zm40 0V34C40 15.2 50.4 4 71.2 0l4.8 8C63.6 10.8 58 17.6 56 28h16V56H40z"/>
            </svg>
          </div>

          <h1 style={{ color: t.textPrimary, fontSize: "54px", fontWeight: 700, lineHeight: 1.30, margin: "0 0 44px", fontStyle: "italic", letterSpacing: "-0.01em" }}>
            {title}
          </h1>

          {/* Accent divider */}
          <div style={{ width: 64, height: 3, background: t.accentColor, borderRadius: 2, margin: "0 auto 40px" }} />

          {/* Author */}
          {authorName && (
            <div>
              <p style={{ color: t.textPrimary, fontSize: "22px", fontWeight: 700, margin: 0 }}>{authorName}</p>
              {designation && <p style={{ color: t.textSecondary, fontSize: "18px", margin: "6px 0 0" }}>{designation}</p>}
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── VARIANT: standard (default / legacy) ──────────────────────────────
  return (
    <div style={{ width: W, height: H, background: backgroundPhoto ? undefined : t.bgGradient, position: "relative", overflow: "hidden", fontFamily: font, display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: P, boxSizing: "border-box" }}>
      {backgroundPhoto && <BgPhoto src={backgroundPhoto} overlay={isDark ? "rgba(0,0,0,0.72)" : "rgba(255,255,255,0.82)"} />}

      {/* Decorative hero circle */}
      <div style={{ position: "absolute", width: 580, height: 580, borderRadius: "50%", background: `radial-gradient(circle at 38% 38%, ${t.circleColorAlt}, ${t.circleColor} 55%, transparent 75%)`, top: -160, right: -140, opacity: isDark ? 0.9 : 0.55 }} />
      <div style={{ position: "absolute", width: 700, height: 700, borderRadius: "50%", border: `1.5px solid ${t.counterRing}`, top: -220, right: -200 }} />
      <div style={{ position: "absolute", width: 860, height: 860, borderRadius: "50%", border: `1px solid ${t.counterRing.replace("0.35", "0.15")}`, top: -300, right: -280 }} />
      <div style={{ position: "absolute", width: 180, height: 180, borderRadius: "50%", background: `radial-gradient(circle, ${t.accentColor}, transparent 70%)`, bottom: 220, right: 80, opacity: 0.18 }} />

      {/* Dot grid */}
      <svg style={{ position: "absolute", top: 0, left: 0, opacity: isDark ? 0.04 : 0.06, pointerEvents: "none" }} width={W} height={H}>
        {Array.from({ length: 18 }).map((_, row) =>
          Array.from({ length: 18 }).map((_, col) => (
            <circle key={`${row}-${col}`} cx={col * 62 + 30} cy={row * 62 + 30} r={2.5} fill={t.textPrimary} />
          ))
        )}
      </svg>

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

        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 44 }}>
          <div style={{ width: 64, height: 5, background: t.accentColor, borderRadius: 3 }} />
          <div style={{ width: 14, height: 14, borderRadius: "50%", background: t.accentColor, opacity: 0.6 }} />
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {authorName ? (
            <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
              <Avatar name={authorName} photoUrl={authorPhotoUrl} size={62} bg={t.accentColor} color={isDark ? "#000" : "#fff"} />
              <div>
                <p style={{ color: t.textPrimary, fontSize: "24px", fontWeight: 700, margin: 0, lineHeight: 1.2 }}>{authorName}</p>
                {(designation || authorHandle) && (
                  <p style={{ color: t.textSecondary, fontSize: "19px", margin: "5px 0 0" }}>{designation || authorHandle}</p>
                )}
              </div>
            </div>
          ) : <div />}

          <div style={{ opacity: 0.5 }}>
            <div style={{ width: 44, height: 44, borderRadius: "50%", border: `1.5px solid ${t.textMuted}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: t.textMuted, fontSize: "16px", fontWeight: 600 }}>1</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
