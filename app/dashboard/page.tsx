import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import AddMonitorForm from '@/components/add-monitor-form'
import MonitorsList from '@/components/monitors-list'
import { Monitor } from '@/lib/supabase-types'
import { Activity, AlertTriangle, CheckCircle, Clock, TrendingUp } from 'lucide-react'

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
  const avgResponseTime = monitorsList.length > 0 
    ? Math.round(monitorsList.reduce((acc, m) => acc + (m.response_time || 0), 0) / monitorsList.length)
    : 0

  const uptimePercentage = totalMonitors > 0 ? Math.round((upMonitors / totalMonitors) * 100) : 0

  return (
    <div className="space-y-8">
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
            Welcome to API Pulse! Add your first monitor below to start tracking your API's uptime and performance.
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Add Monitor Form */}
        <div className="lg:col-span-1">
          <AddMonitorForm />
        </div>

        {/* Quick Status Overview */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>System Status</CardTitle>
              <CardDescription>
                Real-time overview of all your monitored endpoints
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-success/10 rounded-lg border border-success/20">
                  <div className="text-2xl font-bold text-success">
                    {upMonitors}
                  </div>
                  <div className="text-sm text-foreground">
                    Online
                  </div>
                </div>
                
                <div className="text-center p-4 bg-destructive/10 rounded-lg border border-destructive/20">
                  <div className="text-2xl font-bold text-destructive">
                    {downMonitors}
                  </div>
                  <div className="text-sm text-foreground">
                    Offline
                  </div>
                </div>
                
                <div className="text-center p-4 bg-warning/10 rounded-lg border border-warning/20">
                  <div className="text-2xl font-bold text-warning">
                    {pendingMonitors}
                  </div>
                  <div className="text-sm text-foreground">
                    Pending
                  </div>
                </div>
                
                <div className="text-center p-4 bg-info/10 rounded-lg border border-info/20">
                  <div className="text-2xl font-bold text-info">
                    {totalMonitors}
                  </div>
                  <div className="text-sm text-foreground">
                    Total
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Monitors List */}
      <MonitorsList monitors={monitorsList} />
    </div>
  )
} 