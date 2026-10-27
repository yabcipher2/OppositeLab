import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

// Check if building for Capacitor (mobile apps)
const isCapacitorBuild = process.env.CAPACITOR_BUILD === 'true';

/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: process.env.NODE_ENV === "development" ? ".next-dev" : ".next",
  
  // Enable static export for Capacitor builds
  output: isCapacitorBuild ? 'export' : undefined,
  
  // Disable image optimization for static export
  images: {
    unoptimized: isCapacitorBuild,
  },
  
  // Trailing slash for better compatibility with mobile WebView
  trailingSlash: isCapacitorBuild,
  
  webpack(config) {
    config.resolve.alias["@"] = path.join(projectRoot, "src");
    return config;
  },
};

export default nextConfig;
