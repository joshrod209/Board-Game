import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Board Game',
  description: 'A custom Sequence-style board game',
  // Opened from the iPhone Home Screen: full screen, no Safari bars
  appleWebApp: { capable: true, title: 'Board Game', statusBarStyle: 'black-translucent' },
}

export const viewport: Viewport = {
  // Draw edge to edge; globals.css keeps content clear of the notch and home indicator
  viewportFit: 'cover',
  themeColor: '#111827',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
