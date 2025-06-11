import { FeatureGlassCard } from "@/components/ui/glass-card"

interface Feature {
  title: string
  description: string
  icon: string
}

export function FeaturesSection() {
  const features: Feature[] = [
    {
      title: "Real-time Monitoring",
      description: "Check your APIs every minute with instant notifications when something goes wrong.",
      icon: "⚡"
    },
    {
      title: "Performance Tracking",
      description: "Monitor response times and identify performance bottlenecks before they impact users.",
      icon: "📊"
    },
    {
      title: "Instant Alerts",
      description: "Get notified immediately via email when your APIs go down or become slow.",
      icon: "🚨"
    },
    {
      title: "Simple Setup",
      description: "Add your API endpoints in seconds. No complex configuration required.",
      icon: "⚙️"
    },
    {
      title: "Status Dashboard",
      description: "Beautiful dashboard showing all your monitors, their status, and historical data.",
      icon: "📈"
    },
    {
      title: "99.9% Uptime SLA",
      description: "Our monitoring infrastructure is reliable, so you can trust your alerts.",
      icon: "🛡️"
    }
  ]

  return (
    <section id="features" className="py-32 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-background to-secondary/20">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-20">
          <div className="mb-4 flex justify-center">
            <div className="inline-flex items-center rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary backdrop-blur-sm border border-primary/20">
              🚀 Powerful Features
            </div>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-6 tracking-tight">
            Everything you need to monitor your APIs
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Simple, powerful tools to keep your services running smoothly and your users happy.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <FeatureGlassCard key={index} feature={feature} index={index} />
          ))}
        </div>
      </div>
    </section>
  )
} 