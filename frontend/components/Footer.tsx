'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export function Footer() {
  const pathname = usePathname()
  
  // Hide footer on admin, merchant, and customer dashboard routes
  const hiddenRoutes = ['/admin', '/merchant', '/customer']
  const shouldHideFooter = hiddenRoutes.some(route => pathname.startsWith(route))
  
  if (shouldHideFooter) {
    return null
  }

  return (
    <footer className="border-t border-gray-200 bg-gray-50 relative z-10">
      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center overflow-hidden">
            <img src="/logos/SikaRemit.jpeg" alt="SikaRemit" className="w-8 h-8 object-cover rounded-lg" />
          </div>
          <div>
            <div className="text-xl font-bold text-gray-800">SikaRemit</div>
            <div className="text-xs text-gray-500">Secure Payment Solutions</div>
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-gray-500 mb-6 max-w-md">
          Empowering businesses worldwide with secure, fast, and reliable payment processing solutions.
        </p>

        {/* Links - 2x2 grid on mobile, 4 cols on desktop */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
          <div>
            <div className="font-semibold text-sm text-gray-800 mb-3">Product</div>
            <div className="flex flex-col gap-2 text-sm text-gray-500">
              <Link href="#features" className="hover:text-gray-700">Features</Link>
              <Link href="#pricing" className="hover:text-gray-700">Pricing</Link>
              <Link href="#security" className="hover:text-gray-700">Security</Link>
              <Link href="/api" className="hover:text-gray-700">API Docs</Link>
            </div>
          </div>
          <div>
            <div className="font-semibold text-sm text-gray-800 mb-3">Support</div>
            <div className="flex flex-col gap-2 text-sm text-gray-500">
              <Link href="/faq" className="hover:text-gray-700">FAQ</Link>
              <Link href="/contact" className="hover:text-gray-700">Contact</Link>
              <Link href="/help" className="hover:text-gray-700">Help Center</Link>
              <Link href="/status" className="hover:text-gray-700">Status</Link>
            </div>
          </div>
          <div>
            <div className="font-semibold text-sm text-gray-800 mb-3">Company</div>
            <div className="flex flex-col gap-2 text-sm text-gray-500">
              <Link href="/about" className="hover:text-gray-700">About</Link>
              <Link href="/careers" className="hover:text-gray-700">Careers</Link>
              <Link href="/blog" className="hover:text-gray-700">Blog</Link>
              <Link href="/press" className="hover:text-gray-700">Press</Link>
            </div>
          </div>
          <div>
            <div className="font-semibold text-sm text-gray-800 mb-3">Legal</div>
            <div className="flex flex-col gap-2 text-sm text-gray-500">
              <Link href="/privacy" className="hover:text-gray-700">Privacy</Link>
              <Link href="/terms" className="hover:text-gray-700">Terms</Link>
              <Link href="/compliance" className="hover:text-gray-700">Compliance</Link>
              <Link href="/cookies" className="hover:text-gray-700">Cookies</Link>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-gray-200 mb-4"></div>

        {/* Copyright */}
        <div className="text-center text-xs text-gray-500">
          © 2025 SikaRemit. All rights reserved. Powered by PayGlobe
        </div>
      </div>
    </footer>
  )
}
