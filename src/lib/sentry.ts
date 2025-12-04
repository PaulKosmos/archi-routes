// src/lib/sentry.ts
// Sentry error tracking configuration
//
// INSTALLATION:
// npm install --save @sentry/nextjs
//
// SETUP INSTRUCTIONS:
// 1. Create free account at https://sentry.io
// 2. Create new Next.js project
// 3. Copy DSN from Settings -> Client Keys (DSN)
// 4. Add to .env.local:
//    NEXT_PUBLIC_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
// 5. Uncomment code below

/**
 * Initialize Sentry for error tracking
 *
 * Features:
 * - Automatic error capture
 * - Performance monitoring (10% sample rate)
 * - User context tracking
 * - Release tracking
 * - Source maps for debugging
 */

// Uncomment after installing @sentry/nextjs
/*
import * as Sentry from '@sentry/nextjs'

export function initSentry() {
  const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN

  if (!SENTRY_DSN) {
    console.warn('Sentry DSN not configured. Error tracking disabled.')
    return
  }

  Sentry.init({
    dsn: SENTRY_DSN,

    // Environment
    environment: process.env.NODE_ENV || 'development',

    // Performance Monitoring
    tracesSampleRate: 0.1, // 10% of transactions for performance monitoring

    // Session Replay (optional, costs extra)
    // replaysSessionSampleRate: 0.1,
    // replaysOnErrorSampleRate: 1.0,

    // Ignore common errors
    ignoreErrors: [
      // Browser extensions
      'top.GLOBALS',
      'chrome-extension://',
      'moz-extension://',
      // Network errors
      'NetworkError',
      'Network request failed',
      // Non-critical errors
      'ResizeObserver loop limit exceeded',
    ],

    // Before send hook for filtering/modifying events
    beforeSend(event, hint) {
      // Filter out sensitive data
      if (event.request?.headers) {
        delete event.request.headers.cookie
        delete event.request.headers.authorization
      }

      return event
    },
  })
}

// Manually capture exception
export function captureException(error: Error, context?: Record<string, any>) {
  Sentry.captureException(error, {
    extra: context,
  })
}

// Manually capture message
export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info') {
  Sentry.captureMessage(message, level)
}

// Set user context
export function setUser(user: { id: string; email?: string; username?: string } | null) {
  Sentry.setUser(user)
}

// Set custom context
export function setContext(name: string, context: Record<string, any>) {
  Sentry.setContext(name, context)
}

// Add breadcrumb
export function addBreadcrumb(breadcrumb: Sentry.Breadcrumb) {
  Sentry.addBreadcrumb(breadcrumb)
}
*/

// Temporary stubs until Sentry is installed
export function initSentry() {
  console.log('Sentry not installed. Install with: npm install @sentry/nextjs')
}

export function captureException(error: Error, context?: Record<string, any>) {
  console.error('Sentry captureException:', error, context)
}

export function captureMessage(message: string, level: string = 'info') {
  console.log(`Sentry captureMessage [${level}]:`, message)
}

export function setUser(user: { id: string; email?: string; username?: string } | null) {
  console.log('Sentry setUser:', user)
}

export function setContext(name: string, context: Record<string, any>) {
  console.log('Sentry setContext:', name, context)
}

export function addBreadcrumb(breadcrumb: any) {
  console.log('Sentry addBreadcrumb:', breadcrumb)
}

/**
 * Usage examples:
 *
 * // In app/layout.tsx (root layout)
 * import { initSentry } from '@/lib/sentry'
 * useEffect(() => {
 *   initSentry()
 * }, [])
 *
 * // Capture error manually
 * try {
 *   // some code
 * } catch (error) {
 *   captureException(error as Error, { userId: user.id })
 * }
 *
 * // Set user context after login
 * setUser({ id: user.id, email: user.email })
 *
 * // Clear user context after logout
 * setUser(null)
 *
 * // Add breadcrumb for debugging
 * addBreadcrumb({
 *   category: 'auth',
 *   message: 'User logged in',
 *   level: 'info'
 * })
 */
