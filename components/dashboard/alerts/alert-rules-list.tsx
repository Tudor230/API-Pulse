"use client"

import { useState, useEffect } from 'react'
import { MonitorAlertRule, Monitor, NotificationChannel } from '@/lib/supabase-types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
    Bell,
    CheckCircle,
    XCircle,
    AlertTriangle,
    Settings,
    Trash2,
    RefreshCw,
    Plus,
    Edit,
    Clock,
    Shield,
    Activity
} from 'lucide-react'

interface AlertRuleWithRelations extends MonitorAlertRule {
    monitors: Pick<Monitor, 'id' | 'name' | 'url'>
    notification_channels: Pick<NotificationChannel, 'id' | 'name' | 'type'>
}

interface AlertRulesListProps {
    refreshTrigger?: number
}

export default function AlertRulesList({ refreshTrigger }: AlertRulesListProps) {
    const [alertRules, setAlertRules] = useState<AlertRuleWithRelations[]>([])
    const [monitors, setMonitors] = useState<Monitor[]>([])
    const [channels, setChannels] = useState<NotificationChannel[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [selectedMonitor, setSelectedMonitor] = useState<string>('all')

    const fetchData = async () => {
        try {
            setIsLoading(true)
            setError(null)

            // Fetch alert rules
            const rulesResponse = await fetch('/api/alert-rules')
            const rulesData = await rulesResponse.json()

            if (!rulesResponse.ok) {
                throw new Error(rulesData.error || 'Failed to fetch alert rules')
            }

            // Fetch monitors for filtering
            const monitorsResponse = await fetch('/api/monitors')
            const monitorsData = await monitorsResponse.json()

            if (!monitorsResponse.ok) {
                throw new Error(monitorsData.error || 'Failed to fetch monitors')
            }

            // Fetch notification channels
            const channelsResponse = await fetch('/api/notification-channels')
            const channelsData = await channelsResponse.json()

            if (!channelsResponse.ok) {
                throw new Error(channelsData.error || 'Failed to fetch notification channels')
            }

            setAlertRules(rulesData.alertRules || [])
            setMonitors(monitorsData.monitors || [])
            setChannels(channelsData.channels || [])
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred')
        } finally {
            setIsLoading(false)
        }
    }

    const handleToggleActive = async (ruleId: string, isActive: boolean) => {
        try {
            const response = await fetch(`/api/alert-rules/${ruleId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ is_active: !isActive }),
            })

            if (!response.ok) {
                const data = await response.json()
                throw new Error(data.error || 'Failed to update alert rule')
            }

            // Update the rule in the list
            setAlertRules(prev => prev.map(rule =>
                rule.id === ruleId
                    ? { ...rule, is_active: !isActive }
                    : rule
            ))
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update rule')
        }
    }

    const handleDelete = async (ruleId: string) => {
        if (!confirm('Are you sure you want to delete this alert rule?')) {
            return
        }

        try {
            const response = await fetch(`/api/alert-rules/${ruleId}`, {
                method: 'DELETE',
            })

            if (!response.ok) {
                const data = await response.json()
                throw new Error(data.error || 'Failed to delete alert rule')
            }

            // Remove the rule from the list
            setAlertRules(prev => prev.filter(rule => rule.id !== ruleId))
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete rule')
        }
    }

    useEffect(() => {
        fetchData()
    }, [refreshTrigger])

    // Filter rules by selected monitor
    const filteredRules = selectedMonitor === 'all'
        ? alertRules
        : alertRules.filter(rule => rule.monitor_id === selectedMonitor)

    const getStatusBadge = (rule: AlertRuleWithRelations) => {
        if (!rule.is_active) {
            return (
                <Badge variant="secondary" className="bg-muted/50 text-muted-foreground">
                    <XCircle className="h-3 w-3 mr-1" />
                    Disabled
                </Badge>
            )
        }

        return (
            <Badge className="bg-success/10 text-success border-success/20">
                <CheckCircle className="h-3 w-3 mr-1" />
                Active
            </Badge>
        )
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

    const getAlertConditions = (rule: AlertRuleWithRelations) => {
        const conditions = []
        if (rule.alert_on_down) conditions.push('Down')
        if (rule.alert_on_up) conditions.push('Recovery')
        if (rule.alert_on_timeout) conditions.push('Timeout')
        return conditions.join(', ') || 'None'
    }

    if (isLoading) {
        return (
            <Card className="backdrop-blur-xl bg-background/60 border-border/50">
                <CardHeader>
                    <CardTitle>Alert Rules</CardTitle>
                    <CardDescription>Loading your alert rules...</CardDescription>
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
        <Card className="backdrop-blur-xl bg-background/60 border-border/50">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <Bell className="h-5 w-5" />
                            Alert Rules ({filteredRules.length})
                        </CardTitle>
                        <CardDescription>
                            Configure when and how alerts are triggered for your monitors
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="default"
                            size="sm"
                            onClick={fetchData}
                            className="flex items-center gap-2 hover:bg-primary hover:text-primary-foreground bg-primary/10 border border-primary/40 backdrop-blur-sm text-primary transition-all duration-200 shadow-sm"
                        >
                            <RefreshCw className="h-4 w-4" />
                            Refresh
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                {error && (
                    <Alert variant="destructive" className="backdrop-blur-xl bg-background/60 border-border/50">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                {/* Filter by Monitor */}
                {monitors.length > 0 && (
                    <div className="flex items-center gap-4">
                        <Label htmlFor="monitor-filter">Filter by Monitor:</Label>
                        <Select value={selectedMonitor} onValueChange={setSelectedMonitor}>
                            <SelectTrigger className="w-64 border-muted-foreground/20 bg-background/40 backdrop-blur-sm focus:border-primary/60 focus:bg-background/60">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="backdrop-blur-xl bg-background/80 border-muted-foreground/20">
                                <SelectItem value="all">All Monitors</SelectItem>
                                {monitors.map(monitor => (
                                    <SelectItem key={monitor.id} value={monitor.id}>
                                        {monitor.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}

                {filteredRules.length === 0 ? (
                    <div className="text-center py-12">
                        <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-foreground mb-2">
                            {selectedMonitor === 'all' ? 'No alert rules configured' : 'No rules for this monitor'}
                        </h3>
                        <p className="text-muted-foreground mb-4">
                            {selectedMonitor === 'all'
                                ? 'Alert rules are automatically created when you add notification channels.'
                                : 'This monitor doesn\'t have any alert rules configured.'
                            }
                        </p>
                        {selectedMonitor === 'all' && (
                            <Button
                                variant="default"
                                onClick={() => window.location.href = '/alerts?tab=channels'}
                                className="hover:bg-primary hover:text-primary-foreground bg-primary/10 border border-primary/40 backdrop-blur-sm text-primary transition-all duration-200 shadow-sm"
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                Add Notification Channel
                            </Button>
                        )}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Monitor</TableHead>
                                    <TableHead>Channel</TableHead>
                                    <TableHead>Alert Conditions</TableHead>
                                    <TableHead>Threshold</TableHead>
                                    <TableHead>Cooldown</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredRules.map((rule) => (
                                    <TableRow key={rule.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Activity className="h-4 w-4 text-muted-foreground" />
                                                <div>
                                                    <div className="font-medium text-sm">{rule.monitors.name}</div>
                                                    <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                                                        {rule.monitors.url}
                                                    </div>
                                                </div>
                                            </div>
                                        </TableCell>

                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <span className="text-lg">{getChannelIcon(rule.notification_channels.type)}</span>
                                                <div>
                                                    <div className="font-medium text-sm">{rule.notification_channels.name}</div>
                                                    <Badge variant="outline" className="text-xs text-muted-foreground bg-background/40 backdrop-blur-sm border-muted-foreground/20">
                                                        {rule.notification_channels.type.toUpperCase()}
                                                    </Badge>
                                                </div>
                                            </div>
                                        </TableCell>

                                        <TableCell>
                                            <div className="text-sm">
                                                {getAlertConditions(rule)}
                                            </div>
                                        </TableCell>

                                        <TableCell>
                                            <div className="flex items-center gap-1 text-sm">
                                                <Shield className="h-3 w-3 text-muted-foreground" />
                                                {rule.consecutive_failures_threshold} failure{rule.consecutive_failures_threshold > 1 ? 's' : ''}
                                            </div>
                                        </TableCell>

                                        <TableCell>
                                            <div className="flex items-center gap-1 text-sm">
                                                <Clock className="h-3 w-3 text-muted-foreground" />
                                                {rule.cooldown_minutes}m
                                            </div>
                                        </TableCell>

                                        <TableCell>
                                            {getStatusBadge(rule)}
                                        </TableCell>

                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <div className="flex items-center gap-2">
                                                    <Switch
                                                        checked={rule.is_active}
                                                        onCheckedChange={() => handleToggleActive(rule.id, rule.is_active)}
                                                        className="data-[state=checked]:bg-primary"
                                                    />
                                                    <span className="text-xs text-muted-foreground">
                                                        {rule.is_active ? 'On' : 'Off'}
                                                    </span>
                                                </div>

                                                <Button
                                                    variant="default"
                                                    size="sm"
                                                    onClick={() => handleDelete(rule.id)}
                                                    className="text-xs text-destructive bg-destructive/20 hover:bg-destructive/30 border border-destructive/40 backdrop-blur-sm transition-all duration-200 shadow-sm"
                                                >
                                                    <Trash2 className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}

                {/* Summary Stats */}
                {filteredRules.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-border/50">
                        <div className="text-center p-3 rounded-lg bg-background/40 backdrop-blur-sm">
                            <div className="text-lg font-semibold text-foreground">
                                {filteredRules.filter(r => r.is_active).length}
                            </div>
                            <div className="text-xs text-muted-foreground">Active Rules</div>
                        </div>
                        <div className="text-center p-3 rounded-lg bg-background/40 backdrop-blur-sm">
                            <div className="text-lg font-semibold text-foreground">
                                {new Set(filteredRules.map(r => r.monitor_id)).size}
                            </div>
                            <div className="text-xs text-muted-foreground">Monitored Services</div>
                        </div>
                        <div className="text-center p-3 rounded-lg bg-background/40 backdrop-blur-sm">
                            <div className="text-lg font-semibold text-foreground">
                                {new Set(filteredRules.map(r => r.notification_channel_id)).size}
                            </div>
                            <div className="text-xs text-muted-foreground">Notification Channels</div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
