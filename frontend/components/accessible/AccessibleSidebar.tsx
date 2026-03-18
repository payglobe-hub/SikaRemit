'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { ChevronRight, LogOut, Settings, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/lib/auth/context'
import { useRouter } from 'next/navigation'
import { NavigationItem } from '@/components/shared/AppLayout'

interface AccessibleSidebarProps {
  userType: 'customer' | 'merchant' | 'admin'
  isOpen: boolean
  onClose: () => void
  onToggleCollapsed: (collapsed: boolean) => void
  collapsed: boolean
  navigation?: NavigationItem[]
}

export default function AccessibleSidebar({
  userType,
  isOpen,
  onClose,
  onToggleCollapsed,
  collapsed,
  navigation = []
}: AccessibleSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuth()
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const sidebarRef = useRef<HTMLElement>(null)
  const navigationItemsRef = useRef<(HTMLAnchorElement | null)[]>([])

  const handleLogout = async () => {
    await logout()
    router.push('/')
  }

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const filteredNavigation = navigation.filter((item) => {
      if (!item.roles || item.roles.length === 0) return true
      return item.roles.includes(user?.role || '')
    })

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setFocusedIndex(prev => {
          const next = prev + 1
          return next >= filteredNavigation.length ? 0 : next
        })
        break
      case 'ArrowUp':
        e.preventDefault()
        setFocusedIndex(prev => {
          const next = prev - 1
          return next < 0 ? filteredNavigation.length - 1 : next
        })
        break
      case 'Enter':
      case ' ':
        e.preventDefault()
        if (focusedIndex >= 0 && navigationItemsRef.current[focusedIndex]) {
          navigationItemsRef.current[focusedIndex]?.click()
        }
        break
      case 'Escape':
        e.preventDefault()
        onClose()
        break
    }
  }

  // Focus management
  useEffect(() => {
    if (focusedIndex >= 0 && navigationItemsRef.current[focusedIndex]) {
      navigationItemsRef.current[focusedIndex]?.focus()
    }
  }, [focusedIndex])

  // Responsive behavior
  useEffect(() => {
    const checkScreenSize = () => {
      const isLargeScreen = window.innerWidth >= 1024
      onToggleCollapsed(!isLargeScreen)
    }

    checkScreenSize()
    window.addEventListener('resize', checkScreenSize)
    return () => window.removeEventListener('resize', checkScreenSize)
  }, [onToggleCollapsed])

  const brandConfig = {
    customer: {
      name: 'SikaRemit Customer',
      logo: '/logos/SikaRemit.jpeg',
      color: 'emerald'
    },
    merchant: {
      name: 'SikaRemit Merchant',
      logo: '/logos/SikaRemit.jpeg',
      color: 'blue'
    },
    admin: {
      name: 'SikaRemit Admin',
      logo: '/logos/SikaRemit.jpeg',
      color: 'purple'
    }
  }

  const config = brandConfig[userType]
  const filteredNavigation = navigation.filter((item) => {
    if (!item.roles || item.roles.length === 0) return true
    return item.roles.includes(user?.role || '')
  })

  return (
    <aside 
      ref={sidebarRef}
      className={cn(
        'fixed left-0 z-30 top-16 bottom-0',
        'bg-white dark:bg-neutral-900',
        'border-r border-neutral-200 dark:border-neutral-800',
        'transition-all duration-300 ease-in-out',
        'shadow-lg shadow-neutral-200/50 dark:shadow-neutral-900/50',
        isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        collapsed ? 'w-16' : 'w-64',
        'lg:translate-x-0'
      )}
      role="navigation"
      aria-label={`${userType} navigation sidebar`}
      onKeyDown={handleKeyDown}
    >
      <div className="flex flex-col h-full">
        {/* Mobile close button */}
        <button
          onClick={onClose}
          className={cn(
            'absolute top-4 right-4 z-10 p-2 rounded-lg',
            'hover:bg-neutral-100 dark:hover:bg-neutral-800/50',
            'transition-colors duration-200 lg:hidden',
            'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2'
          )}
          aria-label="Close navigation menu"
        >
          <div className="w-5 h-5 flex items-center justify-center">
            <div className="w-4 h-0.5 bg-neutral-500 transform rotate-45 absolute"></div>
            <div className="w-4 h-0.5 bg-neutral-500 transform -rotate-45 absolute"></div>
          </div>
        </button>

        {/* Navigation - filtered by user role */}
        <nav 
          className="flex-1 p-3 space-y-1 overflow-y-auto scrollbar-thin scrollbar-thumb-neutral-300 dark:scrollbar-thumb-neutral-700"
          role="menubar"
          aria-label={`${userType} navigation items`}
        >
          {filteredNavigation.map((item, index) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.title}
                href={item.href}
                ref={el => { navigationItemsRef.current[index] = el }}
                className={cn(
                  'group flex items-center gap-3 px-3 py-2.5 rounded-lg',
                  'transition-all duration-200 ease-in-out',
                  'hover:shadow-sm',
                  'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
                  isActive
                    ? 'bg-primary/10 text-primary border-l-4 border-primary shadow-sm'
                    : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800/50',
                  collapsed && 'justify-center px-2'
                )}
                role="menuitem"
                aria-current={isActive ? 'page' : undefined}
                aria-label={`${item.title} - ${item.description || ''}`}
              >
                <div className={cn(
                  'flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-200',
                  isActive ? 'bg-primary/20' : 'bg-neutral-500/10'
                )}
                  aria-hidden="true"
                >
                  <item.icon className={cn(
                    'h-4 w-4 transition-transform duration-200',
                    isActive ? 'text-primary' : 'text-neutral-500',
                    'group-hover:scale-110'
                  )} />
                </div>

                {!collapsed && (
                  <div className="flex-1 min-w-0">
                    <span className={cn(
                      'font-medium transition-all duration-200 block truncate',
                      isActive ? 'text-primary' : 'text-neutral-700 dark:text-neutral-300'
                    )}>
                      {item.title}
                    </span>
                    {item.description && (
                      <span className="text-xs text-neutral-500 dark:text-neutral-400 truncate block">
                        {item.description}
                      </span>
                    )}
                  </div>
                )}

                {/* Tooltip for collapsed state */}
                {collapsed && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-neutral-900 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50" role="tooltip">
                    {item.title}
                  </div>
                )}
              </Link>
            )
          })}
        </nav>

        {/* User section */}
        <div className="p-3 border-t border-neutral-200 dark:border-neutral-800">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button 
                className={cn(
                  'w-full flex items-center gap-3 p-3 rounded-lg',
                  'hover:bg-neutral-100 dark:hover:bg-neutral-800/50',
                  'transition-all duration-200 group',
                  collapsed && 'justify-center px-2',
                  'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2'
                )}
                aria-label="User menu"
              >
                <div className="relative flex-shrink-0">
                  <Avatar className="w-8 h-8 ring-2 ring-primary/20">
                    <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white font-semibold text-xs">
                      {user?.name?.slice(0, 1).toUpperCase() || userType.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className={cn(
                    'absolute inset-0 rounded-full bg-gradient-to-br from-primary/10 to-secondary/10',
                    'opacity-0 group-hover:opacity-100 transition-opacity duration-300'
                  )} />
                </div>

                {!collapsed && (
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">
                      {user?.name || `${userType.charAt(0).toUpperCase()}${userType.slice(1)} User`}
                    </p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                      {user?.email || `${userType}@sikaremit.com`}
                    </p>
                  </div>
                )}

                {!collapsed && (
                  <ChevronRight className="w-4 h-4 text-neutral-400 group-hover:text-neutral-600 dark:group-hover:text-neutral-300 transition-colors" />
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium text-neutral-900 dark:text-white">
                    {user?.name || `${userType.charAt(0).toUpperCase()}${userType.slice(1)} User`}
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    {user?.email || `${userType}@sikaremit.com`}
                  </p>
                  <div className="flex items-center mt-2">
                    <div className="inline-flex items-center px-2 py-1 rounded-full bg-gradient-to-r from-primary/10 to-secondary/10 text-primary text-xs font-medium">
                      <div className="w-2 h-2 bg-gradient-to-br from-primary to-secondary rounded-full mr-2 animate-pulse"></div>
                      {userType.charAt(0).toUpperCase() + userType.slice(1)}
                    </div>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Settings className="mr-3 h-4 w-4" />
                <Link href={`/${userType}/settings`} className="w-full">
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <User className="mr-3 h-4 w-4" />
                <Link href={`/${userType}/profile`} className="w-full">
                  Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                className="text-error dark:text-error"
              >
                <LogOut className="mr-3 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </aside>
  )
}
