import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#1D9E75",
        }}
      >
        <span style={{ fontSize: 96, fontWeight: 700, color: "white", fontFamily: "sans-serif", lineHeight: 1 }}>
          H
        </span>
      </div>
    ),
    { ...size },
  );
}
