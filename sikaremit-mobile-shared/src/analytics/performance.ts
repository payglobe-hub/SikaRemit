// Performance tracking utilities
export const startPerformanceTrace = (traceName: string): string => {
  const startTime = Date.now();
  

  // In a real app, this would start a performance trace
  // Example:
  // const trace = perf().newTrace(traceName);
  // trace.start();

  return `${traceName}_${startTime}`;
};

export const stopPerformanceTrace = (traceId: string, additionalData?: Record<string, any>) => {
  const endTime = Date.now();
  const [traceName, startTimeStr] = traceId.split('_');
  const startTime = parseInt(startTimeStr);
  const duration = endTime - startTime;

  

  // In a real app, this would stop the performance trace
  // Example:
  // trace.stop();
};

export const measureFunctionPerformance = async <T>(
  functionName: string,
  fn: () => Promise<T> | T
): Promise<T> => {
  const traceId = startPerformanceTrace(`function_${functionName}`);
  try {
    const result = await fn();
    stopPerformanceTrace(traceId, { success: true });
    return result;
  } catch (error: unknown) {
    stopPerformanceTrace(traceId, { success: false, error: error instanceof Error ? error.message : String(error) });
    throw error;
  }
};

export const trackNetworkRequest = (
  url: string,
  method: string,
  startTime: number
) => {
  const duration = Date.now() - startTime;
  

  // In a real app, this would track network performance
  // Example:
  // analytics().logEvent('network_request', {
  //   url,
  //   method,
  //   duration,
  // });
};

export const measureRenderTime = (componentName: string, startTime: number) => {
  const duration = Date.now() - startTime;
  

  // Track slow renders (>16ms for 60fps)
  if (duration > 16) {
    console.warn(`Slow render detected: ${componentName} took ${duration}ms`);
  }
};

