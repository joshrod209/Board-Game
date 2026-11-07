import OnlineRoom from '@/components/online/OnlineRoom'

export default async function RoomPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  return <OnlineRoom code={code.toUpperCase()} />
}
