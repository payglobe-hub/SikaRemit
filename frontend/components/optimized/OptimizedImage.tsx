'use client'

import Image from 'next/image'
import { useState } from 'react'
import { cn } from '@/lib/utils'

interface OptimizedImageProps {
  src: string
  alt: string
  width?: number
  height?: number
  className?: string
  priority?: boolean
  fallback?: string
}

export function OptimizedImage({ 
  src, 
  alt, 
  width = 40, 
  height = 40, 
  className,
  priority = false,
  fallback = '/logos/SikaRemit.jpeg'
}: OptimizedImageProps) {
  const [imgSrc, setImgSrc] = useState(src)
  const [isLoading, setIsLoading] = useState(true)

  const handleError = () => {
    if (imgSrc !== fallback) {
      setImgSrc(fallback)
    }
  }

  return (
    <div className={cn('relative overflow-hidden', className)}>
      <Image
        src={imgSrc}
        alt={alt}
        width={width}
        height={height}
        priority={priority}
        className={cn(
          'transition-all duration-300',
          isLoading ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
        )}
        onLoad={() => setIsLoading(false)}
        onError={handleError}
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
      />
      
      {/* Loading skeleton */}
      {isLoading && (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 animate-pulse rounded-md" />
      )}
    </div>
  )
}

// Predefined logo configurations
export const LogoSizes = {
  small: { width: 24, height: 24 },
  medium: { width: 40, height: 40 },
  large: { width: 64, height: 64 },
  xl: { width: 96, height: 96 }
} as const

// Optimized SikaRemit logo component
export function SikaRemitLogo({ 
  size = 'medium', 
  className,
  priority = false 
}: { 
  size?: keyof typeof LogoSizes
  className?: string
  priority?: boolean 
}) {
  return (
    <OptimizedImage
      src="/logos/SikaRemit.jpeg"
      alt="SikaRemit Logo"
      width={LogoSizes[size].width}
      height={LogoSizes[size].height}
      className={className}
      priority={priority}
    />
  )
}
