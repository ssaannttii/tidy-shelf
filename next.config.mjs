/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    // No ESLint config shipped; never let lint block a production build.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
