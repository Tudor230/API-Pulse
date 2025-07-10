// AWS Lambda function for comprehensive monitor checking with full alerting support
// This replaces the Node.js cron job with a scalable, fault-tolerant solution

const { createClient } = require("@supabase/supabase-js");
const { SSMClient, GetParametersCommand } = require("@aws-sdk/client-ssm");
const fetch = require("node-fetch");

// Cache for parameters and clients
let parametersCache = null;
let supabase = null;

/**
 * Get parameters from Parameter Store with caching
 */
async function getParameters() {
  if (parametersCache) {
    return parametersCache;
  }

  try {
    const client = new SSMClient({ region: process.env.AWS_REGION || 'eu-central-1' });
    
    const command = new GetParametersCommand({
      Names: [
        "/api-pulse/supabase-url",
        "/api-pulse/supabase-service-role-key",
        "/api-pulse/resend-api-key",
        "/api-pulse/resend-from-email",
        "/api-pulse/twilio-account-sid",
        "/api-pulse/twilio-auth-token",
        "/api-pulse/twilio-phone-number",
        "/api-pulse/timeout-seconds"
      ],
      WithDecryption: true
    });

    const response = await client.send(command);
    
    if (!response.Parameters || response.Parameters.length === 0) {
      throw new Error("No parameters found in Parameter Store");
    }

    // Parse parameters into a config object
    const config = {};
    response.Parameters.forEach(param => {
      const key = param.Name.split('/').pop(); // Get last part after /
      config[key.replace(/-/g, '_')] = param.Value; // Convert kebab-case to snake_case
    });

    // Validate required parameters
    if (!config.supabase_url || !config.supabase_service_role_key) {
      throw new Error("Missing required Supabase parameters");
    }

    parametersCache = config;
    console.log("✅ Parameters loaded from Parameter Store");
    return parametersCache;
  } catch (error) {
    console.error("❌ Failed to load parameters from Parameter Store:", error);
    throw error;
  }
}

/**
 * Initialize Supabase client with parameters from Parameter Store
 */
