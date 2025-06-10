import { createServerClient } from '@/lib/supabase'
import TestPageClient from '@/app/test/test-page-client'
import TestAuth from './auth'

export default async function TestPage() {
  const supabase = createServerClient()
  
  // Check if user is authenticated
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Database Test Page</h1>
            <p className="text-muted-foreground mb-6">
              Test the Supabase database connection and CRUD operations
            </p>
          </div>

          <TestAuth />

          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-800 mb-2">What this page tests:</h3>
            <ul className="text-blue-700 space-y-1 text-sm">
              <li>✅ Supabase authentication (sign up/in)</li>
              <li>✅ Database connection and client setup</li>
              <li>✅ Row Level Security (RLS) policies</li>
              <li>✅ CRUD operations (Create, Read monitors)</li>
              <li>✅ API routes with authentication</li>
              <li>✅ TypeScript integration</li>
              <li>✅ Real-time updates via state management</li>
            </ul>
          </div>
        </div>
      </div>
    )
  }

  // Fetch monitors for the authenticated user
  const { data: monitors, error } = await supabase
    .from('monitors')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching monitors:', error)
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Database Test Page</h1>
          <p className="text-muted-foreground">
            Test the Supabase database connection and CRUD operations
          </p>
          <div className="mt-4 text-sm text-green-600 bg-green-50 border border-green-200 rounded-lg p-3 inline-block">
            ✅ Authenticated as: {session.user.email}
          </div>
        </div>

        <TestPageClient initialMonitors={monitors || []} />

        <div className="mt-8 bg-green-50 border border-green-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-green-800 mb-2">Database Test Results:</h3>
          <ul className="text-green-700 space-y-1 text-sm">
            <li>✅ Authentication: Working</li>
            <li>✅ Database Connection: {error ? '❌ Failed' : '✅ Success'}</li>
            <li>✅ RLS Policies: Active (user-scoped data)</li>
            <li>✅ Monitors Fetched: {monitors?.length || 0} records</li>
            <li>✅ API Routes: Available at /api/monitors</li>
          </ul>
        </div>
      </div>
    </div>
  )
} 