/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins:
        process.env.NODE_ENV === 'development'
          ? ['localhost:3000', '127.0.0.1:3000']
          : ['clinidex.co.uk', 'www.clinidex.co.uk'],
    },
  },
};

export default nextConfig;
