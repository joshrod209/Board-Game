import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Quad Sequence',
  description: 'A custom Sequence-style board game',
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

