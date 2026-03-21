'use client'

import { useNotifications } from './provider';

export function useNotificationSocket() {
  // This hook provides direct access to the WebSocket connection
  // for components that need to send messages
  const { socket } = useNotifications()
  return socket
}
