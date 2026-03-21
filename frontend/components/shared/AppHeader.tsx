'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  Bell,
  BellDot,
  User,
  LogOut,
  Settings,
  Check,
  AlertTriangle,
  Info,
  Menu,
  Search,
  Sun,
  Moon,
  Monitor,
  ChevronRight,
  X
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from '@/components/ui/command'
import { useAuth } from '@/lib/auth/context'
import { useNotifications } from '@/lib/notifications/provider'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'
import { NavigationItem } from './AppLayout'

// Notification icon helper
function getNotificationIcon(type: string, level: string) {
  if (type?.includes('payment') || type?.includes('transaction') || type?.includes('merchant')) {
    return <div className="w-2 h-2 rounded-full bg-primary" />
  }
  if (type?.includes('security') || level === 'security') {
    return <div className="w-2 h-2 rounded-full bg-error" />
  }
  if (level === 'warning' || level === 'error') {
    return <div className="w-2 h-2 rounded-full bg-warning" />
  }
  return <div className="w-2 h-2 rounded-full bg-info" />
}

// Breadcrumb generation utility
function generateBreadcrumbs(pathname: string, userType: 'customer' | 'merchant' | 'admin'): Array<{ name: string; href: string; icon: React.ComponentType<{ className?: string }> }> {
  const segments = pathname.split('/').filter(Boolean)
  const breadcrumbs: Array<{ name: string; href: string; icon: React.ComponentType<{ className?: string }> }> = []

  if (segments.length > 1) {
    const userSegments = segments.slice(1)
    let currentPath = `/${userType}`
    const isOnDashboard = userSegments.length === 1 && userSegments[0] === 'dashboard'

    if (!isOnDashboard) {
      breadcrumbs.push({
        name: 'Dashboard',
        href: `/${userType}/dashboard`,
        icon: () => <div className="w-4 h-4" />
      })
    }

    userSegments.forEach((segment, index) => {
      currentPath += `/${segment}`
      const name = segment.charAt(0).toUpperCase() + segment.slice(1).replace('-', ' ')
      breadcrumbs.push({
        name,
        href: currentPath,
        icon: () => <div className="w-4 h-4" />
      })
    })
  } else {
    breadcrumbs.push({
      name: 'Dashboard',
      href: `/${userType}/dashboard`,
      icon: () => <div className="w-4 h-4" />
    })
  }

  return breadcrumbs
}

interface AppHeaderProps {
  userType: 'customer' | 'merchant' | 'admin'
  onMenuClick?: () => void
  sidebarOpen?: boolean
  sidebarCollapsed?: boolean
  showSidebar?: boolean
  navigation?: NavigationItem[]
}

