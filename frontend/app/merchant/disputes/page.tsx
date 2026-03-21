'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { toast } from 'react-hot-toast'

// Force dynamic rendering to prevent SSR issues with auth
export const dynamic = 'force-dynamic'
export const runtime = 'edge'
import {
  MessageSquare,
  Clock,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  Users,
  Star,
  Filter,
  Search,
  Calendar,
  Reply,
  CheckSquare,
  ArrowUpRight,
  Eye
} from 'lucide-react'

import {
  getMerchantDisputes,
  getMerchantDisputeStats,
  getOverdueDisputes,
  respondToDispute,
  resolveDispute,
  escalateDispute,
  MerchantDispute,
  MerchantDisputeStats,
  MerchantDisputeFilters,
  getMerchantDisputeStatusColor,
  getMerchantDisputeStatusLabel,
  isDisputeOverdue,
  getResponseUrgency,
  canRespondToDispute,
  canResolveDispute,
  canEscalateDispute
} from '@/lib/api/merchant-disputes'

export default function MerchantDisputesPage() {
  const queryClient = useQueryClient()
  const [filters, setFilters] = useState<MerchantDisputeFilters>({
    status: 'all',
    escalated: 'all'
  })
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDispute, setSelectedDispute] = useState<MerchantDispute | null>(null)
  const [showResponseModal, setShowResponseModal] = useState(false)
  const [showResolutionModal, setShowResolutionModal] = useState(false)
  const [showEscalationModal, setShowEscalationModal] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  
  const [responseForm, setResponseForm] = useState({ response_text: '' })
  const [resolutionForm, setResolutionForm] = useState({ resolution_text: '' })
  const [escalationForm, setEscalationForm] = useState({ escalation_reason: '' })

  // Fetch disputes
  const { data: disputesData, isLoading: disputesLoading, refetch } = useQuery({
    queryKey: ['merchant-disputes', filters],
    queryFn: () => getMerchantDisputes(filters)
  })

  // Fetch stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['merchant-dispute-stats'],
    queryFn: getMerchantDisputeStats
  })

  // Fetch overdue disputes
  const { data: overdueDisputes } = useQuery({
    queryKey: ['overdue-disputes'],
    queryFn: getOverdueDisputes,
    refetchInterval: 60000 // Refresh every minute
  })

  // Response mutation
  const responseMutation = useMutation({
    mutationFn: ({ disputeId, data }: { disputeId: number, data: any }) =>
      respondToDispute(disputeId, data),
    onSuccess: () => {
      toast.success('Response submitted successfully!')
      setShowResponseModal(false)
      setResponseForm({ response_text: '' })
      queryClient.invalidateQueries({ queryKey: ['merchant-disputes'] })
      queryClient.invalidateQueries({ queryKey: ['merchant-dispute-stats'] })
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to submit response')
    }
  })

  // Resolution mutation
  const resolutionMutation = useMutation({
    mutationFn: ({ disputeId, data }: { disputeId: number, data: any }) =>
      resolveDispute(disputeId, data),
    onSuccess: () => {
      toast.success('Dispute resolved successfully!')
      setShowResolutionModal(false)
      setResolutionForm({ resolution_text: '' })
      queryClient.invalidateQueries({ queryKey: ['merchant-disputes'] })
      queryClient.invalidateQueries({ queryKey: ['merchant-dispute-stats'] })
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to resolve dispute')
    }
  })

  // Escalation mutation
  const escalationMutation = useMutation({
    mutationFn: ({ disputeId, data }: { disputeId: number, data: any }) =>
      escalateDispute(disputeId, data),
    onSuccess: () => {
      toast.success('Dispute escalated to admin successfully!')
      setShowEscalationModal(false)
      setEscalationForm({ escalation_reason: '' })
      queryClient.invalidateQueries({ queryKey: ['merchant-disputes'] })
      queryClient.invalidateQueries({ queryKey: ['merchant-dispute-stats'] })
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to escalate dispute')
    }
  })

  const disputes = disputesData || []
  const disputeStats: MerchantDisputeStats = stats || {
    total_disputes: 0,
    open_disputes: 0,
    under_review_disputes: 0,
    resolved_disputes: 0,
    escalated_disputes: 0,
    overdue_disputes: 0,
    avg_response_time_hours: 0,
    satisfaction_rate: 0
  }

  // Filter disputes based on search
  const filteredDisputes = disputes.filter(dispute => 
    dispute.reason.toLowerCase().includes(searchQuery.toLowerCase()) ||
    dispute.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    dispute.customer_email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleResponse = () => {
    if (!selectedDispute || !responseForm.response_text.trim()) return
    
    responseMutation.mutate({
      disputeId: selectedDispute.id,
      data: responseForm
    })
  }

  const handleResolution = () => {
    if (!selectedDispute || !resolutionForm.resolution_text.trim()) return
    
    resolutionMutation.mutate({
      disputeId: selectedDispute.id,
      data: resolutionForm
    })
  }

  const handleEscalation = () => {
    if (!selectedDispute || !escalationForm.escalation_reason.trim()) return
    
    escalationMutation.mutate({
      disputeId: selectedDispute.id,
      data: escalationForm
    })
  }

  const getUrgencyColor = (urgency: 'high' | 'medium' | 'low') => {
    switch (urgency) {
      case 'high': return 'text-red-600 bg-red-100'
      case 'medium': return 'text-yellow-600 bg-yellow-100'
      case 'low': return 'text-green-600 bg-green-100'
    }
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
                Dispute Management
              </h1>
              <p className="mt-2 text-gray-600">
                Handle customer disputes and maintain satisfaction
              </p>
            </div>
            
            {/* Overdue Disputes Alert */}
            {overdueDisputes && overdueDisputes.length > 0 && (
              <div className="flex items-center px-4 py-2 bg-red-50 border border-red-200 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
                <span className="text-red-800 font-medium">
                  {overdueDisputes.length} overdue dispute{overdueDisputes.length > 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Statistics Cards */}
        {!statsLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
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

            <div className="bg-white rounded-lg shadow p-6">
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

            <div className="bg-white rounded-lg shadow p-6">
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

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <Star className="w-4 h-4 text-blue-600" />
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

        {/* Performance Metrics */}
        {!statsLoading && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg Response Time</p>
                  <p className="text-lg font-bold text-gray-900">{disputeStats.avg_response_time_hours}h</p>
                </div>
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Under Review</p>
                  <p className="text-lg font-bold text-gray-900">{disputeStats.under_review_disputes}</p>
                </div>
                <Users className="w-5 h-5 text-blue-600" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Escalated</p>
                  <p className="text-lg font-bold text-gray-900">{disputeStats.escalated_disputes}</p>
                </div>
                <ArrowUpRight className="w-5 h-5 text-orange-600" />
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
                    value={filters.status}
                    onChange={(e) => setFilters({ ...filters, status: e.target.value })}
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

                <div className="flex items-center">
                  <select
                    value={filters.escalated}
                    onChange={(e) => setFilters({ ...filters, escalated: e.target.value })}
                    className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Disputes</option>
                    <option value="false">Not Escalated</option>
                    <option value="true">Escalated</option>
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
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredDisputes.map((dispute) => {
                const urgency = getResponseUrgency(dispute)
                const overdue = isDisputeOverdue(dispute)
                
                return (
                  <div key={dispute.id} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getMerchantDisputeStatusColor(dispute.status)}`}>
                            {getStatusIcon(dispute.status)}
                            <span className="ml-1">{getMerchantDisputeStatusLabel(dispute.status)}</span>
                          </span>
                          
                          {dispute.status === 'merchant_response' && (
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getUrgencyColor(urgency)}`}>
                              <Clock className="w-3 h-3 mr-1" />
                              {urgency} priority
                            </span>
                          )}
                          
                          {overdue && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              Overdue
                            </span>
                          )}
                          
                          {dispute.escalated_to_admin && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                              <ArrowUpRight className="w-3 h-3 mr-1" />
                              Escalated
                            </span>
                          )}
                        </div>
                        
                        <h3 className="text-lg font-medium text-gray-900 mb-1">
                          {dispute.customer_name}
                        </h3>
                        
                        <p className="text-gray-600 mb-2 line-clamp-2">
                          {dispute.reason}
                        </p>
                        
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span>
                            ${dispute.transaction_amount} {dispute.transaction_currency}
                          </span>
                          <span>•</span>
                          <span>{new Date(dispute.transaction_date).toLocaleDateString()}</span>
                          <span>•</span>
                          <span>{dispute.days_open} days</span>
                          {dispute.status === 'merchant_response' && (
                            <>
                              <span>•</span>
                              <span className={overdue ? 'text-red-600 font-medium' : ''}>
                                Due: {new Date(dispute.response_deadline).toLocaleDateString()}
                              </span>
                            </>
                          )}
                        </div>

                        {dispute.merchant_response && (
                          <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                            <p className="text-sm font-medium text-blue-900 mb-1">Your Response:</p>
                            <p className="text-sm text-blue-800">{dispute.merchant_response}</p>
                          </div>
                        )}

                        {dispute.merchant_resolution && (
                          <div className="mt-3 p-3 bg-green-50 rounded-lg">
                            <p className="text-sm font-medium text-green-900 mb-1">Resolution:</p>
                            <p className="text-sm text-green-800">{dispute.merchant_resolution}</p>
                          </div>
                        )}

                        {dispute.customer_feedback && (
                          <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                            <p className="text-sm font-medium text-blue-900 mb-1">Customer Feedback:</p>
                            <p className="text-sm text-blue-800">{dispute.customer_feedback}</p>
                            <p className="text-xs text-blue-600 mt-1">
                              {dispute.customer_satisfied ? '✓ Satisfied' : '✗ Not Satisfied'}
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="ml-4 flex flex-col items-end space-y-2">
                        <button
                          onClick={() => {
                            setSelectedDispute(dispute)
                            setShowDetailsModal(true)
                          }}
                          className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        
                        {canRespondToDispute(dispute) && (
                          <button
                            onClick={() => {
                              setSelectedDispute(dispute)
                              setShowResponseModal(true)
                            }}
                            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                          >
                            <Reply className="w-4 h-4" />
                          </button>
                        )}
                        
                        {canResolveDispute(dispute) && (
                          <button
                            onClick={() => {
                              setSelectedDispute(dispute)
                              setShowResolutionModal(true)
                            }}
                            className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                          >
                            <CheckSquare className="w-4 h-4" />
                          </button>
                        )}
                        
                        {canEscalateDispute(dispute) && (
                          <button
                            onClick={() => {
                              setSelectedDispute(dispute)
                              setShowEscalationModal(true)
                            }}
                            className="px-3 py-1 text-sm bg-orange-600 text-white rounded hover:bg-orange-700 transition-colors"
                          >
                            <ArrowUpRight className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Response Modal */}
        {showResponseModal && selectedDispute && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Respond to Dispute
              </h3>
              
              <div className="mb-4">
                <div className="bg-gray-50 p-3 rounded-lg mb-4">
                  <p className="text-sm font-medium text-gray-700 mb-1">Customer Issue:</p>
                  <p className="text-sm text-gray-600">{selectedDispute.reason}</p>
                </div>
                
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Response *
                </label>
                <textarea
                  rows={4}
                  value={responseForm.response_text}
                  onChange={(e) => setResponseForm({ ...responseForm, response_text: e.target.value })}
                  placeholder="Provide a detailed response to address the customer's concerns..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowResponseModal(false)
                    setSelectedDispute(null)
                    setResponseForm({ response_text: '' })
                  }}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                
                <button
                  onClick={handleResponse}
                  disabled={responseMutation.isPending || !responseForm.response_text.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {responseMutation.isPending ? 'Submitting...' : 'Submit Response'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Resolution Modal */}
        {showResolutionModal && selectedDispute && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Resolve Dispute
              </h3>
              
              <div className="mb-4">
                <div className="bg-gray-50 p-3 rounded-lg mb-4">
                  <p className="text-sm font-medium text-gray-700 mb-1">Customer Issue:</p>
                  <p className="text-sm text-gray-600">{selectedDispute.reason}</p>
                </div>
                
                {selectedDispute.merchant_response && (
                  <div className="bg-blue-50 p-3 rounded-lg mb-4">
                    <p className="text-sm font-medium text-blue-700 mb-1">Your Previous Response:</p>
                    <p className="text-sm text-blue-600">{selectedDispute.merchant_response}</p>
                  </div>
                )}
                
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Resolution Details *
                </label>
                <textarea
                  rows={4}
                  value={resolutionForm.resolution_text}
                  onChange={(e) => setResolutionForm({ ...resolutionForm, resolution_text: e.target.value })}
                  placeholder="Describe how you're resolving this dispute (refund, replacement, etc.)..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowResolutionModal(false)
                    setSelectedDispute(null)
                    setResolutionForm({ resolution_text: '' })
                  }}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                
                <button
                  onClick={handleResolution}
                  disabled={resolutionMutation.isPending || !resolutionForm.resolution_text.trim()}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {resolutionMutation.isPending ? 'Resolving...' : 'Resolve Dispute'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Escalation Modal */}
        {showEscalationModal && selectedDispute && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Escalate to Admin
              </h3>
              
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-3">
                  This dispute will be reviewed by the SikaRemit admin team.
                </p>
                
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for Escalation *
                </label>
                <textarea
                  rows={3}
                  value={escalationForm.escalation_reason}
                  onChange={(e) => setEscalationForm({ ...escalationForm, escalation_reason: e.target.value })}
                  placeholder="Explain why this dispute needs admin intervention..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowEscalationModal(false)
                    setSelectedDispute(null)
                    setEscalationForm({ escalation_reason: '' })
                  }}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                
                <button
                  onClick={handleEscalation}
                  disabled={escalationMutation.isPending || !escalationForm.escalation_reason.trim()}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
                >
                  {escalationMutation.isPending ? 'Escalating...' : 'Escalate to Admin'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Details Modal */}
        {showDetailsModal && selectedDispute && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[80vh] overflow-y-auto">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Dispute Details
              </h3>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Transaction ID</p>
                    <p className="text-sm text-gray-900">{selectedDispute.transaction_id}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Amount</p>
                    <p className="text-sm text-gray-900">${selectedDispute.transaction_amount} {selectedDispute.transaction_currency}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Customer</p>
                    <p className="text-sm text-gray-900">{selectedDispute.customer_name}</p>
                    <p className="text-xs text-gray-600">{selectedDispute.customer_email}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Status</p>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getMerchantDisputeStatusColor(selectedDispute.status)}`}>
                      {getMerchantDisputeStatusLabel(selectedDispute.status)}
                    </span>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Issue Description</p>
                  <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-lg">{selectedDispute.reason}</p>
                </div>

                {selectedDispute.merchant_response && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Your Response</p>
                    <p className="text-sm text-gray-900 bg-blue-50 p-3 rounded-lg">{selectedDispute.merchant_response}</p>
                    <p className="text-xs text-gray-600 mt-1">
                      {selectedDispute.merchant_response_time && 
                        `Responded: ${new Date(selectedDispute.merchant_response_time).toLocaleString()}`
                      }
                    </p>
                  </div>
                )}

                {selectedDispute.merchant_resolution && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Resolution</p>
                    <p className="text-sm text-gray-900 bg-green-50 p-3 rounded-lg">{selectedDispute.merchant_resolution}</p>
                    <p className="text-xs text-gray-600 mt-1">
                      {selectedDispute.merchant_resolution_time && 
                        `Resolved: ${new Date(selectedDispute.merchant_resolution_time).toLocaleString()}`
                      }
                    </p>
                  </div>
                )}

                {selectedDispute.escalated_to_admin && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Escalation Details</p>
                    <div className="bg-orange-50 p-3 rounded-lg">
                      <p className="text-sm text-orange-900 mb-1">{selectedDispute.escalation_reason}</p>
                      <p className="text-xs text-orange-600">
                        Escalated: {selectedDispute.escalated_at && 
                          new Date(selectedDispute.escalated_at).toLocaleString()
                        }
                      </p>
                    </div>
                  </div>
                )}

                {selectedDispute.customer_feedback && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Customer Feedback</p>
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <p className="text-sm text-blue-900 mb-1">{selectedDispute.customer_feedback}</p>
                      <p className="text-xs text-blue-600">
                        {selectedDispute.customer_satisfied ? '✓ Satisfied' : '✗ Not Satisfied'}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end mt-6">
                <button
                  onClick={() => {
                    setShowDetailsModal(false)
                    setSelectedDispute(null)
                  }}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
