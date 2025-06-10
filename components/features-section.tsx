import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function FeaturesSection() {
  const features = [
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
    <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Everything you need to monitor your APIs
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Simple, powerful tools to keep your services running smoothly and your users happy.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card key={index} className="border-gray-200 hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <span className="text-2xl">{feature.icon}</span>
                </div>
                <CardTitle className="text-xl text-gray-900">
                  {feature.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-600 text-base">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
} 