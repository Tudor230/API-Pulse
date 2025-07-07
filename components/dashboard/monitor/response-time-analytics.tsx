"use client"

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Monitor } from '@/lib/supabase-types'
import { TrendingUp, ChevronDown, ChevronUp } from 'lucide-react'

interface ResponseTimeAnalyticsProps {
  monitors: Monitor[]
  avgResponseTime: number
  upMonitorsWithResponseTime: Monitor[]
}

export default function ResponseTimeAnalytics({ 
  monitors, 
  avgResponseTime, 
  upMonitorsWithResponseTime 
}: ResponseTimeAnalyticsProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Response Time Analytics</CardTitle>
        <CardDescription>
          Average response time: {avgResponseTime}ms across {upMonitorsWithResponseTime.length} healthy monitors
        </CardDescription>
      </CardHeader>
      <CardContent>
        {upMonitorsWithResponseTime.length > 0 ? (
          <div className="space-y-6">
            {/* Average Response Time Gauge */}
            <div className="text-center">
              <div className="relative w-48 h-24 mx-auto mb-4">
                {/* Gauge background with proper color zones */}
                <div className="absolute inset-0 rounded-t-full overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-success via-success to-warning" style={{ clipPath: 'polygon(0% 0%, 50% 0%, 50% 100%, 0% 100%)' }}></div>
                  <div className="absolute inset-0 bg-gradient-to-r from-warning to-destructive" style={{ clipPath: 'polygon(50% 0%, 100% 0%, 100% 100%, 50% 100%)' }}></div>
                </div>
                <div className="absolute inset-1 bg-background rounded-t-full"></div>
                
                {/* Gauge needle */}
                <div 
                  className="absolute w-1 h-20 bg-foreground origin-bottom transform transition-transform duration-1000"
                  style={{ 
                    left: '50%', 
                    bottom: '2px',
                    transform: `translateX(-50%) rotate(${
                      avgResponseTime <= 1000 
                        ? (avgResponseTime / 1000) * 90 - 90  // Green zone: -90 to 0 degrees
                        : avgResponseTime <= 2000 
                          ? ((avgResponseTime - 1000) / 1000) * 45 // Yellow zone: 0 to 45 degrees
                          : Math.min(45 + ((avgResponseTime - 2000) / 1000) * 45, 90) // Red zone: 45 to 90 degrees
                    }deg)`
                  }}
                ></div>
              </div>
              <div className="text-3xl font-bold mb-2">{avgResponseTime}ms</div>
              <div className="text-sm text-muted-foreground">Average Response Time</div>
            </div>

            {/* Expand/Collapse Toggle */}
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm text-muted-foreground">Individual Monitor Performance</h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center gap-2"
              >
                {isExpanded ? (
                  <>
                    <ChevronUp className="h-4 w-4" />
                    Collapse
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4" />
                    Expand ({upMonitorsWithResponseTime.length} monitors)
                  </>
                )}
              </Button>
            </div>

            {/* Response Time Distribution Chart */}
            {isExpanded && (
              <div className={`space-y-3 ${upMonitorsWithResponseTime.length > 5 ? 'max-h-80 overflow-y-auto pr-2' : ''}`}>
                {monitors
                  .filter(m => m.status === 'up' && m.response_time !== null)
                  .sort((a, b) => (a.response_time || 0) - (b.response_time || 0))
                  .map((monitor) => {
                    const maxResponseTime = Math.max(...upMonitorsWithResponseTime.map(m => m.response_time || 0), 1000)
                    const widthPercentage = ((monitor.response_time || 0) / maxResponseTime) * 100
                    const isAboveAverage = (monitor.response_time || 0) > avgResponseTime
                    
                    return (
                      <div key={monitor.id} className="space-y-2">
                        <div className="flex justify-between items-center text-sm">
                          <span className="font-medium truncate max-w-[200px]">{monitor.name}</span>
                          <div className="flex items-center gap-2">
                            <span className={`font-medium ${
                              (monitor.response_time || 0) <= 1000 ? 'text-green-600' :
                              (monitor.response_time || 0) > 1000 && (monitor.response_time || 0) <= 2000 ? 'text-yellow-600' : 'text-red-600'
                            }`}>
                              {monitor.response_time}ms
                            </span>
                            {isAboveAverage && (
                              <span className="text-xs text-warning bg-warning/10 px-1 rounded">
                                +{((monitor.response_time || 0) - avgResponseTime)}ms
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="relative w-full bg-muted rounded-full h-2">
                          {/* Average line indicator */}
                          <div 
                            className="absolute top-0 w-0.5 h-2 bg-blue-500 z-10"
                            style={{ left: `${(avgResponseTime / maxResponseTime) * 100}%` }}
                          />
                          <div 
                            className={`h-2 rounded-full transition-all duration-500 ${
                              (monitor.response_time || 0) <= 1000 ? 'bg-green-500' :
                              (monitor.response_time || 0) > 1000 && (monitor.response_time || 0) <= 2000 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${Math.max(widthPercentage, 2)}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
              </div>
            )}

            {/* Chart Legend */}
            <div className="flex items-center justify-center gap-6 pt-4 border-t text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full" />
                <span className="text-muted-foreground">Excellent (&lt;1s)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-yellow-500 rounded-full" />
                <span className="text-muted-foreground">Good (1-2s)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full" />
                <span className="text-muted-foreground">Needs Attention (&gt;2s)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-0.5 h-3 bg-blue-500" />
                <span className="text-muted-foreground">Average ({avgResponseTime}ms)</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
              <TrendingUp className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">No Response Data</h3>
            <p className="text-muted-foreground">
              Response time analytics will appear here after your monitors have been checked
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 