// Simple performance monitoring for SikaRemit frontend
interface PerformanceMetrics {
  domLoadTime?: number
  pageLoadTime?: number
  resourceCount?: number
  memoryUsage?: number
  timestamp: string
  url: string
  userAgent: string
}

class SimplePerformanceMonitor {
  private metrics: PerformanceMetrics[] = []
  private observer?: PerformanceObserver

  constructor() {
    this.initPerformanceObserver()
    this.recordInitialMetrics()
  }

  private initPerformanceObserver() {
    if (typeof window === 'undefined' || !window.PerformanceObserver) {
      return
    }

    try {
      this.observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.analyzePerformanceEntry(entry)
        }
      })

      // Observe different performance entry types
      this.observer.observe({ entryTypes: ['navigation', 'resource', 'measure'] })
    } catch (error) {
      console.warn('Performance Observer not supported:', error)
    }
  }

  private recordInitialMetrics() {
    if (typeof window === 'undefined' || !window.performance) {
      return
    }

    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
    if (navigation) {
      const domLoadTime = navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart
      const pageLoadTime = navigation.loadEventEnd - navigation.loadEventStart
      const resourceCount = performance.getEntriesByType('resource').length

      this.recordMetric({
        domLoadTime,
        pageLoadTime,
        resourceCount
      })
    }
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

  private recordMetric(metrics: Partial<PerformanceMetrics>) {
    const metric: PerformanceMetrics = {
      ...metrics,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent
    }

    this.metrics.push(metric)
    console.log('Performance Metrics:', metric)

    // Report to analytics in production
    if (process.env.NODE_ENV === 'production') {
      this.reportMetric(metric)
    }
  }

  private reportMetric(metric: PerformanceMetrics) {
    // Send to your analytics service (placeholder)
    console.log('Reporting metrics to analytics:', metric)
    
    // Example: Send to Google Analytics if available
    if (typeof window !== 'undefined' && (window as any).gtag) {
      Object.entries(metric).forEach(([key, value]) => {
        if (typeof value === 'number') {
          (window as any).gtag('event', key, {
            event_category: 'Performance',
            value: Math.round(value),
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
      domLoadStatus: this.getDomLoadStatus(latest.domLoadTime),
      pageLoadStatus: this.getPageLoadStatus(latest.pageLoadTime),
      resourceStatus: this.getResourceStatus(latest.resourceCount),
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

  private getDomLoadStatus(value?: number): 'good' | 'needs-improvement' | 'poor' {
    if (!value) return 'good'
    if (value <= 1000) return 'good'
    if (value <= 2000) return 'needs-improvement'
    return 'poor'
  }

  private getPageLoadStatus(value?: number): 'good' | 'needs-improvement' | 'poor' {
    if (!value) return 'good'
    if (value <= 2000) return 'good'
    if (value <= 4000) return 'needs-improvement'
    return 'poor'
  }

  private getResourceStatus(value?: number): 'good' | 'needs-improvement' | 'poor' {
    if (!value) return 'good'
    if (value <= 50) return 'good'
    if (value <= 100) return 'needs-improvement'
    return 'poor'
  }

  public getMemoryUsage() {
    if (typeof window !== 'undefined' && (performance as any).memory) {
      const memory = (performance as any).memory
      return {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
        usedPercentage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100
      }
    }
    return null
  }

  public checkCoreWebVitals() {
    if (typeof window === 'undefined' || !window.performance) {
      return null
    }

    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
    if (!navigation) return null

    // Calculate approximate Core Web Vitals
    const fcp = navigation.responseEnd - navigation.requestStart // Approximate First Contentful Paint
    const lcp = navigation.loadEventEnd - navigation.fetchStart // Approximate Largest Contentful Paint
    const ttfb = navigation.responseStart - navigation.requestStart // Time to First Byte

    return {
      fcp,
      lcp,
      ttfb,
      status: {
        fcp: this.getFCPStatus(fcp),
        lcp: this.getLCPStatus(lcp),
        ttfb: this.getTTFBStatus(ttfb)
      }
    }
  }

  private getFCPStatus(value: number): 'good' | 'needs-improvement' | 'poor' {
    if (value <= 1800) return 'good'
    if (value <= 3000) return 'needs-improvement'
    return 'poor'
  }

  private getLCPStatus(value: number): 'good' | 'needs-improvement' | 'poor' {
    if (value <= 2500) return 'good'
    if (value <= 4000) return 'needs-improvement'
    return 'poor'
  }

  private getTTFBStatus(value: number): 'good' | 'needs-improvement' | 'poor' {
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
let performanceMonitor: SimplePerformanceMonitor | null = null

export function getPerformanceMonitor(): SimplePerformanceMonitor {
  if (!performanceMonitor) {
    performanceMonitor = new SimplePerformanceMonitor()
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
export { SimplePerformanceMonitor }
export type { PerformanceMetrics }
