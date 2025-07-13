"use client"

import { useState, useEffect, useCallback } from 'react'
import { AlertLog, Monitor, NotificationChannel, AlertStatus, AlertType } from '@/lib/supabase-types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { useMediaQuery } from '@/lib/hooks/use-media-query'
import {
    History,
    CheckCircle,
    XCircle,
    AlertTriangle,
    Clock,
    RefreshCw,
    ChevronLeft,
    ChevronRight,
    Search,
    Filter,
    Mail,
    MessageSquare,
    Webhook,
    Activity,
    Calendar,
    User
} from 'lucide-react'

interface AlertLogWithRelations extends AlertLog {
    monitors: Pick<Monitor, 'id' | 'name' | 'url'> | null
    notification_channels: Pick<NotificationChannel, 'id' | 'name' | 'type'> | null
}

interface AlertHistoryListProps {
    refreshTrigger?: number
}

export default function AlertHistoryList({ refreshTrigger }: AlertHistoryListProps) {
    const [alertLogs, setAlertLogs] = useState<AlertLogWithRelations[]>([])
    const [monitors, setMonitors] = useState<Monitor[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Pagination
    const [currentPage, setCurrentPage] = useState(1)
    const [totalItems, setTotalItems] = useState(0)
    const [pageSize] = useState(25)

    // Filters
    const [selectedMonitor, setSelectedMonitor] = useState<string>('all')
    const [selectedStatus, setSelectedStatus] = useState<string>('all')
    const [selectedType, setSelectedType] = useState<string>('all')
    const [searchTerm, setSearchTerm] = useState('')

    // Responsive breakpoint
    const isMobile = useMediaQuery('(max-width: 640px)')

    const fetchData = useCallback(async () => {
        try {
            setIsLoading(true)
            setError(null)

            const offset = (currentPage - 1) * pageSize
            const params = new URLSearchParams({
                limit: pageSize.toString(),
                offset: offset.toString(),
            })

            if (selectedMonitor !== 'all') {
                params.set('monitor_id', selectedMonitor)
            }

            if (selectedStatus !== 'all') {
                params.set('status', selectedStatus)
            }

            if (selectedType !== 'all') {
                params.set('alert_type', selectedType)
            }

            // Fetch alert history
            const historyResponse = await fetch(`/api/alert-history?${params}`)
            const historyData = await historyResponse.json()

            if (!historyResponse.ok) {
                throw new Error(historyData.error || 'Failed to fetch alert history')
            }

            // Fetch monitors for filtering (only if not already loaded)
            if (monitors.length === 0) {
                const monitorsResponse = await fetch('/api/monitors')
                const monitorsData = await monitorsResponse.json()

                if (monitorsResponse.ok) {
                    setMonitors(monitorsData.monitors || [])
                }
            }

            setAlertLogs(historyData.alertLogs || [])
            setTotalItems(historyData.total || 0)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred')
        } finally {
            setIsLoading(false)
        }
    }, [currentPage, selectedMonitor, selectedStatus, selectedType, pageSize, monitors.length])

    useEffect(() => {
        fetchData()
    }, [fetchData, refreshTrigger])

    // Filter logs by search term
    const filteredLogs = searchTerm
        ? alertLogs.filter(log =>
            log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.monitors?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.notification_channels?.name.toLowerCase().includes(searchTerm.toLowerCase())
        )
        : alertLogs

    const totalPages = Math.ceil(totalItems / pageSize)

    const getStatusBadge = (status: AlertStatus) => {
        switch (status) {
            case 'sent':
                return (
                    <Badge className="bg-success/10 text-success border-success/20">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Sent
                    </Badge>
                )
            case 'failed':
                return (
                    <Badge variant="destructive">
                        <XCircle className="h-3 w-3 mr-1" />
                        Failed
                    </Badge>
                )
            case 'pending':
                return (
                    <Badge className="bg-warning/10 text-warning border-warning/20">
                        <Clock className="h-3 w-3 mr-1" />
                        Pending
                    </Badge>
                )
            case 'queued':
                return (
                    <Badge variant="secondary">
                        <Clock className="h-3 w-3 mr-1" />
                        Queued
                    </Badge>
                )
            default:
                return (
                    <Badge variant="outline">
                        {status}
                    </Badge>
                )
        }
    }

    const getTypeIcon = (type: AlertType) => {
        switch (type) {
            case 'email':
                return <Mail className="h-4 w-4" />
            case 'sms':
                return <MessageSquare className="h-4 w-4" />
            case 'webhook':
                return <Webhook className="h-4 w-4" />
            default:
                return <Activity className="h-4 w-4" />
        }
    }

    const getTriggerStatusBadge = (status: string) => {
        switch (status) {
            case 'down':
                return <Badge variant="destructive" className="text-xs">Down</Badge>
            case 'up':
                return <Badge className="bg-success/10 text-success border-success/20 text-xs">Up</Badge>
            case 'timeout':
                return <Badge className="bg-warning/10 text-warning border-warning/20 text-xs">Timeout</Badge>
            default:
                return <Badge variant="outline" className="text-xs">{status}</Badge>
        }
    }

    const formatDate = (dateString: string) => {
        const date = new Date(dateString)
        const now = new Date()
        const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

        if (diffInHours < 24) {
            return date.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            })
        } else if (diffInHours < 168) { // 7 days
            return date.toLocaleDateString('en-US', {
                weekday: 'short',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            })
        } else {
            return date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            })
        }
    }

    if (isLoading) {
        return (
            <Card className="backdrop-blur-xl bg-background/60 border-border/50">
                <CardHeader>
                    <CardTitle>Alert History</CardTitle>
                    <CardDescription>Loading your alert history...</CardDescription>
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
                            <History className="h-5 w-5" />
                            Alert History ({totalItems})
                        </CardTitle>
                        <CardDescription>
                            View your alert notification history and delivery status
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

                {/* Filters */}
                <div className="flex flex-col lg:flex-row gap-4">
                    {/* Search */}
                    <div className="flex-1 min-w-0">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search alerts by message or monitor name..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 border-muted-foreground/20 bg-background/40 focus:border-primary/60 focus:bg-background/60"
                            />
                        </div>
                    </div>

                    {/* Filter Controls */}
                    <div className="flex flex-col sm:flex-row gap-2 lg:gap-3">
                        {/* Monitor Filter */}
                        {monitors.length > 0 && (
                            <Select value={selectedMonitor} onValueChange={setSelectedMonitor}>
                                <SelectTrigger className="w-full sm:w-48 border-muted-foreground/20 bg-background/40 backdrop-blur-sm focus:border-primary/60 focus:bg-background/60">
                                    <SelectValue placeholder="All Monitors" />
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
                        )}

                        {/* Status Filter */}
                        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                            <SelectTrigger className="w-full sm:w-36 border-muted-foreground/20 bg-background/40 backdrop-blur-sm focus:border-primary/60 focus:bg-background/60">
                                <SelectValue placeholder="All Status" />
                            </SelectTrigger>
                            <SelectContent className="backdrop-blur-xl bg-background/80 border-muted-foreground/20">
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="sent">Sent</SelectItem>
                                <SelectItem value="failed">Failed</SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="queued">Queued</SelectItem>
                            </SelectContent>
                        </Select>

                        {/* Type Filter */}
                        <Select value={selectedType} onValueChange={setSelectedType}>
                            <SelectTrigger className="w-full sm:w-32 border-muted-foreground/20 bg-background/40 backdrop-blur-sm focus:border-primary/60 focus:bg-background/60">
                                <SelectValue placeholder="All Types" />
                            </SelectTrigger>
                            <SelectContent className="backdrop-blur-xl bg-background/80 border-muted-foreground/20">
                                <SelectItem value="all">All Types</SelectItem>
                                <SelectItem value="email">Email</SelectItem>
                                <SelectItem value="sms">SMS</SelectItem>
                                <SelectItem value="webhook">Webhook</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {filteredLogs.length === 0 ? (
                    <div className="text-center py-12">
                        <History className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-foreground mb-2">
                            {searchTerm ? 'No alerts match your search' : 'No alert history found'}
                        </h3>
                        <p className="text-muted-foreground mb-4">
                            {searchTerm
                                ? 'Try adjusting your search terms or filters'
                                : 'Alert history will appear here once alerts start being sent'
                            }
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Monitor</TableHead>
                                        <TableHead>Channel</TableHead>
                                        <TableHead>Trigger</TableHead>
                                        <TableHead>Message</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Time</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredLogs.map((log) => (
                                        <TableRow key={log.id}>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Activity className="h-4 w-4 text-muted-foreground" />
                                                    <div>
                                                        <div className="font-medium text-sm">
                                                            {log.monitors?.name || 'Unknown Monitor'}
                                                        </div>
                                                        {log.monitors?.url && (
                                                            <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                                                                {log.monitors.url}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </TableCell>

                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    {log.notification_channels && getTypeIcon(log.alert_type)}
                                                    <div>
                                                        <div className="font-medium text-sm">
                                                            {log.notification_channels?.name || 'Unknown Channel'}
                                                        </div>
                                                        <Badge variant="outline" className="text-xs text-muted-foreground bg-background/40 backdrop-blur-sm border-muted-foreground/20">
                                                            {log.alert_type.toUpperCase()}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            </TableCell>

                                            <TableCell>
                                                <div className="flex flex-col gap-1">
                                                    {getTriggerStatusBadge(log.trigger_status)}
                                                    {log.consecutive_failures > 1 && (
                                                        <span className="text-xs text-muted-foreground">
                                                            {log.consecutive_failures} failures
                                                        </span>
                                                    )}
                                                </div>
                                            </TableCell>

                                            <TableCell>
                                                <div className="max-w-[300px]">
                                                    <p className="text-sm truncate" title={log.message}>
                                                        {log.message}
                                                    </p>
                                                    {log.error_message && (
                                                        <p className="text-xs text-destructive mt-1 truncate" title={log.error_message}>
                                                            Error: {log.error_message}
                                                        </p>
                                                    )}
                                                </div>
                                            </TableCell>

                                            <TableCell>
                                                {getStatusBadge(log.status)}
                                            </TableCell>

                                            <TableCell>
                                                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                                    <Calendar className="h-3 w-3" />
                                                    {formatDate(log.sent_at || log.created_at)}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-border/50">
                                <div className="text-sm text-muted-foreground text-center sm:text-left">
                                    Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalItems)} of {totalItems} alerts
                                </div>
                                <div className="flex items-center justify-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                        className="!border-muted-foreground/20 bg-background/40 backdrop-blur-sm hover:bg-background/60"
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                        <span className="hidden sm:inline">Previous</span>
                                    </Button>

                                    <div className="flex items-center gap-1">
                                        {(() => {
                                            const maxVisiblePages = isMobile ? 3 : 5
                                            const halfVisible = Math.floor(maxVisiblePages / 2)

                                            let startPage = Math.max(1, currentPage - halfVisible)
                                            let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1)

                                            // Adjust start page if we're near the end
                                            if (endPage - startPage + 1 < maxVisiblePages) {
                                                startPage = Math.max(1, endPage - maxVisiblePages + 1)
                                            }

                                            const pages = []

                                            // Add first page if not in range
                                            if (startPage > 1) {
                                                pages.push(
                                                    <Button
                                                        key={1}
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => setCurrentPage(1)}
                                                        className="min-w-[2.5rem] !border-muted-foreground/20 bg-background/40 backdrop-blur-sm hover:bg-background/60"
                                                    >
                                                        1
                                                    </Button>
                                                )

                                                if (startPage > 2) {
                                                    pages.push(
                                                        <span key="ellipsis1" className="px-1 text-muted-foreground text-sm">...</span>
                                                    )
                                                }
                                            }

                                            // Add visible pages
                                            for (let page = startPage; page <= endPage; page++) {
                                                pages.push(
                                                    <Button
                                                        key={page}
                                                        variant={page === currentPage ? "default" : "outline"}
                                                        size="sm"
                                                        onClick={() => setCurrentPage(page)}
                                                        className={`min-w-[2.5rem] ${page === currentPage
                                                            ? "hover:bg-primary/10 bg-primary/10 border border-primary/40 backdrop-blur-sm text-primary transition-all duration-200 shadow-sm"
                                                            : "!border-muted-foreground/20 bg-background/40 backdrop-blur-sm hover:bg-background/60"
                                                            }`}
                                                    >
                                                        {page}
                                                    </Button>
                                                )
                                            }

                                            // Add last page if not in range
                                            if (endPage < totalPages) {
                                                if (endPage < totalPages - 1) {
                                                    pages.push(
                                                        <span key="ellipsis2" className="px-1 text-muted-foreground text-sm">...</span>
                                                    )
                                                }

                                                pages.push(
                                                    <Button
                                                        key={totalPages}
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => setCurrentPage(totalPages)}
                                                        className="min-w-[2.5rem] !border-muted-foreground/20 bg-background/40 backdrop-blur-sm hover:bg-background/60"
                                                    >
                                                        {totalPages}
                                                    </Button>
                                                )
                                            }

                                            return pages
                                        })()}
                                    </div>

                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        disabled={currentPage === totalPages}
                                        className="!border-muted-foreground/20 bg-background/40 backdrop-blur-sm hover:bg-background/60"
                                    >
                                        <span className="hidden sm:inline">Next</span>
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* Summary Stats */}
                {filteredLogs.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-border/50">
                        <div className="text-center p-3 rounded-lg bg-background/40 backdrop-blur-sm">
                            <div className="text-lg font-semibold text-success">
                                {filteredLogs.filter(log => log.status === 'sent').length}
                            </div>
                            <div className="text-xs text-muted-foreground">Sent</div>
                        </div>
                        <div className="text-center p-3 rounded-lg bg-background/40 backdrop-blur-sm">
                            <div className="text-lg font-semibold text-destructive">
                                {filteredLogs.filter(log => log.status === 'failed').length}
                            </div>
                            <div className="text-xs text-muted-foreground">Failed</div>
                        </div>
                        <div className="text-center p-3 rounded-lg bg-background/40 backdrop-blur-sm">
                            <div className="text-lg font-semibold text-warning">
                                {filteredLogs.filter(log => log.status === 'pending').length}
                            </div>
                            <div className="text-xs text-muted-foreground">Pending</div>
                        </div>
                        <div className="text-center p-3 rounded-lg bg-background/40 backdrop-blur-sm">
                            <div className="text-lg font-semibold text-foreground">
                                {new Set(filteredLogs.map(log => log.monitor_id)).size}
                            </div>
                            <div className="text-xs text-muted-foreground">Monitors</div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
