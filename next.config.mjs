/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: ['clinidex.co.uk', 'www.clinidex.co.uk'],
    },
  },
};

export default nextConfig;
