/** @type {import('next').NextConfig} */
const nextConfig = {
  // pdf-parse is a CommonJS module that reads test fixtures off disk; bundling
  // it breaks the route. Mark it external so Next leaves it as require().
  experimental: {
    serverComponentsExternalPackages: ["pdf-parse"],
  },
};

export default nextConfig;
