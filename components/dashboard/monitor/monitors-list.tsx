"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Monitor } from '@/lib/supabase-types'
import { RefreshCw, ExternalLink, BarChart3 } from 'lucide-react'
import Link from 'next/link'

interface MonitorsListProps {
  monitors: Monitor[]
}

function getStatusVariant(status: Monitor['status']) {
  switch (status) {
    case 'up':
      return 'default' // Green
    case 'down':
      return 'destructive' // Red
    case 'timeout':
      return 'outline' // Orange-ish outline (custom styling needed)
    case 'pending':
      return 'secondary' // Gray
    case 'unknown':
      return 'outline' // Outlined
    default:
      return 'secondary'
  }
}

function getResponseTimeColor(responseTime: number) {
  if (responseTime <= 1000) return 'text-success'
  if (responseTime > 1000 && responseTime <= 2000) return 'text-warning'
  return 'text-destructive'
}

function formatDate(dateString: string | null) {
  if (!dateString) return 'Never'
  const date = new Date(dateString)
  const now = new Date()
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))

  if (diffInMinutes < 1) return 'Just now'
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`
  if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`
  return date.toLocaleDateString()
}

function formatInterval(minutes: number) {
  if (minutes < 60) {
    return `${minutes}m`
  }
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  if (remainingMinutes === 0) {
    return `${hours}h`
  }
  return `${hours}h ${remainingMinutes}m`
}

export default function MonitorsList({ monitors }: MonitorsListProps) {
  const router = useRouter()
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    router.refresh()
    // Add a small delay for better UX
    setTimeout(() => setIsRefreshing(false), 1000)
  }

  if (monitors.length === 0) {
    return (
      <Card className="backdrop-blur-xl bg-background/60 border-border/50">
        <CardHeader>
          <CardTitle className="text-foreground">Your Monitors</CardTitle>
          <CardDescription className="text-muted-foreground">No monitors configured yet</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
              <svg
                className="w-12 h-12 text-muted-foreground"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">No monitors yet</h3>
            <p className="text-muted-foreground mb-4">
              Add your first monitor using the form above to start tracking your API&apos;s uptime and performance.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="backdrop-blur-xl bg-background/60 border-border/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-foreground">Your Monitors ({monitors.length})</CardTitle>
            <CardDescription className="text-muted-foreground">
              All your configured API monitors and their current status
            </CardDescription>
          </div>
          <Button
            variant="default"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="hover:bg-primary/20  bg-primary/10 border border-primary/40 backdrop-blur-sm text-primary transition-all duration-200 shadow-sm"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>URL</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Interval</TableHead>
                <TableHead>Response Time</TableHead>
                <TableHead>Last Checked</TableHead>
                <TableHead>Next Check</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {monitors.map((monitor) => (
                <TableRow key={monitor.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <span>{monitor.name}</span>
                      {!monitor.is_active && (
                        <Badge variant="outline" className="text-xs px-2 py-0 text-muted-foreground border-muted-foreground/20">
                          Disabled
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="truncate max-w-xs">{monitor.url}</span>
                      <a
                        href={monitor.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-primary"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      // variant={getStatusVariant(monitor.status)}
                      className={
                        monitor.status === 'up' ? 'border-success text-success bg-success/10' :
                          monitor.status === 'down' ? 'border-destructive text-destructive bg-destructive/20' :
                            monitor.status === 'timeout' ? 'border-warning text-warning bg-warning/10' :
                              monitor.status === 'pending' ? 'border-muted text-muted-foreground bg-muted/10' :
                                'border-muted text-muted-foreground bg-muted/10' // unknown status
                      }
                    >
                      {monitor.status.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatInterval(monitor.interval_minutes)}</TableCell>
                  <TableCell>
                    {monitor.response_time ? (
                      <span className={`font-medium ${getResponseTimeColor(monitor.response_time)}`}>
                        {monitor.response_time}ms
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(monitor.last_checked_at)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(monitor.next_check_at)}
                  </TableCell>
                  <TableCell>
                    <Button variant="default" size="sm" asChild className='hover:bg-primary/20  bg-primary/10 border border-primary/40 backdrop-blur-sm text-primary transition-all duration-200 shadow-sm'>
                      <Link href={`/monitors/${monitor.id}`}>
                        <BarChart3 className="h-4 w-4 mr-2" />
                        Analytics
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
} 