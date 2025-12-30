/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    domains: ['localhost', 'your-api-domain.fly.dev'],
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_PYTHON_API_URL: process.env.NEXT_PUBLIC_PYTHON_API_URL,
  }
};

module.exports = nextConfig;