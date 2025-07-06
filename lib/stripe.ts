import Stripe from 'stripe'

if (!process.env.STRIPE_SECRET_KEY) {
    console.log('Stripe secret key:', process.env.STRIPE_SECRET_KEY)
    throw new Error('STRIPE_SECRET_KEY is not set')
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-06-30.basil',
    typescript: true,
})

export const isTestMode = process.env.STRIPE_SECRET_KEY?.includes('sk_test_')
