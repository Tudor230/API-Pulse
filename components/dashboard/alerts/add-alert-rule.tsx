"use client"

import { useState, useEffect } from 'react'
import { Monitor, NotificationChannel } from '@/lib/supabase-types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Plus, CheckCircle, AlertCircle, Bell, Shield, Clock, Info } from 'lucide-react'

interface AddAlertRuleProps {
    onSuccess?: () => void
}

interface FormData {
    monitor_id: string
    notification_channel_id: string
    alert_on_down: boolean
    alert_on_up: boolean
    alert_on_timeout: boolean
    consecutive_failures_threshold: number
    cooldown_minutes: number
}

export default function AddAlertRule({ onSuccess }: AddAlertRuleProps) {
    const [formData, setFormData] = useState<FormData>({
        monitor_id: '',
        notification_channel_id: '',
        alert_on_down: true,
        alert_on_up: false,
        alert_on_timeout: true,
        consecutive_failures_threshold: 3,
        cooldown_minutes: 60,
    })

    const [monitors, setMonitors] = useState<Monitor[]>([])
    const [channels, setChannels] = useState<NotificationChannel[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)
    const [isDataLoading, setIsDataLoading] = useState(true)

    const fetchData = async () => {
        try {
            setIsDataLoading(true)

            // Fetch monitors
            const monitorsResponse = await fetch('/api/monitors')
            const monitorsData = await monitorsResponse.json()

            if (!monitorsResponse.ok) {
                throw new Error(monitorsData.error || 'Failed to fetch monitors')
            }

            // Fetch notification channels (only verified and active ones)
            const channelsResponse = await fetch('/api/notification-channels')
            const channelsData = await channelsResponse.json()

            if (!channelsResponse.ok) {
                throw new Error(channelsData.error || 'Failed to fetch notification channels')
            }

            setMonitors(monitorsData.monitors || [])
            setChannels(channelsData.channels?.filter((c: NotificationChannel) => c.is_verified && c.is_active) || [])
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load data')
        } finally {
            setIsDataLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setError(null)
        setSuccess(null)

        try {
            const response = await fetch('/api/alert-rules', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Failed to create alert rule')
            }

            setSuccess('Alert rule created successfully!')

            // Reset form
            setFormData({
                monitor_id: '',
                notification_channel_id: '',
                alert_on_down: true,
                alert_on_up: false,
                alert_on_timeout: true,
                consecutive_failures_threshold: 3,
                cooldown_minutes: 60,
            })

            if (onSuccess) {
                onSuccess()
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred')
        } finally {
            setIsLoading(false)
        }
    }

    const getChannelIcon = (type: string) => {
        switch (type) {
            case 'email':
                return '📧'
            case 'sms':
                return '📱'
            case 'webhook':
                return '🔗'
            default:
                return '🔔'
        }
    }

    const isFormValid = formData.monitor_id && formData.notification_channel_id

    if (isDataLoading) {
        return (
            <Card className="w-full backdrop-blur-xl bg-background/60 border-border/50">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Plus className="h-5 w-5" />
                        Add Alert Rule
                    </CardTitle>
                    <CardDescription>Loading...</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="w-full backdrop-blur-xl bg-background/60 border-border/50">
            <CardHeader>
                <div className="flex items-center gap-2">
                    <Plus className="h-5 w-5" />
                    <CardTitle>Add Alert Rule</CardTitle>
                </div>
                <CardDescription>
                    Create custom alert rules for specific monitor and channel combinations
                </CardDescription>
            </CardHeader>
            <CardContent>
                {monitors.length === 0 && (
                    <Alert className="mb-6 border-warning/50 bg-warning/10">
                        <Info className="h-4 w-4 text-warning" />
                        <AlertDescription className="text-warning">
                            You need to create monitors before adding alert rules.{' '}
                            <a href="/dashboard" className="underline">Add your first monitor</a>
                        </AlertDescription>
                    </Alert>
                )}

                {channels.length === 0 && (
                    <Alert className="mb-6 border-warning/50 bg-warning/10">
                        <Info className="h-4 w-4 text-warning" />
                        <AlertDescription className="text-warning">
                            You need verified notification channels to create alert rules.{' '}
                            <a href="/alerts?tab=channels" className="underline">Add a notification channel</a>
                        </AlertDescription>
                    </Alert>
                )}

                {monitors.length > 0 && channels.length > 0 && (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Monitor Selection */}
                        <div className="space-y-2">
                            <Label htmlFor="monitor">Monitor</Label>
                            <Select
                                value={formData.monitor_id}
                                onValueChange={(value) => setFormData(prev => ({ ...prev, monitor_id: value }))}
                            >
                                <SelectTrigger className="border-muted-foreground/20 bg-background/40 backdrop-blur-sm focus:border-primary/60 focus:bg-background/60">
                                    <SelectValue placeholder="Select a monitor" />
                                </SelectTrigger>
                                <SelectContent className="backdrop-blur-xl bg-background/80 border-muted-foreground/20">
                                    {monitors.map(monitor => (
                                        <SelectItem key={monitor.id} value={monitor.id}>
                                            <div className="flex items-center gap-2">
                                                <div className="flex flex-col">
                                                    <span className="font-medium">{monitor.name}</span>
                                                    <span className="text-xs text-muted-foreground truncate max-w-[300px]">
                                                        {monitor.url}
                                                    </span>
                                                </div>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Notification Channel Selection */}
                        <div className="space-y-2">
                            <Label htmlFor="channel">Notification Channel</Label>
                            <Select
                                value={formData.notification_channel_id}
                                onValueChange={(value) => setFormData(prev => ({ ...prev, notification_channel_id: value }))}
                            >
                                <SelectTrigger className="border-muted-foreground/20 bg-background/40 backdrop-blur-sm focus:border-primary/60 focus:bg-background/60">
                                    <SelectValue placeholder="Select a notification channel" />
                                </SelectTrigger>
                                <SelectContent className="backdrop-blur-xl bg-background/80 border-muted-foreground/20">
                                    {channels.map(channel => (
                                        <SelectItem key={channel.id} value={channel.id}>
                                            <div className="flex items-center gap-2">
                                                <span className="text-lg">{getChannelIcon(channel.type)}</span>
                                                <div className="flex flex-col">
                                                    <span className="font-medium">{channel.name}</span>
                                                    <span className="text-xs text-muted-foreground">
                                                        {channel.type.toUpperCase()}
                                                    </span>
                                                </div>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Alert Conditions */}
                        <div className="space-y-4">
                            <Label className="text-sm font-medium">Alert Conditions</Label>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <AlertCircle className="h-4 w-4 text-destructive" />
                                        <Label htmlFor="alert-down" className="text-sm">Monitor goes down</Label>
                                    </div>
                                    <Switch
                                        id="alert-down"
                                        checked={formData.alert_on_down}
                                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, alert_on_down: checked }))}
                                    />
                                </div>

                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <CheckCircle className="h-4 w-4 text-success" />
                                        <Label htmlFor="alert-up" className="text-sm">Monitor recovers</Label>
                                    </div>
                                    <Switch
                                        id="alert-up"
                                        checked={formData.alert_on_up}
                                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, alert_on_up: checked }))}
                                    />
                                </div>

                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Clock className="h-4 w-4 text-warning" />
                                        <Label htmlFor="alert-timeout" className="text-sm">Request times out</Label>
                                    </div>
                                    <Switch
                                        id="alert-timeout"
                                        checked={formData.alert_on_timeout}
                                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, alert_on_timeout: checked }))}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Threshold Settings */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="threshold" className="flex items-center gap-2">
                                    <Shield className="h-4 w-4" />
                                    Consecutive Failures
                                </Label>
                                <Input
                                    id="threshold"
                                    type="number"
                                    min="1"
                                    max="10"
                                    value={formData.consecutive_failures_threshold}
                                    onChange={(e) => setFormData(prev => ({
                                        ...prev,
                                        consecutive_failures_threshold: parseInt(e.target.value) || 1
                                    }))}
                                    className="border-muted-foreground/20 bg-background/40 backdrop-blur-sm focus:border-primary/60 focus:bg-background/60"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Alert after this many consecutive failures
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="cooldown" className="flex items-center gap-2">
                                    <Clock className="h-4 w-4" />
                                    Cooldown (minutes)
                                </Label>
                                <Input
                                    id="cooldown"
                                    type="number"
                                    min="0"
                                    max="1440"
                                    value={formData.cooldown_minutes}
                                    onChange={(e) => setFormData(prev => ({
                                        ...prev,
                                        cooldown_minutes: parseInt(e.target.value) || 0
                                    }))}
                                    className="border-muted-foreground/20 bg-background/40 backdrop-blur-sm focus:border-primary/60 focus:bg-background/60"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Wait time between alerts for same issue
                                </p>
                            </div>
                        </div>

                        {/* Error/Success Messages */}
                        {error && (
                            <Alert variant="destructive" className="backdrop-blur-xl bg-background/60 border-border/50">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        {success && (
                            <Alert className="border-success/50 bg-success/10">
                                <CheckCircle className="h-4 w-4 text-success" />
                                <AlertDescription className="text-success">
                                    {success}
                                </AlertDescription>
                            </Alert>
                        )}

                        {/* Submit Button */}
                        <Button
                            type="submit"
                            className="w-full hover:bg-primary hover:text-primary-foreground bg-primary/10 border border-primary/40 backdrop-blur-sm text-primary transition-all duration-200 shadow-sm"
                            disabled={isLoading || !isFormValid}
                        >
                            {isLoading ? 'Creating...' : 'Create Alert Rule'}
                        </Button>
                    </form>
                )}

                {/* Information */}
                <div className="mt-6 p-4 rounded-lg bg-background/40 backdrop-blur-sm border border-border/30">
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                        <Info className="h-4 w-4" />
                        About Alert Rules
                    </h4>
                    <div className="text-sm text-muted-foreground space-y-2">
                        <p>
                            • Alert rules are automatically created when you add notification channels
                        </p>
                        <p>
                            • Custom rules allow fine-tuned control over specific monitor-channel combinations
                        </p>
                        <p>
                            • Consecutive failures prevent false positives from temporary network issues
                        </p>
                        <p>
                            • Cooldown periods prevent alert spam by limiting notification frequency
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
