'use client'

import { useState } from 'react'
import { useSubscription } from '@/lib/contexts/SubscriptionContext'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Crown, Monitor, Bell, Clock, BarChart3, ChevronDown, ChevronUp, Check, X } from 'lucide-react'
import Link from 'next/link'

export function SubscriptionStatus() {
  const [showDetails, setShowDetails] = useState(false)
  const {
    data,
    loading,
    error,
    isFreePlan,
    isProPlan,
    getAllowedIntervals,
    getAllowedNotificationTypes,
    getAllowedTimeframes
  } = useSubscription()

  if (loading) {
    return (
      <Card className="p-6">
        <div className="space-y-4">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-red-500">
          Error loading subscription: {error}
        </div>
      </Card>
    )
  }

  if (!data) return null

  const { subscription, planLimits, currentUsage } = data
  const plan = subscription?.plan || 'free'

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Crown className={`h-5 w-5 ${isProPlan ? 'text-yellow-500' : 'text-gray-400'}`} />
          <h3 className="text-lg font-semibold">Current Plan</h3>
          <Badge variant={isProPlan ? 'default' : 'secondary'}>
            {plan.toUpperCase()}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {isFreePlan && (
            <Button size="sm" asChild>
              <Link href="/pricing">
                Upgrade to Pro
              </Link>
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center gap-1"
          >
            {showDetails ? (
              <>
                Hide Details
                <ChevronUp className="h-4 w-4" />
              </>
            ) : (
              <>
                Show Details
                <ChevronDown className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>

      {showDetails && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Monitors Usage */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Monitor className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">Monitors</span>
              </div>
              <div className="text-2xl font-bold">
                {currentUsage.monitorCount}
                {planLimits?.max_monitors === -1 ? (
                  <span className="text-sm text-gray-500 font-normal"> / Unlimited</span>
                ) : (
                  <span className="text-sm text-gray-500 font-normal"> / {planLimits?.max_monitors}</span>
                )}
              </div>
              {planLimits?.max_monitors !== -1 && (
                <div className="w-full bg-accent rounded-full h-2 ">
                  <div
                    className="bg-blue-500 h-2 rounded-full"
                    style={{
                      width: `${Math.min((currentUsage.monitorCount / (planLimits?.max_monitors || 1)) * 100, 100)}%`
                    }}
                  />
                </div>
              )}
            </div>

            {/* Notification Channels Usage */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">Channels</span>
              </div>
              <div className="text-2xl font-bold">
                {currentUsage.notificationChannelsCount}
                {planLimits?.max_notification_channels === -1 ? (
                  <span className="text-sm text-gray-500 font-normal"> / Unlimited</span>
                ) : (
                  <span className="text-sm text-gray-500 font-normal"> / {planLimits?.max_notification_channels}</span>
                )}
              </div>
              {planLimits?.max_notification_channels !== -1 && (
                <div className="w-full bg-accent rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full"
                    style={{
                      width: `${Math.min((currentUsage.notificationChannelsCount / (planLimits?.max_notification_channels || 1)) * 100, 100)}%`
                    }}
                  />
                </div>
              )}
            </div>

            {/* Check Intervals */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-purple-500" />
                <span className="text-sm font-medium">Intervals</span>
              </div>
              <div className="text-xs text-gray-600">
                {getAllowedIntervals().map(interval => (
                  <Badge key={interval} variant="outline" className="mr-1 mb-1">
                    {interval}m
                  </Badge>
                ))}
              </div>
            </div>

            {/* Analytics Timeframes */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-orange-500" />
                <span className="text-sm font-medium">Analytics</span>
              </div>
              <div className="text-xs text-gray-600">
                {getAllowedTimeframes().map(timeframe => (
                  <Badge key={timeframe} variant="outline" className="mr-1 mb-1">
                    {timeframe}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          {/* Plan Features */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-gray-700">Current Plan Features</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-2">
                {isProPlan ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <X className="w-4 h-4 text-red-500" />
                )}
                <span>Unlimited monitors</span>
              </div>
              <div className="flex items-center gap-2">
                {isProPlan ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <X className="w-4 h-4 text-red-500" />
                )}
                <span>All check intervals</span>
              </div>
              <div className="flex items-center gap-2">
                {isProPlan ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <X className="w-4 h-4 text-red-500" />
                )}
                <span>SMS & Webhook alerts</span>
              </div>
              <div className="flex items-center gap-2">
                {isProPlan ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <X className="w-4 h-4 text-red-500" />
                )}
                <span>Extended analytics</span>
              </div>
              <div className="flex items-center gap-2">
                {isProPlan ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <X className="w-4 h-4 text-red-500" />
                )}
                <span>Priority support</span>
              </div>
            </div>
          </div>

          {isFreePlan && (
            <div className="mt-4 p-4 bg-accent rounded-lg border border-primary/20">
              <div className="flex items-center justify-between">
                <div>
                  <h5 className="font-medium text-info">Upgrade to Pro</h5>
                  <p className="text-sm text-card-foreground">
                    Unlock unlimited monitors, all intervals, and advanced notifications
                  </p>
                </div>
                <Button size="sm" asChild>
                  <Link href="/pricing">
                    Upgrade Now
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </Card>
  )
}