export default function AppHeader({
  userType,
  onMenuClick,
  sidebarOpen = false,
  sidebarCollapsed = false,
  showSidebar = true,
  navigation = []
}: AppHeaderProps) {
  const { user, logout } = useAuth()
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications()
  const [notifOpen, setNotifOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system')
  const pathname = usePathname()

  const breadcrumbs = generateBreadcrumbs(pathname, userType)

  // Theme management
  const applyTheme = (newTheme: 'light' | 'dark' | 'system') => {
    const root = document.documentElement
    if (newTheme === 'dark') {
      root.classList.add('dark')
    } else if (newTheme === 'light') {
      root.classList.remove('dark')
    } else {
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        root.classList.add('dark')
      } else {
        root.classList.remove('dark')
      }
    }
  }

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme)
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme', newTheme)
    }
    applyTheme(newTheme)
  }

  // Global search items
  const searchItems: Array<{ name: string; href: string; icon: React.ComponentType<{ className?: string }> }> = [
    { name: 'Settings', href: `/${userType}/settings`, icon: Settings },
  ]

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

  return (
    <>
      <header className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 fixed top-0 z-30 w-full">
        <div className="px-6">
          <div className="flex justify-between items-center h-16">
            {/* Left Section */}
            <div className="flex items-center gap-4">
              {/* Mobile Menu Button - sidebar toggle for merchant/admin, nav drawer for customer */}
              {showSidebar ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onMenuClick}
                  className="lg:hidden p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              ) : navigation.length > 0 ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setMobileNavOpen(true)}
                  className="lg:hidden p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              ) : null}

              {/* Desktop Brand */}
              <div className="hidden lg:flex items-center space-x-3">
                <Link href={`/${userType}/settings`} className="flex items-center space-x-3 hover:opacity-90 transition-all duration-300 group hover:scale-105">
                  <div className="relative">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 transition-all duration-300 group-hover:shadow-xl group-hover:shadow-primary/30">
                      <Image
                        src={config.logo}
                        alt={`${config.name} Logo`}
                        width={32}
                        height={32}
                        className="rounded-xl"
                      />
                    </div>
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary/10 to-secondary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </div>
                  <div>
                    <span className="text-lg font-bold text-neutral-900 dark:text-white group-hover:text-primary transition-colors duration-300">SikaRemit</span>
                    <span className="text-xs text-neutral-600 dark:text-neutral-400 group-hover:text-primary transition-colors duration-300 capitalize">{userType}</span>
                  </div>
                </Link>
              </div>

              {/* Inline Navigation for customer (no sidebar) */}
              {!showSidebar && navigation.length > 0 && (
                <nav className="hidden lg:flex items-center space-x-1">
                  {navigation.slice(0, 7).map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                    return (
                      <Link
                        key={item.title}
                        href={item.href}
                        className={cn(
                          'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200',
                          isActive
                            ? 'bg-primary/10 text-primary'
                            : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white'
                        )}
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    )
                  })}
                </nav>
              )}

              {/* Breadcrumbs - only when sidebar is present */}
              {showSidebar && (
                <nav className="hidden md:flex items-center space-x-1 text-sm">
                  {breadcrumbs.map((crumb, index) => (
                    <div key={crumb.href} className="flex items-center">
                      {index > 0 && (
                        <ChevronRight className="h-4 w-4 text-neutral-400 mx-1" />
                      )}
                      {index === breadcrumbs.length - 1 ? (
                        <span className="text-neutral-900 dark:text-white font-medium">
                          {crumb.name}
                        </span>
                      ) : (
                        <Link
                          href={crumb.href}
                          className="text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
                        >
                          {crumb.name}
                        </Link>
                      )}
                    </div>
                  ))}
                </nav>
              )}
            </div>

            {/* Center Section - Page Title (Mobile) */}
            <div className="md:hidden">
              <h1 className="text-lg font-semibold text-neutral-900 dark:text-white">
                {breadcrumbs[breadcrumbs.length - 1]?.name}
              </h1>
            </div>

            {/* Right Section */}
            <div className="flex items-center gap-2">
              {/* Global Search */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearchOpen(true)}
                className="hidden md:flex items-center gap-2 px-3 py-2 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-all"
              >
                <Search className="h-4 w-4" />
                <span className="text-sm">Search...</span>
                <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border border-neutral-300 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-800 px-1.5 font-mono text-xs font-medium text-neutral-600 dark:text-neutral-400 opacity-100">
                  <span className="text-xs">⌘</span>K
                </kbd>
              </Button>

              {/* Mobile Search Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSearchOpen(true)}
                className="md:hidden p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg"
              >
                <Search className="h-5 w-5" />
              </Button>

              {/* Theme Toggle */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg">
                    {theme === 'light' && <Sun className="h-5 w-5" />}
                    {theme === 'dark' && <Moon className="h-5 w-5" />}
                    {theme === 'system' && <Monitor className="h-5 w-5" />}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuLabel>Theme</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleThemeChange('light')}>
                    <Sun className="mr-2 h-4 w-4" />
                    Light
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleThemeChange('dark')}>
                    <Moon className="mr-2 h-4 w-4" />
                    Dark
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleThemeChange('system')}>
                    <Monitor className="mr-2 h-4 w-4" />
                    System
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Notifications */}
              <Popover open={notifOpen} onOpenChange={setNotifOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="relative p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                  >
                    {unreadCount > 0 ? (
                      <BellDot className="h-5 w-5 text-primary" />
                    ) : (
                      <Bell className="h-5 w-5 text-neutral-600 dark:text-neutral-400" />
                    )}
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-error text-xs text-white font-medium">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0" align="end" sideOffset={8}>
                  <div className="p-4 border-b border-neutral-200 dark:border-neutral-700">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-neutral-900 dark:text-white">Notifications</h3>
                      {unreadCount > 0 && (
                        <Button variant="ghost" size="sm" onClick={() => markAllAsRead()}>
                          <Check className="h-4 w-4 mr-1" />
                          Mark all read
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="max-h-[300px] overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-neutral-500 dark:text-neutral-400">
                        <Bell className="h-10 w-10 mx-auto mb-2 text-neutral-300" />
                        <p className="text-sm font-medium">No notifications</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-neutral-200 dark:divide-neutral-700">
                        {notifications.slice(0, 5).map((notif) => (
                          <div
                            key={notif.id}
                            className={cn(
                              'p-4 hover:bg-neutral-50 dark:hover:bg-neutral-800 cursor-pointer transition-colors',
                              !notif.is_read && 'bg-primary/5'
                            )}
                            onClick={() => markAsRead(notif.id.toString())}
                          >
                            <div className="flex gap-3">
                              <div className="flex-shrink-0 mt-0.5">
                                {getNotificationIcon(notif.notification_type || '', notif.level)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={cn(
                                  'text-sm font-medium truncate',
                                  !notif.is_read
                                    ? 'text-neutral-900 dark:text-white'
                                    : 'text-neutral-600 dark:text-neutral-400'
                                )}>
                                  {notif.title}
                                </p>
                                <p className="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-2 mt-0.5">
                                  {notif.message}
                                </p>
                                <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
                                  {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
                                </p>
                              </div>
                              {!notif.is_read && (
                                <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-2"></div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="p-3 border-t border-neutral-200 dark:border-neutral-700">
                    <Link href={`/${userType}/notifications`} onClick={() => setNotifOpen(false)}>
                      <Button variant="ghost" className="w-full" size="sm">
                        View all notifications
                      </Button>
                    </Link>
                  </div>
                </PopoverContent>
              </Popover>

              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative h-10 w-10 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all duration-300 group"
                  >
                    <Avatar className="h-10 w-10 ring-2 ring-primary/20 hover:ring-primary/40 transition-all duration-300 shadow-lg shadow-primary/10">
                      <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white font-semibold">
                        {user?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || userType.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium text-neutral-900 dark:text-white">{user?.name}</p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">{user?.email}</p>
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
                  <DropdownMenuItem onClick={logout} className="text-error dark:text-error">
                    <LogOut className="mr-3 h-4 w-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Drawer - for customer (no sidebar) */}
      {!showSidebar && mobileNavOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={() => setMobileNavOpen(false)}
          />
          <div className="fixed top-0 left-0 z-50 h-full w-72 bg-white dark:bg-neutral-900 shadow-2xl lg:hidden transition-transform duration-300">
            <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-800">
              <span className="text-lg font-bold text-neutral-900 dark:text-white">SikaRemit</span>
              <Button variant="ghost" size="sm" onClick={() => setMobileNavOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <nav className="flex flex-col p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-4rem)]">
              {navigation.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                return (
                  <Link
                    key={item.title}
                    href={item.href}
                    onClick={() => setMobileNavOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    <span>{item.title}</span>
                  </Link>
                )
              })}
            </nav>
          </div>
        </>
      )}

      {/* Global Search Dialog */}
      <CommandDialog open={searchOpen} onOpenChange={setSearchOpen}>
        <CommandInput placeholder={`Search ${userType} functions...`} />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Navigation">
            {searchItems.map((item) => (
              <CommandItem
                key={item.href}
                onSelect={() => {
                  window.location.href = item.href
                  setSearchOpen(false)
                }}
              >
                <item.icon className="mr-2 h-4 w-4" />
                <span>{item.name}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  )
}
