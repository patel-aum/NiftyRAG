import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 8,
          background: "linear-gradient(135deg, #16a34a 0%, #15803d 100%)",
        }}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 40 40"
          fill="none"
          style={{ margin: "0 auto" }}
        >
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
    ),
    { ...size }
  );
}
