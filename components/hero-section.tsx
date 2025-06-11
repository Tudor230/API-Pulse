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
      <section className="min-h-screen flex items-center justify-center bg-gradient-to-br from-secondary/10 via-background to-secondary/30 py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground mb-6 tracking-tight">
            Welcome back to{" "}
            <span className="text-primary bg-gradient-to-r from-primary to-primary/80 bg-clip-text">API Pulse</span>
          </h1>
          
          <p className="text-xl sm:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto leading-relaxed">
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
    <section className="min-h-screen flex items-center justify-center bg-gradient-to-br from-secondary/10 via-background to-secondary/30 py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto text-center">
        <div className="mb-8 flex justify-center">
          <div className="inline-flex items-center rounded-full bg-secondary/50 px-4 py-2 text-sm font-medium text-secondary-foreground backdrop-blur-sm border border-border/50">
            ✨ Now with real-time monitoring
          </div>
        </div>
        
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground mb-6 tracking-tight">
          Monitor Your APIs with{" "}
          <span className="text-primary bg-gradient-to-r from-primary to-primary/80 bg-clip-text">Confidence</span>
        </h1>
        
        <p className="text-xl sm:text-2xl text-muted-foreground mb-12 max-w-3xl mx-auto leading-relaxed">
          Keep track of your API uptime, performance, and health with real-time monitoring 
          and instant alerts when things go wrong.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
          <Button asChild size="lg" className="text-lg px-8 py-4 shadow-lg hover:shadow-xl transition-all duration-300">
            <Link href="/sign-up">
              Start Monitoring Free
            </Link>
          </Button>
          
          <Button asChild variant="outline" size="lg" className="text-lg px-8 py-4 backdrop-blur-sm border-border/50 hover:bg-secondary/50 transition-all duration-300">
            <Link href="#features">
              See How It Works
            </Link>
          </Button>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-8 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
            No credit card required
          </div>
          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-primary rounded-full"></div>
            Setup in under 2 minutes
          </div>
          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-violet-500 rounded-full"></div>
            Free forever plan
          </div>
        </div>
      </div>
    </section>
  )
} 