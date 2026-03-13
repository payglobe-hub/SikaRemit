'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Webhook as WebhookIcon,
  Plus,
  Trash2,
  Edit,
  TestTube,
  CheckCircle2,
  XCircle,
  Loader2,
  Copy,
  Eye,
  EyeOff,
  RefreshCw,
  Activity
} from 'lucide-react'
import {
  getWebhooks,
  getWebhookEvents,
  getWebhookStats,
  createWebhook,
  updateWebhook,
  deleteWebhook,
  testWebhook,
  retryWebhookEvent,
  AVAILABLE_EVENTS,
  type Webhook,
  type WebhookEvent
} from '@/lib/api/webhooks'
import { useToast } from '@/hooks/use-toast'
import { PermissionGuard } from '@/components/ui/permission-guard'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'

export default function WebhooksPage() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedWebhook, setSelectedWebhook] = useState<Webhook | null>(null)
  const [showSecret, setShowSecret] = useState<Record<number, boolean>>({})
  const [formData, setFormData] = useState({
    url: '',
    events: [] as string[],
    secret: ''
  })

  const { data: webhooks, isLoading: webhooksLoading } = useQuery({
    queryKey: ['webhooks'],
    queryFn: getWebhooks
  })

  const { data: events, isLoading: eventsLoading } = useQuery({
    queryKey: ['webhook-events'],
    queryFn: () => getWebhookEvents(),
    refetchInterval: 30000
  })

  const { data: stats } = useQuery({
    queryKey: ['webhook-stats'],
    queryFn: getWebhookStats
  })

  const createMutation = useMutation({
    mutationFn: createWebhook,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] })
      toast({ title: 'Success', description: 'Webhook created successfully' })
      setShowCreateDialog(false)
      resetForm()
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to create webhook', variant: 'destructive' })
    }
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Webhook> }) =>
      updateWebhook(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] })
      toast({ title: 'Success', description: 'Webhook updated successfully' })
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to update webhook', variant: 'destructive' })
    }
  })

  const deleteMutation = useMutation({
    mutationFn: deleteWebhook,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] })
      toast({ title: 'Success', description: 'Webhook deleted successfully' })
      setShowDeleteDialog(false)
      setSelectedWebhook(null)
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to delete webhook', variant: 'destructive' })
    }
  })

  const testMutation = useMutation({
    mutationFn: testWebhook,
    onSuccess: (data) => {
      toast({ title: 'Test Result', description: data.message })
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to test webhook', variant: 'destructive' })
    }
  })

  const retryMutation = useMutation({
    mutationFn: retryWebhookEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhook-events'] })
      toast({ title: 'Success', description: 'Event retry initiated' })
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to retry event', variant: 'destructive' })
    }
  })

  const resetForm = () => {
    setFormData({ url: '', events: [], secret: '' })
  }

  const handleCreate = () => {
    if (!formData.url || formData.events.length === 0) {
      toast({
        title: 'Error',
        description: 'Please enter URL and select at least one event',
        variant: 'destructive'
      })
      return
    }
    createMutation.mutate(formData)
  }

  const handleToggleActive = (webhook: Webhook) => {
    updateMutation.mutate({
      id: webhook.id,
      data: { is_active: !webhook.is_active }
    })
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({ title: 'Copied', description: 'Copied to clipboard' })
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; icon: any; color: string }> = {
      delivered: { variant: 'default', icon: CheckCircle2, color: 'text-green-600' },
      failed: { variant: 'destructive', icon: XCircle, color: 'text-red-600' },
      pending: { variant: 'secondary', icon: Loader2, color: 'text-orange-600' }
    }
    const config = variants[status] || variants.pending
    const Icon = config.icon

    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className={`h-3 w-3 ${config.color}`} />
        {status}
      </Badge>
    )
  }

  return (
    <PermissionGuard
      role={['super_admin']}
      fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-2">
            <h2 className="text-xl font-semibold">Access Denied</h2>
            <p className="text-muted-foreground">You do not have permission to manage webhooks.</p>
          </div>
        </div>
      }
    >
    <div className="w-full space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <WebhookIcon className="h-8 w-8" />
              Webhook Management
            </h1>
            <p className="text-muted-foreground mt-1">
              Configure and monitor webhook endpoints
            </p>
          </div>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Webhook
          </Button>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Total Webhooks</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total_webhooks}</div>
              </CardContent>
            </Card>
            <Card className="border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-green-700 dark:text-green-300">
                  Active
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                  {stats.active_webhooks}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Total Events</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total_events}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats.total_events > 0
                    ? Math.round((stats.successful_deliveries / stats.total_events) * 100)
                    : 0}
                  %
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Avg Response</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.average_response_time}ms</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Content */}
        <Tabs defaultValue="webhooks" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
            <TabsTrigger value="events">Event Log</TabsTrigger>
          </TabsList>

          {/* Webhooks Tab */}
          <TabsContent value="webhooks" className="space-y-4">
            {webhooksLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : webhooks && webhooks.length > 0 ? (
              <div className="space-y-4">
                {webhooks.map((webhook) => (
                  <Card key={webhook.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-lg">{webhook.url}</CardTitle>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(webhook.url)}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                          <CardDescription>
                            Created {new Date(webhook.created_at).toLocaleDateString()}
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={webhook.is_active}
                            onCheckedChange={() => handleToggleActive(webhook)}
                          />
                          <Badge variant={webhook.is_active ? 'default' : 'secondary'}>
                            {webhook.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Success</p>
                          <p className="font-semibold text-green-600">{webhook.success_count}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Failures</p>
                          <p className="font-semibold text-red-600">{webhook.failure_count}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Events</p>
                          <p className="font-semibold">{webhook.events.length}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Last Triggered</p>
                          <p className="font-semibold">
                            {webhook.last_triggered
                              ? new Date(webhook.last_triggered).toLocaleString()
                              : 'Never'}
                          </p>
                        </div>
                      </div>

                      <div>
                        <p className="text-sm text-muted-foreground mb-2">Subscribed Events</p>
                        <div className="flex flex-wrap gap-2">
                          {webhook.events.map((event) => (
                            <Badge key={event} variant="outline">
                              {event}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Webhook Secret</p>
                        <div className="flex items-center gap-2">
                          <Input
                            type={showSecret[webhook.id] ? 'text' : 'password'}
                            value={webhook.secret}
                            readOnly
                            className="font-mono text-sm"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setShowSecret({
                                ...showSecret,
                                [webhook.id]: !showSecret[webhook.id]
                              })
                            }
                          >
                            {showSecret[webhook.id] ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(webhook.secret || '')}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => testMutation.mutate(webhook.id)}
                          disabled={testMutation.isPending}
                        >
                          <TestTube className="mr-2 h-4 w-4" />
                          Test
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            setSelectedWebhook(webhook)
                            setShowDeleteDialog(true)
                          }}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <WebhookIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-lg font-medium">No webhooks configured</p>
                  <p className="text-muted-foreground mt-1">
                    Create your first webhook to receive real-time notifications
                  </p>
                  <Button onClick={() => setShowCreateDialog(true)} className="mt-4">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Webhook
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Events Tab */}
          <TabsContent value="events" className="space-y-4">
            {eventsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : events && events.length > 0 ? (
              <div className="space-y-4">
                {events.map((event) => (
                  <Card key={event.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <Activity className="h-5 w-5" />
                            {event.event_type}
                          </CardTitle>
                          <CardDescription>
                            {new Date(event.created_at).toLocaleString()}
                          </CardDescription>
                        </div>
                        {getStatusBadge(event.status)}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Response Status</p>
                          <p className="font-semibold">{event.response_status || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Retry Count</p>
                          <p className="font-semibold">{event.retry_count}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Delivered At</p>
                          <p className="font-semibold">
                            {event.delivered_at
                              ? new Date(event.delivered_at).toLocaleString()
                              : 'Pending'}
                          </p>
                        </div>
                        <div>
                          {event.status === 'failed' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => retryMutation.mutate(event.id)}
                              disabled={retryMutation.isPending}
                            >
                              <RefreshCw className="mr-2 h-4 w-4" />
                              Retry
                            </Button>
                          )}
                        </div>
                      </div>

                      {event.error_message && (
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Error</p>
                          <div className="bg-red-50 dark:bg-red-950/20 p-3 rounded-md text-sm text-red-700 dark:text-red-300">
                            {event.error_message}
                          </div>
                        </div>
                      )}

                      <details className="cursor-pointer">
                        <summary className="text-sm font-medium mb-2">View Payload</summary>
                        <div className="bg-muted p-3 rounded-md mt-2">
                          <pre className="text-xs overflow-auto">
                            {JSON.stringify(event.payload, null, 2)}
                          </pre>
                        </div>
                      </details>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-lg font-medium">No webhook events</p>
                  <p className="text-muted-foreground mt-1">
                    Webhook events will appear here when triggered
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>


      {/* Create Webhook Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Webhook</DialogTitle>
            <DialogDescription>
              Configure a new webhook endpoint to receive event notifications
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="url">Webhook URL</Label>
              <Input
                id="url"
                placeholder="https://your-domain.com/webhooks"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="secret">Webhook Secret (optional)</Label>
              <Input
                id="secret"
                placeholder="Leave empty to auto-generate"
                value={formData.secret}
                onChange={(e) => setFormData({ ...formData, secret: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Events to Subscribe</Label>
              <div className="grid grid-cols-2 gap-3 max-h-64 overflow-y-auto p-2">
                {AVAILABLE_EVENTS.map((event) => (
                  <div key={event.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={event.value}
                      checked={formData.events.includes(event.value)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setFormData({
                            ...formData,
                            events: [...formData.events, event.value]
                          })
                        } else {
                          setFormData({
                            ...formData,
                            events: formData.events.filter((e) => e !== event.value)
                          })
                        }
                      }}
                    />
                    <label
                      htmlFor={event.value}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {event.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Webhook'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Webhook</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this webhook? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => selectedWebhook && deleteMutation.mutate(selectedWebhook.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </PermissionGuard>
  )
}
