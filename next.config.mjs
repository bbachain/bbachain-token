
/** @type {import('next').NextConfig} */
const nextConfig = {
    // output: "standalone",
    images: {
      remotePatterns: [
        {
          protocol: 'https',
          hostname: 'ipfs.io',
        },
      ],
    },
  };
  
  export default nextConfig
  