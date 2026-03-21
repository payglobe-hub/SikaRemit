// Crash reporting utilities
export const reportCrash = (error: Error, context?: Record<string, any>) => {
  console.error('Crash reported:', error, context);

  // In a real app, this would send crash reports to a service like Sentry, Firebase Crashlytics, etc.
  // Example:
  // Sentry.captureException(error, {
  //   tags: {
  //     component: context?.component,
  //     screen: context?.screen,
  //   },
  //   extra: context,
  // });
};

export const reportNonFatalError = (error: Error, context?: Record<string, any>) => {
  console.warn('Non-fatal error reported:', error, context);

  // In a real app, this would send non-fatal errors to monitoring service
  // Example:
  // Sentry.captureException(error, {
  //   level: 'warning',
  //   tags: {
  //     type: 'non_fatal',
  //   },
  //   extra: context,
  // });
};

export const setUserContext = (userId: string, email?: string, additionalInfo?: Record<string, any>) => {
  

  // In a real app, this would set user context for crash reports
  // Example:
  // Sentry.setUser({
  //   id: userId,
  //   email: email,
  //   ...additionalInfo,
  // });
};

export const addBreadcrumb = (message: string, category?: string, level?: 'info' | 'warning' | 'error') => {
  

  // In a real app, this would add breadcrumbs for debugging
  // Example:
  // Sentry.addBreadcrumb({
  //   message,
  //   category: category || 'custom',
  //   level: level || 'info',
  // });
};

export const initializeCrashReporting = () => {
  

  // In a real app, this would initialize the crash reporting service
  // Example:
  // Sentry.init({
  //   dsn: 'your-dsn-here',
  //   environment: __DEV__ ? 'development' : 'production',
  // });
};

export const setReleaseVersion = (version: string) => {
  

  // In a real app, this would set the release version for crash reports
  // Example:
  // Sentry.setRelease(version);
};

