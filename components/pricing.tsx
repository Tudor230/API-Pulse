'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getStripe } from '@/lib/stripe-client'
import { STRIPE_PRICE_IDS } from '@/lib/stripe-price-ids'
import { useSubscription } from '@/lib/hooks/use-subscription'
import { Check, X, Zap, Clock, BarChart3, Bell, Shield, Headphones } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useTheme } from 'next-themes'

interface PricingCardProps {
    title: string
    price: string
    description: string
    features: { name: string; included: boolean }[]
    buttonText: string
    buttonVariant?: 'default' | 'outline'
    popular?: boolean
    onUpgrade?: () => void
    disabled?: boolean
    testMode?: boolean
}

function PricingCard({
    title,
    price,
    description,
    features,
    buttonText,
    buttonVariant = 'default',
    popular = false,
    onUpgrade,
    disabled = false,
    testMode = false
}: PricingCardProps) {
    return (
        <Card className={`relative ${popular ? 'border-primary shadow-lg scale-105' : ''}`}>
            {popular && (
                <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-primary">
                    Most Popular
                </Badge>
            )}
            {testMode && (
                <Badge variant="outline" className="absolute -top-2 right-4 bg-warning text-warning-foreground">
                    Test Mode
                </Badge>
            )}
            <CardHeader className="text-center">
                <CardTitle className="text-2xl">{title}</CardTitle>
                <div className="text-4xl font-bold">{price}</div>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <ul className="space-y-3">
                    {features.map((feature, index) => (
                        <li key={index} className="flex items-center gap-3">
                            {feature.included ? (
                                <Check className="h-5 w-5 text-success" />
                            ) : (
                                <X className="h-5 w-5 text-muted-foreground" />
                            )}
                            <span className={feature.included ? '' : 'text-muted-foreground'}>
                                {feature.name}
                            </span>
                        </li>
                    ))}
                </ul>
                <Button
                    className="w-full"
                    variant={buttonVariant}
                    onClick={onUpgrade}
                    disabled={disabled}
                >
                    {buttonText}
                </Button>
            </CardContent>
        </Card>
    )
}

export default function PricingComponent() {
    const { data, isFreePlan, isProPlan, loading } = useSubscription()
    const { theme, resolvedTheme } = useTheme()
    const [loadingUpgrade, setLoadingUpgrade] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleUpgrade = async (priceId: string, plan: string) => {
        setLoadingUpgrade(true)
        setError(null)

        try {
            const currentTheme = resolvedTheme || theme || 'light'

            const response = await fetch('/api/stripe/create-checkout-session', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    priceId,
                    plan,
                    theme: currentTheme,
                }),
            })

            if (!response.ok) {
                throw new Error('Failed to create checkout session')
            }

            const { sessionId, url, isTestMode } = await response.json()

            if (url) {
                window.location.href = url
            } else {
                const stripe = await getStripe()
                const { error } = await stripe!.redirectToCheckout({ sessionId })

                if (error) {
                    throw new Error(error.message)
                }
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong')
        } finally {
            setLoadingUpgrade(false)
        }
    }

    const isTestMode = process.env.NODE_ENV !== 'production' ||
        process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.includes('pk_test_')

    const freePlanFeatures = [
        { name: 'Up to 3 monitors', included: true },
        { name: '30 & 60 minute intervals', included: true },
        { name: '1 & 6 hour chart views', included: true },
        { name: 'Email notifications', included: true },
        { name: '1-minute intervals', included: false },
        { name: 'Extended chart views (24h, 7d, 30d)', included: false },
        { name: 'SMS & Webhook notifications', included: false },
        { name: 'Unlimited monitors', included: false },
        { name: 'Priority support', included: false },
    ]

    const proPlanFeatures = [
        { name: 'Unlimited monitors', included: true },
        { name: '1, 5, 10, 15, 30, 60 minute intervals', included: true },
        { name: 'All chart views (1h, 6h, 24h, 7d, 30d)', included: true },
        { name: 'Email, SMS & Webhook notifications', included: true },
        { name: 'Priority support', included: true },
        { name: 'Advanced analytics', included: true },
        { name: 'Custom alerts', included: true },
        { name: 'API access', included: true },
    ]

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        )
    }

    return (
        <div className="space-y-8">
            {isTestMode && (
                <Alert>
                    <Zap className="h-4 w-4" />
                    <AlertDescription>
                        <strong>Test Mode:</strong> This is a test environment. No real payments will be processed.
                        Use test card number 4242 4242 4242 4242 for testing.
                    </AlertDescription>
                </Alert>
            )}

            {error && (
                <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            <div className="text-center space-y-4">
                <h2 className="text-3xl font-bold">Choose Your Plan</h2>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                    Start with our free plan and upgrade when you need more powerful monitoring capabilities.
                </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                <PricingCard
                    title="Free"
                    price="$0"
                    description="Perfect for getting started with API monitoring"
                    features={freePlanFeatures}
                    buttonText={isFreePlan ? "Current Plan" : "Downgrade to Free"}
                    buttonVariant="outline"
                    disabled={isFreePlan}
                    testMode={isTestMode}
                />

                <PricingCard
                    title="Pro"
                    price="$19/month"
                    description="Advanced monitoring for professional applications"
                    features={proPlanFeatures}
                    buttonText={isProPlan ? "Current Plan" : loadingUpgrade ? "Processing..." : "Upgrade to Pro"}
                    popular={true}
                    onUpgrade={() => handleUpgrade(STRIPE_PRICE_IDS.pro_monthly, 'pro')}
                    disabled={isProPlan || loadingUpgrade}
                    testMode={isTestMode}
                />
            </div>

            <div className="text-center space-y-4 pt-8">
                <h3 className="text-xl font-semibold">Feature Comparison</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                    <div className="space-y-2">
                        <Clock className="h-8 w-8 mx-auto text-primary" />
                        <h4 className="font-medium">Monitoring Intervals</h4>
                        <p className="text-sm text-muted-foreground">
                            Free: 30 & 60 minutes<br />
                            Pro: 1, 5, 10, 15, 30, 60 minutes
                        </p>
                    </div>
                    <div className="space-y-2">
                        <BarChart3 className="h-8 w-8 mx-auto text-primary" />
                        <h4 className="font-medium">Chart Views</h4>
                        <p className="text-sm text-muted-foreground">
                            Free: 1 & 6 hours<br />
                            Pro: 1h, 6h, 24h, 7d, 30d
                        </p>
                    </div>
                    <div className="space-y-2">
                        <Bell className="h-8 w-8 mx-auto text-primary" />
                        <h4 className="font-medium">Notifications</h4>
                        <p className="text-sm text-muted-foreground">
                            Free: Email only<br />
                            Pro: Email, SMS, Webhooks
                        </p>
                    </div>
                </div>
            </div>

            <div className="text-center text-sm text-muted-foreground">
                <p>
                    Need help choosing? {' '}
                    <a href="mailto:support@apipulse.com" className="text-primary hover:underline">
                        Contact our support team
                    </a>
                </p>
            </div>
        </div>
    )
}
