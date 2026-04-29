import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins: ["192.168.1.82", "openblogdev.aaravlabs.com"],
  serverExternalPackages: ["pg"],
};

export default nextConfig;
