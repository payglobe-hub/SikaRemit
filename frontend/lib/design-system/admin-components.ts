// Admin Component Utilities - Modern Enterprise Components
import { adminDesignTokens } from './admin-tokens'

// Utility functions for consistent styling
export const adminStyles = {
  // Layout utilities
  container: {
    maxWidth: '7xl', // 1280px
    paddingX: 'lg',  // 16px
    paddingY: 'xl',  // 20px
  },

  // Spacing utilities
  spacing: {
    section: 'space-y-8',
    card: 'space-y-6',
    form: 'space-y-4',
    list: 'space-y-2',
  },

  // Card variants
  card: {
    base: `
      bg-white dark:bg-gray-900
      border border-gray-200 dark:border-gray-800
      rounded-xl
      shadow-sm hover:shadow-md
      transition-all duration-200
      overflow-hidden
    `,
    elevated: `
      bg-white dark:bg-gray-900
      border border-gray-200 dark:border-gray-800
      rounded-xl
      shadow-lg hover:shadow-xl
      transition-all duration-200
      overflow-hidden
    `,
    flat: `
      bg-gray-50 dark:bg-gray-800/50
      border border-gray-200 dark:border-gray-700
      rounded-xl
      shadow-none hover:shadow-sm
      transition-all duration-200
      overflow-hidden
    `,
    glass: `
      bg-white/80 dark:bg-gray-900/80
      backdrop-blur-xl
      border border-white/20 dark:border-gray-700/50
      rounded-xl
      shadow-xl shadow-black/5
      transition-all duration-200
      overflow-hidden
    `,
  },

  // Button variants
  button: {
    primary: `
      bg-blue-600 hover:bg-blue-700
      text-white
      border border-transparent
      rounded-lg
      shadow-sm hover:shadow-md
      transition-all duration-200
      focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
      disabled:opacity-50 disabled:cursor-not-allowed
      font-medium
    `,
    secondary: `
      bg-white hover:bg-gray-50
      text-gray-900
      border border-gray-300
      rounded-lg
      shadow-sm hover:shadow-md
      transition-all duration-200
      focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
      disabled:opacity-50 disabled:cursor-not-allowed
      font-medium
    `,
    ghost: `
      bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800
      text-gray-700 dark:text-gray-300
      border border-transparent
      rounded-lg
      transition-all duration-200
      focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
      disabled:opacity-50 disabled:cursor-not-allowed
      font-medium
    `,
    danger: `
      bg-red-600 hover:bg-red-700
      text-white
      border border-transparent
      rounded-lg
      shadow-sm hover:shadow-md
      transition-all duration-200
      focus:ring-2 focus:ring-red-500 focus:ring-offset-2
      disabled:opacity-50 disabled:cursor-not-allowed
      font-medium
    `,
  },

  // Input variants
  input: {
    base: `
      block w-full
      bg-white dark:bg-gray-900
      border border-gray-300 dark:border-gray-600
      rounded-lg
      shadow-sm
      placeholder:text-gray-400 dark:placeholder:text-gray-500
      focus:border-blue-500 focus:ring-blue-500 focus:ring-1
      transition-all duration-200
      disabled:opacity-50 disabled:cursor-not-allowed
    `,
    error: `
      block w-full
      bg-white dark:bg-gray-900
      border border-red-300 dark:border-red-600
      rounded-lg
      shadow-sm
      placeholder:text-gray-400 dark:placeholder:text-gray-500
      focus:border-red-500 focus:ring-red-500 focus:ring-1
      transition-all duration-200
      disabled:opacity-50 disabled:cursor-not-allowed
    `,
  },

  // Text variants
  text: {
    h1: `
      text-3xl font-bold
      text-gray-900 dark:text-white
      tracking-tight
    `,
    h2: `
      text-2xl font-semibold
      text-gray-900 dark:text-white
      tracking-tight
    `,
    h3: `
      text-xl font-semibold
      text-gray-900 dark:text-white
      tracking-tight
    `,
    h4: `
      text-lg font-semibold
      text-gray-900 dark:text-white
      tracking-tight
    `,
    body: `
      text-base
      text-gray-700 dark:text-gray-300
      leading-relaxed
    `,
    caption: `
      text-sm
      text-gray-500 dark:text-gray-400
    `,
    label: `
      text-sm font-medium
      text-gray-700 dark:text-gray-300
    `,
  },

  // Badge variants
  badge: {
    success: `
      inline-flex items-center
      px-2.5 py-0.5
      rounded-full text-xs font-medium
      bg-green-100 text-green-800
      dark:bg-green-900/30 dark:text-green-400
    `,
    warning: `
      inline-flex items-center
      px-2.5 py-0.5
      rounded-full text-xs font-medium
      bg-yellow-100 text-yellow-800
      dark:bg-yellow-900/30 dark:text-yellow-400
    `,
    error: `
      inline-flex items-center
      px-2.5 py-0.5
      rounded-full text-xs font-medium
      bg-red-100 text-red-800
      dark:bg-red-900/30 dark:text-red-400
    `,
    info: `
      inline-flex items-center
      px-2.5 py-0.5
      rounded-full text-xs font-medium
      bg-blue-100 text-blue-800
      dark:bg-blue-900/30 dark:text-blue-400
    `,
    neutral: `
      inline-flex items-center
      px-2.5 py-0.5
      rounded-full text-xs font-medium
      bg-gray-100 text-gray-800
      dark:bg-gray-800 dark:text-gray-300
    `,
  },

  // Table variants
  table: {
    base: `
      min-w-full
      divide-y divide-gray-200 dark:divide-gray-700
    `,
    header: `
      bg-gray-50 dark:bg-gray-800/50
    `,
    headerCell: `
      px-6 py-3
      text-left text-xs font-medium
      text-gray-500 dark:text-gray-400
      uppercase tracking-wider
    `,
    body: `
      bg-white dark:bg-gray-900
      divide-y divide-gray-200 dark:divide-gray-700
    `,
    bodyCell: `
      px-6 py-4
      text-sm
      text-gray-900 dark:text-gray-100
    `,
    row: `
      hover:bg-gray-50 dark:hover:bg-gray-800/50
      transition-colors duration-150
    `,
  },

  // Navigation variants
  nav: {
    sidebar: {
      item: `
        flex items-center gap-3
        px-3 py-2.5
        rounded-lg
        text-sm font-medium
        transition-all duration-200
        hover:bg-gray-100 dark:hover:bg-gray-800
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
      `,
      itemActive: `
        flex items-center gap-3
        px-3 py-2.5
        rounded-lg
        text-sm font-medium
        bg-blue-50 text-blue-700
        border-l-4 border-blue-600
        dark:bg-blue-900/30 dark:text-blue-400
        transition-all duration-200
      `,
      itemCollapsed: `
        flex items-center justify-center
        px-3 py-2.5
        rounded-lg
        text-sm font-medium
        transition-all duration-200
        hover:bg-gray-100 dark:hover:bg-gray-800
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
      `,
    },
  },

  // Status variants
  status: {
    online: 'w-2 h-2 bg-green-500 rounded-full animate-pulse',
    offline: 'w-2 h-2 bg-gray-400 rounded-full',
    busy: 'w-2 h-2 bg-red-500 rounded-full',
    away: 'w-2 h-2 bg-yellow-500 rounded-full',
  },

  // Animation classes
  animation: {
    fadeIn: 'animate-in fade-in duration-300',
    slideIn: 'animate-in slide-in-from-bottom-2 duration-300',
    scaleIn: 'animate-in zoom-in-95 duration-200',
    bounceIn: 'animate-in bounce-in duration-500',
  },
}

