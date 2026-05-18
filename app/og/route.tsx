import { ImageResponse } from "next/og"
import { type NextRequest } from "next/server"

export const runtime = "edge"

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const title = searchParams.get("title") || "Qalam"
  const description =
    searchParams.get("description") || "AI LinkedIn Writing System for Professionals"
  const tag = searchParams.get("tag") || ""

  const titleSize = title.length > 70 ? "42px" : title.length > 50 ? "50px" : "60px"

  return new ImageResponse(
    (
      <div
        style={{
          background: "#0d4a45",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "space-between",
          padding: "72px 80px",
          fontFamily: "system-ui, -apple-system, sans-serif",
          position: "relative",
        }}
      >
        {/* Subtle grid overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />

        {/* Top: wordmark */}
        <div style={{ display: "flex", alignItems: "center", gap: "14px", zIndex: 1 }}>
          <div
            style={{
              width: "52px",
              height: "52px",
              borderRadius: "14px",
              background: "#c9a84c",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
              fontSize: "28px",
              fontWeight: 900,
              letterSpacing: "-1px",
            }}
          >
            Q
          </div>
          <span
            style={{ color: "rgba(255,255,255,0.9)", fontSize: "26px", fontWeight: 700 }}
          >
            Qalam
          </span>
        </div>

        {/* Middle: tag + title + description */}
        <div style={{ display: "flex", flexDirection: "column", gap: "18px", zIndex: 1 }}>
          {tag ? (
            <div
              style={{
                display: "flex",
                background: "rgba(201,168,76,0.15)",
                border: "1px solid rgba(201,168,76,0.45)",
                color: "#c9a84c",
                fontSize: "15px",
                fontWeight: 600,
                padding: "6px 18px",
                borderRadius: "999px",
                width: "fit-content",
                letterSpacing: "0.02em",
                textTransform: "uppercase",
              }}
            >
              {tag}
            </div>
          ) : null}
          <div
            style={{
              color: "#ffffff",
              fontSize: titleSize,
              fontWeight: 800,
              lineHeight: 1.15,
              maxWidth: "960px",
              letterSpacing: "-0.02em",
            }}
          >
            {title}
          </div>
          {description ? (
            <div
              style={{
                color: "rgba(255,255,255,0.6)",
                fontSize: "22px",
                lineHeight: 1.5,
                maxWidth: "820px",
              }}
            >
              {description}
            </div>
          ) : null}
        </div>

        {/* Bottom: domain */}
        <div
          style={{
            color: "rgba(255,255,255,0.35)",
            fontSize: "17px",
            letterSpacing: "0.04em",
            zIndex: 1,
          }}
        >
          byqalam.com
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