async function getSupabaseClient() {
  if (!supabase) {
    const config = await getParameters();
    
    supabase = createClient(config.supabase_url, config.supabase_service_role_key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    console.log("✅ Supabase client initialized");
  }

  return supabase;
}

/**
 * AWS Lambda handler for processing SQS messages
 */
exports.handler = async (event) => {
  console.log(
    "🚀 Lambda worker started, processing",
    event.Records?.length || 0,
    "messages"
  );

  const results = {
    batchItemFailures: [],
    processed: 0,
    succeeded: 0,
    failed: 0,
    alertsSent: 0,
    duration: Date.now(),
  };

  // Process each SQS message in the batch
  for (const record of event.Records || []) {
    try {
      const message = JSON.parse(record.body);
      console.log(`📨 Processing message type: ${message.messageType}`);

      let result;
      switch (message.messageType) {
        case "MONITOR_CHECK":
          result = await processMonitorCheck(message);
          break;
        case "ALERT_PROCESSING":
          result = await processAlert(message);
          break;
        default:
          throw new Error(`Unknown message type: ${message.messageType}`);
      }

      if (result.success) {
        results.succeeded++;
        if (result.alertsSent) {
          results.alertsSent += result.alertsSent;
        }
        console.log(`✅ Successfully processed message ${message.messageId}`);
      } else {
        throw new Error(result.error || "Processing failed");
      }
    } catch (error) {
      console.error(`❌ Failed to process message ${record.messageId}:`, error);
      results.failed++;

      // Add to batch item failures for partial batch failure handling
      results.batchItemFailures.push({
        itemIdentifier: record.messageId,
      });
    }

    results.processed++;
  }

  results.duration = Date.now() - results.duration;
  console.log(`🏁 Lambda completed:`, results);

  // Return batch item failures for SQS partial batch failure handling
  return {
    batchItemFailures: results.batchItemFailures,
  };
};

/**
 * Process a monitor check message with full alerting support
 */
async function processMonitorCheck(message) {
  const startTime = Date.now();
  const { monitorId, userId, monitorData } = message.payload;

  console.log(`🔍 Checking monitor: ${monitorData.name} (${monitorData.url})`);

  try {
    // Fetch current monitor data from database to ensure it's still active
    const supabase = await getSupabaseClient();
    const { data: monitor, error: fetchError } = await supabase
      .from("monitors")
      .select("*")
      .eq("id", monitorId)
      .eq("user_id", userId)
      .single();

    if (fetchError || !monitor) {
      throw new Error(`Monitor not found or access denied: ${monitorId}`);
    }

    if (!monitor.is_active) {
      console.log(`⏸️ Monitor ${monitorId} is inactive, skipping check`);
      return {
        success: true,
        messageId: message.messageId,
        processingTime: Date.now() - startTime,
      };
    }

    // Perform the health check
    const checkResult = await performHealthCheck(monitorData);

    // Get recent monitoring history for consecutive failure calculation
    const history = await getRecentMonitoringHistory(monitor.id);

    // Update monitor status in database
    await updateMonitorStatus(monitor, checkResult);

    // Save monitoring history for analytics
    await saveMonitoringHistory(monitor, checkResult);

    // Check if we need to trigger alerts
    const alertsResult = await checkAndTriggerAlerts(
      monitor,
      checkResult,
      history
    );

    console.log(
      `✅ Monitor check completed: ${monitorData.name} - ${checkResult.status} (${checkResult.responseTime}ms)`
    );

    return {
      success: true,
      messageId: message.messageId,
      processingTime: Date.now() - startTime,
      monitorId,
      status: checkResult.status,
      responseTime: checkResult.responseTime,
      statusChanged: monitor.status !== checkResult.status,
      alertsSent: alertsResult.alertsSent,
    };
  } catch (error) {
    console.error(`❌ Monitor check failed for ${monitorId}:`, error);
    return {
      success: false,
      messageId: message.messageId,
      processingTime: Date.now() - startTime,
      error: error.message,
    };
  }
}

/**
 * Perform comprehensive HTTP health check
 */
async function performHealthCheck(monitorData) {
  const startTime = Date.now();
  let status = "down";
  let responseTime = null;
  let statusCode = null;
  let errorMessage = null;

  try {
    // Get configuration from Parameter Store
    const config = await getParameters();
    
    // Create abort controller for timeout
    const timeoutSeconds = monitorData.timeoutSeconds || parseInt(config.timeout_seconds) || 10;
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      timeoutSeconds * 1000
    );

    const response = await fetch(monitorData.url, {
      method: "GET",
      signal: controller.signal,
      headers: {
        "User-Agent": "API-Pulse-Lambda-Worker/1.0",
        Accept: "application/json, text/html, */*",
        ...monitorData.headers,
      },
    });

    clearTimeout(timeoutId);
    responseTime = Date.now() - startTime;
    statusCode = response.status;
    status = response.ok ? "up" : "down";

    if (!response.ok) {
      errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    }

    console.log(
      `Health check result: ${status} (${responseTime}ms, HTTP ${statusCode})`
    );
  } catch (error) {
    responseTime = Date.now() - startTime;

    if (error.name === "AbortError") {
      status = "timeout";
      errorMessage = `Request timeout`;
      console.log(`Health check timeout: ${responseTime}ms`);
    } else {
      status = "down";
      errorMessage = error.message || "Request failed";
      console.log(`Health check failed: ${errorMessage}`);
    }
  }

  return {
    status,
    responseTime,
    statusCode,
    errorMessage,
  };
}

/**
 * Get recent monitoring history for consecutive failure tracking
 */
async function getRecentMonitoringHistory(monitorId) {
  try {
    const supabase = await getSupabaseClient();
    const { data: history, error } = await supabase
      .from("monitoring_history")
      .select("status, checked_at")
      .eq("monitor_id", monitorId)
      .order("checked_at", { ascending: false })
      .limit(10);

    if (error) {
      console.error(`⚠️ Failed to fetch monitoring history: ${error.message}`);
      return [];
    }

    return history || [];
  } catch (error) {
    console.error(`⚠️ Error fetching monitoring history: ${error.message}`);
    return [];
  }
}

/**
 * Update monitor status in database
 */
async function updateMonitorStatus(monitor, checkResult) {
  const nextCheckAt = new Date(
    Date.now() + monitor.interval_minutes * 60 * 1000
  );

  const supabase = await getSupabaseClient();
  const { error } = await supabase
    .from("monitors")
    .update({
      status: checkResult.status,
      last_checked_at: new Date().toISOString(),
      next_check_at: nextCheckAt.toISOString(),
      response_time: checkResult.responseTime,
    })
    .eq("id", monitor.id);

  if (error) {
    throw new Error(`Failed to update monitor status: ${error.message}`);
  }
}

