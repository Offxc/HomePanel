import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#1D9E75",
          borderRadius: 6,
        }}
      >
        <span style={{ fontSize: 18, fontWeight: 700, color: "white", fontFamily: "sans-serif", lineHeight: 1 }}>
          H
        </span>
      </div>
    ),
    { ...size },
  );
}
