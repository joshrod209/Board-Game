import type { Metadata } from 'next'
import { headers } from 'next/headers'
import OnlineRoom from '@/components/online/OnlineRoom'

type Props = { params: Promise<{ code: string }> }

/**
 * What Messages and other apps show for an invite link: a title, a short
 * line and the preview image (opengraph-image.tsx in this folder).
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const code = (await params).code.toUpperCase()
  // Previews need full image addresses, so use the address this link was opened at
  const h = await headers()
  const host = h.get('x-forwarded-host') ?? h.get('host')
  const proto = h.get('x-forwarded-proto') ?? (host?.startsWith('localhost') ? 'http' : 'https')
  const title = `You're invited to play The Board Game · ${code}`
  const description = `Tap to join game ${code} and pick a team.`
  return {
    metadataBase: host ? new URL(`${proto}://${host}`) : undefined,
    title,
    description,
    openGraph: { title, description, siteName: 'The Board Game', type: 'website' },
    twitter: { card: 'summary_large_image', title, description },
  }
}

export default async function RoomPage({ params }: Props) {
  const { code } = await params
  return <OnlineRoom code={code.toUpperCase()} />
}
