"use client"

import { Header } from "@/components/layout/header"
import { HeroSection } from "@/components/landing/hero-section"
import { FeaturesSectionWithHoverEffects } from "@/components/feature-section-with-hover-effects"
import { Pricing } from "@/components/landing/pricing"
import { AnimatedBackground } from "@/components/layout/animated-background"
import { createClient } from '@/lib/supabase-client'
import { SparklesCore } from "@/components/ui/sparkles"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import type { User } from '@supabase/supabase-js'

const demoPlans = [
  {
    name: "STARTER",
    price: "0",
    yearlyPrice: "0",
    period: "per month",
    features: [
      "Up to 3 monitors",
      "Basic analytics",
      "48-hour support response time",
      "Community support",
    ],
    description: "Perfect for individuals and small projects",
    buttonText: "Start Free",
    href: "/sign-up",
    isPopular: false,
    planType: "free" as const,
  },
  {
    name: "PROFESSIONAL",
    price: "10",
    yearlyPrice: "8",
    period: "per month",
    features: [
      "Up to 10 monitors",
      "Advanced analytics",
      "24-hour support response time",
      "Priority support",
      "Team collaboration",
      "Custom integrations",
    ],
    description: "Ideal for growing teams and businesses",
    buttonText: "Get Started",
    href: "/sign-up",
    isPopular: true,
    stripeMonthlyPriceId: process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID,
    stripeYearlyPriceId: process.env.NEXT_PUBLIC_STRIPE_PRO_YEARLY_PRICE_ID,
    planType: "pro" as const,
  },
  {
    name: "ENTERPRISE",
    price: "100",
    yearlyPrice: "80",
    period: "per month",
    features: [
      "Unlimited monitors",
      "Custom solutions",
      "Dedicated account manager",
      "1-hour support response time",
      "Advanced security",
      "Custom contracts",
    ],
    description: "For large organizations with specific needs",
    buttonText: "Contact Sales",
    href: "/contact",
    isPopular: false,
    stripeMonthlyPriceId: process.env.NEXT_PUBLIC_STRIPE_ENTERPRISE_MONTHLY_PRICE_ID,
    stripeYearlyPriceId: process.env.NEXT_PUBLIC_STRIPE_ENTERPRISE_YEARLY_PRICE_ID,
    planType: "enterprise" as const,
  },
];

export default function HomePage() {
  const { theme } = useTheme()
  const [user, setUser] = useState<User | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const getUser = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    getUser()
  }, [])

  // Prevent hydration mismatch by not rendering theme-dependent content until mounted
  if (!mounted) {
    return (
      <div className="relative min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="fixed inset-0 w-full h-full pointer-events-none" style={{ height: '100vh', minHeight: '100%' }}>
          <SparklesCore
            id="tsparticlescolorful"
            background="transparent"
            minSize={0.6}
            maxSize={1.4}
            particleDensity={100}
            className="w-full h-full"
            particleColor="#6366f1"
            speed={0.5}
          />
        </div>
        <div className="relative z-10">
          <Header user={user} />
          <main>
            <HeroSection user={user} />
            <FeaturesSectionWithHoverEffects />
            <section id="pricing" className="container mx-auto px-4 py-16">
              <Pricing plans={demoPlans} />
            </section>
          </main>
        </div>
      </div>
    )
  }

  // Dynamic particle color based on theme
  const particleColor = theme === 'dark' ? '#6366f1' : '#3b82f6'

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="fixed inset-0 w-full h-full pointer-events-none" style={{ height: '100vh', minHeight: '100%' }}>
        <SparklesCore
          id="tsparticlescolorful"
          background="transparent"
          minSize={0.6}
          maxSize={1.4}
          particleDensity={50}
          className="w-full h-full"
          particleColor={particleColor}
          speed={0.5}
        />
      </div>
      <div className="relative z-10">
        <Header user={user} />
        <main>
          <HeroSection user={user} />
          <FeaturesSectionWithHoverEffects />
          <section id="pricing" className="container mx-auto px-4 py-16">
            <Pricing plans={demoPlans} />
          </section>
        </main>
      </div>
    </div>
  )
} 