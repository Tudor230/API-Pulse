"use client"

import { Header } from "@/components/layout/header"
import { HeroSection } from "@/components/landing/hero-section"
import { FeaturesSectionWithHoverEffects } from "@/components/landing/feature-section"
import { Pricing } from "@/components/landing/pricing"
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
      "One notification channel",
      "Only email alerts",
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
      "Up to 5 notification channels",
      "Advanced analytics",
      "Email, SMS & Webhook alerts",
      "Priority support",
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
      "Unlimited notification channels",
      "Custom solutions",
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
  const [userLoaded, setUserLoaded] = useState(false)

  useEffect(() => {
    setMounted(true)
    const supabase = createClient()

    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      setUserLoaded(true)
    }

    getUser()

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Prevent hydration mismatch and ensure everything is loaded before rendering
  if (!mounted || !userLoaded) {
    return (
      <div className="relative min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-300">Loading...</p>
        </div>
      </div>
    )
  }

  // Dynamic particle color based on theme
  const particleColor = theme === 'dark' ? '#6366f1' : '#3b82f6'

  // Debug log to see current user state
  console.log('Current user state in HomePage:', user)

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