// Utility functions
export const cn = (...classes: (string | undefined | null | false)[]): string => {
  return classes.filter(Boolean).join(' ')
}

export const getCardVariant = (variant: keyof typeof adminStyles.card = 'base') => {
  return adminStyles.card[variant]
}

export const getButtonVariant = (variant: keyof typeof adminStyles.button = 'primary') => {
  return adminStyles.button[variant]
}

export const getBadgeVariant = (variant: keyof typeof adminStyles.badge = 'neutral') => {
  return adminStyles.badge[variant]
}

export const getTextVariant = (variant: keyof typeof adminStyles.text = 'body') => {
  return adminStyles.text[variant]
}

export const getStatusIndicator = (status: keyof typeof adminStyles.status = 'offline') => {
  return adminStyles.status[status]
}

// Responsive utilities
export const responsive = {
  hideOnMobile: 'hidden md:block',
  hideOnDesktop: 'block md:hidden',
  showOnMobile: 'block md:hidden',
  showOnDesktop: 'hidden md:block',
  container: 'container mx-auto px-4 sm:px-6 lg:px-8',
  grid: {
    cols1: 'grid-cols-1',
    cols2: 'grid-cols-1 md:grid-cols-2',
    cols3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    cols4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
    cols5: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5',
  },
}

// Focus and accessibility utilities
export const focus = {
  ring: 'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
  visible: 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
}

// Dark mode utilities
export const darkMode = {
  text: {
    primary: 'text-gray-900 dark:text-white',
    secondary: 'text-gray-600 dark:text-gray-400',
    tertiary: 'text-gray-500 dark:text-gray-500',
  },
  bg: {
    primary: 'bg-white dark:bg-gray-900',
    secondary: 'bg-gray-50 dark:bg-gray-800',
    tertiary: 'bg-gray-100 dark:bg-gray-700',
  },
  border: 'border-gray-200 dark:border-gray-700',
  hover: 'hover:bg-gray-50 dark:hover:bg-gray-800',
}
