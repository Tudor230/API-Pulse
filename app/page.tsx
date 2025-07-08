import { Header } from "@/components/layout/header"
import { HeroSection } from "@/components/landing/hero-section"
import { FeaturesSection } from "@/components/landing/features-section"
import { Pricing } from "@/components/landing/pricing"
import { AnimatedBackground } from "@/components/layout/animated-background"
import { createClient } from '@/lib/supabase-server'

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
      "Limited API access",
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
    price: "9.99",
    yearlyPrice: "99.99",
    period: "per month",
    features: [
      "Unlimited monitors",
      "Advanced analytics",
      "24-hour support response time",
      "Full API access",
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
    price: "299",
    yearlyPrice: "239",
    period: "per month",
    features: [
      "Everything in Professional",
      "Custom solutions",
      "Dedicated account manager",
      "1-hour support response time",
      "SSO Authentication",
      "Advanced security",
      "Custom contracts",
      "SLA agreement",
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
            <Pricing plans={demoPlans} />
          </section>
        </main>
      </div>
    </div>
  )
} 