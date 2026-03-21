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
                  
                  return null; 
                },
                setItem: function(key, value) { 
                  
                },
                removeItem: function(key) { 
                  
                },
                clear: function() { 
                  
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
