import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'TextoPro — Plateforme SMS professionnelle en Côte d\'Ivoire'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'center',
          background: '#0A0A0F',
          padding: '80px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '20px',
            marginBottom: '40px',
          }}
        >
          <div
            style={{
              width: '72px',
              height: '72px',
              borderRadius: '18px',
              background: 'linear-gradient(135deg, #00D4FF 0%, #10B981 100%)',
            }}
          />
          <div style={{ fontSize: '44px', fontWeight: 700, color: '#fff' }}>TextoPro</div>
        </div>
        <div style={{ fontSize: '64px', fontWeight: 800, color: '#fff', lineHeight: 1.1 }}>
          Envoyez des SMS
        </div>
        <div style={{ fontSize: '64px', fontWeight: 800, color: '#00D4FF', lineHeight: 1.1 }}>
          professionnels
        </div>
        <div style={{ fontSize: '30px', color: '#94A3B8', marginTop: '32px' }}>
          Marketing · Transactionnel · OTP — dès 20 FCFA/SMS
        </div>
      </div>
    ),
    { ...size }
  )
}
