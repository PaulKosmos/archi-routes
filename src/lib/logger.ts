// src/lib/logger.ts
// Structured logging utility for production-ready logging

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

// Log level priority (higher = more important)
const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

export interface LogMeta {
  [key: string]: unknown
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
 *
 * In production: Only logs 'warn' and 'error' levels
 * In development: Logs all levels
 */
class Logger {
  private isDevelopment: boolean
  private minLevel: LogLevel

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development'
    // In production, only log warnings and errors
    // In development, log everything
    this.minLevel = this.isDevelopment ? 'debug' : 'warn'
  }

  /**
   * Check if a log level should be output
   */
  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[this.minLevel]
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
    if (this.shouldLog('debug')) {
      console.log(this.formatLog('debug', message, meta))
    }
  }

  /**
   * Info level logging (only in development)
   */
  info(message: string, meta?: LogMeta) {
    if (this.shouldLog('info')) {
      console.log(this.formatLog('info', message, meta))
    }
  }

  /**
   * Warning level logging (always logged)
   */
  warn(message: string, meta?: LogMeta) {
    if (this.shouldLog('warn')) {
      console.warn(this.formatLog('warn', message, meta))
    }
  }

  /**
   * Error level logging (always logged)
   */
  error(message: string, error?: Error, meta?: LogMeta) {
    if (this.shouldLog('error')) {
      console.error(this.formatLog('error', message, meta, error))
    }
  }

  /**
   * Log with custom level
   */
  log(level: LogLevel, message: string, meta?: LogMeta, error?: Error) {
    if (!this.shouldLog(level)) return

    const formatted = this.formatLog(level, message, meta, error)

    switch (level) {
      case 'debug':
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
 * Simple console replacement for quick migration
 * Use this as a drop-in replacement for console.log
 *
 * Instead of: console.log('message', data)
 * Use: devLog('message', data)
 *
 * This will only log in development mode
 */
const isDev = process.env.NODE_ENV === 'development'

export const devLog = (...args: unknown[]) => {
  if (isDev) console.log(...args)
}

export const devWarn = (...args: unknown[]) => {
  if (isDev) console.warn(...args)
}

export const devError = (...args: unknown[]) => {
  // Errors are always logged
  console.error(...args)
}

export const devDebug = (...args: unknown[]) => {
  if (isDev) console.debug(...args)
}

/**
 * Usage examples:
 *
 * // Structured logging (recommended for production code)
 * logger.info('User logged in', { userId: '123', email: 'user@example.com' })
 * logger.error('Failed to process request', error as Error, { requestId: '456' })
 * logger.warn('Deprecated API used', { endpoint: '/api/old' })
 * logger.debug('Cache hit', { key: 'user:123', ttl: 3600 })
 *
 * // Simple console replacement (for quick migration)
 * devLog('Debug message', someData)  // Only logs in development
 * devWarn('Warning message')          // Only logs in development
 * devError('Error message', error)    // Always logs (even in production)
 */
