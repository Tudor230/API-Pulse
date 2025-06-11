import { Header } from "@/components/header"
import { HeroSection } from "@/components/hero-section"
import { FeaturesSection } from "@/components/features-section"
import { createClient } from '@/lib/supabase-server'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary/20 via-secondary/5 to-muted/30">
      <Header user={user} />
      <main>
        <HeroSection user={user} />
        <FeaturesSection />
      </main>
    </div>
  )
} 