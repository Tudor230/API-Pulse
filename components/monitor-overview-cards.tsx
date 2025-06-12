"use client"

import { Monitor, UptimeStats, ResponseTimeTrend } from '@/lib/supabase-types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Activity, Clock, Zap, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2 } from 'lucide-react'

interface MonitorOverviewCardsProps {
  monitor: Monitor
  stats: UptimeStats
  responseTrend: ResponseTimeTrend[]
}

export default function MonitorOverviewCards({ monitor, stats, responseTrend }: MonitorOverviewCardsProps) {
  // Ensure avg_response_time is never null
  const safeAvgResponseTime = stats.avg_response_time ?? 0

  // Calculate trend for response time
  const getResponseTimeTrend = () => {
    if (responseTrend.length < 2) return null
    
    // Split data into two equal halves
    const midPoint = Math.floor(responseTrend.length / 2)
    const recent = responseTrend.slice(0, midPoint)
    const older = responseTrend.slice(midPoint)
    
    const recentAvg = recent.reduce((sum, item) => sum + (item.response_time || 0), 0) / recent.length
    const olderAvg = older.reduce((sum, item) => sum + (item.response_time || 0), 0) / older.length
    
    // For response times, a negative change is improvement (faster response)
    const percentChange = olderAvg > 0 ? ((recentAvg - olderAvg) / olderAvg) * 100 : 0
    
    return {
      isImproving: percentChange < 0, // Negative change means improvement
      change: Math.abs(percentChange)
    }
  }

  const responseTrend_calc = getResponseTimeTrend()

  const formatUptime = (percentage: number) => {
    return percentage.toFixed(2) + '%'
  }

  const formatResponseTime = (ms: number) => {
    if (ms < 1000) return `${Math.round(ms)}ms`
    return `${(ms / 1000).toFixed(2)}s`
  }

  const getUptimeColor = (percentage: number) => {
    if (percentage >= 99.9) return 'text-success'
    if (percentage >= 95) return 'text-warning'
    return 'text-destructive'
  }

  const getResponseTimeColor = (ms: number) => {
    if (ms <= 500) return 'text-success'
    if (ms <= 1000) return 'text-warning'
    return 'text-destructive'
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      {/* Current Status */}
      <Card className="border-l-4 border-l-primary">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Current Status</CardTitle>
          {monitor.status === 'up' ? (
            <CheckCircle2 className="h-4 w-4 text-success" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-destructive" />
          )}
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-2">
            <div className="text-2xl font-bold">
              {monitor.status === 'up' ? 'Online' : 'Offline'}
            </div>
            <Badge 
              className={
                monitor.status === 'up' 
                  ? 'bg-success/10 text-success border-success/20' 
                  : 'bg-destructive/10 text-destructive border-destructive/20'
              }
            >
              {monitor.status.toUpperCase()}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {monitor.last_checked_at 
              ? `Last checked ${new Date(monitor.last_checked_at).toLocaleTimeString()}`
              : 'Never checked'
            }
          </p>
        </CardContent>
      </Card>

      {/* Uptime */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">24h Uptime</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            <span className={getUptimeColor(stats.uptime_percentage)}>
              {formatUptime(stats.uptime_percentage)}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            {stats.successful_checks} of {stats.total_checks} checks successful
          </p>
        </CardContent>
      </Card>

      {/* Average Response Time */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <div className="text-2xl font-bold">
              <span className={getResponseTimeColor(safeAvgResponseTime)}>
                {formatResponseTime(safeAvgResponseTime)}
              </span>
            </div>
            {responseTrend_calc && (
              <div className="flex items-center gap-1">
                {responseTrend_calc.isImproving ? (
                  <TrendingDown className="h-4 w-4 text-success" />
                ) : (
                  <TrendingUp className="h-4 w-4 text-destructive" />
                )}
                <span className={`text-xs ${responseTrend_calc.isImproving ? 'text-success' : 'text-destructive'}`}>
                  {responseTrend_calc.change.toFixed(1)}%
                </span>
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Over last 24 hours
          </p>
        </CardContent>
      </Card>

      {/* Incidents */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">24h Incidents</CardTitle>
          <Zap className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            <span className={stats.failed_checks > 0 ? 'text-destructive' : 'text-success'}>
              {stats.failed_checks + stats.timeout_checks}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            {stats.failed_checks} failed, {stats.timeout_checks} timeouts
          </p>
        </CardContent>
      </Card>
    </div>
  )
} 