/**
 * Save comprehensive monitoring history for analytics
 */
async function saveMonitoringHistory(monitor, checkResult) {
  const supabase = await getSupabaseClient();
  const { error } = await supabase.from("monitoring_history").insert({
    monitor_id: monitor.id,
    user_id: monitor.user_id,
    status: checkResult.status,
    response_time: checkResult.responseTime,
    status_code: checkResult.statusCode,
    error_message: checkResult.errorMessage,
    checked_at: new Date().toISOString(),
  });

  if (error) {
    console.error(`⚠️ Failed to save monitoring history: ${error.message}`);
    // Don't throw - monitoring history is not critical for monitor operation
  }
}

/**
 * Comprehensive alert processing with consecutive failure tracking
 */
async function checkAndTriggerAlerts(monitor, checkResult, history) {
  const result = {
    alertsSent: 0,
    alertsSkipped: 0,
  };

  // Check if status actually changed (required for most alert types)
  const statusChanged = monitor.status !== checkResult.status;

  console.log(
    `🔔 Alert check for ${monitor.name}: ${monitor.status} → ${checkResult.status} (changed: ${statusChanged})`
  );

  try {
    const supabase = await getSupabaseClient();

    // Get all active alert rules for this monitor with their notification channels
    const { data: alertRules, error: rulesError } = await supabase
      .from("monitor_alert_rules")
      .select(
        `
        *,
        notification_channels (*)
      `
      )
      .eq("monitor_id", monitor.id)
      .eq("is_active", true)
      .eq("notification_channels.is_active", true)
      .eq("notification_channels.is_verified", true);

    if (rulesError) {
      console.error("Error fetching alert rules:", rulesError);
      return result;
    }

    if (!alertRules || alertRules.length === 0) {
      console.log("No active alert rules found for monitor");
      return result;
    }

    // Calculate consecutive failures for threshold checking
    const consecutiveFailures = calculateConsecutiveFailures(
      history,
      checkResult.status
    );
    console.log(`Consecutive failures: ${consecutiveFailures}`);

    // Process each alert rule
    for (const rule of alertRules) {
      try {
        const shouldAlert = await shouldTriggerAlert(
          rule,
          monitor.status,
          checkResult.status,
          consecutiveFailures,
          statusChanged
        );

        if (!shouldAlert) {
          result.alertsSkipped++;
          continue;
        }

        // Check cooldown period to prevent spam
        const withinCooldown = await isWithinCooldownPeriod(rule);
        if (withinCooldown) {
          console.log(`Alert skipped due to cooldown: ${rule.id}`);
          result.alertsSkipped++;
          continue;
        }

        // Send the alert
        await sendAlertNotification(
          monitor,
          rule,
          checkResult,
          consecutiveFailures,
          monitor.status
        );

        result.alertsSent++;
        console.log(`📢 Alert sent for rule ${rule.id}`);
      } catch (alertError) {
        console.error(`Failed to process alert rule ${rule.id}:`, alertError);
      }
    }

    console.log(
      `Alert processing completed: ${result.alertsSent} sent, ${result.alertsSkipped} skipped`
    );
    return result;
  } catch (error) {
    console.error("Error processing alerts:", error);
    return result;
  }
}

/**
 * Calculate consecutive failures from history
 */
function calculateConsecutiveFailures(history, currentStatus) {
  let consecutiveFailures = 0;

  // Count current failure if applicable
  if (currentStatus === "down" || currentStatus === "timeout") {
    consecutiveFailures = 1;
  }

  // Count previous consecutive failures
  for (const record of history) {
    if (record.status === "down" || record.status === "timeout") {
      consecutiveFailures++;
    } else {
      break;
    }
  }

  return consecutiveFailures;
}

/**
 * Check if there was a previous down/timeout alert sent for this rule
 */
