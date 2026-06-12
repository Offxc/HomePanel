import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HomePanel",
  description: "Shared household panel",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
