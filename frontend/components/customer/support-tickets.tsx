'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getSupportTickets,
  getSupportTicket,
  createSupportTicket,
  addSupportMessage
} from '@/lib/api/customer'
import { SupportTicket as SupportTicketType } from '@/lib/types/customer'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import {
  MessageSquare,
  Plus,
  Send,
  Paperclip,
  AlertCircle,
  RefreshCw,
  Clock,
  CheckCircle,
  User,
  HeadphonesIcon
} from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface SupportTicketsProps {
  compact?: boolean
}

interface CreateTicketDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function CreateTicketDialog({ open, onOpenChange }: CreateTicketDialogProps) {
  const [formData, setFormData] = useState({
    subject: '',
    category: '',
    priority: 'medium' as const,
    description: ''
  })
  const [attachments, setAttachments] = useState<File[]>([])
  const queryClient = useQueryClient()

  const createMutation = useMutation({
    mutationFn: (data: typeof formData & { attachments: File[] }) =>
      createSupportTicket({ ...data, attachments: data.attachments }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-tickets'] })
      onOpenChange(false)
      setFormData({ subject: '', category: '', priority: 'medium', description: '' })
      setAttachments([])
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createMutation.mutate({ ...formData, attachments })
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachments(Array.from(e.target.files))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Support Ticket</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              value={formData.subject}
              onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
              required
            />
          </div>

          <div>
            <Label htmlFor="category">Category</Label>
            <Select value={formData.category} onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" className="!text-gray-900 font-semibold" />
              </SelectTrigger>
              <SelectContent className="bg-white border border-gray-200 shadow-lg">
                <SelectItem value="account" className="px-3 py-2 text-gray-900 hover:bg-blue-50 hover:text-blue-900 cursor-pointer">Account Issues</SelectItem>
                <SelectItem value="payment" className="px-3 py-2 text-gray-900 hover:bg-blue-50 hover:text-blue-900 cursor-pointer">Payment Problems</SelectItem>
                <SelectItem value="transaction" className="px-3 py-2 text-gray-900 hover:bg-blue-50 hover:text-blue-900 cursor-pointer">Transaction Issues</SelectItem>
                <SelectItem value="security" className="px-3 py-2 text-gray-900 hover:bg-blue-50 hover:text-blue-900 cursor-pointer">Security Concerns</SelectItem>
                <SelectItem value="technical" className="px-3 py-2 text-gray-900 hover:bg-blue-50 hover:text-blue-900 cursor-pointer">Technical Support</SelectItem>
                <SelectItem value="billing" className="px-3 py-2 text-gray-900 hover:bg-blue-50 hover:text-blue-900 cursor-pointer">Billing Questions</SelectItem>
                <SelectItem value="other" className="px-3 py-2 text-gray-900 hover:bg-blue-50 hover:text-blue-900 cursor-pointer">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="priority">Priority</Label>
            <Select value={formData.priority} onValueChange={(value: any) => setFormData(prev => ({ ...prev, priority: value }))}>
              <SelectTrigger>
                <SelectValue className="!text-gray-900 font-semibold" />
              </SelectTrigger>
              <SelectContent className="bg-white border border-gray-200 shadow-lg">
                <SelectItem value="low" className="px-3 py-2 text-gray-900 hover:bg-blue-50 hover:text-blue-900 cursor-pointer">Low</SelectItem>
                <SelectItem value="medium" className="px-3 py-2 text-gray-900 hover:bg-blue-50 hover:text-blue-900 cursor-pointer">Medium</SelectItem>
                <SelectItem value="high" className="px-3 py-2 text-gray-900 hover:bg-blue-50 hover:text-blue-900 cursor-pointer">High</SelectItem>
                <SelectItem value="urgent" className="px-3 py-2 text-gray-900 hover:bg-blue-50 hover:text-blue-900 cursor-pointer">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={4}
              required
            />
          </div>

          <div>
            <Label htmlFor="attachments">Attachments (optional)</Label>
            <Input
              id="attachments"
              type="file"
              multiple
              onChange={handleFileChange}
              accept="image/*,.pdf,.doc,.docx"
            />
            {attachments.length > 0 && (
              <div className="text-sm text-muted-foreground mt-1">
                {attachments.length} file(s) selected
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating...' : 'Create Ticket'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function SupportTickets({ compact = false }: SupportTicketsProps) {
  const [selectedTicket, setSelectedTicket] = useState<SupportTicketType | null>(null)
  const [newMessage, setNewMessage] = useState('')
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const queryClient = useQueryClient()

  const {
    data: tickets,
    isLoading,
    error,
    refetch,
    isRefetching
  } = useQuery<SupportTicketType[]>({
    queryKey: ['support-tickets'],
    queryFn: () => getSupportTickets(),
    retry: 3,
    staleTime: 2 * 60 * 1000, // 2 minutes
  })

  const sendMessageMutation = useMutation({
    mutationFn: ({ ticketId, message }: { ticketId: string; message: string }) =>
      addSupportMessage(ticketId, message),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-tickets'] })
      setNewMessage('')
    }
  })

  const getStatusBadge = (status: SupportTicketType['status']) => {
    switch (status) {
      case 'open':
        return <Badge variant="destructive">Open</Badge>
      case 'in_progress':
        return <Badge variant="default" className="bg-blue-100 text-blue-800">In Progress</Badge>
      case 'waiting_for_customer':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Waiting for You</Badge>
      case 'resolved':
        return <Badge variant="default" className="bg-green-100 text-green-800">Resolved</Badge>
      case 'closed':
        return <Badge variant="outline">Closed</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getPriorityColor = (priority: SupportTicketType['priority']) => {
    switch (priority) {
      case 'urgent':
        return 'text-red-600'
      case 'high':
        return 'text-orange-600'
      case 'medium':
        return 'text-yellow-600'
      case 'low':
        return 'text-green-600'
      default:
        return 'text-gray-600'
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HeadphonesIcon className="h-5 w-5" />
            Support Tickets
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="border p-4 rounded animate-pulse">
                <div className="flex justify-between items-start mb-2">
                  <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                  <div className="h-6 bg-gray-200 rounded w-16"></div>
                </div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HeadphonesIcon className="h-5 w-5" />
            Support Tickets
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>Failed to load support tickets. Please try again.</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isRefetching}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`} />
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <HeadphonesIcon className="h-5 w-5" />
            Support Tickets
            {tickets && tickets.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {tickets.length}
              </Badge>
            )}
          </CardTitle>
          <Button onClick={() => setCreateDialogOpen(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            New Ticket
          </Button>
        </CardHeader>
        <CardContent>
          {!tickets || tickets.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <HeadphonesIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium mb-2">No support tickets yet</p>
              <p className="text-sm mb-4">Need help? Create your first support ticket.</p>
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Ticket
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {tickets && tickets.map((ticket: SupportTicketType) => (
                <div
                  key={ticket.id}
                  className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => setSelectedTicket(ticket)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-medium text-sm">{ticket.subject}</h3>
                    {getStatusBadge(ticket.status)}
                  </div>
                  <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                    {ticket.description}
                  </p>
                  <div className="flex justify-between items-center text-xs text-muted-foreground">
                    <div className="flex items-center gap-3">
                      <span className={`font-medium ${getPriorityColor(ticket.priority)}`}>
                        {ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)} Priority
                      </span>
                      <span>{ticket.category.replace('_', ' ')}</span>
                    </div>
                    <span>{new Date(ticket.updated_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ticket Detail Modal */}
      {selectedTicket && (
        <Dialog open={!!selectedTicket} onOpenChange={() => setSelectedTicket(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>{selectedTicket.subject}</span>
                {getStatusBadge(selectedTicket.status)}
              </DialogTitle>
            </DialogHeader>
            <div className="max-h-96 overflow-y-auto">
              <div className="space-y-4">
                {selectedTicket.messages?.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${message.sender === 'customer' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`flex gap-2 max-w-[70%] ${message.sender === 'customer' ? 'flex-row-reverse' : ''}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        message.sender === 'customer'
                          ? 'bg-blue-100 text-blue-600'
                          : 'bg-green-100 text-green-600'
                      }`}>
                        {message.sender === 'customer' ? <User className="h-4 w-4" /> : <HeadphonesIcon className="h-4 w-4" />}
                      </div>
                      <div className={`p-3 rounded-lg ${
                        message.sender === 'customer'
                          ? 'bg-blue-50 border border-blue-200'
                          : 'bg-green-50 border border-green-200'
                      }`}>
                        <p className="text-sm">{message.message}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(message.created_at).toLocaleDateString()} at {new Date(message.created_at).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {selectedTicket.status !== 'closed' && selectedTicket.status !== 'resolved' && (
              <div className="border-t pt-4">
                <div className="flex gap-2">
                  <Textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message..."
                    className="flex-1"
                    rows={2}
                  />
                  <Button
                    onClick={() => sendMessageMutation.mutate({
                      ticketId: selectedTicket.id,
                      message: newMessage
                    })}
                    disabled={!newMessage.trim() || sendMessageMutation.isPending}
                    className="self-end"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}

      <CreateTicketDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
    </>
  )
}
