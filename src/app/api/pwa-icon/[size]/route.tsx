import { ImageResponse } from "next/og";
import { readFileSync } from "fs";
import { join } from "path";

export async function GET(_req: Request, { params }: { params: Promise<{ size: string }> }) {
  const { size: sizeParam } = await params;
  const size = Math.min(512, Math.max(32, Number(sizeParam) || 192));

  const svg = readFileSync(join(process.cwd(), "public", "icons", "icon.svg"), "utf8");
  const src = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;

  return new ImageResponse(
    <img src={src} width={size} height={size} />,
    { width: size, height: size },
  );
}
