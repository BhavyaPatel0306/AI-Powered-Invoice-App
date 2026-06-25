import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow the ngrok tunnel origin so dev HMR / cross-origin requests aren't blocked.
  allowedDevOrigins: ["5870-192-12-180-57.ngrok-free.app", "*.ngrok-free.app"],
};

export default nextConfig;
