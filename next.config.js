/** @type {import('next').NextConfig} */
const nextConfig = {
  // Pin the workspace root so a stray lockfile in the home directory
  // doesn't get picked up as the project root
  outputFileTracingRoot: __dirname,
  // Use filesystem cache but allow it to be cleared
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
}

module.exports = nextConfig

