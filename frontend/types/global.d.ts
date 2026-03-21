/// <reference types="@testing-library/jest-dom" />

declare namespace NodeJS {
  interface ProcessEnv {
    WEBHOOK_SECRET: string
    NODE_ENV: 'development' | 'production'
  }
}

declare global {
  interface Window {
    WEBHOOK_SECRET: string
  }
}

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name?: string | null
      image?: string | null
      role: 'admin' | 'merchant' | 'customer'
      token: string
      expiresAt: number
      firstName?: string
      lastName?: string
    }
  }

  interface User {
    id: string
    email: string
    name?: string | null
    image?: string | null
    role: 'admin' | 'merchant' | 'customer'
    token: string
    refreshToken: string
    firstName?: string
    lastName?: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    accessToken?: string
    refreshToken?: string
    role?: string
    provider?: string
    exp?: number
    sub?: string
    email?: string
    name?: string
    firstName?: string
    lastName?: string
  }
}
