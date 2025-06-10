import { SignUpForm } from "@/components/auth/sign-up-form"
import Link from "next/link"
import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'

export default async function SignUpPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  // If user is already logged in, redirect to dashboard
  if (user) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header with logo and back to home */}
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">P</span>
              </div>
              <span className="text-xl font-bold text-gray-900">API Pulse</span>
            </Link>
            
            <Link 
              href="/" 
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Get started today
            </h1>
            <p className="text-gray-600">
              Create your account and start monitoring your APIs
            </p>
          </div>
          
          <SignUpForm />
          
          {/* Additional trust signals */}
          <div className="mt-8 text-center text-sm text-gray-500">
            <div className="flex items-center justify-center space-x-4">
              <span>✓ Free to start</span>
              <span>✓ No credit card required</span>
              <span>✓ 2-minute setup</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
} 