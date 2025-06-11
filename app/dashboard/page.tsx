import { createClient } from '@/lib/supabase-server'

export default async function DashboardPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="bg-card/50 shadow-lg rounded-lg p-6 border border-border">
      <h1 className="text-2xl font-bold text-foreground mb-4">Dashboard</h1>
      <p className="text-muted-foreground mb-4">Welcome to API Pulse, {user?.email}!</p>
      
      <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 rounded-md p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-emerald-500" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
              Authentication Successful!
            </h3>
            <div className="mt-2 text-sm text-emerald-700 dark:text-emerald-300">
              <p>Your Google OAuth signup/signin worked perfectly. You can now start monitoring your APIs.</p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="mt-6">
        <p className="text-sm text-muted-foreground">User ID: {user?.id}</p>
        <p className="text-sm text-muted-foreground">Email: {user?.email}</p>
      </div>
    </div>
  )
} 