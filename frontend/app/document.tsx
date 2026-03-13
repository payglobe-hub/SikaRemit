import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <script dangerouslySetInnerHTML={{
          __html: `
            // Aggressive localStorage polyfill for SSR
            (function() {
              if (typeof window !== 'undefined') {
                // Client-side - use real localStorage
                return;
              }
              
              // Server-side - create global localStorage polyfill
              global.localStorage = global.localStorage || {
                getItem: function(key) { 
                  console.warn('localStorage.getItem called on server-side for key:', key);
                  return null; 
                },
                setItem: function(key, value) { 
                  console.warn('localStorage.setItem called on server-side for key:', key);
                },
                removeItem: function(key) { 
                  console.warn('localStorage.removeItem called on server-side for key:', key);
                },
                clear: function() { 
                  console.warn('localStorage.clear called on server-side');
                },
                length: 0,
                key: function(index) { return null; }
              };
              
              // Also define window.localStorage for SSR
              if (typeof global.window !== 'undefined') {
                global.window.localStorage = global.localStorage;
              }
            })();
          `
        }} />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
