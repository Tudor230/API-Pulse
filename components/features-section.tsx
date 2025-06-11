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
    <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-white dark:bg-gray-900">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Everything you need to monitor your APIs
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
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