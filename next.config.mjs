/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { hostname: "images.pexels.com" },
      { hostname: "res.cloudinary.com" },
      { hostname: "img.clerk.com" },
    ],
  },
};

export default nextConfig;
