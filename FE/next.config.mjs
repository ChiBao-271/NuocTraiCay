/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Keep webpack's dev chunks away from production build artifacts. Running
  // `next build` while `next dev` is active must not replace dev server chunks.
  distDir: process.env.NODE_ENV === 'development' ? '.next-dev' : '.next',
};

export default nextConfig;
