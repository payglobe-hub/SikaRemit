'use client';

import Link from 'next/link';
import { useSession } from '@/lib/auth/session-provider';
import { usePathname } from 'next/navigation';
import clsx from 'classnames';
import { motion } from 'framer-motion';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  BarChart3,
  CreditCard,
  Send,
  User,
  Settings,
  FileText,
  HelpCircle
} from 'lucide-react';

type NavItem = {
  name: string;
  href: string;
  roles: string[];
  icon: React.ComponentType<any>;
  description: string;
};

const navItems: NavItem[] = [
  {
    name: 'Dashboard',
    href: '/customer/dashboard',
    roles: ['admin', 'merchant', 'customer'],
    icon: BarChart3,
    description: 'Overview of your account and transactions'
  },
  {
    name: 'Admin',
    href: '/admin/settings',
    roles: ['admin'],
    icon: Settings,
    description: 'Administrative controls and system management'
  }
];

export function EnhancedMainNav() {
  const session = useSession();
  const pathname = usePathname();

  if (session.status !== 'authenticated' || !session?.user || pathname === '/' || pathname.startsWith('/auth') || pathname.startsWith('/customer') || pathname.startsWith('/merchant') || pathname.startsWith('/admin')) return null;

  const user = session.user as any;

  const filteredNavItems = navItems.map(item => {
    if (item.name === 'Dashboard') {
      return {
        ...item,
        href: user.role === 'customer' ? '/customer/dashboard' : 
              user.role === 'merchant' ? '/merchant/dashboard' : 
              '/admin/dashboard'
      };
    }
    if (item.name === 'Account') {
      return {
        ...item,
        href: '/customer/account'
      };
    }
    return item;
  }).filter(item => item.roles.includes(user.role));

  return (
    <TooltipProvider>
      <nav className="flex space-x-1">
        {filteredNavItems.map((item, index) => (
          <motion.div
            key={item.href}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href={item.href}
                  className={clsx(
                    "relative flex items-center gap-2 px-3 py-2 transition-all rounded-md text-sm font-medium min-h-[40px]",
                    pathname === item.href
                      ? "text-primary bg-primary/10 shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                  )}
                  aria-current={pathname === item.href ? "page" : undefined}
                >
                  {pathname === item.href && (
                    <motion.span
                      layoutId="navIndicator"
                      className={clsx("absolute inset-0 bg-primary/10 rounded-md")}
                      transition={{ type: 'spring', bounce: 0.25, duration: 0.5 }}
                    />
                  )}
                  <item.icon className="h-4 w-4" />
                  <span className={clsx("relative z-10")}>{item.name}</span>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                <p>{item.description}</p>
              </TooltipContent>
            </Tooltip>
          </motion.div>
        ))}
      </nav>
    </TooltipProvider>
  );
}
