
/** @type {import('next').NextConfig} */
const nextConfig = {
    output: "standalone",
    images: {
      remotePatterns: [
        {
          protocol: 'https',
          hostname: 'ipfs.io',
          pathname: '/ipfs/**',
        },
        {
          protocol: 'https',
          hostname: 'gateway.pinata.cloud',
          pathname: '/ipfs/**',
        },
        {
          protocol: 'https',
          hostname: 'arweave.net',
          pathname: '/**',
        },
        {
          protocol: 'https',
          hostname: '**.infura-ipfs.io', // wildcard subdomain support
          pathname: '/ipfs/**',
        }
      ],
    },
  };
  
  export default nextConfig
  