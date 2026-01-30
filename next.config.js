/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["bullmq", "ioredis"],
    instrumentationHook: true,
  },
};

module.exports = nextConfig;
