import React from "react";
import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import "../styles/tailwind.css";
import "@livekit/components-styles";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#09090b",
};

export const metadata: Metadata = {
  title: "OppositeLab — Collaborate With Your Creative Opposite",
  description:
    "OppositeLab pairs creators with their mathematical opposite and finds the one shared obsession that sparks breakthrough ideas neither could build alone.",
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/icons/oppositelab-180.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: { capable: true, title: "OppositeLab", statusBarStyle: "black-translucent" },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={GeistSans.variable} suppressHydrationWarning>
      <body className={GeistSans.className}>
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>

        <script
          type="module"
          async
          src="https://static.rocket.new/rocket-web.js?_cfg=https%3A%2F%2Foppositela8421back.builtwithrocket.new&_be=https%3A%2F%2Fappanalytics.rocket.new&_v=0.1.21"
        />
        <script
          type="module"
          defer
          src="https://static.rocket.new/rocket-shot.js?v=0.0.3"
        />
      </body>
    </html>
  );
}
