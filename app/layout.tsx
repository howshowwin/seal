import type { Metadata, Viewport } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";

const nunito = Nunito({ variable: "--font-nunito", subsets: ["latin"], weight: ["600", "800"] });

export const metadata: Metadata = {
  title: "海豹寶寶",
  description: "幫海豹寶寶著色、捏出體型,看牠在小浮冰上跳來跳去。",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#9fdcf7",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="zh-Hant" className={`${nunito.variable} h-full antialiased`}>
      <body className="h-full">{children}</body>
    </html>
  );
}
