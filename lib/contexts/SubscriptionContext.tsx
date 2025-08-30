"use client"

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback
} from 'react'
import { createClient } from '@/lib/supabase-client'
import {
  UserSubscription,
  PlanLimits,
  SubscriptionUsage,
  AlertType
} from '@/lib/supabase-types'

interface SubscriptionData {
  subscription: UserSubscription | null
  planLimits: PlanLimits | null
  usage: SubscriptionUsage | null
  currentUsage: {
    monitorCount: number
    notificationChannelsCount: number
  }
}

interface SubscriptionContextType {
  data: SubscriptionData | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  canCreateMonitor: () => Promise<boolean>
  canUseInterval: (intervalMinutes: number) => Promise<boolean>
  canCreateNotificationChannel: (type: AlertType) => Promise<boolean>
  canAccessTimeframe: (timeframe: string) => Promise<boolean>
  isFreePlan: boolean
  isProPlan: boolean
  getAllowedIntervals: () => number[]
  getAllowedNotificationTypes: () => AlertType[]
  getAllowedTimeframes: () => string[]
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined)

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<SubscriptionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)
  
  const supabase = createClient()

  const fetchSubscriptionData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/subscription')
      if (!response.ok) {
        // If unauthorized, don't set it as an error - user might not be fully authenticated yet
        if (response.status === 401) {
          console.log('User not authenticated yet, skipping subscription fetch')
          return
        }
        throw new Error('Failed to fetch subscription data')
      }

      const subscriptionData = await response.json()
      setData(subscriptionData)
    } catch (err) {
      // Only set error for non-auth related issues
      if (err instanceof Error && !err.message.includes('401') && !err.message.includes('Unauthorized')) {
        setError(err.message)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  const checkLimit = async (type: string, value?: any): Promise<boolean> => {
    try {
      const response = await fetch('/api/subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'check_limits',
          type,
          value
        })
      })

      if (!response.ok) {
        return false
      }

      const result = await response.json()
      return result.canPerformAction
    } catch (error) {
      console.error('Error checking subscription limit:', error)
      return false
    }
  }

  const canCreateMonitor = () => checkLimit('create_monitor')
  const canUseInterval = (intervalMinutes: number) => checkLimit('use_interval', intervalMinutes)
  const canCreateNotificationChannel = (type: AlertType) => checkLimit('create_notification_channel', type)
  const canAccessTimeframe = (timeframe: string) => checkLimit('access_timeframe', timeframe)

  // Listen for auth state changes
  useEffect(() => {
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user || null)
      
      if (session?.user) {
        await fetchSubscriptionData()
      } else {
        setLoading(false)
      }
    }

    getInitialSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user || null)
      
      if (session?.user && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
        // Add a small delay to ensure session is fully established
        setTimeout(async () => {
          await fetchSubscriptionData()
        }, 100)
      } else if (event === 'SIGNED_OUT') {
        // Clear subscription data when user signs out
        setData(null)
        setError(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [fetchSubscriptionData, supabase.auth])

  const isFreePlan = data?.subscription?.plan === 'free' || !data?.subscription
  const isProPlan = data?.subscription?.plan === 'pro' && data?.subscription?.status === 'active'

  const getAllowedIntervals = (): number[] => {
    return data?.planLimits?.allowed_intervals || [30, 60]
  }

  const getAllowedNotificationTypes = (): AlertType[] => {
    return data?.planLimits?.allowed_notification_types || ['email']
  }

  const getAllowedTimeframes = (): string[] => {
    return data?.planLimits?.allowed_chart_timeframes || ['1h', '6h']
  }

  const value = {
    data,
    loading,
    error,
    refetch: fetchSubscriptionData,
    canCreateMonitor,
    canUseInterval,
    canCreateNotificationChannel,
    canAccessTimeframe,
    isFreePlan,
    isProPlan,
    getAllowedIntervals,
    getAllowedNotificationTypes,
    getAllowedTimeframes
  }

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  )
}

export function useSubscription() {
  const context = useContext(SubscriptionContext)
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider')
  }
  return context
}
