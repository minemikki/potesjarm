/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    // Eksponer Vercel-miljøet til klienten så WAITLIST_MODE (app/lib/launch.js)
    // kan vise ventelisten i produksjon, men selve appen i Preview-deploys.
    // VERCEL_ENV settes automatisk av Vercel ved bygging.
    NEXT_PUBLIC_VERCEL_ENV: process.env.VERCEL_ENV || "",
  },
};
export default nextConfig;
