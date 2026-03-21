import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import dynamic from 'next/dynamic';
import "./globals.css";
import { AppContent } from './AppContent'

// Import localStorage polyfill for SSR safety
import '@/lib/polyfills/localStorage'

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SikaRemit - Secure Payment Solutions",
  description: "Experience seamless, secure payment processing with SikaRemit. Built for businesses that demand reliability, speed, and global reach.",
  keywords: "payments, fintech, money transfer, mobile money, bank transfers, secure payments",
  authors: [{ name: "SikaRemit Team" }],
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#000000',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="scroll-smooth" data-scroll-behavior="smooth">
      <body className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/50 relative antialiased`}>
        {/* Subtle background accents (lightweight — no animate-spin) */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 left-10 w-64 h-64 bg-gradient-to-r from-blue-400/8 to-blue-300/8 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-10 w-72 h-72 bg-gradient-to-r from-blue-400/6 to-purple-400/6 rounded-full blur-3xl animate-pulse delay-1000"></div>
        </div>
        <AppContent>
          {children}
        </AppContent>
      </body>
    </html>
  )
}
