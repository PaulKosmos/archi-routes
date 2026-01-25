import type { NextConfig } from "next";

// Bundle analyzer configuration
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig: NextConfig = {
  // TypeScript errors fixed (Jan 25, 2026) - See PRE_LAUNCH_AUDIT_REPORT.md
  eslint: {
    ignoreDuringBuilds: true, // TODO: Enable ESLint checking after fixing lint errors
  },
  typescript: {
    ignoreBuildErrors: false, // ✅ TypeScript checking enabled
  },
  // Use standalone output to avoid static export issues with dynamic pages
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'jkozshkubprsvkayfvhf.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'source.unsplash.com',
      },
    ],
  },
  // Fix Jest worker issues in Next.js 15
  webpack: (config, { isServer, dev }) => {
    // In development mode, disable parallelism completely to prevent Jest worker errors
    if (dev) {
      config.parallelism = 1

      // Disable all worker threads
      config.optimization = {
        ...config.optimization,
        minimize: false,
      }

      // Remove thread-loader from all rules
      if (config.module && config.module.rules) {
        config.module.rules = config.module.rules.map((rule: any) => {
          if (rule.use && Array.isArray(rule.use)) {
            rule.use = rule.use.filter((use: any) => {
              // Remove thread-loader completely in development
              return typeof use !== 'object' || use.loader !== 'thread-loader'
            })
          }
          return rule
        })
      }
    }

    return config
  },
};

export default withBundleAnalyzer(nextConfig);
