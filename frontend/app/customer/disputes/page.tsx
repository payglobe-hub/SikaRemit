'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { toast } from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import { 
  Plus, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  MessageSquare,
  Star,
  Filter,
  Search
} from 'lucide-react'

import { 
  getCustomerDisputes, 
  getCustomerDisputeStats,
  provideDisputeFeedback,
  Dispute,
  DisputeStats,
  DisputeFeedbackRequest,
  getDisputeStatusColor,
  getDisputeStatusLabel,
  formatDisputeDate,
  isDisputeActionable
} from '@/lib/api/customer-disputes'
import { CreateDisputeModal } from '@/components/disputes/create-dispute-modal'

// Force dynamic rendering to prevent SSR issues with auth
export const dynamic = 'force-dynamic'
export const runtime = 'edge'

export default function CustomerDisputesPage() {
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null)
  const [showFeedbackModal, setShowFeedbackModal] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [feedbackForm, setFeedbackForm] = useState({
    satisfied: true,
    feedback_text: ''
  })

  // Fetch disputes
  const { data: disputesData, isLoading: disputesLoading, refetch } = useQuery({
    queryKey: ['customer-disputes', statusFilter],
    queryFn: () => getCustomerDisputes({
      status: statusFilter !== 'all' ? statusFilter : undefined
    })
  })

  // Fetch stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dispute-stats'],
    queryFn: getCustomerDisputeStats
  })

  // Feedback mutation
  const feedbackMutation = useMutation({
    mutationFn: ({ disputeId, data }: { disputeId: number, data: DisputeFeedbackRequest }) =>
      provideDisputeFeedback(disputeId, data),
    onSuccess: () => {
      toast.success('Feedback submitted successfully!')
      setShowFeedbackModal(false)
      setFeedbackForm({ satisfied: true, feedback_text: '' })
      queryClient.invalidateQueries({ queryKey: ['customer-disputes'] })
      queryClient.invalidateQueries({ queryKey: ['dispute-stats'] })
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to submit feedback')
    }
  })

  const disputes = disputesData?.results || []
  const disputeStats: DisputeStats = stats || {
    total_disputes: 0,
    open_disputes: 0,
    resolved_disputes: 0,
    escalated_disputes: 0,
    satisfaction_rate: 0
  }

  // Filter disputes based on search
  const filteredDisputes = disputes.filter(dispute => 
    dispute.reason.toLowerCase().includes(searchQuery.toLowerCase()) ||
    dispute.merchant_name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleFeedbackSubmit = () => {
    if (!selectedDispute) return
    
    feedbackMutation.mutate({
      disputeId: selectedDispute.id,
      data: feedbackForm
    })
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
      case 'merchant_response':
        return <Clock className="w-4 h-4" />
      case 'under_review':
        return <MessageSquare className="w-4 h-4" />
      case 'resolved':
        return <CheckCircle className="w-4 h-4" />
      case 'pending_escalation':
        return <AlertTriangle className="w-4 h-4" />
      default:
        return <Clock className="w-4 h-4" />
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                My Disputes
              </h1>
              <p className="mt-2 text-gray-600">
                Track and manage your dispute cases
              </p>
            </div>
            <Button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Dispute
            </Button>
          </div>
        </div>

        {/* Statistics Cards */}
        {!statsLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <MessageSquare className="w-4 h-4 text-blue-600" />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Disputes</p>
                  <p className="text-2xl font-bold text-gray-900">{disputeStats.total_disputes}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                    <Clock className="w-4 h-4 text-yellow-600" />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Open Disputes</p>
                  <p className="text-2xl font-bold text-gray-900">{disputeStats.open_disputes}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Resolved</p>
                  <p className="text-2xl font-bold text-gray-900">{disputeStats.resolved_disputes}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                    <AlertTriangle className="w-4 h-4 text-orange-600" />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Escalated</p>
                  <p className="text-2xl font-bold text-gray-900">{disputeStats.escalated_disputes}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                    <Star className="w-4 h-4 text-indigo-600" />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Satisfaction Rate</p>
                  <p className="text-2xl font-bold text-gray-900">{disputeStats.satisfaction_rate}%</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
              <div className="flex items-center space-x-4">
                <div className="flex items-center">
                  <Filter className="w-4 h-4 text-gray-500 mr-2" />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Status</option>
                    <option value="open">Open</option>
                    <option value="merchant_response">Awaiting Response</option>
                    <option value="under_review">Under Review</option>
                    <option value="resolved">Resolved</option>
                    <option value="pending_escalation">Escalated</option>
                  </select>
                </div>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search disputes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Disputes List */}
        <div className="bg-white rounded-lg shadow">
          {disputesLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading disputes...</p>
            </div>
          ) : filteredDisputes.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">
                {searchQuery ? 'No disputes found matching your search' : 'No disputes found'}
              </p>
              {!searchQuery && (
                <Link
                  href="/customer/disputes/create-dispute"
                  className="mt-4 inline-flex items-center text-blue-600 hover:text-blue-800"
                >
                  Create your first dispute
                </Link>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredDisputes.map((dispute) => (
                <div key={dispute.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getDisputeStatusColor(dispute.status)}`}>
                          {getStatusIcon(dispute.status)}
                          <span className="ml-1">{getDisputeStatusLabel(dispute.status)}</span>
                        </span>
                        {dispute.is_escalated && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Escalated
                          </span>
                        )}
                      </div>
                      
                      <h3 className="text-lg font-medium text-gray-900 mb-1">
                        {dispute.merchant_name}
                      </h3>
                      
                      <p className="text-gray-600 mb-2 line-clamp-2">
                        {dispute.reason}
                      </p>
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span>
                          ${dispute.transaction_amount} {dispute.transaction_currency}
                        </span>
                        <span>•</span>
                        <span>{formatDisputeDate(dispute.created_at)}</span>
                        <span>•</span>
                        <span>{dispute.days_open} days</span>
                      </div>

                      {dispute.merchant_response && (
                        <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                          <p className="text-sm font-medium text-blue-900 mb-1">Merchant Response:</p>
                          <p className="text-sm text-blue-800">{dispute.merchant_response}</p>
                        </div>
                      )}

                      {dispute.merchant_resolution && (
                        <div className="mt-3 p-3 bg-green-50 rounded-lg">
                          <p className="text-sm font-medium text-green-900 mb-1">Resolution:</p>
                          <p className="text-sm text-green-800">{dispute.merchant_resolution}</p>
                        </div>
                      )}
                    </div>

                    <div className="ml-4 flex flex-col items-end space-y-2">
                      {isDisputeActionable(dispute) && (
                        <button
                          onClick={() => {
                            setSelectedDispute(dispute)
                            setShowFeedbackModal(true)
                          }}
                          className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                        >
                          Provide Feedback
                        </button>
                      )}
                      
                      <button
                        onClick={() => setSelectedDispute(dispute)}
                        className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Feedback Modal */}
        {showFeedbackModal && selectedDispute && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Provide Feedback
              </h3>
              
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-3">
                  Are you satisfied with the resolution for this dispute?
                </p>
                
                <div className="flex space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="satisfied"
                      checked={feedbackForm.satisfied === true}
                      onChange={() => setFeedbackForm({ ...feedbackForm, satisfied: true })}
                      className="mr-2"
                    />
                    <span className="text-sm">Yes, satisfied</span>
                  </label>
                  
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="satisfied"
                      checked={feedbackForm.satisfied === false}
                      onChange={() => setFeedbackForm({ ...feedbackForm, satisfied: false })}
                      className="mr-2"
                    />
                    <span className="text-sm">No, not satisfied</span>
                  </label>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional feedback (optional)
                </label>
                <textarea
                  rows={3}
                  value={feedbackForm.feedback_text}
                  onChange={(e) => setFeedbackForm({ ...feedbackForm, feedback_text: e.target.value })}
                  placeholder="Share your thoughts about the resolution..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowFeedbackModal(false)
                    setSelectedDispute(null)
                    setFeedbackForm({ satisfied: true, feedback_text: '' })
                  }}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                
                <button
                  onClick={handleFeedbackSubmit}
                  disabled={feedbackMutation.isPending}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {feedbackMutation.isPending ? 'Submitting...' : 'Submit Feedback'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Create Dispute Modal */}
        <CreateDisputeModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
        />
      </div>
    </div>
  )
}
