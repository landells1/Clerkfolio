/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins:
        process.env.NODE_ENV === 'development'
          ? ['localhost:3000', '127.0.0.1:3000']
          : ['clerkfolio.co.uk', 'www.clerkfolio.co.uk'],
    },
  },
};

export default nextConfig;
