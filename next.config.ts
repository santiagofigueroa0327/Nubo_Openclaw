import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3"],
  allowedDevOrigins: ["http://127.0.0.1:3010", "http://localhost:3010"],
};

export default nextConfig;
