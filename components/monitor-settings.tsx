"use client"

import { useState } from 'react'
import { Monitor } from '@/lib/supabase-types'
import { useSubscription } from '@/lib/hooks/use-subscription'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Settings, Edit, Trash2, Save, X, AlertTriangle } from 'lucide-react'

interface MonitorSettingsProps {
  monitor: Monitor
}

export default function MonitorSettings({ monitor }: MonitorSettingsProps) {
  const { getAllowedIntervals, isFreePlan } = useSubscription()
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const allowedIntervals = getAllowedIntervals()

  // Form state
  const [formData, setFormData] = useState({
    name: monitor.name,
    url: monitor.url,
    interval_minutes: monitor.interval_minutes.toString(),
    is_active: monitor.is_active
  })

  const handleSave = async () => {
    setIsLoading(true)
    setError(null)
    setSuccess(null)

    // Validate interval is allowed for user's plan
    const newInterval = parseInt(formData.interval_minutes)
    if (!allowedIntervals.includes(newInterval)) {
      setError(`The ${newInterval} minute interval is not available on your current plan. Please upgrade to Pro to access all intervals.`)
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch(`/api/monitors/${monitor.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          url: formData.url,
          interval_minutes: parseInt(formData.interval_minutes),
          is_active: formData.is_active
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update monitor')
      }

      setSuccess('Monitor updated successfully!')
      setIsEditing(false)

      // Refresh the page to show updated data
      setTimeout(() => {
        window.location.reload()
      }, 1500)

    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to update monitor')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this monitor? This action cannot be undone.')) {
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/monitors/${monitor.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete monitor')
      }

      // Redirect to dashboard after successful deletion
      window.location.href = '/dashboard'

    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to delete monitor')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    setFormData({
      name: monitor.name,
      url: monitor.url,
      interval_minutes: monitor.interval_minutes.toString(),
      is_active: monitor.is_active
    })
    setIsEditing(false)
    setError(null)
    setSuccess(null)
  }

  // Generate interval options based on user's plan
  const intervalOptions = allowedIntervals.map(interval => ({
    value: interval.toString(),
    label: interval === 1 ? 'Every minute' :
      interval < 60 ? `Every ${interval} minutes` :
        `Every ${interval / 60} hour${interval / 60 > 1 ? 's' : ''}`
  }))

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Monitor Settings
            </CardTitle>
            <CardDescription>
              Configure monitoring parameters and manage this monitor
            </CardDescription>
          </div>
          {!isEditing && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2"
            >
              <Edit className="h-4 w-4" />
              Edit
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status Messages */}
        {error && (
          <Alert className="border-destructive/50 bg-destructive/5">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <AlertDescription className="text-destructive">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="border-success/50 bg-success/5">
            <AlertTriangle className="h-4 w-4 text-success" />
            <AlertDescription className="text-success">
              {success}
            </AlertDescription>
          </Alert>
        )}

        {isEditing ? (
          <div className="space-y-4">
            {/* Monitor Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Monitor Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter monitor name"
              />
            </div>

            {/* URL */}
            <div className="space-y-2">
              <Label htmlFor="url">URL</Label>
              <Input
                id="url"
                type="url"
                value={formData.url}
                onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                placeholder="https://api.example.com/health"
              />
            </div>

            {/* Check Interval */}
            <div className="space-y-2">
              <Label htmlFor="interval">Check Interval</Label>
              <Select
                value={formData.interval_minutes}
                onValueChange={(value) => setFormData(prev => ({ ...prev, interval_minutes: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {intervalOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isFreePlan && (
                <p className="text-xs text-gray-500">
                  Free plan includes {allowedIntervals.length > 1 ? 'intervals' : 'interval'}: {allowedIntervals.join(', ')} minute{allowedIntervals.length > 1 ? 's' : ''}.
                  <span className="text-blue-600"> Upgrade to Pro</span> for all intervals including 1, 5, 10, and 15 minutes.
                </p>
              )}
            </div>

            {/* Active Status */}
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
              <Label htmlFor="is_active">
                Enable monitoring
              </Label>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-4">
              <Button
                onClick={handleSave}
                disabled={isLoading}
                className="flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                {isLoading ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={isLoading}
                className="flex items-center gap-2"
              >
                <X className="h-4 w-4" />
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Monitor Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">Monitor Name</Label>
                <div className="mt-1 text-sm font-medium">{monitor.name}</div>
              </div>

              <div>
                <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                <div className="mt-1 flex items-center gap-2">
                  <Badge className={monitor.is_active ? 'bg-success/10 text-success border-success/20' : 'bg-muted text-muted-foreground'}>
                    {monitor.is_active ? 'Active' : 'Paused'}
                  </Badge>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-muted-foreground">URL</Label>
                <div className="mt-1 text-sm font-mono break-all">{monitor.url}</div>
              </div>

              <div>
                <Label className="text-sm font-medium text-muted-foreground">Check Interval</Label>
                <div className="mt-1 text-sm">
                  {intervalOptions.find(opt => opt.value === monitor.interval_minutes.toString())?.label ||
                    `Every ${monitor.interval_minutes} minutes`}
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-muted-foreground">Created</Label>
                <div className="mt-1 text-sm">{new Date(monitor.created_at).toLocaleString()}</div>
              </div>

              <div>
                <Label className="text-sm font-medium text-muted-foreground">Last Updated</Label>
                <div className="mt-1 text-sm">{new Date(monitor.updated_at).toLocaleString()}</div>
              </div>
            </div>
          </div>
        )}

        {/* Danger Zone */}
        {!isEditing && (
          <div className="pt-6 border-t">
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-destructive">Danger Zone</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Permanently delete this monitor and all its historical data.
                </p>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={isLoading}
                className="flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                {isLoading ? 'Deleting...' : 'Delete Monitor'}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 