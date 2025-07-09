import { SignInForm } from "@/components/auth/sign-in-form"
import { Header } from "@/components/layout/header"
import { UnifiedBackground } from "@/components/layout/unified-background"
import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'

export default async function SignInPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  // If user is already logged in, redirect to dashboard
  if (user) {
    redirect('/dashboard')
  }

  return (
    <div className="relative min-h-screen flex flex-col">
      <UnifiedBackground />
      <div className="relative z-10 flex flex-col min-h-screen">
        <Header user={null} />

        {/* Main content */}
        <main className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
          <div className="w-full max-w-md">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-foreground mb-2">
                Welcome back
              </h1>
              <p className="text-muted-foreground">
                Sign in to your API Pulse dashboard
              </p>
            </div>

            <SignInForm />
          </div>
        </main>
      </div>
    </div>
  )
} 