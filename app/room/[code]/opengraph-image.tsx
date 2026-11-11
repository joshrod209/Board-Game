import { ImageResponse } from 'next/og'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const alt = 'Invite to play The Board Game'

const RED = '#dc2626'
const BLUE = '#2563eb'

/** A corner of the board with a few chips on it */
const MINI_BOARD: Array<Array<string | null>> = [
  [null, RED, null, BLUE, null],
  [BLUE, RED, null, null, RED],
  [null, RED, BLUE, null, null],
  [null, RED, null, BLUE, null],
]

/** The picture shown with an invite link in Messages and other apps */
export default async function InviteImage({ params }: { params: Promise<{ code: string }> | { code: string } }) {
  const code = (await params).code.toUpperCase().slice(0, 6)

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 80px',
          background: 'linear-gradient(135deg, #111827 0%, #1f2937 100%)',
          color: 'white',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 40, color: '#9ca3af' }}>You&apos;re invited to play</div>
          <div style={{ fontSize: 72, fontWeight: 800, marginTop: 4 }}>The Board Game</div>
          <div style={{ display: 'flex', alignItems: 'center', marginTop: 44 }}>
            <div style={{ fontSize: 34, color: '#9ca3af', marginRight: 24 }}>Game code</div>
            <div
              style={{
                display: 'flex',
                fontSize: 76,
                fontWeight: 800,
                letterSpacing: 14,
                padding: '6px 28px',
                borderRadius: 20,
                background: '#facc15',
                color: '#111827',
              }}
            >
              {code}
            </div>
          </div>
          <div style={{ fontSize: 32, color: '#d1d5db', marginTop: 40 }}>Tap to join and pick a team</div>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            padding: 18,
            borderRadius: 24,
            background: '#374151',
            transform: 'rotate(4deg)',
          }}
        >
          {MINI_BOARD.map((row, r) => (
            <div key={r} style={{ display: 'flex' }}>
              {row.map((chip, c) => (
                <div
                  key={c}
                  style={{
                    width: 64,
                    height: 64,
                    margin: 5,
                    borderRadius: 10,
                    background: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {chip && (
                    <div style={{ width: 40, height: 40, borderRadius: 20, background: chip, border: '4px solid white', boxShadow: '0 2px 6px rgba(0,0,0,0.4)' }} />
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    ),
    size
  )
}
