import axios from 'axios'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export interface SessionData {
  user: {
    id: string
    email: string
    name: string
    role: string
  } | null
}

// Re-export useAuth from context for backward compatibility
export { useAuth } from './context';
export { useSession, type Session } from './session-provider';
