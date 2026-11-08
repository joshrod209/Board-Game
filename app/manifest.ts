import type { MetadataRoute } from 'next'

/** Lets the game open full screen when added to a phone's Home Screen */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Board Game',
    short_name: 'Board Game',
    start_url: '/',
    display: 'standalone',
    background_color: '#111827',
    theme_color: '#111827',
    icons: [{ src: '/apple-icon', sizes: '180x180', type: 'image/png' }],
  }
}
