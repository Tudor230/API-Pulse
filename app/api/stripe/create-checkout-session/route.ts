import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { stripe, isTestMode } from '@/lib/stripe'
import { STRIPE_PRICE_IDS } from '@/lib/stripe-price-ids'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const body = await request.json()
        const { priceId, plan, theme } = body

        // Validate price ID
        if (!Object.values(STRIPE_PRICE_IDS).includes(priceId)) {
            return NextResponse.json({ error: 'Invalid price ID' }, { status: 400 })
        }

        // Get or create Stripe customer
        let customerId: string

        const { data: subscription } = await supabase
            .from('user_subscriptions')
            .select('stripe_customer_id')
            .eq('user_id', user.id)
            .single()

        if (subscription?.stripe_customer_id) {
            customerId = subscription.stripe_customer_id
        } else {
            // Create new Stripe customer
            const customer = await stripe.customers.create({
                email: user.email,
                metadata: {
                    user_id: user.id,
                },
            })
            customerId = customer.id

            // Update subscription with customer ID
            await supabase
                .from('user_subscriptions')
                .update({ stripe_customer_id: customerId })
                .eq('user_id', user.id)
        }

        // Get the base URL with fallback
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

        // Determine theme settings
        const isDarkMode = theme === 'dark'

        // Create checkout session
        const session = await stripe.checkout.sessions.create({
            customer: customerId,
            payment_method_types: ['card'],
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            mode: 'subscription',
            success_url: `${baseUrl}/dashboard?success=true`,
            cancel_url: `${baseUrl}/dashboard?canceled=true`,
            metadata: {
                user_id: user.id,
                plan: plan,
            },
            allow_promotion_codes: true,
            billing_address_collection: 'required',
            automatic_tax: {
                enabled: false, // Enable this in production if needed
            },
            ui_mode: 'hosted',
            custom_text: {
                submit: {
                    message: `🚀 ${isDarkMode ? '✨' : '🌟'} Start your ${plan} subscription and begin monitoring your APIs!`
                }
            },
        })

        return NextResponse.json({
            sessionId: session.id,
            url: session.url,
            isTestMode
        })
    } catch (error) {
        logger.apiError('POST', '/api/stripe/create-checkout-session', error, user?.id)
        console.error('Stripe checkout session creation failed:', error)
        return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
    }
}
