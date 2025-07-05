import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { Header } from '@/components/header'
import { StaticBackground } from '@/components/static-background'
import { MonitorsPageClient } from '@/components/monitors-page-client'

export default async function MonitorsPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  // Fetch monitors data
  const { data: monitors, error } = await supabase
    .from('monitors')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching monitors:', error)
  }

  const monitorsList = monitors || []

  // Calculate basic stats
  const totalMonitors = monitorsList.length
  const upMonitors = monitorsList.filter(m => m.status === 'up').length
  const downMonitors = monitorsList.filter(m => m.status === 'down').length
  const timeoutMonitors = monitorsList.filter(m => m.status === 'timeout').length
  const pendingMonitors = monitorsList.filter(m => m.status === 'pending').length

  const stats = {
    total: totalMonitors,
    up: upMonitors,
    down: downMonitors,
    timeout: timeoutMonitors,
    pending: pendingMonitors,
    uptimePercentage: totalMonitors > 0 ? Math.round((upMonitors / totalMonitors) * 100) : 0
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <StaticBackground />
      <div className="relative z-10">
        <Header user={user} />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <MonitorsPageClient monitors={monitorsList} stats={stats} />
        </main>
      </div>
    </div>
  )
} 