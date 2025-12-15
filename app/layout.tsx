import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'KOL AI Manager',
  description: 'Quản lý KOL AI tự động trả lời Facebook',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  )
}
