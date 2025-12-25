import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'PayTrack - Payment Verification Platform',
    short_name: 'PayTrack',
    description: 'Secure India-focused payment verification platform with UPI screenshot validation',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#000000',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
      {
        src: '/apple-icon.png',
        type: 'image/png',
        sizes: '192x192', // Assuming generic size for now, needed for some validators
      },
    ],
  }
}
