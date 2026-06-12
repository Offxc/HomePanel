import { ImageResponse } from "next/og";

export async function GET(_req: Request, { params }: { params: Promise<{ size: string }> }) {
  const { size: sizeParam } = await params;
  const size = Math.min(512, Math.max(16, Number(sizeParam) || 192));
  const radius = Math.round(size * 0.2);
  const fontSize = Math.round(size * 0.52);

  return new ImageResponse(
    (
      <div
        style={{
          width: size,
          height: size,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#1D9E75",
          borderRadius: radius,
        }}
      >
        <span
          style={{
            fontSize,
            fontWeight: 700,
            color: "white",
            fontFamily: "sans-serif",
            letterSpacing: "-0.04em",
            lineHeight: 1,
          }}
        >
          H
        </span>
      </div>
    ),
    { width: size, height: size },
  );
}
