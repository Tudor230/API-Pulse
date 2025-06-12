"use client"

import { MonitoringHistory } from '@/lib/supabase-types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { AlertCircle, CheckCircle, Clock, XCircle, Info } from 'lucide-react'

interface IncidentHistoryProps {
  history: MonitoringHistory[]
  monitorName: string
}

export default function IncidentHistory({ history, monitorName }: IncidentHistoryProps) {
  // Group history into incidents (consecutive failures/timeouts)
  const getIncidents = () => {
    if (history.length === 0) return []
    
    const incidents = []
    let currentIncident = null
    
    // Sort by checked_at descending (newest first)
    const sortedHistory = [...history].sort((a, b) => 
      new Date(b.checked_at).getTime() - new Date(a.checked_at).getTime()
    )
    
    for (const record of sortedHistory) {
      if (record.status === 'down' || record.status === 'timeout') {
        if (!currentIncident) {
                     currentIncident = {
             id: record.id,
             startTime: record.checked_at,
             endTime: null as string | null,
             status: record.status,
             duration: 0,
             statusCode: record.status_code,
             errorMessage: record.error_message,
             checksCount: 1
           }
        } else {
          currentIncident.startTime = record.checked_at // Keep updating to get the earliest time
          currentIncident.checksCount++
        }
      } else if (record.status === 'up' && currentIncident) {
                 // End of incident
         currentIncident.endTime = record.checked_at
         currentIncident.duration = new Date(currentIncident.startTime).getTime() - new Date(record.checked_at).getTime()
        incidents.push(currentIncident)
        currentIncident = null
      }
    }
    
    // If there's an ongoing incident
    if (currentIncident) {
      currentIncident.duration = Date.now() - new Date(currentIncident.startTime).getTime()
      incidents.push(currentIncident)
    }
    
    return incidents
  }

  const incidents = getIncidents()

  const formatDuration = (durationMs: number) => {
    const minutes = Math.floor(durationMs / (1000 * 60))
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)
    
    if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`
    if (hours > 0) return `${hours}h ${minutes % 60}m`
    return `${minutes}m`
  }

  const getStatusIcon = (status: string) => {
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

  const getStatusBadge = (status: string, isOngoing: boolean = false) => {
    const baseClass = isOngoing ? "animate-pulse" : ""
    
    switch (status) {
      case 'down':
        return <Badge variant="destructive" className={baseClass}>
          {isOngoing ? 'Ongoing Outage' : 'Outage'}
        </Badge>
      case 'timeout':
        return <Badge className={`bg-warning/10 text-warning border-warning/20 ${baseClass}`}>
          {isOngoing ? 'Ongoing Timeout' : 'Timeout'}
        </Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getSeverityColor = (durationMs: number) => {
    const minutes = durationMs / (1000 * 60)
    if (minutes > 60) return 'text-destructive' // Critical: >1 hour
    if (minutes > 15) return 'text-warning' // Warning: >15 minutes
    return 'text-muted-foreground' // Minor: <15 minutes
  }

  if (history.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Incident History
          </CardTitle>
          <CardDescription>
            Track outages and performance issues for {monitorName}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-success" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">No Incidents Recorded</h3>
            <p className="text-muted-foreground">
              Great news! No incidents have been detected in the last 24 hours.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Incidents Summary */}
      {incidents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Incident Summary (24h)
            </CardTitle>
            <CardDescription>
              {incidents.length} incident{incidents.length !== 1 ? 's' : ''} detected for {monitorName}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {incidents.map((incident, index) => (
                <div key={incident.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(incident.status)}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          Incident #{incidents.length - index}
                        </span>
                        {getStatusBadge(incident.status, !incident.endTime)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Started {new Date(incident.startTime).toLocaleString()}
                        {incident.endTime && (
                          <> • Resolved {new Date(incident.endTime).toLocaleString()}</>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-medium ${getSeverityColor(incident.duration)}`}>
                      {formatDuration(incident.duration)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {incident.checksCount} checks
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed History Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            Detailed Check History
          </CardTitle>
          <CardDescription>
            Complete monitoring history for the last 24 hours
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-h-96 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Response Time</TableHead>
                  <TableHead>Status Code</TableHead>
                  <TableHead>Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history
                  .sort((a, b) => new Date(b.checked_at).getTime() - new Date(a.checked_at).getTime())
                  .map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-mono text-sm">
                        {new Date(record.checked_at).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(record.status)}
                          <span className={
                            record.status === 'up' ? 'text-success' :
                            record.status === 'down' ? 'text-destructive' :
                            record.status === 'timeout' ? 'text-warning' :
                            'text-muted-foreground'
                          }>
                            {record.status.toUpperCase()}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {record.response_time ? (
                          <span className={
                            record.response_time <= 500 ? 'text-success' :
                            record.response_time <= 1000 ? 'text-warning' :
                            'text-destructive'
                          }>
                            {record.response_time}ms
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {record.status_code ? (
                          <span className={
                            record.status_code >= 200 && record.status_code < 300 ? 'text-success' :
                            record.status_code >= 300 && record.status_code < 400 ? 'text-info' :
                            'text-destructive'
                          }>
                            {record.status_code}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        {record.error_message ? (
                          <span className="text-destructive text-sm truncate" title={record.error_message}>
                            {record.error_message}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 