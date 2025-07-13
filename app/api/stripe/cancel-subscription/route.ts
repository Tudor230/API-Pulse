import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { stripe } from '@/lib/stripe'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        // Get current subscription
        const { data: subscription, error } = await supabase
            .from('user_subscriptions')
            .select('stripe_subscription_id, plan, status')
            .eq('user_id', user.id)
            .single()

        if (error || !subscription?.stripe_subscription_id) {
            return NextResponse.json({ error: 'No active subscription found' }, { status: 400 })
        }

        if (subscription.plan === 'free') {
            return NextResponse.json({ error: 'Already on free plan' }, { status: 400 })
        }

        // Cancel the subscription at period end
        const stripeSubscription = await stripe.subscriptions.update(
            subscription.stripe_subscription_id,
            {
                cancel_at_period_end: true,
                metadata: {
                    user_id: user.id,
                    cancelled_by: 'user',
                },
            }
        )

        // Update subscription in database
        await supabase
            .from('user_subscriptions')
            .update({
                cancelled_at: new Date().toISOString(),
            })
            .eq('user_id', user.id)

        logger.info(`Subscription cancelled for user ${user.id}`, {
            component: 'stripe-cancel',
            userId: user.id,
            subscriptionId: subscription.stripe_subscription_id,
        })

        return NextResponse.json({
            success: true,
            message: 'Subscription will be cancelled at the end of the current billing period'
        })

    } catch (error) {
        logger.apiError('POST', '/api/stripe/cancel-subscription', error, user?.id)
        console.error('Stripe subscription cancellation failed:', error)
        return NextResponse.json({ error: 'Failed to cancel subscription' }, { status: 500 })
    }
}
