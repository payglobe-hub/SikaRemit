// Accessibility configuration
export const ACCESSIBILITY_CONFIG = {
  // WCAG 2.1 AA compliance settings
  wcagLevel: 'AA',
  
  // Screen reader announcements
  announcements: {
    polite: true,
    assertive: false,
    ariaLive: true
  },
  
  // Keyboard navigation
  keyboard: {
    skipLinks: true,
    focusManagement: true,
    trapFocus: true
  },
  
  // Color contrast
  contrast: {
    minimumRatio: 4.5,  // AA compliance
    largeTextRatio: 3.0
  },
  
  // Focus indicators
  focus: {
    visible: true,
    offset: 2,
    borderRadius: 4
  }
};

// Accessibility utilities
export function announceToScreenReader(message: string, politeness: 'polite' | 'assertive' = 'polite') {
  const announcement = document.createElement('div');
  announcement.setAttribute('aria-live', politeness);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;
  
  document.body.appendChild(announcement);
  
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}

export function manageFocus(container: HTMLElement, shouldTrap: boolean = false) {
  if (!shouldTrap) return;
  
  const focusableElements = container.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  
  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];
  
  container.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Tab') {
      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          (lastElement as HTMLElement).focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastElement) {
          (firstElement as HTMLElement).focus();
          e.preventDefault();
        }
      }
    }
  });
}
