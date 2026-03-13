import api from './axios'

export const AVAILABLE_EVENTS = [
  { value: 'payment.success', label: 'Payment Success' },
  { value: 'payment.failed', label: 'Payment Failed' },
  { value: 'user.created', label: 'User Created' },
  { value: 'transaction.completed', label: 'Transaction Completed' }
]

export interface Webhook {
  id: number
  url: string
  events: string[]
  is_active: boolean
  created_at: string
  success_count?: number
  failure_count?: number
  last_triggered?: string
  secret?: string
}

export interface WebhookEvent {
  id: number
  webhook_id: number
  event_type: string
  status: string
  created_at: string
  response_status?: number
  retry_count?: number
  delivered_at?: string
  error_message?: string
  payload?: any
}

export async function getWebhooks(): Promise<Webhook[]> {
  const response = await api.get('/api/v1/admin/webhooks/')
  return response.data.results || response.data || []
}

export async function createWebhook(data: Partial<Webhook>): Promise<Webhook> {
  const response = await api.post('/api/v1/admin/webhooks/', data)
  return response.data
}

export async function updateWebhook(id: number, data: Partial<Webhook>): Promise<Webhook> {
  const response = await api.patch(`/api/v1/admin/webhooks/${id}/`, data)
  return response.data
}

export async function deleteWebhook(id: number): Promise<void> {
  await api.delete(`/api/v1/admin/webhooks/${id}/`)
}

export async function testWebhook(id: number): Promise<{ message: string }> {
  const response = await api.post(`/api/v1/admin/webhooks/${id}/test/`)
  return response.data
}

export async function getWebhookEvents(webhookId?: number): Promise<WebhookEvent[]> {
  const url = webhookId 
    ? `/api/v1/admin/webhooks/${webhookId}/events/`
    : `/api/v1/admin/webhook-events/`
  const response = await api.get(url)
  return response.data.results || response.data || []
}

export async function getWebhookStats() {
  const response = await api.get('/api/v1/admin/webhooks/stats/')
  return response.data
}

export async function retryWebhookEvent(eventId: number): Promise<void> {
  await api.post(`/api/v1/admin/webhook-events/${eventId}/retry/`)
}
