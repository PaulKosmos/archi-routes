/**
 * Конфигурация производительности для продакшена
 */

// Core Web Vitals thresholds
export const PERFORMANCE_THRESHOLDS = {
  // First Contentful Paint
  FCP: {
    GOOD: 1800,
    NEEDS_IMPROVEMENT: 3000,
    POOR: 3000
  },
  // Largest Contentful Paint
  LCP: {
    GOOD: 2500,
    NEEDS_IMPROVEMENT: 4000,
    POOR: 4000
  },
  // First Input Delay
  FID: {
    GOOD: 100,
    NEEDS_IMPROVEMENT: 300,
    POOR: 300
  },
  // Cumulative Layout Shift
  CLS: {
    GOOD: 0.1,
    NEEDS_IMPROVEMENT: 0.25,
    POOR: 0.25
  },
  // Time to Interactive
  TTI: {
    GOOD: 3800,
    NEEDS_IMPROVEMENT: 7300,
    POOR: 7300
  }
} as const

// Memory usage thresholds
export const MEMORY_THRESHOLDS = {
  WARNING: 0.6, // 60% of limit
  CRITICAL: 0.8, // 80% of limit
  MAX_LIMIT: 0.9 // 90% of limit
} as const

// Bundle size thresholds
export const BUNDLE_THRESHOLDS = {
  MAIN_BUNDLE: {
    WARNING: 1024 * 1024, // 1MB
    CRITICAL: 2 * 1024 * 1024 // 2MB
  },
  INITIAL_LOAD: {
    WARNING: 512 * 1024, // 512KB
    CRITICAL: 1024 * 1024 // 1MB
  }
} as const

// Performance monitoring configuration
export const MONITORING_CONFIG = {
  // Sampling rate for performance metrics (0-1)
  SAMPLING_RATE: 0.1, // 10% of users
  
  // Metrics collection interval
  COLLECTION_INTERVAL: 10000, // 10 seconds
  
  // Maximum number of metrics to store in memory
  MAX_METRICS_STORED: 100,
  
  // Performance budget thresholds
  BUDGETS: {
    BUNDLE_SIZE: 1.5 * 1024 * 1024, // 1.5MB
    INITIAL_LOAD_TIME: 2000, // 2 seconds
    INTERACTIVE_TIME: 3000, // 3 seconds
    LARGEST_CONTENTFUL_PAINT: 2500, // 2.5 seconds
  }
} as const

// Error tracking configuration
export const ERROR_TRACKING_CONFIG = {
  // Maximum errors to track per session
  MAX_ERRORS_PER_SESSION: 50,
  
  // Error sampling rate
  ERROR_SAMPLING_RATE: 1.0, // 100% for critical errors
  
  // Performance error thresholds
  PERFORMANCE_ERROR_THRESHOLDS: {
    SLOW_LOAD: 5000, // 5 seconds
    HIGH_MEMORY: 0.8, // 80% memory usage
    LARGE_BUNDLE: 2 * 1024 * 1024 // 2MB bundle
  }
} as const

// Caching configuration
export const CACHE_CONFIG = {
  // Static assets cache duration
  STATIC_ASSETS_TTL: 31536000, // 1 year
  
  // API responses cache duration
  API_CACHE_TTL: 300, // 5 minutes
  
  // Image cache duration
  IMAGE_CACHE_TTL: 86400, // 1 day
  
  // Component cache duration
  COMPONENT_CACHE_TTL: 3600 // 1 hour
} as const

// Image optimization configuration
export const IMAGE_CONFIG = {
  // Supported formats
  SUPPORTED_FORMATS: ['webp', 'avif', 'jpeg', 'png'] as const,
  
  // Quality settings
  QUALITY: {
    HIGH: 90,
    MEDIUM: 75,
    LOW: 60
  },
  
  // Size breakpoints
  BREAKPOINTS: {
    MOBILE: 400,
    TABLET: 768,
    DESKTOP: 1200,
    LARGE: 1920
  },
  
  // Lazy loading configuration
  LAZY_LOADING: {
    ROOT_MARGIN: '50px',
    THRESHOLD: 0.1
  }
} as const

// Bundle optimization configuration
export const BUNDLE_CONFIG = {
  // Code splitting configuration
  CODE_SPLITTING: {
    CHUNK_SIZE_LIMIT: 244 * 1024, // 244KB
    MAX_CHUNKS: 20,
    MIN_CHUNK_SIZE: 20 * 1024 // 20KB
  },
  
  // Tree shaking configuration
  TREE_SHAKING: {
    ENABLED: true,
    SIDE_EFFECTS: false
  },
  
  // Compression configuration
  COMPRESSION: {
    GZIP: true,
    BROTLI: true,
    LEVEL: 6
  }
} as const

