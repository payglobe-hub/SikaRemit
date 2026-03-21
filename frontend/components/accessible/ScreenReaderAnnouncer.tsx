'use client'

import { useEffect, useRef } from 'react'

interface ScreenReaderAnnouncerProps {
  message?: string
  politeness?: 'polite' | 'assertive' | 'off'
}

// Global screen reader announcer
export function ScreenReaderAnnouncer({ 
  message, 
  politeness = 'polite' 
}: ScreenReaderAnnouncerProps) {
  const announcerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (message && announcerRef.current) {
      announcerRef.current.textContent = message
      
      // Clear the message after it's been read
      const timer = setTimeout(() => {
        if (announcerRef.current) {
          announcerRef.current.textContent = ''
        }
      }, 1000)

      return () => clearTimeout(timer)
    }
  }, [message])

  return (
    <div
      ref={announcerRef}
      aria-live={politeness}
      aria-atomic="true"
      className="sr-only"
    />
  )
}

// Hook for screen reader announcements
export function useScreenReader() {
  const announce = (message: string, politeness: 'polite' | 'assertive' = 'polite') => {
    const announcer = document.createElement('div')
    announcer.setAttribute('aria-live', politeness)
    announcer.setAttribute('aria-atomic', 'true')
    announcer.className = 'sr-only'
    announcer.textContent = message
    
    document.body.appendChild(announcer)
    
    // Remove after announcement
    setTimeout(() => {
      document.body.removeChild(announcer)
    }, 1000)
  }

  const announcePageChange = (pageTitle: string) => {
    announce(`Navigated to ${pageTitle}`)
  }

  const announceAction = (action: string) => {
    announce(`${action} completed`)
  }

  const announceError = (error: string) => {
    announce(`Error: ${error}`, 'assertive')
  }

  const announceLoading = (status: 'started' | 'completed') => {
    if (status === 'started') {
      announce('Loading content')
    } else {
      announce('Content loaded')
    }
  }

  return {
    announce,
    announcePageChange,
    announceAction,
    announceError,
    announceLoading
  }
}

// Context provider for screen reader announcements
import { createContext, useContext, ReactNode } from 'react'

interface ScreenReaderContextType {
  announce: (message: string, politeness?: 'polite' | 'assertive') => void
  announcePageChange: (pageTitle: string) => void
  announceAction: (action: string) => void
  announceError: (error: string) => void
  announceLoading: (status: 'started' | 'completed') => void
}

const ScreenReaderContext = createContext<ScreenReaderContextType | null>(null)

export function ScreenReaderProvider({ children }: { children: ReactNode }) {
  const screenReader = useScreenReader()

  return (
    <ScreenReaderContext.Provider value={screenReader}>
      {children}
      <ScreenReaderAnnouncer />
    </ScreenReaderContext.Provider>
  )
}

export function useScreenReaderContext() {
  const context = useContext(ScreenReaderContext)
  if (!context) {
    throw new Error('useScreenReaderContext must be used within ScreenReaderProvider')
  }
  return context
}
