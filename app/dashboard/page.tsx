import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import AddMonitorForm from '@/components/dashboard/monitor/add-monitor-form'
import MonitorsList from '@/components/dashboard/monitor/monitors-list'
import ResponseTimeAnalytics from '@/components/dashboard/monitor/response-time-analytics'
import { SubscriptionStatus } from '@/components/dashboard/subscription/subscription-status'
import { DashboardNotifications } from '@/components/dashboard/dashboard-notifications'
import { Monitor } from '@/lib/supabase-types'
import { Activity, AlertTriangle, CheckCircle, Clock, Timer, TrendingUp } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch monitors data
  const { data: monitors, error } = await supabase
    .from('monitors')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching monitors:', error)
  }

  const monitorsList = monitors || []

  // Calculate dashboard stats
  const totalMonitors = monitorsList.length
  const upMonitors = monitorsList.filter(m => m.status === 'up').length
  const downMonitors = monitorsList.filter(m => m.status === 'down').length
  const pendingMonitors = monitorsList.filter(m => m.status === 'pending').length
  const timeoutMonitors = monitorsList.filter(m => m.status === 'timeout').length
  // Calculate average response time only from 'up' monitors with valid response times
  const upMonitorsWithResponseTime = monitorsList.filter(m => m.status === 'up' && m.response_time !== null)
  const avgResponseTime = upMonitorsWithResponseTime.length > 0
    ? Math.round(upMonitorsWithResponseTime.reduce((acc, m) => acc + (m.response_time || 0), 0) / upMonitorsWithResponseTime.length)
    : 0

  const uptimePercentage = totalMonitors > 0 ? Math.round((upMonitors / totalMonitors) * 100) : 0

  return (
    <div className="space-y-8 ">
      {/* Notifications */}
      <DashboardNotifications />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Welcome back, {user.email}! Monitor your APIs with real-time status updates.
          </p>
        </div>
      </div>

      {/* Subscription Status */}
      <SubscriptionStatus />

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <Card className="group hover:scale-[1.02] transition-all duration-300 backdrop-blur-xl bg-background/60 border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Monitors</CardTitle>
            <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors duration-300">
              <Activity className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
              {totalMonitors}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Active API endpoints
            </p>
          </CardContent>
        </Card>

        <Card className="group hover:scale-[1.02] transition-all duration-300 backdrop-blur-xl bg-background/60 border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Uptime</CardTitle>
            <div className="p-2 rounded-lg bg-success/10 group-hover:bg-success/20 transition-colors duration-300">
              <CheckCircle className="h-4 w-4 text-success" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold bg-gradient-to-r from-success to-success/80 bg-clip-text text-transparent">
              {uptimePercentage}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {upMonitors} of {totalMonitors} monitors up
            </p>
          </CardContent>
        </Card>

        <Card className="group hover:scale-[1.02] transition-all duration-300 backdrop-blur-xl bg-background/60 border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Issues</CardTitle>
            <div className="p-2 rounded-lg bg-destructive/10 group-hover:bg-destructive/20 transition-colors duration-300">
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold bg-gradient-to-r from-destructive to-destructive/80 bg-clip-text text-transparent">
              {downMonitors}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Monitors currently down
            </p>
          </CardContent>
        </Card>

        <Card className="group hover:scale-[1.02] transition-all duration-300 backdrop-blur-xl bg-background/60 border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Timeouts</CardTitle>
            <div className="p-2 rounded-lg bg-warning/10 group-hover:bg-warning/20 transition-colors duration-300">
              <Timer className="h-4 w-4 text-warning" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold bg-gradient-to-r from-warning to-warning/80 bg-clip-text text-transparent">
              {timeoutMonitors}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Monitors timing out
            </p>
          </CardContent>
        </Card>

        <Card className="group hover:scale-[1.02] transition-all duration-300 backdrop-blur-xl bg-background/60 border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Response</CardTitle>
            <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors duration-300">
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
              {avgResponseTime}ms
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Average response time
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Status Alerts */}
      {downMonitors > 0 && (
        <Alert variant="destructive" className="backdrop-blur-xl bg-destructive/10 border-destructive/30">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {downMonitors} monitor{downMonitors > 1 ? 's are' : ' is'} currently down.
            Check your monitors list below for details.
          </AlertDescription>
        </Alert>
      )}

      {timeoutMonitors > 0 && (
        <Alert variant="default" className="backdrop-blur-xl bg-warning/10 border-warning/30">
          <Timer className="h-4 w-4 text-warning" />
          <AlertDescription className="text-warning-foreground">
            {timeoutMonitors} monitor{timeoutMonitors > 1 ? 's are' : ' is'} experiencing timeouts.
            These APIs may be slow or overloaded.
          </AlertDescription>
        </Alert>
      )}

      {pendingMonitors > 0 && (
        <Alert className="backdrop-blur-xl bg-background/60 border-border/50">
          <Clock className="h-4 w-4" />
          <AlertDescription>
            {pendingMonitors} monitor{pendingMonitors > 1 ? 's are' : ' is'} pending first check.
            Initial results will appear within the configured interval.
          </AlertDescription>
        </Alert>
      )}

      {totalMonitors === 0 && (
        <Alert className="backdrop-blur-xl bg-background/60 border-border/50">
          <Activity className="h-4 w-4" />
          <AlertDescription>
            Welcome to API Pulse! Add your first monitor below to start tracking your API&apos;s uptime and performance.
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Add Monitor Form */}
        <div className="lg:col-span-1">
          <AddMonitorForm />
        </div>

        {/* Response Time Analytics */}
        <div className="lg:col-span-2">
          <ResponseTimeAnalytics
            monitors={monitorsList}
            avgResponseTime={avgResponseTime}
            upMonitorsWithResponseTime={upMonitorsWithResponseTime}
          />
        </div>
      </div>

      {/* Monitors List */}
      <MonitorsList monitors={monitorsList} />
    </div>
  )
} 