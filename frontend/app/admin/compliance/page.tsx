'use client'

import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PermissionGuard } from '@/components/ui/permission-guard'
import { PERMISSIONS } from '@/lib/permissions/context'
import { AccessibleCard } from '@/components/ui/accessible-card'
import { AccessibleButton } from '@/components/ui/accessible-button'
import { LoadingSkeleton, DashboardStatsSkeleton, TableSkeleton } from '@/components/ui/loading-skeleton'
import {
  Shield,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  AlertTriangle,
  Users,
  FileText,
  Eye,
  Download,
  Search,
  Ban,
  CheckSquare
} from 'lucide-react'
import api from '@/lib/api/axios'

interface ComplianceStats {
  total_kyc_reviews: number
  pending_reviews: number
  approved_reviews: number
  rejected_reviews: number
  high_risk_alerts: number
  compliance_score: number
  monthly_reviews: number
}

interface KYCReview {
  id: string
  user_email: string
  user_type: string
  status: 'pending' | 'approved' | 'rejected'
  risk_level: 'low' | 'medium' | 'high'
  submitted_at: string
  reviewed_at?: string
  reviewer?: string
  documents: Array<{
    type: string
    status: string
    url?: string
  }>
}

async function fetchComplianceStats(): Promise<ComplianceStats> {
  const response = await api.get('/api/v1/compliance/stats/')
  // Handle APIResponse wrapper - extract data from response.data
  return response.data.data || response.data
}

async function fetchKYCReviews(): Promise<KYCReview[]> {
  const response = await api.get('/api/v1/compliance/kyc-reviews/')
  // Handle APIResponse wrapper - extract data from response.data
  return response.data.data || response.data
}

async function exportComplianceReport(format: 'csv' | 'excel' | 'pdf' = 'csv', statsData?: ComplianceStats, reviewsData?: KYCReview[]) {
  try {
    // If no data provided, use fallback immediately
    if (!statsData || !reviewsData) {
      throw new Error('No data available for export')
    }

    // Use API directly - auth headers will be added by axios interceptor
    const response = await api.get(`/api/v1/compliance/export/`, {
      params: { format },
      headers: { 
        'Accept': format === 'pdf' ? 'application/pdf' : format === 'excel' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'text/csv'
      },
      responseType: 'blob'
    })

    // Create download link
    const blob = new Blob([response.data], {
      type: format === 'pdf' ? 'application/pdf' : format === 'excel' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'text/csv'
    })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `compliance-report-${new Date().toISOString().split('T')[0]}.${format === 'excel' ? 'xlsx' : format}`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  } catch (error: any) {

    // If 404, use fallback immediately
    if (error.response?.status === 404) {
      
      if (statsData && reviewsData) {
        exportFallbackReport(statsData, reviewsData)
        return
      }
    }
    
    // For other errors, try fallback if data is available
    if (statsData && reviewsData) {
      
      exportFallbackReport(statsData, reviewsData)
    } else {
      throw new Error('No data available for export')
    }
  }
}

