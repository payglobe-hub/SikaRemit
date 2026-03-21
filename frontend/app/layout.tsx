import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'SikaRemit - The Future of African Finance',
  description: 'Send money, pay bills, and manage your finances seamlessly across Africa. Powered by mobile money, built for the continent.',
  keywords: 'mobile money, fintech, Africa, payments, transfers, Ghana, SikaRemit, PayGlobe',
  authors: [{ name: 'PayGlobe Team' }],
  creator: 'PayGlobe',
  publisher: 'PayGlobe',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://sikaremit.com'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://sikaremit.com',
    title: 'SikaRemit - The Future of African Finance',
    description: 'Send money, pay bills, and manage your finances seamlessly across Africa. Powered by mobile money, built for the continent.',
    siteName: 'SikaRemit',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'SikaRemit - African Fintech Platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SikaRemit - The Future of African Finance',
    description: 'Send money, pay bills, and manage your finances seamlessly across Africa. Powered by mobile money, built for the continent.',
    images: ['/og-image.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'your-google-verification-code',
    yandex: 'your-yandex-verification-code',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="manifest" href="/site.webmanifest" />
        <link rel="mask-icon" href="/safari-pinned-tab.svg" color="#5bbad5" />
        <meta name="msapplication-TileColor" content="#da532c" />
        <meta name="theme-color" content="#ffffff" />
        
        {/* Preconnect to external domains */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        
        {/* Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              "name": "SikaRemit",
              "url": "https://sikaremit.com",
              "logo": "https://sikaremit.com/logo.png",
              "description": "Send money, pay bills, and manage your finances seamlessly across Africa. Powered by mobile money, built for the continent.",
              "sameAs": [
                "https://facebook.com/sikaremit",
                "https://twitter.com/sikaremit",
                "https://linkedin.com/company/sikaremit",
                "https://instagram.com/sikaremit"
              ],
              "contactPoint": {
                "@type": "ContactPoint",
                "telephone": "+233-30-000-0000",
                "contactType": "customer service",
                "availableLanguage": ["English", "Twi", "Ga"]
              },
              "address": {
                "@type": "PostalAddress",
                "addressLocality": "Accra",
                "addressCountry": "Ghana"
              }
            }),
          }}
        />
      </head>
      <body className={inter.className}>
        <div id="root">
          {children}
        </div>
        
        {/* Analytics Scripts */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Google Analytics (if needed)
              if (typeof gtag !== 'undefined') {
                gtag('config', 'GA_MEASUREMENT_ID');
              }
              
              // Performance monitoring
              if ('performance' in window) {
                window.addEventListener('load', function() {
                  setTimeout(function() {
                    const perfData = performance.getEntriesByType('navigation')[0];
                    console.log('Page Load Time:', perfData.loadEventEnd - perfData.loadEventStart, 'ms');
                  }, 0);
                });
              }
            `,
          }}
        />
      </body>
    </html>
  )
}
