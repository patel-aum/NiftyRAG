import { ImageResponse } from "next/og";

export const alt = "NiftyRAG – NSE Nifty 50 RAG Chat";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 120,
            height: 120,
            borderRadius: 24,
            background: "linear-gradient(135deg, #16a34a 0%, #15803d 100%)",
            marginBottom: 32,
          }}
        >
          <svg width="64" height="64" viewBox="0 0 40 40" fill="none">
            <path
              d="M10 26V18h4v8h-4zm8-4v-6h4v6h-4zm8 2v-8h4v8h-4z"
              fill="rgba(255,255,255,0.95)"
            />
            <path
              d="M10 18l2-4 2 2 2-3 2 2 2-4 2 3 2-2 2 4"
              stroke="rgba(255,255,255,0.9)"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </svg>
        </div>
        <div style={{ fontSize: 56, fontWeight: 700, color: "#f8fafc", marginBottom: 12 }}>
          Nifty<span style={{ color: "#22c55e" }}>RAG</span>
        </div>
        <div style={{ fontSize: 24, color: "#94a3b8" }}>
          NSE Nifty 50 · RAG + OpenAI
        </div>
      </div>
    ),
    { ...size }
  );
}
