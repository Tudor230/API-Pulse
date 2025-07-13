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
      <Card className="p-4 sm:p-6 backdrop-blur-xl bg-background/60 border-border/50">
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
      <Card className="p-4 sm:p-6 backdrop-blur-xl bg-background/60 border-border/50">
        <div className="text-destructive">
          Error loading subscription: {error}
        </div>
      </Card>
    )
  }

  if (!data) return null

  const { subscription, planLimits, currentUsage } = data
  const plan = subscription?.plan || 'free'

  return (
    <Card className="p-4 sm:p-6 backdrop-blur-xl bg-background/60 border-border/50">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center justify-between sm:justify-start gap-2">
          <div className="flex items-center gap-2">
            <Crown className={`h-5 w-5 ${isProPlan ? 'text-warning' : 'text-muted-foreground'}`} />
            <h3 className="text-lg font-semibold text-foreground">Current Plan</h3>
            <Badge variant={isProPlan ? 'default' : 'secondary'}>
              {plan.toUpperCase()}
            </Badge>
          </div>
          <Button
            variant="default"
            size="sm"
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center gap-1 hover:bg-primary/20 bg-primary/10 border border-primary/40 backdrop-blur-sm text-primary transition-all duration-200 shadow-sm sm:hidden"
          >
            {showDetails ? (
              <>
                <span>Hide</span>
                <ChevronUp className="h-4 w-4" />
              </>
            ) : (
              <>
                <span>Details</span>
                <ChevronDown className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
        <div className="hidden sm:flex items-center gap-2">
          {isFreePlan && (
            <Button size="sm" asChild>
              <Link href="/#pricing">
                Upgrade to Pro
              </Link>
            </Button>
          )}
          <Button
            variant="default"
            size="sm"
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center gap-1 hover:bg-primary/20 bg-primary/10 border border-primary/40 backdrop-blur-sm text-primary transition-all duration-200 shadow-sm"
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

      {/* Mobile upgrade button */}
      {isFreePlan && (
        <div className="mt-4 sm:hidden">
          <Button size="sm" asChild className="w-full">
            <Link href="/#pricing">
              Upgrade to Pro
            </Link>
          </Button>
        </div>
      )}

      {showDetails && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6 mb-6">
            {/* Monitors Usage */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Monitor className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-foreground">Monitors</span>
              </div>
              <div className="text-2xl font-bold text-foreground">
                {currentUsage.monitorCount}
                {planLimits?.max_monitors === -1 ? (
                  <span className="text-sm text-muted-foreground font-normal"> / Unlimited</span>
                ) : (
                  <span className="text-sm text-muted-foreground font-normal"> / {planLimits?.max_monitors}</span>
                )}
              </div>
              {planLimits?.max_monitors !== -1 && (
                <div className="w-full bg-accent rounded-full h-2 ">
                  <div
                    className="bg-primary h-2 rounded-full"
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
                <Bell className="h-4 w-4 text-success" />
                <span className="text-sm font-medium text-foreground">Channels</span>
              </div>
              <div className="text-2xl font-bold text-foreground">
                {currentUsage.notificationChannelsCount}
                {planLimits?.max_notification_channels === -1 ? (
                  <span className="text-sm text-muted-foreground font-normal"> / Unlimited</span>
                ) : (
                  <span className="text-sm text-muted-foreground font-normal"> / {planLimits?.max_notification_channels}</span>
                )}
              </div>
              {planLimits?.max_notification_channels !== -1 && (
                <div className="w-full bg-accent rounded-full h-2">
                  <div
                    className="bg-success h-2 rounded-full"
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
                <Clock className="h-4 w-4 text-info" />
                <span className="text-sm font-medium text-foreground">Intervals</span>
              </div>
              <div className="text-xs text-muted-foreground">
                <div className="flex flex-wrap gap-1">
                  {getAllowedIntervals().map(interval => (
                    <Badge key={interval} variant="outline" className="text-xs">
                      {interval}m
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            {/* Analytics Timeframes */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-warning" />
                <span className="text-sm font-medium text-foreground">Analytics</span>
              </div>
              <div className="text-xs text-muted-foreground">
                <div className="flex flex-wrap gap-1">
                  {getAllowedTimeframes().map(timeframe => (
                    <Badge key={timeframe} variant="outline" className="text-xs">
                      {timeframe}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Plan Features */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-foreground">Current Plan Features</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-2">
                {isProPlan ? (
                  <Check className="w-4 h-4 text-success flex-shrink-0" />
                ) : (
                  <X className="w-4 h-4 text-destructive flex-shrink-0" />
                )}
                <span className="text-foreground">Unlimited monitors</span>
              </div>
              <div className="flex items-center gap-2">
                {isProPlan ? (
                  <Check className="w-4 h-4 text-success flex-shrink-0" />
                ) : (
                  <X className="w-4 h-4 text-destructive flex-shrink-0" />
                )}
                <span className="text-foreground">All check intervals</span>
              </div>
              <div className="flex items-center gap-2">
                {isProPlan ? (
                  <Check className="w-4 h-4 text-success flex-shrink-0" />
                ) : (
                  <X className="w-4 h-4 text-destructive flex-shrink-0" />
                )}
                <span className="text-foreground">SMS & Webhook alerts</span>
              </div>
              <div className="flex items-center gap-2">
                {isProPlan ? (
                  <Check className="w-4 h-4 text-success flex-shrink-0" />
                ) : (
                  <X className="w-4 h-4 text-destructive flex-shrink-0" />
                )}
                <span className="text-foreground">Extended analytics</span>
              </div>
              <div className="flex items-center gap-2">
                {isProPlan ? (
                  <Check className="w-4 h-4 text-success flex-shrink-0" />
                ) : (
                  <X className="w-4 h-4 text-destructive flex-shrink-0" />
                )}
                <span className="text-foreground">Priority support</span>
              </div>
            </div>
          </div>

          {isFreePlan && (
            <div className="mt-4 p-4 bg-accent/20 rounded-lg border border-primary/20">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h5 className="font-medium text-info">Upgrade to Pro</h5>
                  <p className="text-sm text-card-foreground">
                    Unlock unlimited monitors, all intervals, and advanced notifications
                  </p>
                </div>
                <Button size="sm" asChild className="w-full sm:w-auto">
                  <Link href="/#pricing">
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