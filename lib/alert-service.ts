import { Resend } from 'resend'
import { Twilio } from 'twilio'
import { Monitor, NotificationChannel, AlertType } from './supabase-types'

// Initialize services
const resend = new Resend(process.env.RESEND_API_KEY)
const twilio = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN 
  ? new Twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null

export interface AlertContext {
  monitor: Monitor
  channel: NotificationChannel
  triggerStatus: Monitor['status']
  previousStatus: Monitor['status'] | null
  consecutiveFailures: number
  responseTime?: number | null
}

export interface AlertResult {
  success: boolean
  error?: string
  messageId?: string
}

// Email templates
const getEmailTemplate = (context: AlertContext): { subject: string; html: string; text: string } => {
  const { monitor, triggerStatus, previousStatus, consecutiveFailures, responseTime } = context
  
  const isDownAlert = triggerStatus === 'down' || triggerStatus === 'timeout'
  const isRecoveryAlert = previousStatus === 'down' && triggerStatus === 'up'
  
  let subject: string
  let statusIcon: string
  let statusColor: string
  
  if (isRecoveryAlert) {
    subject = `✅ ${monitor.name} is back online`
    statusIcon = '✅'
    statusColor = '#22c55e'
  } else if (isDownAlert) {
    subject = `🚨 ${monitor.name} is down`
    statusIcon = triggerStatus === 'timeout' ? '⏰' : '🚨'
    statusColor = '#ef4444'
  } else {
    subject = `⚠️ ${monitor.name} status changed`
    statusIcon = '⚠️'
    statusColor = '#f59e0b'
  }
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
    </head>
    <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: ${statusColor}; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">${statusIcon} API Monitor Alert</h1>
        </div>
        
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb;">
            <h2 style="color: ${statusColor}; margin-top: 0;">${monitor.name}</h2>
            
            <div style="background: white; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid ${statusColor};">
                <p><strong>Monitor:</strong> ${monitor.name}</p>
                <p><strong>URL:</strong> <a href="${monitor.url}" style="color: #3b82f6;">${monitor.url}</a></p>
                <p><strong>Status:</strong> <span style="color: ${statusColor}; font-weight: bold; text-transform: uppercase;">${triggerStatus}</span></p>
                ${previousStatus ? `<p><strong>Previous Status:</strong> ${previousStatus.toUpperCase()}</p>` : ''}
                ${responseTime !== null && responseTime !== undefined ? `<p><strong>Response Time:</strong> ${responseTime}ms</p>` : ''}
                ${consecutiveFailures > 1 ? `<p><strong>Consecutive Failures:</strong> ${consecutiveFailures}</p>` : ''}
                <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
            </div>
            
            ${isDownAlert ? `
                <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 15px; margin: 20px 0;">
                    <p style="margin: 0; color: #dc2626;">
                        <strong>Action Required:</strong> Your API endpoint is not responding properly. 
                        Please check your service and infrastructure.
                    </p>
                </div>
            ` : ''}
            
            ${isRecoveryAlert ? `
                <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 15px; margin: 20px 0;">
                    <p style="margin: 0; color: #16a34a;">
                        <strong>Good News:</strong> Your API endpoint has recovered and is responding normally again.
                    </p>
                </div>
            ` : ''}
            
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
            
            <p style="color: #6b7280; font-size: 14px; margin: 0;">
                This alert was sent by API Pulse monitoring service.<br>
                Monitor created: ${new Date(monitor.created_at).toLocaleString()}
            </p>
        </div>
    </body>
    </html>
  `
  
  const text = `
API Monitor Alert - ${monitor.name}

Status: ${triggerStatus.toUpperCase()}
URL: ${monitor.url}
${previousStatus ? `Previous Status: ${previousStatus.toUpperCase()}` : ''}
${responseTime !== null && responseTime !== undefined ? `Response Time: ${responseTime}ms` : ''}
${consecutiveFailures > 1 ? `Consecutive Failures: ${consecutiveFailures}` : ''}
Time: ${new Date().toLocaleString()}

${isDownAlert ? 'Action Required: Your API endpoint is not responding properly. Please check your service and infrastructure.' : ''}
${isRecoveryAlert ? 'Good News: Your API endpoint has recovered and is responding normally again.' : ''}

This alert was sent by API Pulse monitoring service.
  `.trim()
  
  return { subject, html, text }
}

// SMS message template
const getSMSMessage = (context: AlertContext): string => {
  const { monitor, triggerStatus, previousStatus, consecutiveFailures } = context
  
  const isRecoveryAlert = previousStatus === 'down' && triggerStatus === 'up'
  
  if (isRecoveryAlert) {
    return `✅ API Pulse: ${monitor.name} is back online! ${monitor.url}`
  }
  
  const statusEmoji = triggerStatus === 'timeout' ? '⏰' : '🚨'
  const failureText = consecutiveFailures > 1 ? ` (${consecutiveFailures} failures)` : ''
  
  return `${statusEmoji} API Pulse Alert: ${monitor.name} is ${triggerStatus.toUpperCase()}${failureText}. Check: ${monitor.url}`
}

// Send email alert
export async function sendEmailAlert(context: AlertContext): Promise<AlertResult> {
  if (!resend) {
    return { success: false, error: 'Resend not configured' }
  }
  
  const { channel } = context
  const email = channel.config.email
  
  if (!email) {
    return { success: false, error: 'No email address configured' }
  }
  
  try {
    const { subject, html, text } = getEmailTemplate(context)
    
    const result = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'alerts@opreatudor.me',
      to: email,
      subject,
      html,
      text,
      headers: {
        'X-Entity-Ref-ID': `monitor-${context.monitor.id}`,
      },
    })
    
    return { success: true, messageId: result.data?.id }
  } catch (error) {
    console.error('Email alert failed:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown email error' 
    }
  }
}

// Send SMS alert
export async function sendSMSAlert(context: AlertContext): Promise<AlertResult> {
  if (!twilio) {
    return { success: false, error: 'Twilio not configured' }
  }
  
  const { channel } = context
  const phone = channel.config.phone
  
  if (!phone) {
    return { success: false, error: 'No phone number configured' }
  }
  
  try {
    const message = getSMSMessage(context)
    
    const result = await twilio.messages.create({
      body: message,
      to: phone,
      from: process.env.TWILIO_PHONE_NUMBER,
    })
    
    return { success: true, messageId: result.sid }
  } catch (error) {
    console.error('SMS alert failed:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown SMS error' 
    }
  }
}

// Send webhook alert
export async function sendWebhookAlert(context: AlertContext): Promise<AlertResult> {
  const { channel, monitor, triggerStatus, previousStatus, consecutiveFailures, responseTime } = context
  const webhookUrl = channel.config.webhook_url
  
  if (!webhookUrl) {
    return { success: false, error: 'No webhook URL configured' }
  }
  
  try {
    const payload = {
      monitor: {
        id: monitor.id,
        name: monitor.name,
        url: monitor.url,
      },
      alert: {
        trigger_status: triggerStatus,
        previous_status: previousStatus,
        consecutive_failures: consecutiveFailures,
        response_time: responseTime,
        timestamp: new Date().toISOString(),
      },
      meta: {
        alert_type: 'webhook',
        source: 'api-pulse',
      }
    }
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'API-Pulse-Webhook/1.0',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000), // 10 second timeout
    })
    
    if (!response.ok) {
      return { 
        success: false, 
        error: `Webhook failed with status ${response.status}: ${response.statusText}` 
      }
    }
    
    return { success: true, messageId: `webhook-${Date.now()}` }
  } catch (error) {
    console.error('Webhook alert failed:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown webhook error' 
    }
  }
}

// Main alert dispatcher
export async function sendAlert(context: AlertContext): Promise<AlertResult> {
  const { channel } = context
  
  switch (channel.type) {
    case 'email':
      return await sendEmailAlert(context)
    case 'sms':
      return await sendSMSAlert(context)
    case 'webhook':
      return await sendWebhookAlert(context)
    default:
      return { success: false, error: `Unsupported alert type: ${channel.type}` }
  }
}

// Utility function to validate notification channel configuration
export function validateChannelConfig(type: AlertType, config: any): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  
  switch (type) {
    case 'email':
      if (!config.email) {
        errors.push('Email address is required')
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(config.email)) {
        errors.push('Invalid email address format')
      }
      break
      
    case 'sms':
      if (!config.phone) {
        errors.push('Phone number is required')
      } else if (!/^\+[1-9]\d{1,14}$/.test(config.phone)) {
        errors.push('Phone number must be in international format (e.g., +1234567890)')
      }
      break
      
    case 'webhook':
      if (!config.webhook_url) {
        errors.push('Webhook URL is required')
      } else {
        try {
          const url = new URL(config.webhook_url)
          if (!['http:', 'https:'].includes(url.protocol)) {
            errors.push('Webhook URL must use HTTP or HTTPS protocol')
          }
        } catch {
          errors.push('Invalid webhook URL format')
        }
      }
      break
      
    default:
      errors.push(`Unsupported channel type: ${type}`)
  }
  
  return { valid: errors.length === 0, errors }
} 