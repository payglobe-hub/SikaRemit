/**
 * SikaRemit Logo Utility
 * Centralized logo configuration for the entire SikaRemit project
 */

export const SIKAREMIT_LOGO = {
  // Main logo path
  src: '/logos/SikaRemit.jpeg',
  alt: 'SikaRemit Logo',
  
  // Standard sizes for different contexts
  sizes: {
    xs: { width: 24, height: 24, className: 'w-6 h-6' },
    sm: { width: 32, height: 32, className: 'w-8 h-8' },
    md: { width: 40, height: 40, className: 'w-10 h-10' },
    lg: { width: 48, height: 48, className: 'w-12 h-12' },
    xl: { width: 64, height: 64, className: 'w-16 h-16' },
  },
  
  // Default styling classes
  defaultClasses: {
    base: 'object-cover rounded-xl',
    withHover: 'object-cover rounded-xl transition-all duration-300 hover:scale-105',
    withShadow: 'object-cover rounded-xl shadow-lg',
    full: 'object-cover rounded-xl shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl',
  }
} as const

/**
 * Get logo props for a specific size and style
 */
export function getLogoProps(
  size: keyof typeof SIKAREMIT_LOGO.sizes = 'md',
  style: keyof typeof SIKAREMIT_LOGO.defaultClasses = 'base'
) {
  const sizeConfig = SIKAREMIT_LOGO.sizes[size]
  const styleClass = SIKAREMIT_LOGO.defaultClasses[style]
  
  return {
    src: SIKAREMIT_LOGO.src,
    alt: SIKAREMIT_LOGO.alt,
    width: sizeConfig.width,
    height: sizeConfig.height,
    className: `${sizeConfig.className} ${styleClass}`,
  }
}

/**
 * Render SikaRemit logo with consistent styling
 */
export function SikaRemitLogo({
  size = 'md',
  style = 'base',
  className = '',
  ...props
}: {
  size?: keyof typeof SIKAREMIT_LOGO.sizes
  style?: keyof typeof SIKAREMIT_LOGO.defaultClasses
  className?: string
  [key: string]: any
}) {
  const logoProps = getLogoProps(size, style)
  
  return (
    <img
      {...logoProps}
      {...props}
      className={`${logoProps.className} ${className}`}
    />
  )
}