function exportFallbackReport(stats: ComplianceStats, reviews: KYCReview[]) {
  try {
    // Create a simple CSV export with current data
    const csvContent = [
      'Compliance Report',
      `Generated: ${new Date().toLocaleString()}`,
      '',
      'Statistics',
      `Total KYC Reviews,${stats.total_kyc_reviews || 0}`,
      `Pending Reviews,${stats.pending_reviews || 0}`,
      `Approved Reviews,${stats.approved_reviews || 0}`,
      `Rejected Reviews,${stats.rejected_reviews || 0}`,
      `High Risk Alerts,${stats.high_risk_alerts || 0}`,
      `Compliance Score,${stats.compliance_score || 0}%`,
      `Monthly Reviews,${stats.monthly_reviews || 0}`,
      '',
      'KYC Reviews',
      'ID,Email,User Type,Status,Risk Level,Submitted At,Reviewed At,Reviewer',
      ...reviews.map((review: KYCReview) => 
        `${review.id},"${review.user_email}","${review.user_type}",${review.status},${review.risk_level},"${review.submitted_at || ''}","${review.reviewed_at || ''}","${review.reviewer || ''}"`
      )
    ].join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `compliance-report-fallback-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  } catch (error) {
    
  }
}

export default function CompliancePage() {
  const { data: stats, isLoading: statsLoading, error: statsError } = useQuery({
    queryKey: ['compliance-stats'],
    queryFn: fetchComplianceStats,
    refetchInterval: 30000,
    staleTime: 25000,
  })

  const { data: reviews, isLoading: reviewsLoading, error: reviewsError } = useQuery({
    queryKey: ['kyc-reviews'],
    queryFn: fetchKYCReviews,
    refetchInterval: 15000,
    staleTime: 10000,
  })

  const [isExporting, setIsExporting] = React.useState(false)

  const handleExport = async () => {
    if (!stats || !reviews) {
      
      alert('No data available for export. Please wait for the data to load.')
      return
    }
    
    setIsExporting(true)
    try {
      await exportComplianceReport('csv', stats, reviews)
    } catch (error: any) {

      // Show more specific error message
      if (error.response?.status === 401) {
        alert('Authentication expired. Please refresh the page and try again.')
      } else if (error.response?.status === 404) {
        // This should be handled by fallback, but just in case
        alert('Export service temporarily unavailable. Please try again in a moment.')
      } else if (error.message === 'No data available for export') {
        alert('No data available for export. Please wait for the data to load.')
      } else {
        alert('Export failed. Please try again.')
      }
    } finally {
      setIsExporting(false)
    }
  }

  // Show loading skeleton while data is loading
  if (statsLoading || reviewsLoading) {
    return (
      <div className="space-y-4" role="main" aria-label="Compliance Dashboard">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Compliance Dashboard</h1>
            <p className="text-gray-600">Monitor KYC reviews and compliance metrics</p>
          </div>
        </div>
        
        <DashboardStatsSkeleton />
        
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-6 border-b">
            <LoadingSkeleton variant="text" width="30%" height="h-6" />
          </div>
          <div className="p-6">
            <TableSkeleton rows={5} columns={4} />
          </div>
        </div>
      </div>
    )
  }

  // Show error state if data fails to load
  if (statsError || reviewsError) {
    return (
      <div className="space-y-4" role="main" aria-label="Compliance Dashboard">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Compliance Dashboard</h1>
            <p className="text-gray-600">Monitor KYC reviews and compliance metrics</p>
          </div>
        </div>
        
        <AccessibleCard 
          title="Error Loading Data"
          description="There was an error loading the compliance dashboard data."
          ariaLabel="Error message"
        >
          <div className="text-center py-8">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">
              Unable to load compliance data. Please try again.
            </p>
            <AccessibleButton 
              onClick={() => window.location.reload()}
              ariaLabel="Refresh compliance dashboard"
            >
              Refresh Page
            </AccessibleButton>
          </div>
        </AccessibleCard>
      </div>
    )
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle2 className="w-3 h-3 mr-1" />Approved</Badge>
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />Pending</Badge>
      default:
        return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>
    }
  }

  const getRiskBadge = (level: string) => {
    switch (level) {
      case 'high':
        return <Badge className="bg-red-100 text-red-800"><AlertTriangle className="w-3 h-3 mr-1" />High Risk</Badge>
      case 'medium':
        return <Badge className="bg-yellow-100 text-yellow-800">Medium Risk</Badge>
      case 'low':
        return <Badge className="bg-green-100 text-green-800">Low Risk</Badge>
      default:
        return <Badge className="bg-gray-100 text-gray-800">{level}</Badge>
    }
  }

  return (
    <div className="space-y-4" role="main" aria-label="Compliance Dashboard">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Compliance Dashboard</h1>
          <p className="text-gray-600">KYC reviews, risk monitoring, and regulatory compliance</p>
        </div>
        <PermissionGuard permission={PERMISSIONS.REPORTING}>
          <AccessibleButton 
            ariaLabel="Export compliance report"
            icon={<Download className="w-4 h-4" />}
            onClick={handleExport}
            disabled={isExporting || !stats || !reviews}
          >
            {isExporting ? 'Exporting...' : 'Export Report'}
          </AccessibleButton>
        </PermissionGuard>
      </header>

      {/* Stats Cards */}
      <section aria-label="Compliance Statistics">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <AccessibleCard 
            title="Total KYC Reviews"
            description="Total number of KYC reviews processed"
            ariaLabel="Total KYC Reviews statistics"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{stats?.total_kyc_reviews || 0}</div>
                <p className="text-xs text-muted-foreground">
                  +{stats?.monthly_reviews || 0} this month
                </p>
              </div>
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
          </AccessibleCard>

          <AccessibleCard 
            title="Pending Reviews"
            description="KYC reviews requiring attention"
            ariaLabel="Pending Reviews statistics"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-yellow-600">{stats?.pending_reviews || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Require attention
                </p>
              </div>
              <Clock className="h-8 w-8 text-muted-foreground" />
            </div>
          </AccessibleCard>

          <AccessibleCard 
            title="High Risk Alerts"
            description="High-risk compliance alerts"
            ariaLabel="High Risk Alerts statistics"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-red-600">{stats?.high_risk_alerts || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Need immediate review
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-muted-foreground" />
            </div>
          </AccessibleCard>

          <AccessibleCard 
            title="Compliance Score"
            description="Overall compliance performance score"
            ariaLabel="Compliance Score statistics"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-green-600">{stats?.compliance_score || 0}%</div>
                <p className="text-xs text-muted-foreground">
                  Overall performance
                </p>
              </div>
              <Shield className="h-8 w-8 text-muted-foreground" />
            </div>
          </AccessibleCard>
        </div>
      </section>

      {/* KYC Reviews Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent KYC Reviews</CardTitle>
          <CardDescription>
            Monitor and manage identity verification requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="pending" className="space-y-4">
            <TabsList>
              <TabsTrigger value="pending">Pending ({reviews?.filter(r => r.status === 'pending').length || 0})</TabsTrigger>
              <TabsTrigger value="approved">Approved ({reviews?.filter(r => r.status === 'approved').length || 0})</TabsTrigger>
              <TabsTrigger value="rejected">Rejected ({reviews?.filter(r => r.status === 'rejected').length || 0})</TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="space-y-4">
              {reviews && reviews.filter(review => review.status === 'pending').length > 0 ? (
                reviews.filter(review => review.status === 'pending').map((review) => (
                  <div key={review.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <p className="font-medium">{review.user_email}</p>
                        {getRiskBadge(review.risk_level)}
                      </div>
                      <p className="text-sm text-gray-600">
                        {review.user_type} â€¢ Submitted {new Date(review.submitted_at).toLocaleDateString()}
                      </p>
                      <div className="flex items-center space-x-2 text-xs text-gray-500">
                        <FileText className="w-3 h-3" />
                        <span>{review.documents.length} documents</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getStatusBadge(review.status)}
                      <PermissionGuard permission={PERMISSIONS.KYC_REVIEW}>
                        <Button size="sm" variant="outline">
                          <Eye className="w-4 h-4 mr-1" />
                          Review
                        </Button>
                      </PermissionGuard>
                      <PermissionGuard permission={PERMISSIONS.KYC_REVIEW}>
                        <Button size="sm" variant="default" className="bg-green-600 hover:bg-green-700">
                          <CheckSquare className="w-4 h-4 mr-1" />
                          Approve
                        </Button>
                      </PermissionGuard>
                      <PermissionGuard permission={PERMISSIONS.KYC_REVIEW}>
                        <Button size="sm" variant="destructive">
                          <Ban className="w-4 h-4 mr-1" />
                          Reject
                        </Button>
                      </PermissionGuard>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No pending reviews at this time.</p>
                  <p className="text-sm text-gray-500 mt-2">KYC reviews that require approval will appear here.</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="approved" className="space-y-4">
              {reviews?.filter(review => review.status === 'approved').map((review) => (
                <div key={review.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <p className="font-medium">{review.user_email}</p>
                      {getRiskBadge(review.risk_level)}
                    </div>
                    <p className="text-sm text-gray-600">
                      {review.user_type} â€¢ Approved by {review.reviewer}
                    </p>
                    <p className="text-xs text-gray-500">
                      {review.reviewed_at ? new Date(review.reviewed_at).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusBadge(review.status)}
                    <Button size="sm" variant="outline">
                      <Eye className="w-4 h-4 mr-1" />
                      View Details
                    </Button>
                  </div>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="rejected" className="space-y-4">
              {reviews?.filter(review => review.status === 'rejected').map((review) => (
                <div key={review.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <p className="font-medium">{review.user_email}</p>
                      {getRiskBadge(review.risk_level)}
                    </div>
                    <p className="text-sm text-gray-600">
                      {review.user_type} â€¢ Rejected by {review.reviewer}
                    </p>
                    <p className="text-xs text-gray-500">
                      {review.reviewed_at ? new Date(review.reviewed_at).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusBadge(review.status)}
                    <Button size="sm" variant="outline">
                      <Eye className="w-4 h-4 mr-1" />
                      View Details
                    </Button>
                  </div>
                </div>
              ))}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

