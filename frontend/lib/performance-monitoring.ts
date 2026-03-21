// Performance monitoring for SikaRemit frontend
// Note: web-vitals library not available, using native performance APIs

interface PerformanceMetrics {
  LCP?: number
  FID?: number
  CLS?: number
  FCP?: number
  TTFB?: number
  timestamp: string
  url: string
  userAgent: string
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = []
  private observer?: PerformanceObserver

  constructor() {
    this.initWebVitals()
    this.initPerformanceObserver()
  }

  private initWebVitals() {
    // Core Web Vitals - using native performance APIs
    // Simulate web-vitals library functionality
    setTimeout(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      if (navigation) {
        // Use fetchStart as fallback for activationStart
        const startTime = navigation.fetchStart || 0
        this.recordMetric('LCP', navigation.loadEventEnd - startTime)
        this.recordMetric('FCP', navigation.responseEnd - navigation.requestStart)
        this.recordMetric('TTFB', navigation.responseStart - navigation.requestStart)
      }
    }, 0)
    
    // FID and CLS would require more complex implementation
    // For now, we'll set placeholder values
    this.recordMetric('FID', 0)
    this.recordMetric('CLS', 0)
  }

  private initPerformanceObserver() {
    if (typeof window === 'undefined' || !window.PerformanceObserver) {
      return
    }

    this.observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        this.analyzePerformanceEntry(entry)
      }
    })

    // Observe different performance entry types
    this.observer.observe({ entryTypes: ['navigation', 'resource', 'measure'] })
  }

  private analyzePerformanceEntry(entry: PerformanceEntry) {
    switch (entry.entryType) {
      case 'navigation':
        const navEntry = entry as PerformanceNavigationTiming
        console.log('Navigation Performance:', {
          domContentLoaded: navEntry.domContentLoadedEventEnd - navEntry.domContentLoadedEventStart,
          loadComplete: navEntry.loadEventEnd - navEntry.loadEventStart,
          firstPaint: navEntry.responseEnd - navEntry.requestStart,
          totalTime: navEntry.loadEventEnd - navEntry.fetchStart
        })
        break

      case 'resource':
        const resourceEntry = entry as PerformanceResourceTiming
        if (resourceEntry.duration > 1000) { // Log slow resources
          console.warn('Slow Resource:', {
            name: resourceEntry.name,
            duration: resourceEntry.duration,
            size: resourceEntry.transferSize
          })
        }
        break
    }
  }

  private recordMetric(name: keyof PerformanceMetrics, value: number) {
    const metric: PerformanceMetrics = {
      [name]: value,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent
    }

    this.metrics.push(metric)
    console.log(`Performance Metric ${name}:`, value)

    // Report to analytics in production
    if (process.env.NODE_ENV === 'production') {
      this.reportMetric(metric)
    }
  }

  private reportMetric(metric: PerformanceMetrics) {
    // Send to your analytics service
    if (typeof window !== 'undefined' && (window as any).gtag) {
      Object.entries(metric).forEach(([key, value]) => {
        if (typeof value === 'number') {
          (window as any).gtag('event', key, {
            event_category: 'Web Vitals',
            value: Math.round(key === 'CLS' ? value * 1000 : value),
            custom_parameter_1: metric.url
          })
        }
      })
    }
  }

  public getMetrics(): PerformanceMetrics[] {
    return this.metrics
  }

  public getLatestMetrics(): PerformanceMetrics | undefined {
    return this.metrics[this.metrics.length - 1]
  }

  public analyzePerformance() {
    const latest = this.getLatestMetrics()
    if (!latest) return null

    const analysis = {
      lcpStatus: this.getLCPStatus(latest.LCP),
      fidStatus: this.getFIDStatus(latest.FID),
      clsStatus: this.getCLSStatus(latest.CLS),
      fcpStatus: this.getFCPStatus(latest.FCP),
      ttfbStatus: this.getTTFBStatus(latest.TTFB),
      overall: 'good' as 'good' | 'needs-improvement' | 'poor'
    }

    // Determine overall status
    const statuses = Object.values(analysis).filter(s => typeof s === 'string') as string[]
    if (statuses.every(s => s === 'good')) {
      analysis.overall = 'good'
    } else if (statuses.some(s => s === 'poor')) {
      analysis.overall = 'poor'
    } else {
      analysis.overall = 'needs-improvement'
    }

    return analysis
  }

  private getLCPStatus(value?: number): 'good' | 'needs-improvement' | 'poor' {
    if (!value) return 'good'
    if (value <= 2500) return 'good'
    if (value <= 4000) return 'needs-improvement'
    return 'poor'
  }

  private getFIDStatus(value?: number): 'good' | 'needs-improvement' | 'poor' {
    if (!value) return 'good'
    if (value <= 100) return 'good'
    if (value <= 300) return 'needs-improvement'
    return 'poor'
  }

  private getCLSStatus(value?: number): 'good' | 'needs-improvement' | 'poor' {
    if (!value) return 'good'
    if (value <= 0.1) return 'good'
    if (value <= 0.25) return 'needs-improvement'
    return 'poor'
  }

  private getFCPStatus(value?: number): 'good' | 'needs-improvement' | 'poor' {
    if (!value) return 'good'
    if (value <= 1800) return 'good'
    if (value <= 3000) return 'needs-improvement'
    return 'poor'
  }

  private getTTFBStatus(value?: number): 'good' | 'needs-improvement' | 'poor' {
    if (!value) return 'good'
    if (value <= 800) return 'good'
    if (value <= 1800) return 'needs-improvement'
    return 'poor'
  }

  public destroy() {
    if (this.observer) {
      this.observer.disconnect()
    }
  }
}

// Singleton instance
let performanceMonitor: PerformanceMonitor | null = null

export function getPerformanceMonitor(): PerformanceMonitor {
  if (!performanceMonitor) {
    performanceMonitor = new PerformanceMonitor()
  }
  return performanceMonitor
}

export function usePerformanceMonitoring() {
  if (typeof window !== 'undefined') {
    return getPerformanceMonitor()
  }
  return null
}

// Export for use in components
export { PerformanceMonitor }
export type { PerformanceMetrics }
