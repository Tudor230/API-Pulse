"use client"

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import AddNotificationChannel from '@/components/dashboard/alerts/add-notification-channel'
import NotificationChannelsList from '@/components/dashboard/alerts/notification-channels-list'
import AlertRulesList from '@/components/dashboard/alerts/alert-rules-list'
import AddAlertRule from '@/components/dashboard/alerts/add-alert-rule'
import AlertHistoryList from '@/components/dashboard/alerts/alert-history-list'
import { Bell, Mail, Clock, Plus } from 'lucide-react'

export default function AlertsPageClient() {
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [activeTab, setActiveTab] = useState('channels')
  const searchParams = useSearchParams()
  const router = useRouter()

  // Set active tab from URL parameter on mount
  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab && ['channels', 'rules', 'history'].includes(tab)) {
      setActiveTab(tab)
    }
  }, [searchParams])

  const handleTabChange = (value: string) => {
    setActiveTab(value)
    // Update URL without causing a page reload
    const url = new URL(window.location.href)
    url.searchParams.set('tab', value)
    router.replace(url.pathname + url.search)
  }

  const handleChannelSuccess = () => {
    // Trigger a refresh of the notification channels list and alert rules
    setRefreshTrigger(prev => prev + 1)
  }

  const handleRuleSuccess = () => {
    // Trigger a refresh of the alert rules list
    setRefreshTrigger(prev => prev + 1)
  }

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-8">
      <TabsList className="grid w-full grid-cols-3 backdrop-blur-xl bg-background/60 border-border/50">
        <TabsTrigger value="channels" className="flex items-center gap-2 data-[state=active]:!bg-primary/20 data-[state=active]:!text-primary data-[state=active]:!border-primary/40">
          <Mail className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
          <span className="hidden sm:inline">Notification Channels</span>
        </TabsTrigger>
        <TabsTrigger value="rules" className="flex items-center gap-2 data-[state=active]:!bg-primary/20 data-[state=active]:!text-primary data-[state=active]:!border-primary/40">
          <Bell className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
          <span className="hidden sm:inline">Alert Rules</span>
        </TabsTrigger>
        <TabsTrigger value="history" className="flex items-center gap-2 data-[state=active]:!bg-primary/20 data-[state=active]:!text-primary data-[state=active]:!border-primary/40">
          <Clock className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
          <span className="hidden sm:inline">Alert History</span>
        </TabsTrigger>
      </TabsList>

      {/* Notification Channels Tab */}
      <TabsContent value="channels" className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Add New Channel */}
          <div>
            <AddNotificationChannel onSuccess={handleChannelSuccess} />
          </div>

          {/* List Existing Channels */}
          <div>
            <NotificationChannelsList refreshTrigger={refreshTrigger} />
          </div>
        </div>

        {/* Information Card */}
        <Card className="bg-background/60 backdrop-blur-md border-muted-foreground/20 shadow-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              About Notification Channels
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">📧 Email Alerts</h4>
              <p className="text-sm text-muted-foreground">
                Receive detailed email notifications with monitor status, response times, and actionable insights.
              </p>
            </div>

            <div>
              <h4 className="font-medium mb-2">📱 SMS Alerts</h4>
              <p className="text-sm text-muted-foreground">
                Get instant text message alerts for critical monitor failures. Requires Twilio configuration.
              </p>
            </div>

            <div>
              <h4 className="font-medium mb-2">🔗 Webhook Alerts</h4>
              <p className="text-sm text-muted-foreground">
                Integrate with your existing tools by sending JSON payloads to your webhook endpoints.
              </p>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Alert Rules Tab */}
      <TabsContent value="rules" className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Add New Alert Rule */}
          <div>
            <AddAlertRule onSuccess={handleRuleSuccess} />
          </div>

          {/* List Existing Alert Rules */}
          <div>
            <AlertRulesList refreshTrigger={refreshTrigger} />
          </div>
        </div>

        {/* Information Card */}
        <Card className="backdrop-blur-xl bg-background/60 border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              About Alert Rules
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">🎯 Smart Alerting</h4>
              <p className="text-sm text-muted-foreground">
                Alert rules determine when and how you get notified. Rules are automatically created when you add notification channels, but you can create custom rules for specific combinations.
              </p>
            </div>

            <div>
              <h4 className="font-medium mb-2">🛡️ Failure Thresholds</h4>
              <p className="text-sm text-muted-foreground">
                Set consecutive failure thresholds to prevent false positives from temporary network issues. Only alert after N consecutive failures.
              </p>
            </div>

            <div>
              <h4 className="font-medium mb-2">⏰ Cooldown Periods</h4>
              <p className="text-sm text-muted-foreground">
                Cooldown periods prevent alert spam by limiting how often the same alert can be sent. Default is 60 minutes between alerts for the same issue.
              </p>
            </div>

            <div>
              <h4 className="font-medium mb-2">🔔 Alert Conditions</h4>
              <p className="text-sm text-muted-foreground">
                Choose when to receive alerts: when monitors go down, when they recover, or when requests timeout. Each condition can be enabled or disabled independently.
              </p>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Alert History Tab */}
      <TabsContent value="history" className="space-y-8">
        <AlertHistoryList refreshTrigger={refreshTrigger} />

        {/* Information Card */}
        <Card className="backdrop-blur-xl bg-background/60 border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              About Alert History
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">📊 Delivery Tracking</h4>
              <p className="text-sm text-muted-foreground">
                Track the delivery status of all your alert notifications. See which alerts were sent successfully, failed, or are still pending.
              </p>
            </div>

            <div>
              <h4 className="font-medium mb-2">🔍 Search & Filter</h4>
              <p className="text-sm text-muted-foreground">
                Find specific alerts using the search functionality or filter by monitor, status, or notification type to analyze patterns.
              </p>
            </div>

            <div>
              <h4 className="font-medium mb-2">📈 Analytics</h4>
              <p className="text-sm text-muted-foreground">
                Monitor alert effectiveness with summary statistics showing successful deliveries, failures, and overall notification health.
              </p>
            </div>

            <div>
              <h4 className="font-medium mb-2">🐛 Troubleshooting</h4>
              <p className="text-sm text-muted-foreground">
                Failed alerts include error messages to help diagnose delivery issues with email servers, SMS gateways, or webhook endpoints.
              </p>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
} 