
/** @type {import('next').NextConfig} */
const nextConfig = {
    output: "standalone",
    images: {
    remotePatterns: [
        {
          protocol: 'https',
          hostname: '**',
          pathname: '**', 
        },
        {
          protocol: 'https',
          hostname: 'ipfs.io', 
          pathname: '/ipfs/**',
        },
        {
          protocol: 'https',
          hostname: '**.ipfs.dweb.link',
          pathname: '/ipfs/**',
        },
        {
          protocol: 'https',
          hostname: '**.infura-ipfs.io',
          pathname: '/ipfs/**',
        },
        {
          protocol: 'https',
          hostname: '**.mypinata.cloud',
          pathname: '/ipfs/**',
        },
        {
          protocol: 'https',
          hostname: '**.pinata.cloud',
          pathname: '/ipfs/**',
        },
        {
          protocol: 'https',
          hostname: '**.ipfs.io',
          pathname: '/ipfs/**',
        },
        {
          protocol: 'https',
          hostname: 'arweave.net',
          pathname: '/**',
        },
      ],
    },
  };
  
  export default nextConfig
  