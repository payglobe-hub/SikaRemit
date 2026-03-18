// Global localStorage polyfill for SSR safety
// This file should be imported before any other code that might access localStorage

if (typeof window === 'undefined') {
  // Server-side - create localStorage polyfill
  const localStoragePolyfill = {
    getItem: function(key: string): string | null {
      
      return null;
    },
    setItem: function(key: string, value: string): void {
      
    },
    removeItem: function(key: string): void {
      
    },
    clear: function(): void {
      
    },
    length: 0,
    key: function(index: number): string | null {
      return null;
    }
  };

  // Make it available globally
  (global as any).localStorage = localStoragePolyfill;
  
  // Also make it available on window object (for SSR)
  if (typeof (global as any).window !== 'undefined') {
    (global as any).window.localStorage = localStoragePolyfill;
  }
}
