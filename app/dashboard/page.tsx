import { createClient } from '@/lib/supabase-server'

export default async function DashboardPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Dashboard</h1>
      <p className="text-gray-600 mb-4">Welcome to API Pulse, {user?.email}!</p>
      
      <div className="bg-green-50 border border-green-200 rounded-md p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-green-800">
              Authentication Successful!
            </h3>
            <div className="mt-2 text-sm text-green-700">
              <p>Your Google OAuth signup/signin worked perfectly. You can now start monitoring your APIs.</p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="mt-6">
        <p className="text-sm text-gray-500">User ID: {user?.id}</p>
        <p className="text-sm text-gray-500">Email: {user?.email}</p>
      </div>
    </div>
  )
} 