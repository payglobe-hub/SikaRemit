// Performance monitoring configuration
export const PERFORMANCE_CONFIG = {
  // Core Web Vitals thresholds
  thresholds: {
    LCP: 2500,  // Largest Contentful Paint (ms)
    FID: 100,   // First Input Delay (ms)
    CLS: 0.1,   // Cumulative Layout Shift
    FCP: 1800,  // First Contentful Paint (ms)
    TTFB: 800   // Time to First Byte (ms)
  },
  
  // Bundle analysis
  bundleAnalysis: {
    enabled: true,
    maxSize: 244 * 1024, // 244KB gzipped
    chunkSizeLimit: 300 * 1024 // 300KB per chunk
  },
  
  // Image optimization
  imageOptimization: {
    enabled: true,
    formats: ['webp', 'avif'],
    quality: 80,
    placeholder: true
  }
};

export function reportWebVitals(metric: { name: string; value: number; id?: string }) {
  const { name, value, id } = metric;
  
  // Report to analytics service
  if ((window as any).gtag) {
    (window as any).gtag('event', name, {
      event_category: 'Web Vitals',
      value: Math.round(name === 'CLS' ? value * 1000 : value),
      event_label: id,
      non_interaction: true,
    });
  }
  
  // Console logging in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Web Vitals] ${name}: ${value}`);
  }
}
