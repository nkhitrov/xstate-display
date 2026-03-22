/** @type import('next').NextConfig */
module.exports = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    /**
     * This is checked on CI anyway, so we'll never
     * deploy anything that has type errors
     */
    ignoreBuildErrors: true,
  },
  basePath: `/viz`,
  productionBrowserSourceMaps: true,
};
