/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  api: {
    bodyParser: {
      sizeLimit: '4mb' // Increase the body parser size limit
    }
  }
};

module.exports = nextConfig;
