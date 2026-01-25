import { z } from 'zod'

/**
 * Environment variable validation schema
 * This ensures all required environment variables are present at runtime
 */

// Server-side environment variables (not exposed to browser)
const serverSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
})

// Client-side environment variables (exposed to browser via NEXT_PUBLIC_ prefix)
const clientSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('NEXT_PUBLIC_SUPABASE_URL must be a valid URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required'),
  NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN: z.string().min(1, 'NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN is required'),
  NEXT_PUBLIC_SITE_URL: z.string().url().optional().default('https://archi-routes.com'),
  NEXT_PUBLIC_ORS_API_KEY: z.string().optional(),
  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: z.string().optional(),
  NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),
})

// Combined schema for full validation
const envSchema = serverSchema.merge(clientSchema)

// Type exports
export type ServerEnv = z.infer<typeof serverSchema>
export type ClientEnv = z.infer<typeof clientSchema>
export type Env = z.infer<typeof envSchema>

/**
 * Validate environment variables
 * Call this at application startup to catch missing variables early
 */
export function validateEnv(): Env {
  const parsed = envSchema.safeParse({
    // Server variables
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    NODE_ENV: process.env.NODE_ENV,
    // Client variables
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN: process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_ORS_API_KEY: process.env.NEXT_PUBLIC_ORS_API_KEY,
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
  })

  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors
    const errorMessages = Object.entries(errors)
      .map(([field, messages]) => `  - ${field}: ${messages?.join(', ')}`)
      .join('\n')

    console.error('Environment validation failed:\n' + errorMessages)

    // In development, throw an error to halt startup
    // In production, log the error but don't crash (may have partial functionality)
    if (process.env.NODE_ENV === 'development') {
      throw new Error(`Environment validation failed:\n${errorMessages}`)
    }
  }

  return parsed.data as Env
}

/**
 * Validate only client-side environment variables
 * Safe to call from browser code
 */
export function validateClientEnv(): ClientEnv {
  const parsed = clientSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN: process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_ORS_API_KEY: process.env.NEXT_PUBLIC_ORS_API_KEY,
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
  })

  if (!parsed.success) {
    console.error('Client environment validation failed:', parsed.error.flatten().fieldErrors)
  }

  return parsed.data as ClientEnv
}

// Helper to check if we're in development mode
export const isDevelopment = process.env.NODE_ENV === 'development'
export const isProduction = process.env.NODE_ENV === 'production'

// Export validated env (lazy initialization)
let _env: Env | null = null
export function getEnv(): Env {
  if (!_env) {
    _env = validateEnv()
  }
  return _env
}
