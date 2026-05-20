import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  allowedDevOrigins: ["192.168.1.82", "openblogdev.aaravlabs.com"],
  serverExternalPackages: ["pg"],
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
