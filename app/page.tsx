import { Header } from "@/components/header"
import { HeroSection } from "@/components/hero-section"
import { FeaturesSection } from "@/components/features-section"
import PricingComponent from "@/components/pricing"
import { AnimatedBackground } from "@/components/animated-background"
import { createClient } from '@/lib/supabase-server'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <AnimatedBackground />
      <div className="relative z-10">
        <Header user={user} />
        <main>
          <HeroSection user={user} />
          <FeaturesSection />
          <section id="pricing" className="container mx-auto px-4 py-16">
            <PricingComponent />
          </section>
        </main>
      </div>
    </div>
  )
} 