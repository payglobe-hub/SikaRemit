'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Shield,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Eye,
  MoreHorizontal,
  Filter,
  Users,
  Building2,
  FileText,
  TrendingUp,
  AlertCircle
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import {
  getKYCSubmissions,
  getKYCSubmission,
  approveKYCSubmission,
  rejectKYCSubmission,
  escalateKYCSubmission,
  getKYCSubmissionStats,
  MerchantKYCSubmission,
  getAdminKYCInbox,
  getAdminKYCInboxStats,
  AdminKYCInboxItem,
  approveDirectCustomerKYCDocument,
  rejectDirectCustomerKYCDocument
} from '@/lib/api/admin-kyc'

export default function AdminKYCPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('pending')
  const [selectedPriority, setSelectedPriority] = useState<string>('all')
  const [selectedSubmission, setSelectedSubmission] = useState<AdminKYCInboxItem | null>(null)
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false)
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject' | 'escalate' | null>(null)
  const [reviewNotes, setReviewNotes] = useState('')

  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Fetch submissions and stats
  const { data: submissionsResponse, isLoading: submissionsLoading } = useQuery({
    queryKey: ['kyc-submissions', selectedStatus, selectedPriority, searchTerm],
    queryFn: () => getAdminKYCInbox({
      status: (selectedStatus as any) || 'pending',
      subject: 'all',
    }),
  })

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['kyc-submission-stats'],
    queryFn: getAdminKYCInboxStats,
  })

  const submissions = submissionsResponse?.results || []
  const totalCount = submissionsResponse?.count || 0

  // Mutations
  const approveMutation = useMutation({
    mutationFn: async ({ item, notes }: { item: AdminKYCInboxItem; notes: string }) => {
      if (item.subject_type === 'merchant_customer') {
        return approveKYCSubmission(item.source_id, notes)
      }
      return approveDirectCustomerKYCDocument(item.source_id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kyc-submissions'] })
      queryClient.invalidateQueries({ queryKey: ['kyc-submission-stats'] })
      setReviewDialogOpen(false)
      setReviewNotes('')
      toast({
        title: 'Success',
        description: 'KYC approved successfully',
      })
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to approve submission',
        variant: 'destructive',
      })
    },
  })

  const rejectMutation = useMutation({
    mutationFn: async ({ item, reason }: { item: AdminKYCInboxItem; reason: string }) => {
      if (item.subject_type === 'merchant_customer') {
        return rejectKYCSubmission(item.source_id, reason)
      }
      return rejectDirectCustomerKYCDocument(item.source_id, reason)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kyc-submissions'] })
      queryClient.invalidateQueries({ queryKey: ['kyc-submission-stats'] })
      setReviewDialogOpen(false)
      setReviewNotes('')
      toast({
        title: 'Success',
        description: 'KYC rejected',
      })
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to reject submission',
        variant: 'destructive',
      })
    },
  })

  const escalateMutation = useMutation({
    mutationFn: async ({ item, notes }: { item: AdminKYCInboxItem; notes: string }) => {
      if (item.subject_type !== 'merchant_customer') {
        throw new Error('Escalation is only available for merchant-customer KYC submissions')
      }
      return escalateKYCSubmission(item.source_id, notes)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kyc-submissions'] })
      queryClient.invalidateQueries({ queryKey: ['kyc-submission-stats'] })
      setReviewDialogOpen(false)
      setReviewNotes('')
      toast({
        title: 'Success',
        description: 'KYC submission escalated for further review',
      })
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to escalate submission',
        variant: 'destructive',
      })
    },
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pending Review</Badge>
      case 'approved':
        return <Badge variant="default" className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>
      case 'escalated':
        return <Badge variant="outline"><AlertTriangle className="w-3 h-3 mr-1" />Escalated</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <Badge variant="destructive">Urgent</Badge>
      case 'high':
        return <Badge variant="destructive">High</Badge>
      case 'normal':
        return <Badge variant="secondary">Normal</Badge>
      case 'low':
        return <Badge variant="outline">Low</Badge>
      default:
        return <Badge variant="outline">{priority}</Badge>
    }
  }

  const getRiskBadge = (score: number) => {
    if (score >= 8) return <Badge variant="destructive">High Risk</Badge>
    if (score >= 6) return <Badge variant="secondary">Medium Risk</Badge>
    return <Badge variant="default">Low Risk</Badge>
  }

  const handleReviewAction = (submission: AdminKYCInboxItem, action: 'approve' | 'reject' | 'escalate') => {
    setSelectedSubmission(submission)
    setReviewAction(action)
    setReviewDialogOpen(true)
  }

  const executeReviewAction = () => {
    if (!selectedSubmission || !reviewAction) return

    switch (reviewAction) {
      case 'approve':
        approveMutation.mutate({ item: selectedSubmission, notes: reviewNotes })
        break
      case 'reject':
        rejectMutation.mutate({ item: selectedSubmission, reason: reviewNotes })
        break
      case 'escalate':
        escalateMutation.mutate({ item: selectedSubmission, notes: reviewNotes })
        break
    }
  }

  return (
    <div className="w-full space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Shield className="h-8 w-8" />
              KYC Review Center
            </h1>
            <p className="text-muted-foreground mt-1">
              Review merchant customer KYC submissions and compliance
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Total Pending</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{stats.pending}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Approved</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Rejected</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Escalated</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-indigo-600">{stats.escalated}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {stats.total > 0 ? Math.round((stats.approved / stats.total) * 100) : 0}%
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters and Search */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4 flex-wrap">
              <div className="relative flex-1 min-w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by merchant name, customer email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-3 py-2 border rounded-md"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="escalated">Escalated</option>
              </select>
              <select
                value={selectedPriority}
                onChange={(e) => setSelectedPriority(e.target.value)}
                className="px-3 py-2 border rounded-md"
              >
                <option value="all">All Priorities</option>
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="normal">Normal</option>
                <option value="low">Low</option>
              </select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-4 font-medium">Merchant</th>
                    <th className="text-left p-4 font-medium">Customer</th>
                    <th className="text-left p-4 font-medium">Document Type</th>
                    <th className="text-left p-4 font-medium">Status</th>
                    <th className="text-left p-4 font-medium">Priority</th>
                    <th className="text-left p-4 font-medium">Risk</th>
                    <th className="text-left p-4 font-medium">Submitted</th>
                    <th className="text-left p-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {submissionsLoading ? (
                    <tr>
                      <td colSpan={8} className="text-center p-8 text-muted-foreground">
                        Loading submissions...
                      </td>
                    </tr>
                  ) : submissions.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center p-8 text-muted-foreground">
                        No submissions found
                      </td>
                    </tr>
                  ) : (
                    submissions.map((submission: AdminKYCInboxItem) => (
                      <tr key={submission.id} className="border-b hover:bg-muted/50">
                        <td className="p-4">
                          <div>
                            <div className="font-semibold">
                              {submission.subject_type === 'merchant_customer'
                                ? submission.merchant_customer?.merchant?.business_name
                                : 'Direct Customer'}
                            </div>
                            {submission.subject_type === 'merchant_customer' && (
                              <div className="text-sm text-muted-foreground">
                                {submission.merchant_customer?.merchant?.user?.email}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          <div>
                            <div className="font-semibold">
                              {submission.subject_type === 'merchant_customer'
                                ? `${submission.merchant_customer?.customer?.user?.first_name || ''} ${submission.merchant_customer?.customer?.user?.last_name || ''}`.trim()
                                : `${submission.customer?.user?.first_name || ''} ${submission.customer?.user?.last_name || ''}`.trim() || submission.customer?.user?.email || 'Customer'}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {submission.subject_type === 'merchant_customer'
                                ? submission.merchant_customer?.customer?.user?.email
                                : submission.customer?.user?.email}
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <Badge variant="outline">
                            {submission.kyc_document?.document_type
                              ? String(submission.kyc_document.document_type).replace('_', ' ')
                              : 'Document'}
                          </Badge>
                        </td>
                        <td className="p-4">
                          {getStatusBadge(submission.status)}
                        </td>
                        <td className="p-4">
                          {submission.review_priority ? getPriorityBadge(submission.review_priority) : <span className="text-sm text-muted-foreground">-</span>}
                        </td>
                        <td className="p-4">
                          {getRiskBadge(submission.risk_score)}
                        </td>
                        <td className="p-4">
                          <div>
                            <div className="text-sm">{new Date(submission.submitted_at).toLocaleDateString()}</div>
                            <div className="text-xs text-muted-foreground">
                              {typeof submission.days_pending === 'number'
                                ? `${submission.days_pending} days pending`
                                : ''}
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem onClick={() => setSelectedSubmission(submission)}>
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              {submission.status === 'pending' && (
                                <>
                                  <DropdownMenuItem onClick={() => handleReviewAction(submission, 'approve')}>
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Approve
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleReviewAction(submission, 'reject')}>
                                    <XCircle className="h-4 w-4 mr-2" />
                                    Reject
                                  </DropdownMenuItem>
                                  {submission.subject_type === 'merchant_customer' && (
                                    <DropdownMenuItem onClick={() => handleReviewAction(submission, 'escalate')}>
                                      <AlertTriangle className="h-4 w-4 mr-2" />
                                      Escalate
                                    </DropdownMenuItem>
                                  )}
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {totalCount > submissions.length && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  Showing {submissions.length} of {totalCount} submissions
                </p>
                <Button variant="outline">Load More</Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Review Action Dialog */}
        {selectedSubmission && reviewAction && (
          <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {reviewAction === 'approve' && 'Approve KYC Submission'}
                  {reviewAction === 'reject' && 'Reject KYC Submission'}
                  {reviewAction === 'escalate' && 'Escalate KYC Submission'}
                </DialogTitle>
                <DialogDescription>
                  {reviewAction === 'approve' && 'This will approve the KYC verification for this customer.'}
                  {reviewAction === 'reject' && 'This will reject the KYC submission. The customer will need to resubmit.'}
                  {reviewAction === 'escalate' && 'This will escalate the submission for further review by compliance team.'}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="review-notes">
                    {reviewAction === 'reject' ? 'Reason for Rejection' : 'Notes'} (Optional)
                  </Label>
                  <Textarea
                    id="review-notes"
                    placeholder={
                      reviewAction === 'approve' ? 'Additional notes about approval...' :
                      reviewAction === 'reject' ? 'Please provide reason for rejection...' :
                      'Notes for escalation...'
                    }
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    rows={3}
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setReviewDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={executeReviewAction}
                    disabled={
                      approveMutation.isPending ||
                      rejectMutation.isPending ||
                      escalateMutation.isPending
                    }
                    variant={reviewAction === 'reject' ? 'destructive' : 'default'}
                  >
                    {reviewAction === 'approve' && 'Approve'}
                    {reviewAction === 'reject' && 'Reject'}
                    {reviewAction === 'escalate' && 'Escalate'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Submission Details Dialog */}
        {selectedSubmission && !reviewAction && (
          <Dialog open={!!selectedSubmission} onOpenChange={() => setSelectedSubmission(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>KYC Submission Details</DialogTitle>
                <DialogDescription>
                  Detailed information about this KYC submission
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Merchant</Label>
                    <p className="text-sm">
                      {selectedSubmission.subject_type === 'merchant_customer'
                        ? selectedSubmission.merchant_customer?.merchant?.business_name
                        : 'Direct Customer'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Customer</Label>
                    <p className="text-sm">
                      {selectedSubmission.subject_type === 'merchant_customer'
                        ? `${selectedSubmission.merchant_customer?.customer?.user?.first_name || ''} ${selectedSubmission.merchant_customer?.customer?.user?.last_name || ''}`.trim()
                        : `${selectedSubmission.customer?.user?.first_name || ''} ${selectedSubmission.customer?.user?.last_name || ''}`.trim() || selectedSubmission.customer?.user?.email || 'Customer'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Document Type</Label>
                    <p className="text-sm">
                      {selectedSubmission.kyc_document?.document_type
                        ? String(selectedSubmission.kyc_document.document_type).replace('_', ' ')
                        : 'Document'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Status</Label>
                    <div className="mt-1">
                      {getStatusBadge(selectedSubmission.status)}
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Priority</Label>
                    <div className="mt-1">
                      {selectedSubmission.review_priority ? getPriorityBadge(selectedSubmission.review_priority) : <span className="text-sm text-muted-foreground">-</span>}
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Risk Score</Label>
                    <p className="text-sm font-semibold">{Number((selectedSubmission as any).risk_score || 0)}/10</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Submitted</Label>
                    <p className="text-sm">{new Date(selectedSubmission.submitted_at).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Days Pending</Label>
                    <p className="text-sm">{typeof selectedSubmission.days_pending === 'number' ? selectedSubmission.days_pending : '-'}</p>
                  </div>
                </div>

                {selectedSubmission.admin_notes && (
                  <div>
                    <Label className="text-sm font-medium">Admin Notes</Label>
                    <p className="text-sm bg-muted p-2 rounded">{selectedSubmission.admin_notes}</p>
                  </div>
                )}

                {selectedSubmission.escalation_reason && (
                  <div>
                    <Label className="text-sm font-medium">Escalation Reason</Label>
                    <p className="text-sm bg-muted p-2 rounded">{selectedSubmission.escalation_reason}</p>
                  </div>
                )}

                {selectedSubmission.risk_factors && selectedSubmission.risk_factors.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium">Risk Factors</Label>
                    <div className="flex gap-2 flex-wrap mt-1">
                      {selectedSubmission.risk_factors.map((factor: string, index: number) => (
                        <Badge key={index} variant="outline">{factor}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}
    </div>
  )
}
