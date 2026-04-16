import type { NextConfig } from "next";
import path from "path";

const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https:; font-src 'self'; frame-ancestors 'none'",
  },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
];

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  
  // Webpack configuration to handle @noble/curves compatibility
  webpack: (config) => {
    // Resolve @noble/curves/nist.js to our shim that re-exports from correct paths
    // The Aptos SDK imports from nist.js but @noble/curves@1.2.0 doesn't export it
    config.resolve.alias = {
      ...config.resolve.alias,
      '@noble/curves/nist.js': path.resolve(__dirname, 'src/lib/noble-curves-nist-shim.js'),
    };
    
    // Ensure proper module resolution for ESM packages
    config.resolve.extensionAlias = {
      '.js': ['.js', '.ts', '.tsx'],
      '.mjs': ['.mjs'],
    };
    
    return config;
  },

  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }];
  },
};

export default nextConfig;
