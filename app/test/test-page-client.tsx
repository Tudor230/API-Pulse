"use client"

import { useState } from 'react'
import AddMonitorForm from '@/components/add-monitor-form'
import MonitorsList from '@/components/monitors-list'
import { Button } from '@/components/ui/button'
import { Monitor } from '@/lib/supabase-types'

interface TestPageClientProps {
  initialMonitors: Monitor[]
}

export default function TestPageClient({ initialMonitors }: TestPageClientProps) {
  const [monitors, setMonitors] = useState<Monitor[]>(initialMonitors)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const refreshMonitors = async () => {
    setIsRefreshing(true)
    try {
      const response = await fetch('/api/monitors')
      if (response.ok) {
        const data = await response.json()
        setMonitors(data.monitors || [])
      }
    } catch (error) {
      console.error('Error refreshing monitors:', error)
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleMonitorAdded = () => {
    // Refresh the monitors list when a new monitor is added
    refreshMonitors()
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="space-y-6">
        <AddMonitorForm onSuccess={handleMonitorAdded} />
        
        <div className="flex justify-center">
          <Button 
            onClick={refreshMonitors} 
            disabled={isRefreshing}
            variant="outline"
          >
            {isRefreshing ? 'Refreshing...' : 'Refresh Monitors'}
          </Button>
        </div>
      </div>

      <div>
        <MonitorsList monitors={monitors} />
      </div>
    </div>
  )
} 