// Performance monitoring utilities
export class PerformanceMonitor {
  private static instance: PerformanceMonitor
  private metrics: Map<string, any> = new Map()
  private observers: PerformanceObserver[] = []

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor()
    }
    return PerformanceMonitor.instance
  }

  startMonitoring(): void {
    if (typeof window === 'undefined') return

    // Monitor Core Web Vitals
    this.observeCoreWebVitals()
    
    // Monitor memory usage
    this.observeMemoryUsage()
    
    // Monitor bundle size
    this.observeBundleSize()
  }

  private observeCoreWebVitals(): void {
    // FCP Observer
    const fcpObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === 'first-contentful-paint') {
          this.recordMetric('fcp', entry.startTime)
          this.checkThreshold('fcp', entry.startTime, PERFORMANCE_THRESHOLDS.FCP)
        }
      }
    })
    fcpObserver.observe({ entryTypes: ['paint'] })
    this.observers.push(fcpObserver)

    // LCP Observer
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      const lastEntry = entries[entries.length - 1]
      this.recordMetric('lcp', lastEntry.startTime)
      this.checkThreshold('lcp', lastEntry.startTime, PERFORMANCE_THRESHOLDS.LCP)
    })
    lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] })
    this.observers.push(lcpObserver)

    // FID Observer
    const fidObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const eventEntry = entry as PerformanceEventTiming
        const fid = eventEntry.processingStart - eventEntry.startTime
        this.recordMetric('fid', fid)
        this.checkThreshold('fid', fid, PERFORMANCE_THRESHOLDS.FID)
      }
    })
    fidObserver.observe({ entryTypes: ['first-input'] })
    this.observers.push(fidObserver)

    // CLS Observer
    let clsValue = 0
    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!(entry as any).hadRecentInput) {
          clsValue += (entry as any).value
          this.recordMetric('cls', clsValue)
          this.checkThreshold('cls', clsValue, PERFORMANCE_THRESHOLDS.CLS)
        }
      }
    })
    clsObserver.observe({ entryTypes: ['layout-shift'] })
    this.observers.push(clsObserver)
  }

  private observeMemoryUsage(): void {
    if (!('memory' in performance)) return

    setInterval(() => {
      const memory = (performance as any).memory
      const usage = memory.usedJSHeapSize / memory.jsHeapSizeLimit
      
      this.recordMetric('memory_usage', usage)
      
      if (usage > MEMORY_THRESHOLDS.CRITICAL) {
        this.reportCriticalIssue('high_memory_usage', { usage, limit: memory.jsHeapSizeLimit })
      }
    }, MONITORING_CONFIG.COLLECTION_INTERVAL)
  }

  private observeBundleSize(): void {
    // Monitor bundle size through resource timing
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'resource') {
          const resource = entry as PerformanceResourceTiming
          if (resource.transferSize > BUNDLE_THRESHOLDS.MAIN_BUNDLE.WARNING) {
            this.recordMetric('large_resource', {
              url: resource.name,
              size: resource.transferSize
            })
          }
        }
      }
    })
    observer.observe({ entryTypes: ['resource'] })
    this.observers.push(observer)
  }

  private recordMetric(name: string, value: any): void {
    this.metrics.set(name, {
      value,
      timestamp: Date.now()
    })
  }

  private checkThreshold(metric: string, value: number, thresholds: any): void {
    let status = 'good'
    if (value > thresholds.POOR) {
      status = 'poor'
    } else if (value > thresholds.NEEDS_IMPROVEMENT) {
      status = 'needs_improvement'
    }

    this.recordMetric(`${metric}_status`, status)
    
    if (status !== 'good') {
      this.reportPerformanceIssue(metric, value, status)
    }
  }

  private reportPerformanceIssue(metric: string, value: number, status: string): void {
    console.warn(`Performance issue detected: ${metric} = ${value} (${status})`)
    
    // In production, send to analytics service
    if (process.env.NODE_ENV === 'production') {
      this.sendToAnalytics({
        type: 'performance_issue',
        metric,
        value,
        status,
        timestamp: Date.now()
      })
    }
  }

  private reportCriticalIssue(type: string, data: any): void {
    console.error(`Critical issue detected: ${type}`, data)
    
    // In production, send to error tracking service
    if (process.env.NODE_ENV === 'production') {
      this.sendToAnalytics({
        type: 'critical_issue',
        issue_type: type,
        data,
        timestamp: Date.now()
      })
    }
  }

  private sendToAnalytics(data: any): void {
    // Placeholder for analytics integration
    // In real implementation, send to services like Google Analytics, Sentry, etc.
    console.log('Analytics data:', data)
  }

  getMetrics(): Map<string, any> {
    return new Map(this.metrics)
  }

  disconnect(): void {
    this.observers.forEach(observer => observer.disconnect())
    this.observers = []
  }
}

// Initialize performance monitoring
if (typeof window !== 'undefined') {
  const monitor = PerformanceMonitor.getInstance()
  monitor.startMonitoring()
}

export default PerformanceMonitor
