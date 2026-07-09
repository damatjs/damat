import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { SITE } from "@/lib/constants";

export const runtime = "edge";

/** On-demand social card: /og?title=...&eyebrow=... (satori requires inline
 *  styles — the no-inline-styles rule doesn't apply outside the DOM). */
export function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const title = (params.get("title") ?? SITE.tagline).slice(0, 120);
  const eyebrow = (params.get("eyebrow") ?? "damatjs.com").slice(0, 60);

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 72,
        backgroundColor: "#0d0d0d",
        color: "#f0f0ef",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 16,
            background:
              "linear-gradient(135deg, #f9ab3b, #e5760a 55%, #d9640a)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#ffffff",
            fontSize: 40,
            fontWeight: 700,
          }}
        >
          ▲
        </div>
        <div style={{ display: "flex", fontSize: 36, fontWeight: 700 }}>
          {SITE.name}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div
          style={{
            display: "flex",
            fontSize: 24,
            letterSpacing: 4,
            textTransform: "uppercase",
            color: "#f9ab3b",
          }}
        >
          {eyebrow}
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 64,
            fontWeight: 700,
            lineHeight: 1.15,
            letterSpacing: -1.5,
            maxWidth: 980,
          }}
        >
          {title}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 24,
          color: "#9d9da3",
        }}
      >
        <div style={{ display: "flex" }}>Open source · MIT · built on Bun</div>
        <div style={{ display: "flex" }}>
          {SITE.url.replace("https://", "")}
        </div>
      </div>
    </div>,
    { width: 1200, height: 630 },
  );
}
