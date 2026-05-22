import withPWAInit from '@ducanh2912/next-pwa'
import { PrismaPlugin } from '@prisma/nextjs-monorepo-workaround-plugin'

const withPWA = withPWAInit({
  dest: 'public',
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === 'development',
  workboxOptions: {
    disableDevLogs: true,
  },
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['maplibre-gl'],
  experimental: {
    externalDir: true,
    serverComponentsExternalPackages: ['@prisma/client', 'bcryptjs'],
    outputFileTracingIncludes: {
      '/api/[[...path]]': [
        './server/data/**/*',
        './server/prisma/**/*',
        './server/node_modules/.prisma/client/**/*',
        './server/node_modules/@prisma/client/**/*',
        './server/node_modules/prisma/libquery_engine-rhel-openssl-3.0.x.so.node',
        './server/node_modules/@prisma/engines/**/*',
      ],
    },
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.plugins.push(new PrismaPlugin())
    }
    config.resolve.extensionAlias = {
      '.js': ['.ts', '.tsx', '.js'],
      '.mjs': ['.mts', '.mjs'],
      '.cjs': ['.cts', '.cjs'],
    }
    return config
  },
}

export default withPWA(nextConfig)