async function checkPreviousDownAlert(rule, previousStatus) {
  try {
    const supabase = await getSupabaseClient();
    
    // Look for the most recent down/timeout alert for this rule
    const { data: recentAlerts, error } = await supabase
      .from("alert_logs")
      .select("trigger_status, sent_at")
      .eq("monitor_alert_rule_id", rule.id)
      .eq("status", "sent")
      .in("trigger_status", ["down", "timeout"])
      .order("sent_at", { ascending: false })
      .limit(1);

    if (error) {
      console.error(`Error checking previous down alert: ${error.message}`);
      return true; // Allow recovery alert if we can't check
    }

    // If we have a recent down/timeout alert, check if there's been a recovery alert since then
    if (recentAlerts && recentAlerts.length > 0) {
      const lastDownAlert = recentAlerts[0];
      
      // Check if there's been a recovery alert since the last down alert
      const { data: recoveryAlerts, error: recoveryError } = await supabase
        .from("alert_logs")
        .select("sent_at")
        .eq("monitor_alert_rule_id", rule.id)
        .eq("status", "sent")
        .eq("trigger_status", "up")
        .gt("sent_at", lastDownAlert.sent_at)
        .limit(1);

      if (recoveryError) {
        console.error(`Error checking recovery alerts: ${recoveryError.message}`);
        return true; // Allow recovery alert if we can't check
      }

      // If no recovery alert has been sent since the last down alert, we should send one
      return !recoveryAlerts || recoveryAlerts.length === 0;
    }

    // No previous down alert found
    return false;
  } catch (error) {
    console.error(`Error checking previous down alert: ${error.message}`);
    return true; // Allow recovery alert if we can't check
  }
}

/**
 * Determine if an alert should be triggered based on comprehensive rules
 */
async function shouldTriggerAlert(
  rule,
  oldStatus,
  newStatus,
  consecutiveFailures,
  statusChanged
) {
  // Recovery alerts (down/timeout → up)
  if (
    rule.alert_on_up &&
    (oldStatus === "down" || oldStatus === "timeout") &&
    newStatus === "up"
  ) {
    // Only send recovery alert if we previously sent a down/timeout alert
    const hadPreviousDownAlert = await checkPreviousDownAlert(rule, oldStatus);
    if (hadPreviousDownAlert) {
      console.log(`Recovery alert triggered: ${oldStatus} → ${newStatus} (previous down alert found)`);
      return true;
    } else {
      console.log(`Recovery alert skipped: ${oldStatus} → ${newStatus} (no previous down alert sent)`);
      return false;
    }
  }

  // Down alerts (up → down)
  if (rule.alert_on_down && oldStatus === "up" && newStatus === "down") {
    // Check consecutive failures threshold
    if (consecutiveFailures >= rule.consecutive_failures_threshold) {
      console.log(
        `Down alert triggered: ${consecutiveFailures} failures >= ${rule.consecutive_failures_threshold}`
      );
      return true;
    }
  }

  // Timeout alerts (up → timeout)
  if (rule.alert_on_timeout && oldStatus === "up" && newStatus === "timeout") {
    // Check consecutive failures threshold
    if (consecutiveFailures >= rule.consecutive_failures_threshold) {
      console.log(
        `Timeout alert triggered: ${consecutiveFailures} failures >= ${rule.consecutive_failures_threshold}`
      );
      return true;
    }
  }

  return false;
}

/**
 * Check if alert is within cooldown period
 */
async function isWithinCooldownPeriod(rule) {
  if (rule.cooldown_minutes <= 0) {
    return false;
  }

  try {
    const supabase = await getSupabaseClient();
    const cooldownStart = new Date(
      Date.now() - rule.cooldown_minutes * 60 * 1000
    );

    const { data: recentAlerts, error } = await supabase
      .from("alert_logs")
      .select("sent_at")
      .eq("monitor_alert_rule_id", rule.id)
      .eq("status", "sent")
      .gte("sent_at", cooldownStart.toISOString())
      .limit(1);

    if (error) {
      console.error(`Error checking cooldown: ${error.message}`);
      return false; // Allow alert if we can't check cooldown
    }

    return recentAlerts && recentAlerts.length > 0;
  } catch (error) {
    console.error(`Error checking cooldown: ${error.message}`);
    return false; // Allow alert if we can't check cooldown
  }
}

/**
 * Send alert notification using the full alert service
 */
