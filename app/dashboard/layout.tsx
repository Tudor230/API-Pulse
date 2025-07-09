import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { UnifiedBackground } from '@/components/layout/unified-background'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <UnifiedBackground />
      <div className="relative z-10">
        <Header user={user} />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
      </div>
    </div>
  )
} 