import { SignUpForm } from "@/components/auth/sign-up-form"
import { Header } from "@/components/header"
import { StaticBackground } from "@/components/static-background"
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
    <div className="relative min-h-screen flex flex-col">
      <StaticBackground />
      <div className="relative z-10 flex flex-col min-h-screen">
        <Header user={null} />

        {/* Main content */}
        <main className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
          <div className="w-full max-w-md">
            <div className="text-center mb-8">
                            <h1 className="text-3xl font-bold text-foreground mb-2">
                Get started today
              </h1>
                            <p className="text-muted-foreground">
                Create your account and start monitoring your APIs
              </p>
            </div>
            
            <SignUpForm />
            
            {/* Additional trust signals */}
                        <div className="mt-8 text-center text-sm text-muted-foreground">
              <div className="flex items-center justify-center space-x-4">
                <span>✓ Free to start</span>
                <span>✓ No credit card required</span>
                <span>✓ 2-minute setup</span>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
} 