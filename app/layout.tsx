import type { Metadata } from 'next'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { ThemeProvider } from '@/lib/contexts/ThemeContext'
import { SubscriptionProvider } from '@/lib/contexts/SubscriptionContext'
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
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning={true}>
        <ThemeProvider>
          <SubscriptionProvider>
            {children}
          </SubscriptionProvider>
        </ThemeProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
} 