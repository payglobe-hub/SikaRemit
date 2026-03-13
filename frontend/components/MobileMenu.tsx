"use client"

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import clsx from 'classnames'
import { Menu, User, Settings, CreditCard, Shield, HelpCircle, LogOut } from 'lucide-react'
import { useSession } from '@/lib/auth/session-provider'
import { useAuth } from '@/lib/auth/context'

type NavItem = {
  name: string;
  href: string;
  roles: string[];
  icon: React.ComponentType<any>;
};

const navItems: NavItem[] = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    roles: ['admin', 'merchant', 'customer'],
    icon: User
  },
  {
    name: 'Admin',
    href: '/admin',
    roles: ['admin'],
    icon: Settings
  },
  {
    name: 'Business',
    href: '/merchant',
    roles: ['merchant'],
    icon: Settings
  },
  {
    name: 'Account',
    href: '/account',
    roles: ['customer'],
    icon: User
  }
];

export function MobileMenu() {
  const session = useSession()
  const { logout } = useAuth()
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)

  if (session.status !== 'authenticated' || !session?.user || pathname === '/' || pathname.startsWith('/auth') || pathname.startsWith('/customer') || pathname.startsWith('/merchant') || pathname.startsWith('/admin')) return null

  const user = session.user as any

  const filteredNavItems = navItems.filter(item =>
    item.roles.includes(user.role)
  )

  const userInitials = user.firstName && user.lastName
    ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    : user.email?.[0].toUpperCase() || 'U'

  const userRoleBadge = () => {
    switch (user.role) {
      case 'admin':
        return <Badge variant="destructive" className="text-xs">Admin</Badge>
      case 'merchant':
        return <Badge variant="secondary" className="text-xs">Business</Badge>
      case 'customer':
        return <Badge variant="outline" className="text-xs">Customer</Badge>
      default:
        return null
    }
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-10 w-10 p-0"
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-80">
        <SheetHeader className="text-left">
          <SheetTitle className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={user.image || undefined} alt={user.firstName || 'User'} />
              <AvatarFallback className="bg-primary/10 text-primary">
                {userInitials}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="text-base font-medium">
                {user.firstName} {user.lastName}
              </span>
              <div className="flex items-center gap-2">
                {userRoleBadge()}
              </div>
            </div>
          </SheetTitle>
          <SheetDescription>
            Mobile navigation menu for accessing different sections of the application and account settings.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col space-y-4 mt-6">
          {/* Navigation Links */}
          <nav className="flex flex-col space-y-2">
            {filteredNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={clsx(
                  "flex items-center gap-3 px-3 py-3 text-base font-medium rounded-md transition-colors",
                  pathname === item.href
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                )}
                aria-current={pathname === item.href ? "page" : undefined}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            ))}
          </nav>

          <Separator />

          {/* Quick Actions for Customers */}
          {user && user.role === 'customer' && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Quick Actions
              </h4>
              <div className="grid grid-cols-2 gap-2">
                <Link href="/customer/payments/domestic" onClick={() => setIsOpen(false)}>
                  <Button variant="outline" size="sm" className="w-full justify-start h-auto py-3">
                    <CreditCard className="h-4 w-4 mr-2" />
                    Send Money
                  </Button>
                </Link>
                <Link href="/customer/payments/cross-border" onClick={() => setIsOpen(false)}>
                  <Button variant="outline" size="sm" className="w-full justify-start h-auto py-3">
                    <User className="h-4 w-4 mr-2" />
                    Remit
                  </Button>
                </Link>
                <Link href="/customer/payments/top-up" onClick={() => setIsOpen(false)}>
                  <Button variant="outline" size="sm" className="w-full justify-start h-auto py-3">
                    <CreditCard className="h-4 w-4 mr-2" />
                    Top Up
                  </Button>
                </Link>
                <Link href="/customer/payments/bills" onClick={() => setIsOpen(false)}>
                  <Button variant="outline" size="sm" className="w-full justify-start h-auto py-3">
                    <Settings className="h-4 w-4 mr-2" />
                    Pay Bills
                  </Button>
                </Link>
              </div>
            </div>
          )}

          <Separator />

          {/* User Actions */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Account
            </h4>
            <div className="space-y-2">
              <Link href="/settings" onClick={() => setIsOpen(false)}>
                <Button variant="ghost" className="w-full justify-start">
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </Button>
              </Link>

              {user && user.role === 'customer' && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Notifications</span>
                  {/* Notification bell moved to header */}
                </div>
              )}

              <Link href="/faq" onClick={() => setIsOpen(false)}>
                <Button variant="ghost" className="w-full justify-start">
                  <HelpCircle className="h-4 w-4 mr-2" />
                  Help & FAQ
                </Button>
              </Link>
            </div>
          </div>

          <Separator />

          {/* Sign Out */}
          <Button
            variant="destructive"
            className="w-full justify-start"
            onClick={() => {
              setIsOpen(false)
              logout()
            }}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
