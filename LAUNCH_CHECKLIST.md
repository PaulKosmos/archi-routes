# Archi-Routes Launch Checklist

> Last updated: 2026-01-25

## Overview

This document tracks the pre-launch audit progress and remaining tasks for production deployment.

---

## P0 (Critical) - ALL RESOLVED ✅

| Issue | Description | Status | Resolution |
|-------|-------------|--------|------------|
| P0-1 | Hardcoded API key in code | ✅ Accepted | Risk accepted (private repo) |
| P0-2 | Test endpoint exposed | ✅ Fixed | Deleted `/api/news/test/route.ts` |
| P0-3 | Auth bypass in news API | ✅ Fixed | Added authentication checks |
| P0-4 | TypeScript errors ignored | ✅ Fixed | 247→0 errors, strict checking enabled |

**Status: Project can be deployed - no critical blockers.**

---

## P1 (High Priority) - 2 REMAINING ⚠️

These should be addressed before or immediately after launch.

### P1-1: Console Logging in Production
- **Risk:** Data leakage in logs, performance impact
- **Complexity:** 🟢 Low (1-2h)
- **Status:** ✅ Completed (2026-01-25)
- **Solution:** Enhanced `src/lib/logger.ts` with production log level filtering. Added `devLog`, `devWarn`, `devError` helpers for easy migration.

### P1-2: Rate Limiting
- **Risk:** DDoS attacks, brute force attempts, API abuse
- **Complexity:** 🟡 Medium (2-3h)
- **Status:** ⏳ Pending
- **Solution:** Implement rate limiting via middleware or Vercel Edge Config

### P1-3: CORS Configuration
- **Risk:** Cross-origin attacks, unauthorized API access
- **Complexity:** 🟢 Low (30min)
- **Status:** ✅ Completed (2026-01-25)
- **Solution:** Added CORS handling in `src/middleware.ts` with origin whitelist for production and localhost for development.

### P1-4: ESLint Errors Ignored
- **Risk:** Code quality issues, potential bugs
- **Complexity:** 🟡 Medium (varies)
- **Status:** ⏳ Pending
- **Solution:** Enable ESLint in build process, fix warnings incrementally

### P1-5: Environment Variable Validation
- **Risk:** Application crash on missing env vars
- **Complexity:** 🟢 Low (1h)
- **Status:** ✅ Completed (2026-01-25)
- **Solution:** Created `src/lib/env.ts` with Zod schema validation for all environment variables.

---

## Implementation Priority

### Minimum for Production Launch
1. ✅ TypeScript checking - enabled
2. ✅ Environment variable validation - Zod schema created
3. ⏳ Rate limiting - protection against abuse (can use Vercel's built-in)

### First Week After Launch
1. ✅ Console logging - production-safe logger implemented
2. ✅ Env validation with Zod schema - done
3. ✅ CORS middleware - configured

### Can Be Deferred
- ESLint fixes (non-critical)
- Error tracking (Sentry integration)
- Analytics setup

---

## Quick Implementation Guides

### P1-5: Environment Variable Validation (Fastest)

Create `src/lib/env.ts`:
```typescript
import { z } from 'zod'

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  NEXT_PUBLIC_MAPBOX_TOKEN: z.string().min(1),
  // Add other required env vars
})

export const env = envSchema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  NEXT_PUBLIC_MAPBOX_TOKEN: process.env.NEXT_PUBLIC_MAPBOX_TOKEN,
})
```

### P1-3: CORS Middleware

Add to `middleware.ts`:
```typescript
const allowedOrigins = [
  'https://archiroutes.com',
  'https://www.archiroutes.com',
  process.env.NODE_ENV === 'development' && 'http://localhost:3000',
].filter(Boolean)

export function middleware(request: NextRequest) {
  const origin = request.headers.get('origin')

  if (origin && !allowedOrigins.includes(origin)) {
    return new NextResponse(null, { status: 403 })
  }

  // ... rest of middleware
}
```

### P1-1: Conditional Console Logging

Create `src/lib/logger.ts`:
```typescript
const isDev = process.env.NODE_ENV === 'development'

export const logger = {
  log: (...args: unknown[]) => isDev && console.log(...args),
  warn: (...args: unknown[]) => isDev && console.warn(...args),
  error: (...args: unknown[]) => console.error(...args), // Always log errors
  debug: (...args: unknown[]) => isDev && console.debug(...args),
}
```

---

## Progress Tracking

- [x] P0-1: API key issue addressed
- [x] P0-2: Test endpoint removed
- [x] P0-3: Auth bypass fixed
- [x] P0-4: TypeScript errors fixed
- [x] P1-1: Console logging - Enhanced logger with production filtering
- [ ] P1-2: Rate limiting
- [x] P1-3: CORS configuration - Added to middleware
- [ ] P1-4: ESLint errors
- [x] P1-5: Env validation - Zod schema created

---

## Notes

- Project is on branch: `feature/profile-redesign`
- Main branch for PRs: `main`
- See `PRE_LAUNCH_AUDIT_REPORT.md` for full audit details
- See `TROUBLESHOOTING.md` for known issues and solutions
