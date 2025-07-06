/**
 * Configurable logging utility for API Pulse
 * Provides structured logging with different levels and environment-aware output
 */

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

interface LogContext {
  component?: string
  userId?: string
  monitorId?: string
  requestId?: string
  [key: string]: any
}

class Logger {
  private logLevel: LogLevel
  private isDevelopment: boolean

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development'
    this.logLevel = this.getLogLevel()
  }

  private getLogLevel(): LogLevel {
    const envLevel = process.env.LOG_LEVEL?.toUpperCase()
    switch (envLevel) {
      case 'ERROR':
        return LogLevel.ERROR
      case 'WARN':
        return LogLevel.WARN
      case 'INFO':
        return LogLevel.INFO
      case 'DEBUG':
        return LogLevel.DEBUG
      default:
        return this.isDevelopment ? LogLevel.DEBUG : LogLevel.INFO
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return level <= this.logLevel
  }

  private formatMessage(level: string, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString()
    const contextStr = context ? ` ${JSON.stringify(context)}` : ''
    return `[${timestamp}] ${level}: ${message}${contextStr}`
  }

  private log(level: LogLevel, levelName: string, message: string, context?: LogContext): void {
    if (!this.shouldLog(level)) return

    if (this.isDevelopment) {
      // In development, use console with prefixes
      const formattedMessage = this.formatMessage(levelName, message, context)
      switch (level) {
        case LogLevel.ERROR:
          console.error(`[ERROR] ${formattedMessage}`)
          break
        case LogLevel.WARN:
          console.warn(`[WARN] ${formattedMessage}`)
          break
        case LogLevel.INFO:
          console.info(`[INFO] ${formattedMessage}`)
          break
        case LogLevel.DEBUG:
          console.debug(`[DEBUG] ${formattedMessage}`)
          break
      }
    } else {
      // In production, use structured JSON logging
      const logEntry = {
        timestamp: new Date().toISOString(),
        level: levelName,
        message,
        ...context,
      }
      console.log(JSON.stringify(logEntry))
    }
  }

  error(message: string, context?: LogContext): void {
    this.log(LogLevel.ERROR, 'ERROR', message, context)
  }

  warn(message: string, context?: LogContext): void {
    this.log(LogLevel.WARN, 'WARN', message, context)
  }

  info(message: string, context?: LogContext): void {
    this.log(LogLevel.INFO, 'INFO', message, context)
  }

  debug(message: string, context?: LogContext): void {
    this.log(LogLevel.DEBUG, 'DEBUG', message, context)
  }

  // Convenience methods for common patterns
  apiRequest(method: string, path: string, userId?: string): void {
    this.info(`${method} ${path}`, { component: 'API', userId })
  }

  apiError(method: string, path: string, error: any, userId?: string): void {
    this.error(`${method} ${path} failed: ${error.message || error}`, {
      component: 'API',
      userId,
      error: error.message || String(error),
    })
  }

  sqsOperation(operation: string, queueName?: string, messageId?: string): void {
    this.info(`SQS ${operation}`, { component: 'SQS', queueName, messageId })
  }

  sqsError(operation: string, error: any, queueName?: string): void {
    this.error(`SQS ${operation} failed: ${error.message || error}`, {
      component: 'SQS',
      queueName,
      error: error.message || String(error),
    })
  }

  monitorCheck(monitorId: string, status: string, responseTime?: number): void {
    this.info(`Monitor check completed`, {
      component: 'Monitor',
      monitorId,
      status,
      responseTime,
    })
  }

  schedulerOperation(operation: string, context?: Record<string, any>): void {
    this.info(`Scheduler ${operation}`, { component: 'Scheduler', ...context })
  }
}

// Export singleton instance
export const logger = new Logger()

// Export type for context
export type { LogContext }