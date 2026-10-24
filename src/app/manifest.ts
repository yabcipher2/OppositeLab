import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "OppositeLab — Collaborate With Your Creative Opposite",
    short_name: "OppositeLab",
    description: "Find your creative opposite and build something together.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#09090b",
    theme_color: "#09090b",
    icons: [
      { src: "/icons/oppositelab-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/oppositelab-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/oppositelab-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
