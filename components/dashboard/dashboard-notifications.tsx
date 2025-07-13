'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, AlertCircle, Info } from 'lucide-react'

export function DashboardNotifications() {
    const searchParams = useSearchParams()
    const [notification, setNotification] = useState<{
        type: 'success' | 'error' | 'info'
        message: string
    } | null>(null)

    useEffect(() => {
        if (searchParams.get('success') === 'true') {
            setNotification({
                type: 'success',
                message: 'Welcome to API Pulse Pro! Your subscription is now active and you have access to all premium features.',
            })
        } else if (searchParams.get('canceled') === 'true') {
            setNotification({
                type: 'error',
                message: 'Checkout was cancelled. No charges were made.',
            })
        } else if (searchParams.get('cancelled') === 'true') {
            setNotification({
                type: 'info',
                message: 'Your subscription has been cancelled. You\'ll continue to have access to Pro features until the end of your billing period.',
            })
        }

        // Auto-hide notification after 10 seconds
        if (notification) {
            const timer = setTimeout(() => {
                setNotification(null)
            }, 10000)
            return () => clearTimeout(timer)
        }
    }, [searchParams, notification])

    if (!notification) return null

    const getIcon = () => {
        switch (notification.type) {
            case 'success':
                return <CheckCircle className="h-4 w-4" />
            case 'error':
                return <AlertCircle className="h-4 w-4" />
            case 'info':
                return <Info className="h-4 w-4" />
        }
    }

    const getVariant = () => {
        switch (notification.type) {
            case 'error':
                return 'destructive' as const
            default:
                return 'default' as const
        }
    }

    return (
        <Alert variant={getVariant()} className="backdrop-blur-xl bg-background/60 border-border/50 mb-6">
            {getIcon()}
            <AlertDescription>{notification.message}</AlertDescription>
            <button
                onClick={() => setNotification(null)}
                className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
            >
                ×
            </button>
        </Alert>
    )
}
