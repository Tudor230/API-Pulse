import { Button } from "@/components/ui/button"
import Link from "next/link"

interface HeroSectionProps {
  user?: {
    id: string
    email?: string
  } | null
}

export function HeroSection({ user }: HeroSectionProps) {
  if (user) {
    // Authenticated user - show welcome back message
    return (
      <section className="bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-6">
            Welcome back to{" "}
            <span className="text-blue-600 dark:text-blue-400">API Pulse</span>
          </h1>
          
          <p className="text-xl sm:text-2xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
            Ready to monitor your APIs? Access your dashboard to view your monitors, 
            check uptime statistics, and manage alerts.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button asChild size="lg" className="text-lg px-8 py-3">
              <Link href="/dashboard">
                Go to Dashboard
              </Link>
            </Button>
            
            <Button asChild variant="outline" size="lg" className="text-lg px-8 py-3">
              <Link href="/monitors">
                View Monitors
              </Link>
            </Button>
          </div>
        </div>
      </section>
    )
  }

  // Unauthenticated user - show standard landing page
  return (
    <section className="bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto text-center">
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-6">
          Monitor Your APIs with{" "}
          <span className="text-blue-600 dark:text-blue-400">Confidence</span>
        </h1>
        
        <p className="text-xl sm:text-2xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
          Keep track of your API uptime, performance, and health with real-time monitoring 
          and instant alerts when things go wrong.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Button asChild size="lg" className="text-lg px-8 py-3">
            <Link href="/sign-up">
              Start Monitoring Free
            </Link>
          </Button>
          
          <Button asChild variant="outline" size="lg" className="text-lg px-8 py-3">
            <Link href="#features">
              See How It Works
            </Link>
          </Button>
        </div>
        
        <div className="mt-12 text-sm text-gray-500 dark:text-gray-400">
          No credit card required • Setup in under 2 minutes
        </div>
      </div>
    </section>
  )
} 