async function sendAlertNotification(
  monitor,
  rule,
  checkResult,
  consecutiveFailures,
  previousStatus
) {
  const channel = rule.notification_channels;
  const alertContext = {
    monitor,
    channel,
    triggerStatus: checkResult.status,
    previousStatus,
    consecutiveFailures,
    responseTime: checkResult.responseTime,
  };

  let alertResult = { success: false, error: "Unknown error" };

  try {
    // Send alert based on channel type
    switch (channel.type) {
      case "email":
        alertResult = await sendEmailAlert(alertContext);
        break;
      case "sms":
        alertResult = await sendSMSAlert(alertContext);
        break;
      case "webhook":
        alertResult = await sendWebhookAlert(alertContext);
        break;
      default:
        alertResult = {
          success: false,
          error: `Unsupported alert type: ${channel.type}`,
        };
    }

    // Log the alert attempt
    await logAlert(
      monitor,
      rule,
      channel,
      checkResult,
      consecutiveFailures,
      previousStatus,
      alertResult
    );

    if (!alertResult.success) {
      console.error(`Alert failed for ${channel.type}:`, alertResult.error);
    }

    return alertResult;
  } catch (error) {
    console.error(`Alert notification error:`, error);

    // Log failed alert
    await logAlert(
      monitor,
      rule,
      channel,
      checkResult,
      consecutiveFailures,
      previousStatus,
      { success: false, error: error.message }
    );

    return { success: false, error: error.message };
  }
}

/**
 * Log alert attempt to database
 */
async function logAlert(
  monitor,
  rule,
  channel,
  checkResult,
  consecutiveFailures,
  previousStatus,
  alertResult
) {
  try {
    const supabase = await getSupabaseClient();

    const alertLog = {
      monitor_id: monitor.id,
      monitor_alert_rule_id: rule.id,
      notification_channel_id: channel.id,
      user_id: monitor.user_id,
      alert_type: channel.type,
      status: alertResult.success ? "sent" : "failed",
      trigger_status: checkResult.status,
      previous_status: previousStatus,
      consecutive_failures: consecutiveFailures,
      message: generateAlertMessage(
        monitor,
        checkResult.status,
        previousStatus
      ),
      error_message: alertResult.error || null,
      sent_at: alertResult.success ? new Date().toISOString() : null,
    };

    const { error } = await supabase.from("alert_logs").insert(alertLog);

    if (error) {
      console.error("Failed to save alert log:", error);
    }
  } catch (error) {
    console.error("Error logging alert:", error);
  }
}

/**
 * Generate alert message text
 */
function generateAlertMessage(monitor, newStatus, oldStatus) {
  const isRecovery =
    oldStatus &&
    (oldStatus === "down" || oldStatus === "timeout") &&
    newStatus === "up";

  if (isRecovery) {
    return `✅ Monitor "${monitor.name}" is back online! URL: ${monitor.url}`;
  } else if (newStatus === "down") {
    return `🚨 Monitor "${monitor.name}" is down! URL: ${monitor.url}`;
  } else if (newStatus === "timeout") {
    return `⏰ Monitor "${monitor.name}" timed out! URL: ${monitor.url}`;
  }
  return `📊 Monitor "${monitor.name}" status changed from ${oldStatus} to ${newStatus}`;
}

// ==================== ALERT SERVICE IMPLEMENTATION ====================

/**
 * Email alert implementation with rich HTML templates
 */
