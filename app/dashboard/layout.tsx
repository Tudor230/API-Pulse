import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { Header } from '@/components/header'
import { StaticBackground } from '@/components/static-background'

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
    <div className="relative min-h-screen">
      <StaticBackground />
      <div className="relative z-10">
        <Header user={user} />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
      </div>
    </div>
  )
} 