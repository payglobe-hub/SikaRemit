// Global localStorage polyfill for SSR safety
// This file should be imported before any other code that might access localStorage

if (typeof window === 'undefined') {
  // Server-side - create localStorage polyfill
  const localStoragePolyfill = {
    getItem: function(key: string): string | null {
      console.warn('localStorage.getItem called on server-side for key:', key);
      return null;
    },
    setItem: function(key: string, value: string): void {
      console.warn('localStorage.setItem called on server-side for key:', key);
    },
    removeItem: function(key: string): void {
      console.warn('localStorage.removeItem called on server-side for key:', key);
    },
    clear: function(): void {
      console.warn('localStorage.clear called on server-side');
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