async function sendEmailAlert(context) {
  try {
    // Get Resend configuration from Parameter Store
    const config = await getParameters();
    
    if (!config.resend_api_key) {
      return { success: false, error: "Resend API key not configured" };
    }

    const {
      channel,
      monitor,
      triggerStatus,
      previousStatus,
      consecutiveFailures,
      responseTime,
    } = context;
    const email = channel.config.email;

    if (!email) {
      return { success: false, error: "No email address configured" };
    }

    const { Resend } = require("resend");
    const resend = new Resend(config.resend_api_key);

    const { subject, html, text } = getEmailTemplate(context);

    const result = await resend.emails.send({
      from: config.resend_from_email || "alerts@opreatudor.me",
      to: email,
      subject,
      html,
      text,
      headers: {
        "X-Entity-Ref-ID": `monitor-${monitor.id}`,
      },
    });

    return { success: true, messageId: result.data?.id };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * SMS alert implementation
 */
async function sendSMSAlert(context) {
  try {
    // Get Twilio configuration from Parameter Store
    const config = await getParameters();
    
    if (!config.twilio_account_sid || !config.twilio_auth_token) {
      return { success: false, error: "Twilio not configured" };
    }

    const { channel } = context;
    const phone = channel.config.phone;

    if (!phone) {
      return { success: false, error: "No phone number configured" };
    }

    const { Twilio } = require("twilio");
    const twilio = new Twilio(
      config.twilio_account_sid,
      config.twilio_auth_token
    );

    const message = getSMSMessage(context);

    const result = await twilio.messages.create({
      body: message,
      to: phone,
      from: config.twilio_phone_number,
    });

    return { success: true, messageId: result.sid };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Webhook alert implementation
 */
async function sendWebhookAlert(context) {
  const {
    channel,
    monitor,
    triggerStatus,
    previousStatus,
    consecutiveFailures,
    responseTime,
  } = context;
  const webhookUrl = channel.config.webhook_url;

  if (!webhookUrl) {
    return { success: false, error: "No webhook URL configured" };
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
        alert_type: "webhook",
        source: "api-pulse",
      },
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "API-Pulse-Webhook/1.0",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        success: false,
        error: `Webhook failed with status ${response.status}: ${response.statusText}`,
      };
    }

    return { success: true, messageId: `webhook-${Date.now()}` };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Generate email template
 */
function getEmailTemplate(context) {
  const {
    monitor,
    triggerStatus,
    previousStatus,
    consecutiveFailures,
    responseTime,
  } = context;

  const isDownAlert = triggerStatus === "down" || triggerStatus === "timeout";
  const isRecoveryAlert = previousStatus === "down" && triggerStatus === "up";

  let subject, statusIcon, statusColor;

  if (isRecoveryAlert) {
    subject = `✅ ${monitor.name} is back online`;
    statusIcon = "✅";
    statusColor = "#22c55e";
  } else if (isDownAlert) {
    subject = `🚨 ${monitor.name} is down`;
    statusIcon = triggerStatus === "timeout" ? "⏰" : "🚨";
    statusColor = "#ef4444";
  } else {
    subject = `⚠️ ${monitor.name} status changed`;
    statusIcon = "⚠️";
    statusColor = "#f59e0b";
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
                ${previousStatus ? `<p><strong>Previous Status:</strong> ${previousStatus.toUpperCase()}</p>` : ""}
                ${responseTime !== null && responseTime !== undefined ? `<p><strong>Response Time:</strong> ${responseTime}ms</p>` : ""}
                ${consecutiveFailures > 1 ? `<p><strong>Consecutive Failures:</strong> ${consecutiveFailures}</p>` : ""}
                <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
            </div>
            
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
            
            <p style="color: #6b7280; font-size: 14px; margin: 0;">
                This alert was sent by API Pulse monitoring service.<br>
                Monitor created: ${new Date(monitor.created_at).toLocaleString()}
            </p>
        </div>
    </body>
    </html>
  `;

  const text = `
API Monitor Alert - ${monitor.name}

Status: ${triggerStatus.toUpperCase()}
URL: ${monitor.url}
${previousStatus ? `Previous Status: ${previousStatus.toUpperCase()}` : ""}
${responseTime !== null && responseTime !== undefined ? `Response Time: ${responseTime}ms` : ""}
${consecutiveFailures > 1 ? `Consecutive Failures: ${consecutiveFailures}` : ""}
Time: ${new Date().toLocaleString()}

This alert was sent by API Pulse monitoring service.
  `.trim();

  return { subject, html, text };
}

/**
 * Generate SMS message
 */
function getSMSMessage(context) {
  const { monitor, triggerStatus, previousStatus, consecutiveFailures } =
    context;

  const isRecoveryAlert = previousStatus === "down" && triggerStatus === "up";

  if (isRecoveryAlert) {
    return `✅ API Pulse: ${monitor.name} is back online! ${monitor.url}`;
  }

  const statusEmoji = triggerStatus === "timeout" ? "⏰" : "🚨";
  const failureText =
    consecutiveFailures > 1 ? ` (${consecutiveFailures} failures)` : "";

  return `${statusEmoji} API Pulse Alert: ${monitor.name} is ${triggerStatus.toUpperCase()}${failureText}. Check: ${monitor.url}`;
}

/**
 * Process alert message (for complex alert processing)
 */
async function processAlert(message) {
  const startTime = Date.now();
  console.log(`📢 Processing alert for monitor ${message.payload.monitorId}`);

  // This could handle complex alert rules, cooldowns, escalations, etc.
  // For now, it's a placeholder for future advanced alert features

  return {
    success: true,
    messageId: message.messageId,
    processingTime: Date.now() - startTime,
  };
}
