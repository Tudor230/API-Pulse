import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'API Pulse - Monitor Your APIs',
  description: 'Monitor API endpoints for uptime and performance',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning={true}>{children}</body>
    </html>
  )
} 