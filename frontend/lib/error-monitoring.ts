// Error monitoring and handling configuration
export const ERROR_CONFIG = {
  // Error reporting
  reporting: {
    enabled: process.env.NODE_ENV === 'production',
    endpoint: '/api/v1/errors/report',
    maxErrors: 50,
    samplingRate: 1.0
  },
  
  // Retry configuration
  retry: {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffFactor: 2
  },
  
  // Error boundaries
  boundaries: {
    showDetails: process.env.NODE_ENV === 'development',
    enableRetry: true,
    maxRetries: 3
  }
};

// Error reporting service
export class ErrorReportingService {
  static report(error: Error, context: Record<string, any> = {}) {
    if (!ERROR_CONFIG.reporting.enabled) return;
    
    const errorData = {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      context
    };
    
    // Send to error reporting service
    fetch(ERROR_CONFIG.reporting.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(errorData)
    }).catch(err => {
      console.error('Failed to report error:', err);
    });
    
    // Console logging in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error reported:', errorData);
    }
  }
  
  static reportPerformance(metric: { name: string; value: number }) {
    if (!ERROR_CONFIG.reporting.enabled) return;
    
    this.report(new Error(`Performance issue: ${metric.name} = ${metric.value}`), {
      type: 'performance',
      metric
    });
  }
}
