import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase-admin'
import { logger } from '@/lib/logger'
import Stripe from 'stripe'

const supabase = createAdminClient()

export async function POST(request: NextRequest) {
    const body = await request.text()
    const sig = request.headers.get('stripe-signature')

    if (!sig) {
        return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
    }

    let event: Stripe.Event

    try {
        event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
    } catch (err) {
        logger.apiError('POST', '/api/stripe/webhook', err)
        return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    try {
        switch (event.type) {
            case 'checkout.session.completed':
                await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session)
                break

            case 'customer.subscription.created':
                await handleSubscriptionCreated(event.data.object as Stripe.Subscription)
                break

            case 'customer.subscription.updated':
                await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
                break

            case 'customer.subscription.deleted':
                await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
                break

            case 'invoice.payment_succeeded':
                await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice)
                break

            case 'invoice.payment_failed':
                await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice)
                break

            default:
                console.log(`Unhandled event type: ${event.type}`)
        }

        return NextResponse.json({ received: true })
    } catch (error) {
        logger.apiError('POST', '/api/stripe/webhook', error)
        return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
    }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
    const userId = session.metadata?.user_id
    const plan = session.metadata?.plan || 'pro'

    if (!userId || !session.subscription) {
        throw new Error('Missing required session data')
    }

    // Get the subscription from Stripe
    const subscription = await stripe.subscriptions.retrieve(session.subscription as string, {
        expand: ['items.data.price']
    })

    const item = subscription.items.data[0]
    const periodStart = new Date(item.current_period_start * 1000).toISOString()
    const periodEnd = new Date(item.current_period_end * 1000).toISOString()

    // Update user subscription in database
    await supabase
        .from('user_subscriptions')
        .update({
            plan: plan as 'free' | 'pro',
            status: 'active',
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: subscription.id,
            stripe_price_id: subscription.items.data[0].price.id,
            current_period_start: periodStart,
            current_period_end: periodEnd,
            updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)

    console.log(`Subscription activated for user ${userId}`)
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
    // Find user by customer ID
    const { data: userSubscription } = await supabase
        .from('user_subscriptions')
        .select('user_id')
        .eq('stripe_customer_id', subscription.customer as string)
        .single()

    if (!userSubscription) {
        console.log(`No user found for customer ${subscription.customer} - subscription might be created before checkout completion`)
        return
    }

    // Get period information from the subscription items
    const item = subscription.items.data[0]
    const periodStart = new Date(item.current_period_start * 1000).toISOString()
    const periodEnd = new Date(item.current_period_end * 1000).toISOString()

    // Update subscription with full details
    await supabase
        .from('user_subscriptions')
        .update({
            status: subscription.status as 'active' | 'canceled' | 'past_due' | 'trialing' | 'incomplete',
            stripe_subscription_id: subscription.id,
            stripe_price_id: subscription.items.data[0].price.id,
            current_period_start: periodStart,
            current_period_end: periodEnd,
            updated_at: new Date().toISOString(),
            canceled_at: null
        })
        .eq('user_id', userSubscription.user_id)

    console.log(`Subscription created for user ${userSubscription.user_id}`)
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
    // Find user by customer ID
    const { data: userSubscription } = await supabase
        .from('user_subscriptions')
        .select('user_id')
        .eq('stripe_customer_id', subscription.customer as string)
        .single()

    if (!userSubscription) {
        throw new Error(`No user found for customer ${subscription.customer}`)
    }

    const item = subscription.items.data[0]
    const periodStart = new Date(item.current_period_start * 1000).toISOString()
    const periodEnd = new Date(item.current_period_end * 1000).toISOString()
    // Update subscription status
    await supabase
        .from('user_subscriptions')
        .update({
            status: subscription.status as 'active' | 'canceled' | 'past_due' | 'trialing' | 'incomplete',
            current_period_start: periodStart,
            current_period_end: periodEnd,
            updated_at: new Date().toISOString()
        })
        .eq('user_id', userSubscription.user_id)

    console.log(`Subscription updated for user ${userSubscription.user_id}`)
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    // Find user by customer ID
    const { data: userSubscription } = await supabase
        .from('user_subscriptions')
        .select('user_id')
        .eq('stripe_customer_id', subscription.customer as string)
        .single()

    if (!userSubscription) {
        throw new Error(`No user found for customer ${subscription.customer}`)
    }

    // Downgrade to free plan
    await supabase
        .from('user_subscriptions')
        .update({
            plan: 'free',
            status: 'canceled',
            canceled_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        })
        .eq('user_id', userSubscription.user_id)

    console.log(`Subscription canceled for user ${userSubscription.user_id}`)
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
    // Update subscription status to active if it was past_due
    // Note: invoice.subscription exists but might not be in the TypeScript interface
    const subscriptionId = (invoice as Stripe.Invoice & { subscription?: string }).subscription
    if (subscriptionId) {
        const { data: userSubscription } = await supabase
            .from('user_subscriptions')
            .select('user_id')
            .eq('stripe_subscription_id', subscriptionId)
            .single()

        if (userSubscription) {
            await supabase
                .from('user_subscriptions')
                .update({
                    status: 'active',
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', userSubscription.user_id)

            console.log(`Payment succeeded for user ${userSubscription.user_id}`)
        }
    }
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
    // Update subscription status to past_due
    const subscriptionId = (invoice as Stripe.Invoice & { subscription?: string }).subscription
    if (subscriptionId) {
        const { data: userSubscription } = await supabase
            .from('user_subscriptions')
            .select('user_id')
            .eq('stripe_subscription_id', subscriptionId)
            .single()

        if (userSubscription) {
            await supabase
                .from('user_subscriptions')
                .update({
                    status: 'past_due',
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', userSubscription.user_id)

            console.log(`Payment failed for user ${userSubscription.user_id}`)
        }
    }
}
