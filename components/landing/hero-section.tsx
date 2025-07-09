import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ContainerScroll } from "@/components/ui/container-scroll-animation"

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
      <ContainerScroll
        titleComponent={
          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground mb-6 tracking-tight">
              Welcome back to{" "}
              <span className="text-primary bg-gradient-to-r from-primary to-primary/80 bg-clip-text">API Pulse</span>
            </h1>

            <p className="text-xl sm:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto leading-relaxed">
              Ready to monitor your APIs? Access your dashboard to view your monitors,
              check uptime statistics, and manage alerts.
            </p>

            {/* <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button asChild size="lg" className="text-lg px-8 py-3 hover:scale-105 transition-transform duration-200">
                <Link href="/dashboard">
                  Go to Dashboard
                </Link>
              </Button>

              <Button asChild variant="outline" size="lg" className="text-lg px-8 py-3 hover:scale-105 transition-transform duration-200">
                <Link href="/monitors">
                  View Monitors
                </Link>
              </Button>
            </div> */}
          </div>
        }
      >
        <div className="h-full w-full rounded-2xl flex items-center justify-center bg-transparet border border-border/20">
          <div className="text-center p-8">
            <div className="w-20 h-20 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
              <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
            </div>
            <h3 className="text-2xl font-bold text-foreground mb-2">Your Dashboard Awaits</h3>
            <p className="text-muted-foreground">Real-time monitoring at your fingertips</p>
          </div>
        </div>
      </ContainerScroll>
    )
  }

  // Unauthenticated user - show standard landing page
  return (
    <ContainerScroll
      titleComponent={
        <div className="text-center">
          <div className="mb-8 flex justify-center">
            <div className="inline-flex items-center rounded-full bg-secondary/50 px-4 py-2 text-sm font-medium text-secondary-foreground backdrop-blur-sm border border-border/50 hover:bg-secondary/70 transition-colors duration-200">
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

          {/* <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <Button asChild size="lg" className="text-lg px-8 py-4 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300">
              <Link href="/sign-up">
                Start Monitoring Free
              </Link>
            </Button>

            <Button asChild variant="outline" size="lg" className="text-lg px-8 py-4 backdrop-blur-sm border-border/50 hover:bg-secondary/50 hover:scale-105 transition-all duration-300">
              <Link href="#features">
                See How It Works
              </Link>
            </Button>
          </div> */}

          <div className="flex flex-col sm:flex-row items-center justify-center gap-8 text-sm text-muted-foreground">
            <div className="flex items-center gap-2 hover:text-foreground transition-colors duration-200">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
              No credit card required
            </div>
            <div className="flex items-center gap-2 hover:text-foreground transition-colors duration-200">
              <div className="w-2 h-2 bg-primary rounded-full"></div>
              Setup in under 2 minutes
            </div>
            <div className="flex items-center gap-2 hover:text-foreground transition-colors duration-200">
              <div className="w-2 h-2 bg-accent rounded-full animate-pulse animation-delay-1000"></div>
              Free forever plan
            </div>
          </div>
        </div>
      }
    >
      <div className="h-full w-full rounded-2xl flex items-center justify-center p-8 bg-background/20 backdrop-blur-sm border border-border/20">
        <div className="w-full max-w-4xl">
          {/* Mock Dashboard Preview */}
          <div className="bg-background/80 backdrop-blur-sm rounded-lg border border-border p-6 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-foreground">API Monitoring Dashboard</h3>
              <div className="flex gap-2">
                <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-muted-foreground">Live</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-secondary/50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-emerald-500">99.9%</div>
                <div className="text-sm text-muted-foreground">Uptime</div>
              </div>
              <div className="bg-secondary/50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-blue-500">145ms</div>
                <div className="text-sm text-muted-foreground">Response Time</div>
              </div>
              <div className="bg-secondary/50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-primary">12</div>
                <div className="text-sm text-muted-foreground">Monitors</div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                  <span className="font-medium">api.example.com</span>
                </div>
                <span className="text-sm text-muted-foreground">200ms</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                  <span className="font-medium">payments.service.com</span>
                </div>
                <span className="text-sm text-muted-foreground">89ms</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                  <span className="font-medium">analytics.domain.com</span>
                </div>
                <span className="text-sm text-muted-foreground">1.2s</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ContainerScroll>
  )
} 