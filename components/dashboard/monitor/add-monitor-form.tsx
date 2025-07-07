"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSubscription } from '@/lib/contexts/SubscriptionContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface AddMonitorFormProps {
  onSuccess?: () => void
}

export default function AddMonitorForm({ onSuccess }: AddMonitorFormProps) {
  const router = useRouter()
  const { getAllowedIntervals, isFreePlan } = useSubscription()
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    interval_minutes: 30 // Default to 30 minutes (available on free plan)
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const allowedIntervals = getAllowedIntervals()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setSuccess(null)

    // Validate interval is allowed for user's plan
    if (!allowedIntervals.includes(formData.interval_minutes)) {
      setError(`The ${formData.interval_minutes} minute interval is not available on your current plan. Please upgrade to Pro to access all intervals.`)
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch('/api/monitors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create monitor')
      }

      setSuccess('Monitor created successfully!')
      setFormData({ name: '', url: '', interval_minutes: allowedIntervals[0] || 30 }) // Reset to first allowed interval

      // Refresh the page to show updated data
      setTimeout(() => {
        router.refresh()
        setSuccess(null)
      }, 2000)

      onSuccess?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Add New Monitor</CardTitle>
        <CardDescription>
          Add a new API endpoint to monitor for uptime and performance
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Monitor Name</Label>
            <Input
              id="name"
              type="text"
              placeholder="My API"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="url">URL</Label>
            <Input
              id="url"
              type="url"
              placeholder="https://api.example.com/health"
              value={formData.url}
              onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="interval">Check Interval</Label>
            <Select
              value={formData.interval_minutes.toString()}
              onValueChange={(value) => setFormData(prev => ({ ...prev, interval_minutes: parseInt(value) }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select interval" />
              </SelectTrigger>
              <SelectContent>
                {allowedIntervals.map(interval => (
                  <SelectItem key={interval} value={interval.toString()}>
                    {interval === 1 ? 'Every minute' :
                      interval < 60 ? `Every ${interval} minutes` :
                        `Every ${interval / 60} hour${interval / 60 > 1 ? 's' : ''}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="border-success/20 bg-success/10 text-success">
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          <Button type="submit" className="w-full mt-[11px]" disabled={isLoading}>
            {isLoading ? 'Creating...' : 'Add Monitor'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
} 