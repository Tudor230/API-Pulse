import { Header } from "@/components/layout/header"
import PricingComponent from "@/components/landing/pricing"
import { AnimatedBackground } from "@/components/layout/animated-background"
import { createClient } from '@/lib/supabase-server'

export default async function PricingPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    return (
        <div className="relative min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
            <AnimatedBackground />
            <div className="relative z-10">
                <Header user={user} />
                <main className="container mx-auto px-4 py-16">
                    <PricingComponent />
                </main>
            </div>
        </div>
    )
}
