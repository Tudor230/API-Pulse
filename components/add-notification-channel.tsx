"use client"

import { useState } from 'react'
import { AlertType } from '@/lib/supabase-types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Mail, MessageSquare, Webhook, Plus, CheckCircle, AlertCircle } from 'lucide-react'

interface AddNotificationChannelProps {
  onSuccess?: () => void
}

interface FormData {
  name: string
  type: AlertType | ''
  email: string
  phone: string
  webhook_url: string
}

const channelTypes = [
  {
    value: 'email' as AlertType,
    label: 'Email',
    icon: Mail,
    description: 'Send alerts via email'
  },
  {
    value: 'sms' as AlertType,
    label: 'SMS',
    icon: MessageSquare,
    description: 'Send alerts via text message'
  },
  {
    value: 'webhook' as AlertType,
    label: 'Webhook',
    icon: Webhook,
    description: 'Send alerts to a webhook URL'
  }
]

export default function AddNotificationChannel({ onSuccess }: AddNotificationChannelProps) {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    type: '',
    email: '',
    phone: '',
    webhook_url: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setSuccess(null)

    try {
      // Prepare config based on type
      let config = {}
      if (formData.type === 'email') {
        config = { email: formData.email }
      } else if (formData.type === 'sms') {
        config = { phone: formData.phone }
      } else if (formData.type === 'webhook') {
        config = { webhook_url: formData.webhook_url }
      }

      const response = await fetch('/api/notification-channels', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          type: formData.type,
          config
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create notification channel')
      }

      // Reset form
      setFormData({
        name: '',
        type: '',
        email: '',
        phone: '',
        webhook_url: ''
      })

      setSuccess(`${channelTypes.find(t => t.value === formData.type)?.label} channel created successfully!`)
      onSuccess?.()

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const getConfigInput = () => {
    switch (formData.type) {
      case 'email':
        return (
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              placeholder="alerts@example.com"
              required
            />
            <p className="text-sm text-muted-foreground">
              You'll receive a verification email before alerts can be sent.
            </p>
          </div>
        )
      case 'sms':
        return (
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              placeholder="+1234567890"
              required
            />
            <p className="text-sm text-muted-foreground">
              Use international format (e.g., +1234567890). You'll receive a verification SMS.
            </p>
          </div>
        )
      case 'webhook':
        return (
          <div className="space-y-2">
            <Label htmlFor="webhook_url">Webhook URL</Label>
            <Input
              id="webhook_url"
              type="url"
              value={formData.webhook_url}
              onChange={(e) => setFormData(prev => ({ ...prev, webhook_url: e.target.value }))}
              placeholder="https://your-app.com/api/alerts"
              required
            />
            <p className="text-sm text-muted-foreground">
              POST requests with JSON payload will be sent to this URL.
            </p>
          </div>
        )
      default:
        return null
    }
  }

  const selectedChannelType = channelTypes.find(t => t.value === formData.type)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Plus className="h-5 w-5" />
          <CardTitle>Add Notification Channel</CardTitle>
        </div>
        <CardDescription>
          Configure how you want to receive alert notifications
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Channel Type Selection */}
          <div className="space-y-3">
            <Label>Channel Type</Label>
            <div className="grid grid-cols-1 gap-3">
              {channelTypes.map((type) => {
                const Icon = type.icon
                const isSelected = formData.type === type.value
                
                return (
                  <div
                    key={type.value}
                    className={`
                      border rounded-lg p-4 cursor-pointer transition-all
                      ${isSelected 
                        ? 'border-primary bg-primary/5 ring-2 ring-primary/20' 
                        : 'border-border hover:border-primary/50'
                      }
                    `}
                    onClick={() => setFormData(prev => ({ ...prev, type: type.value }))}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`h-5 w-5 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{type.label}</span>
                          {type.value === 'sms' && (
                            <Badge variant="secondary" className="text-xs">
                              Requires Twilio
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{type.description}</p>
                      </div>
                      {isSelected && <CheckCircle className="h-5 w-5 text-primary" />}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Channel Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Channel Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder={selectedChannelType ? `My ${selectedChannelType.label} Alerts` : 'My Alert Channel'}
              required
            />
            <p className="text-sm text-muted-foreground">
              A friendly name to identify this notification channel.
            </p>
          </div>

          {/* Channel Configuration */}
          {formData.type && getConfigInput()}

          {/* Error/Success Messages */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="border-success/20 bg-success/10">
              <CheckCircle className="h-4 w-4 text-success" />
              <AlertDescription className="text-success">
                {success}
              </AlertDescription>
            </Alert>
          )}

          {/* Submit Button */}
          <Button 
            type="submit" 
            className="w-full" 
            disabled={isLoading || !formData.name || !formData.type}
          >
            {isLoading ? 'Creating...' : `Create ${selectedChannelType?.label || ''} Channel`}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
} 