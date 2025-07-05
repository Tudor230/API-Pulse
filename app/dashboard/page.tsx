import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import AddMonitorForm from '@/components/add-monitor-form'
import MonitorsList from '@/components/monitors-list'
import ResponseTimeAnalytics from '@/components/response-time-analytics'
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Welcome back, {user.email}! Monitor your APIs with real-time status updates.
          </p>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Monitors</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMonitors}</div>
            <p className="text-xs text-muted-foreground">
              Active API endpoints
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Uptime</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{uptimePercentage}%</div>
            <p className="text-xs text-muted-foreground">
              {upMonitors} of {totalMonitors} monitors up
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Issues</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{downMonitors}</div>
            <p className="text-xs text-muted-foreground">
              Monitors currently down
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Timeouts</CardTitle>
            <Timer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{timeoutMonitors}</div>
            <p className="text-xs text-muted-foreground">
              Monitors timing out
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgResponseTime}ms</div>
            <p className="text-xs text-muted-foreground">
              Average response time
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Status Alerts */}
      {downMonitors > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {downMonitors} monitor{downMonitors > 1 ? 's are' : ' is'} currently down. 
            Check your monitors list below for details.
          </AlertDescription>
        </Alert>
      )}

      {timeoutMonitors > 0 && (
        <Alert variant="default" className="border-warning/20 bg-warning/10">
          <Timer className="h-4 w-4 text-warning" />
          <AlertDescription className="text-warning-foreground">
            {timeoutMonitors} monitor{timeoutMonitors > 1 ? 's are' : ' is'} experiencing timeouts. 
            These APIs may be slow or overloaded.
          </AlertDescription>
        </Alert>
      )}

      {pendingMonitors > 0 && (
        <Alert>
          <Clock className="h-4 w-4" />
          <AlertDescription>
            {pendingMonitors} monitor{pendingMonitors > 1 ? 's are' : ' is'} pending first check.
            Initial results will appear within the configured interval.
          </AlertDescription>
        </Alert>
      )}

      {totalMonitors === 0 && (
        <Alert>
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