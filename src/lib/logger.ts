// src/lib/logger.ts
// Structured logging utility for production-ready logging

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface LogMeta {
  [key: string]: any
}

interface LogEntry {
  level: LogLevel
  message: string
  timestamp: string
  meta?: LogMeta
  error?: {
    name: string
    message: string
    stack?: string
  }
}

/**
 * Structured logger for production use
 * Outputs JSON formatted logs that can be easily parsed by log aggregators
 */
class Logger {
  private isDevelopment: boolean

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development'
  }

  /**
   * Format log entry as JSON
   */
  private formatLog(level: LogLevel, message: string, meta?: LogMeta, error?: Error): string {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
    }

    if (meta) {
      entry.meta = meta
    }

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      }
    }

    return JSON.stringify(entry)
  }

  /**
   * Debug level logging (only in development)
   */
  debug(message: string, meta?: LogMeta) {
    if (this.isDevelopment) {
      console.log(this.formatLog('debug', message, meta))
    }
  }

  /**
   * Info level logging
   */
  info(message: string, meta?: LogMeta) {
    console.log(this.formatLog('info', message, meta))
  }

  /**
   * Warning level logging
   */
  warn(message: string, meta?: LogMeta) {
    console.warn(this.formatLog('warn', message, meta))
  }

  /**
   * Error level logging
   */
  error(message: string, error?: Error, meta?: LogMeta) {
    console.error(this.formatLog('error', message, meta, error))
  }

  /**
   * Log with custom level
   */
  log(level: LogLevel, message: string, meta?: LogMeta, error?: Error) {
    const formatted = this.formatLog(level, message, meta, error)

    switch (level) {
      case 'debug':
        if (this.isDevelopment) console.log(formatted)
        break
      case 'info':
        console.log(formatted)
        break
      case 'warn':
        console.warn(formatted)
        break
      case 'error':
        console.error(formatted)
        break
    }
  }
}

// Export singleton instance
export const logger = new Logger()

// Export default for convenience
export default logger

/**
 * Usage examples:
 *
 * // Info log
 * logger.info('User logged in', { userId: '123', email: 'user@example.com' })
 *
 * // Error log
 * try {
 *   // some code
 * } catch (error) {
 *   logger.error('Failed to process request', error as Error, { requestId: '456' })
 * }
 *
 * // Warning log
 * logger.warn('Deprecated API used', { endpoint: '/api/old' })
 *
 * // Debug log (only in development)
 * logger.debug('Cache hit', { key: 'user:123', ttl: 3600 })
 */
