import type { Metadata, Viewport } from "next";
import { Bebas_Neue, Inter_Tight } from "next/font/google";
import "./globals.css";

const display = Bebas_Neue({ weight: "400", subsets: ["latin"], variable: "--font-display" });
const body = Inter_Tight({ subsets: ["latin"], variable: "--font-body" });

export const metadata: Metadata = {
  title: "VIP-50 ONE",
  description: "Your whole business, one screen.",
};

export const viewport: Viewport = {
  themeColor: "#050505",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}
