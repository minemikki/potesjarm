/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [{ source: "/", destination: "/potesjarm.html" }];
  },
};
export default nextConfig;
