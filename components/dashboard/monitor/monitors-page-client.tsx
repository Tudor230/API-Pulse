"use client"

import { useState, useMemo, useRef } from 'react'
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

interface ImportModalState {
  isOpen: boolean
}

interface ExportModalState {
  isOpen: boolean
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
  const [importModal, setImportModal] = useState<ImportModalState>({ isOpen: false })

  // Form states
  const [editForm, setEditForm] = useState({ name: '', url: '', interval_minutes: 5 })
  const [newInterval, setNewInterval] = useState(5)

  // Loading states
  const [isLoading, setIsLoading] = useState<Record<string, boolean>>({})
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null)

  // Import/Export Operations
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importData, setImportData] = useState<any[]>([])
  const [importPreview, setImportPreview] = useState<any[]>([])
  const [importValidation, setImportValidation] = useState<{
    total: number
    valid: number
    duplicates: number
    errors: string[]
  }>({ total: 0, valid: 0, duplicates: 0, errors: [] })

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

  // Export Monitors
  const handleExportMonitors = (selectedOnly = false) => {
    const monitorsToExport = selectedOnly && selectedMonitors.size > 0
      ? monitors.filter(m => selectedMonitors.has(m.id))
      : monitors

    if (monitorsToExport.length === 0) {
      showNotification('error', 'No monitors to export')
      return
    }

    const exportData = monitorsToExport.map(monitor => ({
      name: monitor.name,
      url: monitor.url,
      interval_minutes: monitor.interval_minutes,
      is_active: monitor.is_active
    }))

    const dataStr = JSON.stringify(exportData, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)

    const filename = selectedOnly
      ? `monitors-selected-export-${new Date().toISOString().split('T')[0]}.json`
      : `monitors-export-${new Date().toISOString().split('T')[0]}.json`

    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    const count = monitorsToExport.length
    showNotification('success', `${count} monitor${count !== 1 ? 's' : ''} exported successfully`)
  }

  const handleDownloadSample = () => {
    const sampleData = [
      {
        name: "Example API",
        url: "https://api.example.com/health",
        interval_minutes: 5,
        is_active: true
      },
      {
        name: "Company Website",
        url: "https://www.company.com",
        interval_minutes: 15,
        is_active: true
      },
      {
        name: "Development Server",
        url: "https://dev.company.com/api/status",
        interval_minutes: 10,
        is_active: false
      }
    ]

    const dataStr = JSON.stringify(sampleData, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)

    const link = document.createElement('a')
    link.href = url
    link.download = 'monitors-sample.json'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    showNotification('success', 'Sample file downloaded')
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (file.type !== 'application/json') {
      showNotification('error', 'Please select a JSON file')
      return
    }

    setImportFile(file)
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string)

        if (!Array.isArray(data)) {
          throw new Error('Invalid format: Expected an array of monitors')
        }

        const errors: string[] = []
        const existingUrls = new Set(monitors.map(m => m.url.toLowerCase()))
        let duplicates = 0

        // Validate monitor structure
        const validatedData = data.map((item, index) => {
          if (!item.name || !item.url) {
            errors.push(`Monitor ${index + 1}: Missing required fields (name, url)`)
            return null
          }

          try {
            new URL(item.url) // Validate URL format
          } catch {
            errors.push(`Monitor ${index + 1}: Invalid URL format`)
            return null
          }

          if (existingUrls.has(item.url.toLowerCase())) {
            duplicates++
          }

          return {
            name: String(item.name),
            url: String(item.url),
            interval_minutes: Number(item.interval_minutes) || 5,
            is_active: Boolean(item.is_active ?? true)
          }
        }).filter(Boolean)

        setImportData(validatedData)
        setImportPreview(validatedData.slice(0, 20)) // Show first 5 for preview
        setImportValidation({
          total: data.length,
          valid: validatedData.length,
          duplicates,
          errors: errors.slice(0, 5) // Show first 5 errors
        })

      } catch (error) {
        showNotification('error', error instanceof Error ? error.message : 'Invalid JSON file')
        setImportFile(null)
        setImportData([])
        setImportPreview([])
        setImportValidation({ total: 0, valid: 0, duplicates: 0, errors: [] })
      }
    }

    reader.readAsText(file)
  }

  const handleImportMonitors = async () => {
    if (!importData.length) return

    setLoadingState('import', true)

    try {
      const results = await Promise.allSettled(
        importData.map(async (monitorData) => {
          const response = await fetch('/api/monitors', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(monitorData)
          })

          if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.error || 'Failed to import monitor')
          }

          return response.json()
        })
      )

      const successful = results.filter(result => result.status === 'fulfilled').length
      const failed = results.filter(result => result.status === 'rejected').length

      if (failed > 0) {
        showNotification('error', `Imported ${successful} monitors, ${failed} failed`)
      } else {
        showNotification('success', `Successfully imported ${successful} monitors`)
      }

      // Reset import state
      setImportModal({ isOpen: false })
      setImportFile(null)
      setImportData([])
      setImportPreview([])
      setImportValidation({ total: 0, valid: 0, duplicates: 0, errors: [] })
      if (fileInputRef.current) fileInputRef.current.value = ''

      router.refresh()
    } catch (error) {
      showNotification('error', 'Failed to import monitors')
    } finally {
      setLoadingState('import', false)
    }
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Monitor Management</h1>
          <p className="text-muted-foreground mt-1">
            Configure, organize, and manage your API monitoring setup
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="default"
            className="flex items-center gap-2 hover:bg-primary hover:text-primary-foreground bg-primary/10 border border-primary/40 backdrop-blur-sm text-primary transition-all duration-200 shadow-sm"
            onClick={() => setImportModal({ isOpen: true })}
          >
            <Upload className="h-4 w-4" />
            <span className="hidden sm:inline">Import</span>
          </Button>
          <Button
            variant="default"
            className="flex items-center gap-2 hover:bg-primary hover:text-primary-foreground bg-primary/10 border border-primary/40 backdrop-blur-sm text-primary transition-all duration-200 shadow-sm"
            onClick={() => handleExportMonitors(false)}
            disabled={monitors.length === 0}
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Export</span>
          </Button>
        </div>
      </div>

      {/* Quick Stats - Simplified */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="backdrop-blur-xl bg-background/60 border-border/50">
          <CardContent className="p-3 sm:p-4">
            <div className="text-xl sm:text-2xl font-bold text-foreground">{stats.total}</div>
            <p className="text-xs sm:text-sm text-muted-foreground">Total Monitors</p>
          </CardContent>
        </Card>
        <Card className="backdrop-blur-xl bg-background/60 border-border/50">
          <CardContent className="p-3 sm:p-4">
            <div className="text-xl sm:text-2xl font-bold text-success">{stats.up}</div>
            <p className="text-xs sm:text-sm text-muted-foreground">Active & Running</p>
          </CardContent>
        </Card>
        <Card className="backdrop-blur-xl bg-background/60 border-border/50">
          <CardContent className="p-3 sm:p-4">
            <div className="text-xl sm:text-2xl font-bold text-destructive">{stats.down + stats.timeout}</div>
            <p className="text-xs sm:text-sm text-muted-foreground">Need Attention</p>
          </CardContent>
        </Card>
        <Card className="backdrop-blur-xl bg-background/60 border-border/50">
          <CardContent className="p-3 sm:p-4">
            <div className="text-xl sm:text-2xl font-bold text-foreground">{uniqueIntervals.length}</div>
            <p className="text-xs sm:text-sm text-muted-foreground">Check Intervals</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 border-border/60 bg-background/60 backdrop-blur-sm">
          <TabsTrigger value="manage" className="flex items-center gap-1 sm:gap-2 data-[state=active]:!bg-primary/20 data-[state=active]:!text-primary data-[state=active]:!border-primary/40 text-xs sm:text-sm px-1 sm:px-3">
            <Settings className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
            <span className="hidden sm:inline">Manage</span>
          </TabsTrigger>
          <TabsTrigger value="create" className="flex items-center gap-1 sm:gap-2 data-[state=active]:!bg-primary/20 data-[state=active]:!text-primary data-[state=active]:!border-primary/40 text-xs sm:text-sm px-1 sm:px-3">
            <Plus className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
            <span className="hidden sm:inline">Create</span>
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-1 sm:gap-2 data-[state=active]:!bg-primary/20 data-[state=active]:!text-primary data-[state=active]:!border-primary/40 text-xs sm:text-sm px-1 sm:px-3">
            <FileText className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
            <span className="hidden sm:inline">Templates</span>
          </TabsTrigger>
          <TabsTrigger value="organize" className="flex items-center gap-1 sm:gap-2 data-[state=active]:!bg-primary/20 data-[state=active]:!text-primary data-[state=active]:!border-primary/40 text-xs sm:text-sm px-1 sm:px-3">
            <Tag className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
            <span className="hidden sm:inline">Organize</span>
          </TabsTrigger>
        </TabsList>

        {/* Manage Tab */}
        <TabsContent value="manage" className="space-y-6">
          {/* Bulk Actions Bar */}
          {showBulkActions && (
            <Alert className='flex items-center backdrop-blur-xl bg-background/60 border-border/50'>
              <CheckSquare className="h-4 w-4 flex-shrink-0" />
              <AlertDescription className="flex flex-col sm:flex-row sm:items-center justify-between w-full gap-2 sm:gap-4">
                <span className="text-sm">{selectedMonitors.size} monitor(s) selected</span>
                <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                  <Button
                    size="sm"
                    variant="default"
                    onClick={handleBulkEnable}
                    disabled={isLoading['bulk-enable']}
                    className="hover:bg-success hover:text-success-foreground bg-success/10 border border-success/40 text-success text-xs sm:text-sm"
                  >
                    {isLoading['bulk-enable'] ? <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 animate-spin" /> : <Play className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />}
                    <span className="hidden sm:inline">Enable</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="default"
                    onClick={handleBulkDisable}
                    disabled={isLoading['bulk-disable']}
                    className="hover:bg-warning hover:text-warning-foreground bg-warning/10 border border-warning/40 text-warning text-xs sm:text-sm"
                  >
                    {isLoading['bulk-disable'] ? <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 animate-spin" /> : <Pause className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />}
                    <span className="hidden sm:inline">Disable</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="default"
                    onClick={openIntervalModal}
                    className="hover:bg-primary hover:text-primary-foreground bg-primary/10 border border-primary/40 text-primary text-xs sm:text-sm"
                  >
                    <Clock className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                    <span className="hidden sm:inline">Change Interval</span>
                    <span className="sm:hidden">Interval</span>
                  </Button>
                  {/* <Button size="sm" variant="default" className="hover:bg-info hover:text-info-foreground bg-info/10 border border-info/40 text-info text-xs sm:text-sm hidden sm:inline-flex">
                    <Tag className="h-4 w-4 mr-1" />
                    Add Tags
                  </Button> */}
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => handleExportMonitors(true)}
                    className="hover:bg-primary hover:text-primary-foreground bg-primary/10 border border-primary/40 text-primary text-xs sm:text-sm"
                  >
                    <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                    <span className="hidden sm:inline">Export</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="default"
                    onClick={openDeleteModal}
                    className="border-destructive text-destructive bg-destructive/20 text-xs sm:text-sm"
                  >
                    <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                    <span className="hidden sm:inline">Delete</span>
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Filters and Search */}
          <Card className="backdrop-blur-xl bg-background/60 border-border/50">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg text-foreground">Monitor Configuration</CardTitle>
              <CardDescription className="text-muted-foreground">
                Manage your monitor settings, intervals, and configurations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4 mb-6">
                {/* Search and Filters Row */}
                <div className="flex flex-col lg:flex-row gap-4">
                  {/* Search Bar */}
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name or URL..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 border-muted-foreground/20"
                    />
                  </div>

                  {/* Desktop Filters - Next to Search */}
                  <div className="hidden lg:flex items-center gap-2">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-32 border-muted-foreground/20 bg-background/40 backdrop-blur-sm">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent className="backdrop-blur-xl bg-background/80 border-muted-foreground/20">
                        <SelectItem value="all" className='hover:bg-accent/80 focus:bg-accent/80 bg-transparent'>All Status</SelectItem>
                        <SelectItem value="up" className='hover:bg-accent/80 focus:bg-accent/80 bg-transparent'>Online</SelectItem>
                        <SelectItem value="down" className='hover:bg-accent/80 focus:bg-accent/80 bg-transparent'>Offline</SelectItem>
                        <SelectItem value="timeout" className='hover:bg-accent/80 focus:bg-accent/80 bg-transparent'>Timeout</SelectItem>
                        <SelectItem value="pending" className='hover:bg-accent/80 focus:bg-accent/80 bg-transparent'>Pending</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={intervalFilter} onValueChange={setIntervalFilter}>
                      <SelectTrigger className="w-36 border-muted-foreground/20 bg-background/40 backdrop-blur-sm">
                        <SelectValue placeholder="Interval" />
                      </SelectTrigger>
                      <SelectContent className="backdrop-blur-xl bg-background/80 border-muted-foreground/20">
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
                      <SelectTrigger className="w-40 border-muted-foreground/20 bg-background/40 backdrop-blur-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="backdrop-blur-xl bg-background/80 border-muted-foreground/20">
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

                {/* Mobile Filters - Below Search */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 lg:hidden">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="border-muted-foreground/20 bg-background/40 backdrop-blur-sm">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent className="backdrop-blur-xl bg-background/80 border-muted-foreground/20">
                      <SelectItem value="all" className='hover:bg-accent/80 focus:bg-accent/80 bg-transparent'>All Status</SelectItem>
                      <SelectItem value="up" className='hover:bg-accent/80 focus:bg-accent/80 bg-transparent'>Online</SelectItem>
                      <SelectItem value="down" className='hover:bg-accent/80 focus:bg-accent/80 bg-transparent'>Offline</SelectItem>
                      <SelectItem value="timeout" className='hover:bg-accent/80 focus:bg-accent/80 bg-transparent'>Timeout</SelectItem>
                      <SelectItem value="pending" className='hover:bg-accent/80 focus:bg-accent/80 bg-transparent'>Pending</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={intervalFilter} onValueChange={setIntervalFilter}>
                    <SelectTrigger className="border-muted-foreground/20 bg-background/40 backdrop-blur-sm">
                      <SelectValue placeholder="Interval" />
                    </SelectTrigger>
                    <SelectContent className="backdrop-blur-xl bg-background/80 border-muted-foreground/20">
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
                    <SelectTrigger className="border-muted-foreground/20 bg-background/40 backdrop-blur-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="backdrop-blur-xl bg-background/80 border-muted-foreground/20">
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
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Button variant="outline" className="h-16 sm:h-20 flex-col gap-2 hover:bg-primary hover:text-primary-foreground bg-primary/10 border border-primary/40 text-primary">
                  <Globe className="h-5 w-5 sm:h-6 sm:w-6" />
                  <span className="text-sm sm:text-base">REST API</span>
                </Button>
                <Button variant="outline" className="h-16 sm:h-20 flex-col gap-2 hover:bg-primary hover:text-primary-foreground bg-primary/10 border border-primary/40 text-primary">
                  <Code className="h-5 w-5 sm:h-6 sm:w-6" />
                  <span className="text-sm sm:text-base">GraphQL</span>
                </Button>
                <Button variant="outline" className="h-16 sm:h-20 flex-col gap-2 hover:bg-primary hover:text-primary-foreground bg-primary/10 border border-primary/40 text-primary">
                  <Shield className="h-5 w-5 sm:h-6 sm:w-6" />
                  <span className="text-sm sm:text-base">Health Check</span>
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md mx-4 backdrop-blur-xl bg-background/90 border-border/50 shadow-2xl">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-foreground">Edit Monitor</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditModal({ isOpen: false, monitor: null })}
                  className="hover:bg-accent/80 text-muted-foreground hover:text-foreground"
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
                  className="border-border/60 bg-background/40 backdrop-blur-sm focus:border-primary/60 focus:bg-background/60"
                />
              </div>
              <div>
                <Label htmlFor="edit-url" className="text-foreground">URL</Label>
                <Input
                  id="edit-url"
                  type="url"
                  value={editForm.url}
                  onChange={(e) => setEditForm({ ...editForm, url: e.target.value })}
                  className="border-border/60 bg-background/40 backdrop-blur-sm focus:border-primary/60 focus:bg-background/60"
                />
              </div>
              <div>
                <Label htmlFor="edit-interval" className="text-foreground">Check Interval (minutes)</Label>
                <Select
                  value={editForm.interval_minutes.toString()}
                  onValueChange={(value) => setEditForm({ ...editForm, interval_minutes: parseInt(value) })}
                >
                  <SelectTrigger className="border-border/60 bg-background/40 backdrop-blur-sm focus:border-primary/60 focus:bg-background/60">
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
              <div className="flex flex-col sm:flex-row gap-2 pt-4">
                <Button
                  onClick={handleEditMonitor}
                  disabled={isLoading['edit']}
                  className="flex-1 hover:bg-primary hover:text-primary-foreground bg-primary/10 border border-primary/40 text-primary transition-all duration-200"
                >
                  {isLoading['edit'] ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Save Changes
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setEditModal({ isOpen: false, monitor: null })}
                  className="flex-1 hover:bg-accent/80 border-border/60 backdrop-blur-sm transition-all duration-200"
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md mx-4 backdrop-blur-xl bg-background/90 border-border/50 shadow-2xl">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-foreground">Change Check Interval</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIntervalModal({ isOpen: false, selectedMonitors: [] })}
                  className="hover:bg-accent/80 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <CardDescription className="text-muted-foreground">
                Update the check interval for {intervalModal.selectedMonitors.length} selected monitor(s)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="new-interval" className="text-foreground">New Check Interval</Label>
                <Select
                  value={newInterval.toString()}
                  onValueChange={(value) => setNewInterval(parseInt(value))}
                >
                  <SelectTrigger className="border-border/60 bg-background/40 backdrop-blur-sm focus:border-primary/60 focus:bg-background/60">
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
              <div className="flex flex-col sm:flex-row gap-2 pt-4">
                <Button
                  onClick={handleBulkChangeInterval}
                  disabled={isLoading['bulk-interval']}
                  className="flex-1 hover:bg-primary hover:text-primary-foreground bg-primary/10 border border-primary/40 text-primary transition-all duration-200"
                >
                  {isLoading['bulk-interval'] ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Update Interval
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIntervalModal({ isOpen: false, selectedMonitors: [] })}
                  className="flex-1 hover:bg-accent/80 border-border/60 backdrop-blur-sm transition-all duration-200"
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md mx-4 backdrop-blur-xl bg-background/90 border-border/50 shadow-2xl">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-destructive">Delete Monitors</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeleteModal({ isOpen: false, selectedMonitors: [], monitorNames: [] })}
                  className="hover:bg-accent/80 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <CardDescription className="text-muted-foreground">
                This action cannot be undone. This will permanently delete the selected monitors.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/20 backdrop-blur-sm max-h-40 overflow-y-auto">
                <p className="font-medium mb-2 text-foreground">Monitors to be deleted:</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {deleteModal.monitorNames.map((name, index) => (
                    <li key={index} className="truncate">• {name}</li>
                  ))}
                </ul>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 pt-4">
                <Button
                  variant="destructive"
                  onClick={handleBulkDelete}
                  disabled={isLoading['bulk-delete']}
                  className="flex-1 hover:bg-destructive hover:text-destructive-foreground transition-all duration-200"
                >
                  {isLoading['bulk-delete'] ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Delete Monitors
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setDeleteModal({ isOpen: false, selectedMonitors: [], monitorNames: [] })}
                  className="flex-1 hover:bg-accent/80 border-border/60 backdrop-blur-sm transition-all duration-200"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Import Monitors Modal */}
      {importModal.isOpen && (
        <div className="fixed inset-0 bg-background/20 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl mx-4 backdrop-blur-xl bg-background/60 border-border/50 shadow-2xl max-h-[80vh] overflow-y-auto">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-foreground">Import Monitors</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setImportModal({ isOpen: false })
                    setImportFile(null)
                    setImportData([])
                    setImportPreview([])
                    setImportValidation({ total: 0, valid: 0, duplicates: 0, errors: [] })
                    if (fileInputRef.current) fileInputRef.current.value = ''
                  }}
                  className="hover:bg-accent/80 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <CardDescription className="text-muted-foreground">
                Upload a JSON file to import monitors. Supported format: array of monitor objects with name, url, interval_minutes, and is_active fields.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-foreground">Select JSON File</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDownloadSample}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    <Download className="h-3 w-3 mr-1" />
                    Sample Format
                  </Button>
                </div>
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept="application/json,.json"
                  onChange={handleFileUpload}
                  className="border-border/60 bg-background/40 backdrop-blur-sm focus:border-primary/60 focus:bg-background/60"
                  placeholder="Choose a JSON file"
                />
                {importFile && (
                  <p className="text-sm text-muted-foreground mt-2">
                    File: <span className="font-medium">{importFile.name}</span> ({(importFile.size / 1024).toFixed(1)} KB)
                  </p>
                )}
              </div>

              {/* Validation Summary */}
              {importValidation.total > 0 && (
                <div className="rounded-lg border border-muted-foreground/20 bg-background/40 backdrop-blur-sm p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle className="h-4 w-4 text-success" />
                    <span className="font-medium text-foreground">Validation Results</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Total:</span>
                      <span className="ml-2 font-medium text-foreground">{importValidation.total}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Valid:</span>
                      <span className="ml-2 font-medium text-success">{importValidation.valid}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Duplicates:</span>
                      <span className="ml-2 font-medium text-warning">{importValidation.duplicates}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Errors:</span>
                      <span className="ml-2 font-medium text-destructive">{importValidation.errors.length}</span>
                    </div>
                  </div>

                  {importValidation.errors.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-muted-foreground/10">
                      <p className="text-sm font-medium text-destructive mb-2">Validation Errors:</p>
                      <ul className="text-sm text-muted-foreground space-y-1 max-h-20 overflow-y-auto">
                        {importValidation.errors.map((error, index) => (
                          <li key={index} className="text-destructive">• {error}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {importValidation.duplicates > 0 && (
                    <div className="mt-2 text-sm text-warning">
                      <AlertCircle className="h-3 w-3 inline mr-1" />
                      {importValidation.duplicates} monitor(s) have URLs that already exist
                    </div>
                  )}
                </div>
              )}

              {/* Import Preview */}
              {importPreview.length > 0 && (
                <div>
                  <Label className="text-foreground">Preview ({importPreview.length} of {importData.length} monitors)</Label>
                  <div className="mt-2 rounded-lg border border-muted-foreground/20 bg-background/40 backdrop-blur-sm p-3 max-h-60 overflow-y-auto">
                    {importPreview.map((item, index) => (
                      <div key={index} className="flex flex-col gap-1 py-2 border-b border-muted-foreground/10 last:border-0">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-foreground truncate">{item.name}</span>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs px-2 py-0 text-muted-foreground border-muted-foreground/20">
                              {item.is_active ? 'Active' : 'Disabled'}
                            </Badge>
                            <Badge variant="outline" className="text-xs px-2 py-0 text-muted-foreground border-muted-foreground/20">
                              {formatInterval(item.interval_minutes)}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-sm text-muted-foreground truncate">{item.url}</div>
                      </div>
                    ))}
                    {importData.length > 20 && (
                      <div className="text-center text-sm text-muted-foreground py-2">
                        ... and {importData.length - 20} more
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2 pt-4">
                <Button
                  onClick={handleImportMonitors}
                  disabled={isLoading['import'] || importData.length === 0}
                  className="flex-1 hover:bg-primary hover:text-primary-foreground bg-primary/10 border border-primary/40 text-primary transition-all duration-200"
                >
                  {isLoading['import'] ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                  Import {importData.length} Monitor{importData.length !== 1 ? 's' : ''}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setImportModal({ isOpen: false })
                    setImportFile(null)
                    setImportData([])
                    setImportPreview([])
                    setImportValidation({ total: 0, valid: 0, duplicates: 0, errors: [] })
                    if (fileInputRef.current) fileInputRef.current.value = ''
                  }}
                  className="flex-1 hover:bg-accent/80 border-border/60 backdrop-blur-sm transition-all duration-200"
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