"use client"

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useSubscription } from '@/lib/contexts/SubscriptionContext'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import { Monitor } from '@/lib/supabase-types'
import {
  ExternalLink,
  BarChart3,
  Search,
  Plus,
  Settings,
  Trash2,
  Edit,
  Copy,
  Play,
  Pause,
  Download,
  Upload,
  Tag,
  CheckSquare,
  Square,
  Clock,
  Globe,
  Shield,
  Code,
  FileText,
  X,
  Loader2,
  AlertCircle,
  CheckCircle
} from 'lucide-react'
import Link from 'next/link'
import AddMonitorForm from '@/components/dashboard/monitor/add-monitor-form'

interface MonitorsPageClientProps {
  monitors: Monitor[]
  stats: {
    total: number
    up: number
    down: number
    timeout: number
    pending: number
    uptimePercentage: number
  }
}

interface EditModalState {
  isOpen: boolean
  monitor: Monitor | null
}

interface IntervalModalState {
  isOpen: boolean
  selectedMonitors: string[]
}

interface DeleteModalState {
  isOpen: boolean
  selectedMonitors: string[]
  monitorNames: string[]
}

function getStatusVariant(status: Monitor['status']) {
  switch (status) {
    case 'up':
      return 'default'
    case 'down':
      return 'destructive'
    case 'timeout':
      return 'outline'
    case 'pending':
      return 'secondary'
    case 'unknown':
      return 'outline'
    default:
      return 'secondary'
  }
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

function formatDate(dateString: string | null) {
  if (!dateString) return 'Never'
  return new Date(dateString).toLocaleDateString()
}

export function MonitorsPageClient({ monitors, stats }: MonitorsPageClientProps) {
  const router = useRouter()
  const { getAllowedIntervals, isFreePlan } = useSubscription()

  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [intervalFilter, setIntervalFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [selectedMonitors, setSelectedMonitors] = useState<Set<string>>(new Set())
  const [activeTab, setActiveTab] = useState('manage')
  const [showBulkActions, setShowBulkActions] = useState(false)

  // Modal states
  const [editModal, setEditModal] = useState<EditModalState>({ isOpen: false, monitor: null })
  const [intervalModal, setIntervalModal] = useState<IntervalModalState>({ isOpen: false, selectedMonitors: [] })
  const [deleteModal, setDeleteModal] = useState<DeleteModalState>({ isOpen: false, selectedMonitors: [], monitorNames: [] })

  // Form states
  const [editForm, setEditForm] = useState({ name: '', url: '', interval_minutes: 5 })
  const [newInterval, setNewInterval] = useState(5)

  // Loading states
  const [isLoading, setIsLoading] = useState<Record<string, boolean>>({})
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null)

  // Filter and search monitors
  const filteredMonitors = useMemo(() => {
    let filtered = monitors.filter(monitor => {
      const matchesSearch = monitor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        monitor.url.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesStatus = statusFilter === 'all' || monitor.status === statusFilter
      const matchesInterval = intervalFilter === 'all' || monitor.interval_minutes.toString() === intervalFilter
      return matchesSearch && matchesStatus && matchesInterval
    })

    // Sort monitors
    filtered.sort((a, b) => {
      let aValue: any
      let bValue: any

      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase()
          bValue = b.name.toLowerCase()
          break
        case 'url':
          aValue = a.url.toLowerCase()
          bValue = b.url.toLowerCase()
          break
        case 'interval':
          aValue = a.interval_minutes
          bValue = b.interval_minutes
          break
        case 'created_at':
          aValue = new Date(a.created_at).getTime()
          bValue = new Date(b.created_at).getTime()
          break
        default:
          aValue = a.name.toLowerCase()
          bValue = b.name.toLowerCase()
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })

    return filtered
  }, [monitors, searchTerm, statusFilter, intervalFilter, sortBy, sortOrder])

  const handleSelectMonitor = (monitorId: string) => {
    const newSelected = new Set(selectedMonitors)
    if (newSelected.has(monitorId)) {
      newSelected.delete(monitorId)
    } else {
      newSelected.add(monitorId)
    }
    setSelectedMonitors(newSelected)
    setShowBulkActions(newSelected.size > 0)
  }

  const handleSelectAll = () => {
    if (selectedMonitors.size === filteredMonitors.length) {
      setSelectedMonitors(new Set())
      setShowBulkActions(false)
    } else {
      setSelectedMonitors(new Set(filteredMonitors.map(m => m.id)))
      setShowBulkActions(true)
    }
  }

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 5000)
  }

  const setLoadingState = (key: string, loading: boolean) => {
    setIsLoading(prev => ({ ...prev, [key]: loading }))
  }

  // Bulk Operations
  const handleBulkEnable = async () => {
    const monitorIds = Array.from(selectedMonitors)
    setLoadingState('bulk-enable', true)

    try {
      const results = await Promise.allSettled(
        monitorIds.map(async id => {
          const response = await fetch(`/api/monitors/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_active: true })
          })

          if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.error || 'Failed to enable monitor')
          }

          return response.json()
        })
      )

      const failures = results.filter(result => result.status === 'rejected').length
      if (failures > 0) {
        showNotification('error', `Failed to enable ${failures} monitor(s)`)
      } else {
        showNotification('success', `Enabled ${monitorIds.length} monitor(s)`)
      }

      setSelectedMonitors(new Set())
      setShowBulkActions(false)
      router.refresh()
    } catch (error) {
      showNotification('error', 'Failed to enable monitors')
    } finally {
      setLoadingState('bulk-enable', false)
    }
  }

  const handleBulkDisable = async () => {
    const monitorIds = Array.from(selectedMonitors)
    setLoadingState('bulk-disable', true)

    try {
      const results = await Promise.allSettled(
        monitorIds.map(async id => {
          const response = await fetch(`/api/monitors/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_active: false })
          })

          if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.error || 'Failed to disable monitor')
          }

          return response.json()
        })
      )

      const failures = results.filter(result => result.status === 'rejected').length
      if (failures > 0) {
        showNotification('error', `Failed to disable ${failures} monitor(s)`)
      } else {
        showNotification('success', `Disabled ${monitorIds.length} monitor(s)`)
      }

      setSelectedMonitors(new Set())
      setShowBulkActions(false)
      router.refresh()
    } catch (error) {
      showNotification('error', 'Failed to disable monitors')
    } finally {
      setLoadingState('bulk-disable', false)
    }
  }

  const openIntervalModal = () => {
    setIntervalModal({
      isOpen: true,
      selectedMonitors: Array.from(selectedMonitors)
    })
  }

  const handleBulkChangeInterval = async () => {
    setLoadingState('bulk-interval', true)

    try {
      const results = await Promise.allSettled(
        intervalModal.selectedMonitors.map(async id => {
          const response = await fetch(`/api/monitors/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ interval_minutes: newInterval })
          })

          if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.error || 'Failed to update interval')
          }

          return response.json()
        })
      )

      const failures = results.filter(result => result.status === 'rejected')
      const successes = results.filter(result => result.status === 'fulfilled')

      if (failures.length > 0) {
        const firstError = failures[0] as PromiseRejectedResult
        if (firstError.reason?.message?.includes('not allowed') || firstError.reason?.message?.includes('INTERVAL_NOT_ALLOWED')) {
          showNotification('error', `Interval ${formatInterval(newInterval)} not allowed for your plan. Upgrade to access shorter intervals.`)
        } else {
          showNotification('error', `Failed to update ${failures.length} monitor(s). ${firstError.reason?.message || ''}`)
        }
      } else {
        showNotification('success', `Updated interval for ${successes.length} monitor(s)`)
      }

      setIntervalModal({ isOpen: false, selectedMonitors: [] })
      setSelectedMonitors(new Set())
      setShowBulkActions(false)
      router.refresh()
    } catch (error) {
      showNotification('error', 'Failed to update intervals')
    } finally {
      setLoadingState('bulk-interval', false)
    }
  }

  const openDeleteModal = () => {
    const monitorIds = Array.from(selectedMonitors)
    const names = monitors
      .filter(m => monitorIds.includes(m.id))
      .map(m => m.name)

    setDeleteModal({
      isOpen: true,
      selectedMonitors: monitorIds,
      monitorNames: names
    })
  }

  const handleBulkDelete = async () => {
    setLoadingState('bulk-delete', true)

    try {
      const results = await Promise.allSettled(
        deleteModal.selectedMonitors.map(async id => {
          const response = await fetch(`/api/monitors/${id}`, {
            method: 'DELETE'
          })

          if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.error || 'Failed to delete monitor')
          }

          return response.json()
        })
      )

      const failures = results.filter(result => result.status === 'rejected').length
      if (failures > 0) {
        showNotification('error', `Failed to delete ${failures} monitor(s)`)
      } else {
        showNotification('success', `Deleted ${deleteModal.selectedMonitors.length} monitor(s)`)
      }

      setDeleteModal({ isOpen: false, selectedMonitors: [], monitorNames: [] })
      setSelectedMonitors(new Set())
      setShowBulkActions(false)
      router.refresh()
    } catch (error) {
      showNotification('error', 'Failed to delete monitors')
    } finally {
      setLoadingState('bulk-delete', false)
    }
  }

  // Individual Operations
  const openEditModal = (monitor: Monitor) => {
    setEditForm({
      name: monitor.name,
      url: monitor.url,
      interval_minutes: monitor.interval_minutes
    })
    setEditModal({ isOpen: true, monitor })
  }

  const handleEditMonitor = async () => {
    if (!editModal.monitor) return

    setLoadingState('edit', true)

    try {
      const response = await fetch(`/api/monitors/${editModal.monitor.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      })

      if (!response.ok) {
        const errorData = await response.json()
        if (errorData.code === 'INTERVAL_NOT_ALLOWED') {
          throw new Error(`Interval ${formatInterval(editForm.interval_minutes)} not allowed for your plan. Upgrade to access shorter intervals.`)
        }
        throw new Error(errorData.error || 'Failed to update monitor')
      }

      showNotification('success', 'Monitor updated successfully')
      setEditModal({ isOpen: false, monitor: null })
      router.refresh()
    } catch (error) {
      showNotification('error', error instanceof Error ? error.message : 'Failed to update monitor')
    } finally {
      setLoadingState('edit', false)
    }
  }

  const handleCopyMonitor = async (monitor: Monitor) => {
    setLoadingState(`copy-${monitor.id}`, true)

    try {
      const response = await fetch('/api/monitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${monitor.name} (Copy)`,
          url: monitor.url,
          interval_minutes: monitor.interval_minutes
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to copy monitor')
      }

      showNotification('success', 'Monitor copied successfully')
      router.refresh()
    } catch (error) {
      showNotification('error', error instanceof Error ? error.message : 'Failed to copy monitor')
    } finally {
      setLoadingState(`copy-${monitor.id}`, false)
    }
  }

  const handleDeleteSingleMonitor = async (monitor: Monitor) => {
    setLoadingState(`delete-${monitor.id}`, true)

    try {
      const response = await fetch(`/api/monitors/${monitor.id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete monitor')
      }

      showNotification('success', 'Monitor deleted successfully')
      router.refresh()
    } catch (error) {
      showNotification('error', error instanceof Error ? error.message : 'Failed to delete monitor')
    } finally {
      setLoadingState(`delete-${monitor.id}`, false)
    }
  }

  const uniqueIntervals = [...new Set(monitors.map(m => m.interval_minutes))].sort((a, b) => a - b)
  const allowedIntervals = getAllowedIntervals()

  return (
    <div className="space-y-6">
      {/* Notification */}
      {notification && (
        <Alert variant={notification.type === 'error' ? 'destructive' : 'default'} className="backdrop-blur-xl bg-background/60 border-border/50">
          {notification.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          <AlertDescription>{notification.message}</AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Monitor Management</h1>
          <p className="text-muted-foreground mt-1">
            Configure, organize, and manage your API monitoring setup
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="default" className="flex items-center gap-2 hover:bg-primary hover:text-primary-foreground bg-primary/10 border border-primary/40 backdrop-blur-sm text-primary transition-all duration-200 shadow-sm">
            <Upload className="h-4 w-4" />
            Import
          </Button>
          <Button variant="default" className="flex items-center gap-2 hover:bg-primary hover:text-primary-foreground bg-primary/10 border border-primary/40 backdrop-blur-sm text-primary transition-all duration-200 shadow-sm">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Quick Stats - Simplified */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="backdrop-blur-xl bg-background/60 border-border/50">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-foreground">{stats.total}</div>
            <p className="text-sm text-muted-foreground">Total Monitors</p>
          </CardContent>
        </Card>
        <Card className="backdrop-blur-xl bg-background/60 border-border/50">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-success">{stats.up}</div>
            <p className="text-sm text-muted-foreground">Active & Running</p>
          </CardContent>
        </Card>
        <Card className="backdrop-blur-xl bg-background/60 border-border/50">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-destructive">{stats.down + stats.timeout}</div>
            <p className="text-sm text-muted-foreground">Need Attention</p>
          </CardContent>
        </Card>
        <Card className="backdrop-blur-xl bg-background/60 border-border/50">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-foreground">{uniqueIntervals.length}</div>
            <p className="text-sm text-muted-foreground">Check Intervals</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 border-border/60 bg-background/40 backdrop-blur-sm">
          <TabsTrigger value="manage" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Manage
          </TabsTrigger>
          <TabsTrigger value="create" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="organize" className="flex items-center gap-2">
            <Tag className="h-4 w-4" />
            Organize
          </TabsTrigger>
        </TabsList>

        {/* Manage Tab */}
        <TabsContent value="manage" className="space-y-6">
          {/* Bulk Actions Bar */}
          {showBulkActions && (
            <Alert className='flex items-center backdrop-blur-xl bg-background/60 border-border/50'>
              <CheckSquare className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between w-full">
                <span>{selectedMonitors.size} monitor(s) selected</span>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleBulkEnable}
                    disabled={isLoading['bulk-enable']}
                    className="hover:bg-success hover:text-success-foreground bg-success/10 border border-success/40 text-success"
                  >
                    {isLoading['bulk-enable'] ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Play className="h-4 w-4 mr-1" />}
                    Enable
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleBulkDisable}
                    disabled={isLoading['bulk-disable']}
                    className="hover:bg-warning hover:text-warning-foreground bg-warning/10 border border-warning/40 text-warning"
                  >
                    {isLoading['bulk-disable'] ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Pause className="h-4 w-4 mr-1" />}
                    Disable
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={openIntervalModal}
                    className="hover:bg-primary hover:text-primary-foreground bg-primary/10 border border-primary/40 text-primary"
                  >
                    <Clock className="h-4 w-4 mr-1" />
                    Change Interval
                  </Button>
                  <Button size="sm" variant="outline" className="hover:bg-info hover:text-info-foreground bg-info/10 border border-info/40 text-info">
                    <Tag className="h-4 w-4 mr-1" />
                    Add Tags
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={openDeleteModal}
                    className="hover:bg-destructive hover:text-destructive-foreground bg-destructive/10 border border-destructive/40 text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Filters and Search */}
          <Card className="backdrop-blur-xl bg-background/60 border-border/50">
            <CardHeader>
              <CardTitle className="text-lg text-foreground">Monitor Configuration</CardTitle>
              <CardDescription className="text-muted-foreground">
                Manage your monitor settings, intervals, and configurations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col lg:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or URL..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <div className="flex gap-2">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[130px] border-border/60 bg-background/40 backdrop-blur-sm">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent className="backdrop-blur-xl bg-background/80 border-border/50">
                      <SelectItem value="all" className='hover:bg-accent/80 focus:bg-accent/80 bg-transparent'>All Status</SelectItem>
                      <SelectItem value="up" className='hover:bg-accent/80 focus:bg-accent/80 bg-transparent'>Online</SelectItem>
                      <SelectItem value="down" className='hover:bg-accent/80 focus:bg-accent/80 bg-transparent'>Offline</SelectItem>
                      <SelectItem value="timeout" className='hover:bg-accent/80 focus:bg-accent/80 bg-transparent'>Timeout</SelectItem>
                      <SelectItem value="pending" className='hover:bg-accent/80 focus:bg-accent/80 bg-transparent'>Pending</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={intervalFilter} onValueChange={setIntervalFilter}>
                    <SelectTrigger className="w-[130px] border-border/60 bg-background/40 backdrop-blur-sm">
                      <SelectValue placeholder="Interval" />
                    </SelectTrigger>
                    <SelectContent className="backdrop-blur-xl bg-background/80 border-border/50">
                      <SelectItem value="all" className='hover:bg-accent/80 focus:bg-accent/80 bg-transparent'>All Intervals</SelectItem>
                      {uniqueIntervals.map(interval => (
                        <SelectItem key={interval} value={interval.toString()} className='hover:bg-accent/80 focus:bg-accent/80 bg-transparent'>
                          {formatInterval(interval)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => {
                    const [field, order] = value.split('-')
                    setSortBy(field)
                    setSortOrder(order as 'asc' | 'desc')
                  }}>
                    <SelectTrigger className="w-[140px] border-border/60 bg-background/40 backdrop-blur-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="backdrop-blur-xl bg-background/80 border-border/50">
                      <SelectItem value="name-asc" className='hover:bg-accent/80 focus:bg-accent/80 bg-transparent'>Name A-Z</SelectItem>
                      <SelectItem value="name-desc" className='hover:bg-accent/80 focus:bg-accent/80 bg-transparent'>Name Z-A</SelectItem>
                      <SelectItem value="url-asc" className='hover:bg-accent/80 focus:bg-accent/80 bg-transparent'>URL A-Z</SelectItem>
                      <SelectItem value="created_at-desc" className='hover:bg-accent/80 focus:bg-accent/80 bg-transparent'>Newest First</SelectItem>
                      <SelectItem value="created_at-asc" className='hover:bg-accent/80 focus:bg-accent/80 bg-transparent'>Oldest First</SelectItem>
                      <SelectItem value="interval-asc" className='hover:bg-accent/80 focus:bg-accent/80 bg-transparent'>Interval Low-High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Monitors Table */}
              {filteredMonitors.length === 0 ? (
                <div className="text-center py-12">
                  <Settings className="mx-auto w-12 h-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    {searchTerm || statusFilter !== 'all' || intervalFilter !== 'all' ? 'No monitors found' : 'No monitors configured'}
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {searchTerm || statusFilter !== 'all' || intervalFilter !== 'all'
                      ? 'Try adjusting your search or filter criteria.'
                      : 'Create your first monitor to start tracking API performance.'
                    }
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <button onClick={handleSelectAll}>
                            {selectedMonitors.size === filteredMonitors.length ?
                              <CheckSquare className="h-4 w-4" /> :
                              <Square className="h-4 w-4" />
                            }
                          </button>
                        </TableHead>
                        <TableHead>Monitor Details</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Configuration</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredMonitors.map((monitor) => (
                        <TableRow key={monitor.id}>
                          <TableCell>
                            <button onClick={() => handleSelectMonitor(monitor.id)}>
                              {selectedMonitors.has(monitor.id) ?
                                <CheckSquare className="h-4 w-4" /> :
                                <Square className="h-4 w-4" />
                              }
                            </button>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium flex items-center gap-2">
                                <span>
                                  {monitor.name}
                                </span>
                                {!monitor.is_active && (
                                  <Badge variant="outline" className="text-xs px-2 py-0 text-muted-foreground border-muted-foreground/20">
                                    Disabled
                                  </Badge>
                                )}
                                <a
                                  href={monitor.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-muted-foreground hover:text-primary"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              </div>
                              <div className="text-sm text-muted-foreground truncate max-w-md">
                                {monitor.url}
                              </div>
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
                          <TableCell>
                            <div className="text-sm">
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                Every {formatInterval(monitor.interval_minutes)}
                              </div>
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <Globe className="h-3 w-3" />
                                HTTP GET
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDate(monitor.created_at)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="sm" asChild>
                                <Link href={`/monitors/${monitor.id}`}>
                                  <BarChart3 className="h-4 w-4" />
                                </Link>
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditModal(monitor)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCopyMonitor(monitor)}
                                disabled={isLoading[`copy-${monitor.id}`]}
                              >
                                {isLoading[`copy-${monitor.id}`] ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteSingleMonitor(monitor)}
                                disabled={isLoading[`delete-${monitor.id}`]}
                              >
                                {isLoading[`delete-${monitor.id}`] ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Create Tab */}
        <TabsContent value="create" className="space-y-6">
          <Card className="backdrop-blur-xl bg-background/60 border-border/50">
            <CardHeader>
              <CardTitle className="text-foreground">Create New Monitor</CardTitle>
              <CardDescription className="text-muted-foreground">
                Set up a new API endpoint monitor with custom configuration
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AddMonitorForm />
            </CardContent>
          </Card>

          {/* Quick Create Templates */}
          <Card className="backdrop-blur-xl bg-background/60 border-border/50">
            <CardHeader>
              <CardTitle className="text-foreground">Quick Templates</CardTitle>
              <CardDescription className="text-muted-foreground">
                Common monitoring configurations for different services
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button variant="outline" className="h-20 flex-col gap-2 hover:bg-primary hover:text-primary-foreground bg-primary/10 border border-primary/40 text-primary">
                  <Globe className="h-6 w-6" />
                  <span>REST API</span>
                </Button>
                <Button variant="outline" className="h-20 flex-col gap-2 hover:bg-primary hover:text-primary-foreground bg-primary/10 border border-primary/40 text-primary">
                  <Code className="h-6 w-6" />
                  <span>GraphQL</span>
                </Button>
                <Button variant="outline" className="h-20 flex-col gap-2 hover:bg-primary hover:text-primary-foreground bg-primary/10 border border-primary/40 text-primary">
                  <Shield className="h-6 w-6" />
                  <span>Health Check</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates">
          <Card className="backdrop-blur-xl bg-background/60 border-border/50">
            <CardHeader>
              <CardTitle className="text-foreground">Monitor Templates</CardTitle>
              <CardDescription className="text-muted-foreground">
                Save and reuse monitor configurations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <FileText className="mx-auto w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2 text-foreground">Templates Coming Soon</h3>
                <p className="text-muted-foreground">
                  Save monitor configurations as templates for quick reuse.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Organize Tab */}
        <TabsContent value="organize">
          <Card className="backdrop-blur-xl bg-background/60 border-border/50">
            <CardHeader>
              <CardTitle className="text-foreground">Organization & Tags</CardTitle>
              <CardDescription className="text-muted-foreground">
                Group and categorize your monitors
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <Tag className="mx-auto w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2 text-foreground">Organization Coming Soon</h3>
                <p className="text-muted-foreground">
                  Group monitors with tags and folders for better organization.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Monitor Modal */}
      {editModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md backdrop-blur-xl bg-background/90 border-border/50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-foreground">Edit Monitor</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditModal({ isOpen: false, monitor: null })}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="edit-name" className="text-foreground">Name</Label>
                <Input
                  id="edit-name"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="border-border/60 bg-background/40 backdrop-blur-sm"
                />
              </div>
              <div>
                <Label htmlFor="edit-url" className="text-foreground">URL</Label>
                <Input
                  id="edit-url"
                  type="url"
                  value={editForm.url}
                  onChange={(e) => setEditForm({ ...editForm, url: e.target.value })}
                  className="border-border/60 bg-background/40 backdrop-blur-sm"
                />
              </div>
              <div>
                <Label htmlFor="edit-interval" className="text-foreground">Check Interval (minutes)</Label>
                <Select
                  value={editForm.interval_minutes.toString()}
                  onValueChange={(value) => setEditForm({ ...editForm, interval_minutes: parseInt(value) })}
                >
                  <SelectTrigger className="border-border/60 bg-background/40 backdrop-blur-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="backdrop-blur-xl bg-background/80 border-border/50">
                    {allowedIntervals.map(interval => (
                      <SelectItem key={interval} value={interval.toString()} className='hover:bg-accent/80 focus:bg-accent/80 bg-transparent'>
                        {formatInterval(interval)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {isFreePlan && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Upgrade to access 1-minute intervals
                  </p>
                )}
              </div>
              <div className="flex gap-2 pt-4">
                <Button
                  onClick={handleEditMonitor}
                  disabled={isLoading['edit']}
                  className="flex-1 hover:bg-primary hover:text-primary-foreground bg-primary/10 border border-primary/40 text-primary"
                >
                  {isLoading['edit'] ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Save Changes
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setEditModal({ isOpen: false, monitor: null })}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Change Interval Modal */}
      {intervalModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Change Check Interval</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIntervalModal({ isOpen: false, selectedMonitors: [] })}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <CardDescription>
                Update the check interval for {intervalModal.selectedMonitors.length} selected monitor(s)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="new-interval">New Check Interval</Label>
                <Select
                  value={newInterval.toString()}
                  onValueChange={(value) => setNewInterval(parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {allowedIntervals.map(interval => (
                      <SelectItem key={interval} value={interval.toString()}>
                        {formatInterval(interval)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {isFreePlan && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Upgrade to access 1-minute intervals
                  </p>
                )}
              </div>
              <div className="flex gap-2 pt-4">
                <Button
                  onClick={handleBulkChangeInterval}
                  disabled={isLoading['bulk-interval']}
                  className="flex-1"
                >
                  {isLoading['bulk-interval'] ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Update Interval
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIntervalModal({ isOpen: false, selectedMonitors: [] })}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-destructive">Delete Monitors</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeleteModal({ isOpen: false, selectedMonitors: [], monitorNames: [] })}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <CardDescription>
                This action cannot be undone. This will permanently delete the selected monitors.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-destructive/10 rounded-lg">
                <p className="font-medium mb-2">Monitors to be deleted:</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {deleteModal.monitorNames.map((name, index) => (
                    <li key={index}>• {name}</li>
                  ))}
                </ul>
              </div>
              <div className="flex gap-2 pt-4">
                <Button
                  variant="destructive"
                  onClick={handleBulkDelete}
                  disabled={isLoading['bulk-delete']}
                  className="flex-1"
                >
                  {isLoading['bulk-delete'] ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Delete Monitors
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setDeleteModal({ isOpen: false, selectedMonitors: [], monitorNames: [] })}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
} 