import { createClient } from '@/lib/supabase-server'
import { notFound, redirect } from 'next/navigation'
import { Monitor, MonitoringHistory, ResponseTimeTrend, UptimeStats, HourlyMonitorData } from '@/lib/supabase-types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import Link from 'next/link'
import { ArrowLeft, ExternalLink, Activity, Clock, Zap, AlertCircle, CheckCircle, XCircle } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { StaticBackground } from '@/components/layout/static-background'
import MonitorOverviewCards from '@/components/dashboard/monitor/monitor-overview-cards'
import IncidentHistory from '@/components/dashboard/alerts/incident-history'
import MonitorSettings from '@/components/dashboard/monitor/monitor-settings'
import MonitorChartWrapper from '@/components/dashboard/monitor/monitor-chart-wrapper'

interface MonitorPageProps {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function MonitorPage({ params }: MonitorPageProps) {
  const { id } = await params;
  const supabase = await createClient()

  // Check authentication
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get the current monitor
  const { data: monitor, error: monitorError } = await supabase
    .from('monitors')
    .select('*')
    .eq('id', id)
    .single()

  if (monitorError || !monitor) {
    notFound()
  }

  // Initial data fetch for the last 24 hours
  const [
    { data: responseTrend },
    { data: hourlyData },
    { data: uptimeStatsResult }
  ] = await Promise.all([
    supabase.rpc('get_response_time_trend', { p_monitor_id: id, p_hours: 24 }),
    supabase.rpc('get_hourly_monitor_data', { p_monitor_id: id, p_hours: 24 }),
    supabase.rpc('get_uptime_stats', { p_monitor_id: id, p_hours: 24 })
  ]);

  const stats = uptimeStatsResult?.[0] || {
    total_checks: 0,
    successful_checks: 0,
    failed_checks: 0,
    timeout_checks: 0,
    uptime_percentage: 0,
    avg_response_time: 0
  }

  const initialData = {
    responseTrend: responseTrend || [],
    hourlyData: hourlyData || [],
    stats: stats
  }

  // Get monitoring history for incidents tab (last 7 days)
  const { data: history } = await supabase
    .from('monitoring_history')
    .select('*')
    .eq('monitor_id', id)
    .gte('checked_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    .order('checked_at', { ascending: false })
    .limit(100)

  const getStatusIcon = (status: Monitor['status']) => {
    switch (status) {
      case 'up':
        return <CheckCircle className="h-4 w-4 text-success" />
      case 'down':
        return <XCircle className="h-4 w-4 text-destructive" />
      case 'timeout':
        return <Clock className="h-4 w-4 text-warning" />
      default:
        return <AlertCircle className="h-4 w-4 text-muted-foreground" />
    }
  }

  const getStatusBadge = (status: Monitor['status']) => {
    switch (status) {
      case 'up':
        return <Badge className="bg-success/10 text-success border-success/20">Online</Badge>
      case 'down':
        return <Badge variant="destructive">Offline</Badge>
      case 'timeout':
        return <Badge className="bg-warning/10 text-warning border-warning/20">Timeout</Badge>
      case 'pending':
        return <Badge className="bg-info/10 text-info border-info/20">Pending</Badge>
      default:
        return <Badge variant="secondary">Unknown</Badge>
    }
  }

  return (
    <div className="relative min-h-screen">
      <StaticBackground />
      <div className="relative z-10">
        <Header user={user} />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-transparent">
            <div className="container mx-auto px-4 py-8 max-w-7xl">
              {/* Header */}
              <div className="flex items-center gap-4 mb-8">
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/dashboard" className="flex items-center gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    Back to Dashboard
                  </Link>
                </Button>
              </div>

              {/* Monitor Header */}
              <div className="mb-8">
                <div className="flex items-start justify-between mb-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(monitor.status)}
                      <h1 className="text-3xl font-bold text-foreground">{monitor.name}</h1>
                      {!monitor.is_active && (
                        <Badge variant="outline" className="text-sm px-3 py-1 text-muted-foreground border-muted-foreground/20">
                          Disabled
                        </Badge>
                      )}
                      {getStatusBadge(monitor.status)}
                    </div>
                    <div className="flex items-center gap-4 text-muted-foreground">
                      <span className="flex items-center gap-2">
                        <ExternalLink className="h-4 w-4" />
                        <a
                          href={monitor.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-primary transition-colors"
                        >
                          {monitor.url}
                        </a>
                      </span>
                      <span className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Checked every {monitor.interval_minutes} minutes
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">Last checked</div>
                    <div className="font-medium">
                      {monitor.last_checked_at
                        ? new Date(monitor.last_checked_at).toLocaleString()
                        : 'Never'
                      }
                    </div>
                  </div>
                </div>

                {monitor.status === 'down' && (
                  <Alert className="border-destructive/50 bg-destructive/5">
                    <AlertCircle className="h-4 w-4 text-destructive" />
                    <AlertDescription className="text-destructive">
                      This monitor is currently down. Our system is actively checking for recovery.
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              {/* Overview Cards */}
              <MonitorOverviewCards
                monitor={monitor}
                stats={initialData.stats}
                responseTrend={initialData.responseTrend}
              />

              {/* Main Content Tabs */}
              <Tabs defaultValue="overview" className="mt-8">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="overview" className="flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    Overview
                  </TabsTrigger>
                  <TabsTrigger value="response" className="flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    Response Time
                  </TabsTrigger>
                  <TabsTrigger value="uptime" className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Uptime
                  </TabsTrigger>
                  <TabsTrigger value="incidents" className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Incidents
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="mt-6">
                  <div className="grid gap-6 lg:grid-cols-2">
                    <MonitorChartWrapper
                      monitorId={monitor.id}
                      initialData={{
                        responseTrend: initialData.responseTrend,
                        hourlyData: initialData.hourlyData,
                        stats: initialData.stats
                      }}
                      title="Response Time Trend"
                      chartType="response-time"
                    />
                    <MonitorChartWrapper
                      monitorId={monitor.id}
                      initialData={{
                        responseTrend: initialData.responseTrend,
                        hourlyData: initialData.hourlyData,
                        stats: initialData.stats
                      }}
                      title="Uptime Overview"
                      chartType="uptime"
                    />
                  </div>
                </TabsContent>

                <TabsContent value="response" className="mt-6">
                  <MonitorChartWrapper
                    monitorId={monitor.id}
                    initialData={{
                      responseTrend: initialData.responseTrend,
                      hourlyData: initialData.hourlyData,
                      stats: initialData.stats
                    }}
                    title="Detailed Response Time Analysis"
                    chartType="response-time"
                    detailed={true}
                  />
                </TabsContent>

                <TabsContent value="uptime" className="mt-6">
                  <MonitorChartWrapper
                    monitorId={monitor.id}
                    initialData={{
                      responseTrend: initialData.responseTrend,
                      hourlyData: initialData.hourlyData,
                      stats: initialData.stats
                    }}
                    title="Detailed Uptime Analysis"
                    chartType="uptime"
                    detailed={true}
                  />
                </TabsContent>

                <TabsContent value="incidents" className="mt-6">
                  <IncidentHistory
                    history={history || []}
                    monitorName={monitor.name}
                  />
                </TabsContent>
              </Tabs>

              {/* Monitor Settings */}
              <div className="mt-12">
                <MonitorSettings monitor={monitor} />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
} 