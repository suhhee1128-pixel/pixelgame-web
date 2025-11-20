import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Pic.ai - AI 2D Game Asset Generator',
  description: 'AI로 만드는 2D 게임 에셋 생성기. 캐릭터, 배경, 아이템까지 모든 게임 에셋을 생성하세요.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body style={{ fontFamily: 'Merriweather Sans, -apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}>
        {children}
      </body>
    </html>
  )
}

