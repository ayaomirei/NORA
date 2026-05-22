import withPWAInit from '@ducanh2912/next-pwa'

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
        './server/node_modules/.prisma/**/*',
        './server/node_modules/@prisma/client/**/*',
      ],
    },
  },
  webpack: (config) => {
    config.resolve.extensionAlias = {
      '.js': ['.ts', '.tsx', '.js'],
      '.mjs': ['.mts', '.mjs'],
      '.cjs': ['.cts', '.cjs'],
    }
    return config
  },
}

export default withPWA(nextConfig)
