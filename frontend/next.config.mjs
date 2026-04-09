/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",          // static HTML export for Docker/HF Spaces
  trailingSlash: true,
  images: { unoptimized: true },
};
export default nextConfig;
