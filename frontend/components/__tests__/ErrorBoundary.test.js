/**
 * @jest-environment jsdom
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ErrorBoundary, { withErrorBoundary } from '../error/ErrorBoundary'

// Mock console.error to avoid noise in test output
const originalConsoleError = console.error
beforeEach(() => {
  console.error = jest.fn()
})

afterEach(() => {
  console.error = originalConsoleError
})

// Test component that throws an error
const ThrowingComponent = ({ shouldThrow = false }) => {
  if (shouldThrow) {
    throw new Error('Test error')
  }
  return <div>Normal content</div>
}

// Test component with async error
const AsyncErrorComponent = () => {
  React.useEffect(() => {
    setTimeout(() => {
      throw new Error('Async error')
    }, 100)
  }, [])
  return <div>Loading...</div>
}

describe('ErrorBoundary', () => {
  it('should render children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div>Test content</div>
      </ErrorBoundary>
    )

    expect(screen.getByText('Test content')).toBeInTheDocument()
  })

  it('should catch and display error boundary UI when child throws', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    expect(screen.getByText(/We're sorry, but something unexpected happened/)).toBeInTheDocument()
  })

  it('should display custom fallback when provided', () => {
    const customFallback = <div>Custom error message</div>

    render(
      <ErrorBoundary fallback={customFallback}>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByText('Custom error message')).toBeInTheDocument()
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument()
  })

  it('should call onError prop when error occurs', () => {
    const onError = jest.fn()

    render(
      <ErrorBoundary onError={onError}>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        componentStack: expect.any(String)
      })
    )
  })

  it('should generate unique error IDs', () => {
    const { rerender } = render(
      <ErrorBoundary>
        <div>Normal content</div>
      </ErrorBoundary>
    )

    // Trigger error
    rerender(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    )

    const errorId = screen.getByText(/Error ID:/).textContent
    expect(errorId).toMatch(/ERR-\d+-[a-z0-9]+/)
  })

  it('should handle retry functionality', async () => {
    const { rerender } = render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={false} />
      </ErrorBoundary>
    )

    // Initially render normally
    expect(screen.getByText('Normal content')).toBeInTheDocument()

    // Trigger error
    rerender(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    )

    // Should show error boundary
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()

    // Click retry button
    const retryButton = screen.getByText(/Try Again/)
    fireEvent.click(retryButton)

    // Should attempt to recover (but still show error since component still throws)
    await waitFor(() => {
      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    })
  })

  it('should limit retry attempts', async () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    )

    // Click retry button 3 times (max retries)
    const retryButton = screen.getByText(/Try Again/)
    
    fireEvent.click(retryButton)
    await waitFor(() => {
      expect(screen.getByText(/2 attempts left/)).toBeInTheDocument()
    })

    fireEvent.click(retryButton)
    await waitFor(() => {
      expect(screen.getByText(/1 attempts left/)).toBeInTheDocument()
    })

    fireEvent.click(retryButton)
    await waitFor(() => {
      expect(screen.queryByText(/Try Again/)).not.toBeInTheDocument()
    })
  })

  it('should handle reload functionality', () => {
    const mockReload = jest.fn()
    Object.defineProperty(window.location, 'reload', {
      value: mockReload,
      writable: true
    })

    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    )

    const reloadButton = screen.getByText('Reload Page')
    fireEvent.click(reloadButton)

    expect(mockReload).toHaveBeenCalled()
  })

  it('should handle go home functionality', () => {
    const mockLocation = { href: '' }
    Object.defineProperty(window, 'location', {
      value: mockLocation,
      writable: true
    })

    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    )

    const homeButton = screen.getByText('Go Home')
    fireEvent.click(homeButton)

    expect(mockLocation.href).toBe('/')
  })

  it('should show error details in development mode', () => {
    const originalNodeEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'development'

    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByText(/Error Details.*Development Only/)).toBeInTheDocument()
    expect(screen.getByText('Test error')).toBeInTheDocument()

    // Restore original NODE_ENV
    process.env.NODE_ENV = originalNodeEnv
  })

  it('should not show error details in production mode', () => {
    const originalNodeEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'

    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.queryByText(/Error Details.*Development Only/)).not.toBeInTheDocument()
    expect(screen.queryByText('Test error')).not.toBeInTheDocument()

    // Restore original NODE_ENV
    process.env.NODE_ENV = originalNodeEnv
  })
})

describe('withErrorBoundary HOC', () => {
  it('should wrap component with error boundary', () => {
    const WrappedComponent = withErrorBoundary(ThrowingComponent)
    
    render(<WrappedComponent shouldThrow={false} />)
    
    expect(screen.getByText('Normal content')).toBeInTheDocument()
  })

  it('should catch errors in wrapped component', () => {
    const WrappedComponent = withErrorBoundary(ThrowingComponent)
    
    render(<WrappedComponent shouldThrow={true} />)
    
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
  })

  it('should use custom fallback when provided', () => {
    const customFallback = <div>Custom fallback</div>
    const WrappedComponent = withErrorBoundary(ThrowingComponent, customFallback)
    
    render(<WrappedComponent shouldThrow={true} />)
    
    expect(screen.getByText('Custom fallback')).toBeInTheDocument()
  })

  it('should call onError when provided', () => {
    const onError = jest.fn()
    const WrappedComponent = withErrorBoundary(ThrowingComponent, undefined, onError)
    
    render(<WrappedComponent shouldThrow={true} />)
    
    expect(onError).toHaveBeenCalled()
  })
})
