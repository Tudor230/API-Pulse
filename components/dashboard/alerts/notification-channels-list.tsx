"use client"

import { useState, useEffect } from 'react'
import { NotificationChannel, AlertType } from '@/lib/supabase-types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Mail, 
  MessageSquare, 
  Webhook, 
  CheckCircle, 
  AlertTriangle, 
  Settings,
  Trash2,
  RefreshCw
} from 'lucide-react'

interface NotificationChannelsListProps {
  refreshTrigger?: number
}

const getChannelIcon = (type: AlertType) => {
  switch (type) {
    case 'email':
      return Mail
    case 'sms':
      return MessageSquare
    case 'webhook':
      return Webhook
    default:
      return Settings
  }
}

const getChannelTypeLabel = (type: AlertType): string => {
  switch (type) {
    case 'email':
      return 'Email'
    case 'sms':
      return 'SMS'
    case 'webhook':
      return 'Webhook'
    default:
      return String(type).toUpperCase()
  }
}

const getChannelValue = (channel: NotificationChannel) => {
  switch (channel.type) {
    case 'email':
      return channel.config.email || 'No email configured'
    case 'sms':
      return channel.config.phone || 'No phone configured'
    case 'webhook':
      return channel.config.webhook_url || 'No URL configured'
    default:
      return 'No configuration'
  }
}

export default function NotificationChannelsList({ refreshTrigger }: NotificationChannelsListProps) {
  const [channels, setChannels] = useState<NotificationChannel[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchChannels = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch('/api/notification-channels')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch notification channels')
      }

      setChannels(data.channels || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (channelId: string) => {
    if (!confirm('Are you sure you want to delete this notification channel?')) {
      return
    }

    try {
      const response = await fetch(`/api/notification-channels/${channelId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete notification channel')
      }

      // Remove the channel from the list
      setChannels(prev => prev.filter(channel => channel.id !== channelId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete channel')
    }
  }

  const handleToggleActive = async (channelId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/notification-channels/${channelId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_active: !isActive }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update notification channel')
      }

      // Update the channel in the list
      setChannels(prev => prev.map(channel => 
        channel.id === channelId 
          ? { ...channel, is_active: !isActive }
          : channel
      ))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update channel')
    }
  }

  useEffect(() => {
    fetchChannels()
  }, [refreshTrigger])

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Notification Channels</CardTitle>
          <CardDescription>Loading your notification channels...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Notification Channels ({channels.length})</CardTitle>
            <CardDescription>
              Manage how you receive alert notifications
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchChannels}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {channels.length === 0 ? (
          <div className="text-center py-12">
            <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No notification channels</h3>
            <p className="text-muted-foreground mb-4">
              Create your first notification channel to start receiving alerts.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Channel</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Configuration</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {channels.map((channel) => {
                  const Icon = getChannelIcon(channel.type)
                  
                  return (
                    <TableRow key={channel.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium">{channel.name}</div>
                            {!channel.is_active && (
                              <Badge variant="secondary" className="text-xs mt-1">
                                Disabled
                              </Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <Badge variant="outline">
                          {getChannelTypeLabel(channel.type)}
                        </Badge>
                      </TableCell>
                      
                      <TableCell>
                        <div className="font-mono text-sm text-muted-foreground max-w-xs truncate">
                          {getChannelValue(channel)}
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {channel.is_verified ? (
                            <Badge variant="default" className="bg-success text-success-foreground">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Verified
                            </Badge>
                          ) : (
                            <Badge variant="destructive">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Unverified
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(channel.created_at).toLocaleDateString()}
                      </TableCell>
                      
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleActive(channel.id, channel.is_active)}
                            className="text-xs"
                          >
                            {channel.is_active ? 'Disable' : 'Enable'}
                          </Button>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(channel.id)}
                            className="text-xs text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 