import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Header } from '@/components/header'
import { StaticBackground } from '@/components/static-background'
import AlertsPageClient from '@/components/alerts-page-client'
import { Bell, AlertTriangle } from 'lucide-react'

export default async function AlertsPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  // Check if user has any monitors
  const { data: monitors, error: monitorsError } = await supabase
    .from('monitors')
    .select('id')
    .limit(1)

  const hasMonitors = monitors && monitors.length > 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <StaticBackground />
      <Header user={user} />
      
      <main className="container mx-auto px-4 py-8 relative z-10">
        <div className="max-w-6xl mx-auto">
          {/* Page Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <Bell className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Alert Management</h1>
                <p className="text-muted-foreground">
                  Configure how you receive notifications when your monitors go down
                </p>
              </div>
            </div>
          </div>

          {/* No Monitors Warning */}
          {!hasMonitors && (
            <Alert className="mb-8">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                You don't have any monitors yet. 
                <a href="/dashboard" className="underline ml-1">Create your first monitor</a> to start receiving alerts.
              </AlertDescription>
            </Alert>
          )}

          {/* Main Content */}
          <AlertsPageClient />
        </div>
      </main>
    </div>
  )
} 