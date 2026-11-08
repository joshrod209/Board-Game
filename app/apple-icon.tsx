import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

const chip = (color: string, left: number, top: number) => (
  <div
    style={{
      position: 'absolute',
      left,
      top,
      width: 92,
      height: 92,
      borderRadius: 46,
      background: color,
      border: '8px solid white',
    }}
  />
)

/** Home Screen icon: a red chip and a blue chip */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', position: 'relative', background: '#111827' }}>
        {chip('#dc2626', 26, 26)}
        {chip('#2563eb', 62, 62)}
      </div>
    ),
    size
  )
}
