import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Monitor } from '@/lib/supabase-types'

interface MonitorsListProps {
  monitors: Monitor[]
}

function getStatusVariant(status: Monitor['status']) {
  switch (status) {
    case 'up':
      return 'default' // Green
    case 'down':
      return 'destructive' // Red
    case 'pending':
      return 'secondary' // Gray
    case 'unknown':
      return 'outline' // Outlined
    default:
      return 'secondary'
  }
}

function formatDate(dateString: string | null) {
  if (!dateString) return 'Never'
  return new Date(dateString).toLocaleString()
}

function formatInterval(minutes: number) {
  if (minutes < 60) {
    return `${minutes}m`
  }
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`
}

export default function MonitorsList({ monitors }: MonitorsListProps) {
  if (monitors.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Your Monitors</CardTitle>
          <CardDescription>No monitors configured yet</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            Add your first monitor using the form above to start monitoring your APIs.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Monitors ({monitors.length})</CardTitle>
        <CardDescription>
          All your configured API monitors and their current status
        </CardDescription>
      </CardHeader>
      <CardContent>
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
            </TableRow>
          </TableHeader>
          <TableBody>
            {monitors.map((monitor) => (
              <TableRow key={monitor.id}>
                <TableCell className="font-medium">{monitor.name}</TableCell>
                <TableCell>
                  <a 
                    href={monitor.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    {monitor.url}
                  </a>
                </TableCell>
                <TableCell>
                  <Badge variant={getStatusVariant(monitor.status)}>
                    {monitor.status.toUpperCase()}
                  </Badge>
                </TableCell>
                <TableCell>{formatInterval(monitor.interval_minutes)}</TableCell>
                <TableCell>
                  {monitor.response_time ? `${monitor.response_time}ms` : '-'}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatDate(monitor.last_checked_at)}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatDate(monitor.next_check_at)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
} 