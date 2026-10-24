import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: process.env.NODE_ENV === "development" ? ".next-dev" : ".next",
  webpack(config) {
    config.resolve.alias["@"] = path.join(projectRoot, "src");
    return config;
  },
};

export default nextConfig;
