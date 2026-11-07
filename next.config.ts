import type { NextConfig } from "next";
const config: NextConfig = {
  ...(process.env.HUB_SSO_LOCAL==='true'?{logging:{incomingRequests:false}}:{}),
  turbopack: { root: process.cwd() },
  poweredByHeader: false,
};
export default config;
