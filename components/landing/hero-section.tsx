import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ContainerScroll } from "@/components/ui/container-scroll-animation"
import MonitorsList from "@/components/dashboard/monitor/monitors-list"
import { Monitor } from "@/lib/supabase-types"

interface HeroSectionProps {
  user?: {
    id: string
    email?: string
  } | null
}

// Mock data for the hero section demo
const mockMonitors: Monitor[] = [
  {
    id: "1",
    user_id: "demo",
    name: "API Gateway",
    url: "https://api.example.com/health",
    status: "up",
    interval_minutes: 5,
    is_active: true,
    response_time: 156,
    last_checked_at: new Date(Date.now() - 2 * 60 * 1000).toISOString(), // 2 minutes ago
    next_check_at: new Date(Date.now() + 3 * 60 * 1000).toISOString(), // 3 minutes from now
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
    updated_at: new Date(Date.now() - 2 * 60 * 1000).toISOString()
  },
  {
    id: "2",
    user_id: "demo",
    name: "Payment Service",
    url: "https://payments.service.com/status",
    status: "up",
    interval_minutes: 10,
    is_active: true,
    response_time: 89,
    last_checked_at: new Date(Date.now() - 1 * 60 * 1000).toISOString(), // 1 minute ago
    next_check_at: new Date(Date.now() + 9 * 60 * 1000).toISOString(), // 9 minutes from now
    created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(), // 15 days ago
    updated_at: new Date(Date.now() - 1 * 60 * 1000).toISOString()
  },
  {
    id: "3",
    user_id: "demo",
    name: "Analytics Engine",
    url: "https://analytics.domain.com/ping",
    status: "timeout",
    interval_minutes: 15,
    is_active: true,
    response_time: 1200,
    last_checked_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 minutes ago
    next_check_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes from now
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
    updated_at: new Date(Date.now() - 5 * 60 * 1000).toISOString()
  },
  {
    id: "4",
    user_id: "demo",
    name: "User Authentication",
    url: "https://auth.myapp.com/health",
    status: "up",
    interval_minutes: 5,
    is_active: true,
    response_time: 234,
    last_checked_at: new Date(Date.now() - 3 * 60 * 1000).toISOString(), // 3 minutes ago
    next_check_at: new Date(Date.now() + 2 * 60 * 1000).toISOString(), // 2 minutes from now
    created_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(), // 45 days ago
    updated_at: new Date(Date.now() - 3 * 60 * 1000).toISOString()
  }
]

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
      <div className="h-full w-full rounded-2xl p-4 bg-background/20 backdrop-blur-sm border border-border/20">
        <div className="w-full h-full">
          {/* Custom hero version of MonitorsList - non-interactive */}
          <div className="pointer-events-none h-full">
            <div className="backdrop-blur-xl bg-background/60 border-border/50 rounded-lg h-full flex flex-col">
              <div className="p-6 border-b border-border/50">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-foreground">Your Monitors ({mockMonitors.length})</h2>
                    <p className="text-sm text-muted-foreground">
                      All your configured API monitors and their current status
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
                    <span className="text-sm text-muted-foreground">Live monitoring</span>
                  </div>
                </div>
              </div>
              <div className="flex-1 overflow-hidden">
                <div className="overflow-x- h-full">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border/50">
                        <th className="text-left p-4 font-medium text-foreground">Name</th>
                        <th className="text-left p-4 font-medium text-foreground">URL</th>
                        <th className="text-left p-4 font-medium text-foreground">Status</th>
                        <th className="text-left p-4 font-medium text-foreground">Interval</th>
                        <th className="text-left p-4 font-medium text-foreground">Response Time</th>
                        <th className="text-left p-4 font-medium text-foreground">Last Checked</th>
                        <th className="text-left p-4 font-medium text-foreground">Next Check</th>
                        <th className="text-left p-4 font-medium text-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mockMonitors.map((monitor) => (
                        <tr key={monitor.id} className="border-b border-border/20">
                          <td className="p-4 font-medium">
                            <div className="flex items-center gap-2">
                              <span className="text-foreground">{monitor.name}</span>
                              {!monitor.is_active && (
                                <span className="text-xs px-2 py-0 text-muted-foreground border border-muted-foreground/20 rounded">
                                  Disabled
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <span className="truncate max-w-xs text-foreground">{monitor.url}</span>
                              <svg className="h-3 w-3 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded border ${monitor.status === 'up' ? 'border-success text-success bg-success/10' :
                              monitor.status === 'down' ? 'border-destructive text-destructive bg-destructive/20' :
                                monitor.status === 'timeout' ? 'border-warning text-warning bg-warning/10' :
                                  monitor.status === 'pending' ? 'border-muted text-muted-foreground bg-muted/10' :
                                    'border-muted text-muted-foreground bg-muted/10'
                              }`}>
                              {monitor.status.toUpperCase()}
                            </span>
                          </td>
                          <td className="p-4 text-foreground">
                            {monitor.interval_minutes < 60 ?
                              `${monitor.interval_minutes}m` :
                              `${Math.floor(monitor.interval_minutes / 60)}h${monitor.interval_minutes % 60 ? ` ${monitor.interval_minutes % 60}m` : ''}`
                            }
                          </td>
                          <td className="p-4">
                            {monitor.response_time ? (
                              <span className={`font-medium ${monitor.response_time <= 1000 ? 'text-success' :
                                monitor.response_time <= 2000 ? 'text-warning' :
                                  'text-destructive'
                                }`}>
                                {monitor.response_time}ms
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                          <td className="p-4 text-sm text-muted-foreground">
                            {monitor.last_checked_at ?
                              (() => {
                                const diffInMinutes = Math.floor((new Date().getTime() - new Date(monitor.last_checked_at).getTime()) / (1000 * 60));
                                return diffInMinutes < 1 ? 'Just now' :
                                  diffInMinutes < 60 ? `${diffInMinutes}m ago` :
                                    diffInMinutes < 1440 ? `${Math.floor(diffInMinutes / 60)}h ago` :
                                      new Date(monitor.last_checked_at).toLocaleDateString();
                              })() : 'Never'
                            }
                          </td>
                          <td className="p-2 text-sm text-muted-foreground">
                            {monitor.next_check_at ?
                              (() => {
                                const diffInMinutes = Math.floor((new Date(monitor.next_check_at).getTime() - new Date().getTime()) / (1000 * 60));
                                return diffInMinutes < 1 ? 'Just now' :
                                  diffInMinutes < 60 ? `${diffInMinutes}m ago` :
                                    diffInMinutes < 1440 ? `${Math.floor(diffInMinutes / 60)}h ago` :
                                      new Date(monitor.next_check_at).toLocaleDateString();
                              })() : 'Never'
                            }
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ContainerScroll>
  )
} 