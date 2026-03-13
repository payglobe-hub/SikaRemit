'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Building2, Search, Plus, Filter, Trash2, UserCheck, Mail, Phone, MapPin, Calendar } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import axios from 'axios'
import { authTokens } from '@/lib/utils/cookie-auth'
import api from '@/lib/api/axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface Merchant {
  id: number
  email: string
  first_name: string
  last_name: string
  user_type: number
  role: string
  is_active: boolean
  created_at: string
  phone?: string
  business_name?: string
  business_address?: string
  business_type?: string
  last_login?: string
  kyc_status?: string
}

interface MerchantInvitation {
  id: number
  email: string
  business_name: string
  invitation_token: string
  is_accepted: boolean
  created_at: string
  expires_at: string
  invited_by: string
}

async function fetchMerchants(search: string = ''): Promise<Merchant[]> {
  const token = authTokens.getAccessToken()
  const response = await axios.get(`${API_URL}/api/v1/accounts/admin/users/`, {
    headers: { Authorization: `Bearer ${token}` },
    params: { search, user_type: 5 } // Filter for merchants only
  })
  
  const data = response.data
  let merchants: Merchant[] = []
  if (data.results && Array.isArray(data.results)) {
    merchants = data.results
  } else if (Array.isArray(data)) {
    merchants = data
  }
  return merchants
}

async function fetchMerchantInvitations(): Promise<MerchantInvitation[]> {
  // Use API directly - auth headers will be added by axios interceptor
  const response = await api.get('/api/v1/admin/merchants/invitations/')
  
  const data = response.data
  let invitations: MerchantInvitation[] = []
  if (data.results && Array.isArray(data.results)) {
    invitations = data.results
  } else if (Array.isArray(data)) {
    invitations = data
  }
  return invitations
}

export default function AdminMerchantsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const [activeTab, setActiveTab] = useState<'merchants' | 'invitations'>('merchants')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedMerchant, setSelectedMerchant] = useState<Merchant | null>(null)
  const [createFormData, setCreateFormData] = useState({
    email: '',
    first_name: '',
    last_name: '',
    phone: '',
    business_name: '',
    business_address: '',
    business_type: '',
    password: ''
  })
  const [editFormData, setEditFormData] = useState({
    email: '',
    first_name: '',
    last_name: '',
    phone: '',
    business_name: '',
    business_address: '',
    business_type: ''
  })
  const [inviteFormData, setInviteFormData] = useState({
    email: '',
    business_name: '',
    business_type: '',
    message: ''
  })

  const queryClient = useQueryClient()

  const { data: allMerchants = [], isLoading: merchantsLoading } = useQuery({
    queryKey: ['admin-merchants', debouncedSearch],
    queryFn: () => fetchMerchants(debouncedSearch),
    retry: false
  })

  const { data: invitations = [], isLoading: invitationsLoading } = useQuery({
    queryKey: ['admin-merchant-invitations'],
    queryFn: fetchMerchantInvitations,
    retry: false
  })

  const merchants = showInactive ? allMerchants : allMerchants.filter(merchant => merchant.is_active)

  const handleSearch = (value: string) => {
    setSearchTerm(value)
    setTimeout(() => setDebouncedSearch(value), 300)
  }

  const createMerchantMutation = useMutation({
    mutationFn: async (userData: typeof createFormData) => {
      const payload = {
        ...userData,
        user_type: 5 // Merchant type
      }
      // Use API directly - auth headers will be added by axios interceptor
      const response = await api.post('/api/v1/accounts/admin/users/', payload)
      return response.data
    },
    onSuccess: () => {
      toast.success('Merchant created successfully')
      setIsCreateDialogOpen(false)
      setCreateFormData({
        email: '',
        first_name: '',
        last_name: '',
        phone: '',
        business_name: '',
        business_address: '',
        business_type: '',
        password: ''
      })
      queryClient.invalidateQueries({ queryKey: ['admin-merchants'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to create merchant')
    }
  })

  const inviteMerchantMutation = useMutation({
    mutationFn: async (inviteData: typeof inviteFormData) => {
      // Use API directly - auth headers will be added by axios interceptor
      const response = await api.post('/api/v1/admin/merchants/invitations/', inviteData)
      return response.data
    },
    onSuccess: () => {
      toast.success('Merchant invitation sent successfully')
      setIsInviteDialogOpen(false)
      setInviteFormData({
        email: '',
        business_name: '',
        business_type: '',
        message: ''
      })
      queryClient.invalidateQueries({ queryKey: ['admin-merchant-invitations'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to send invitation')
    }
  })

  const toggleMerchantStatusMutation = useMutation({
    mutationFn: async (merchant: Merchant) => {
      // Use API directly - auth headers will be added by axios interceptor
      const response = await api.patch(`/api/v1/accounts/admin/users/${merchant.id}/`, {
        is_active: !merchant.is_active
      })
      return response.data
    },
    onSuccess: () => {
      toast.success('Merchant status updated successfully')
      queryClient.invalidateQueries({ queryKey: ['admin-merchants'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update merchant status')
    }
  })

  const updateMerchantMutation = useMutation({
    mutationFn: async ({ merchantId, userData }: { merchantId: number, userData: typeof editFormData }) => {
      const payload = {
        ...userData,
        user_type: 5
      }
      // Use API directly - auth headers will be added by axios interceptor
      const response = await api.patch(`/api/v1/accounts/admin/users/${merchantId}/`, payload)
      return response.data
    },
    onSuccess: () => {
      toast.success('Merchant updated successfully')
      setIsEditDialogOpen(false)
      setSelectedMerchant(null)
      queryClient.invalidateQueries({ queryKey: ['admin-merchants'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update merchant')
    }
  })

  const deleteMerchantMutation = useMutation({
    mutationFn: async (merchantId: number) => {
      // Use API directly - auth headers will be added by axios interceptor
      const response = await api.delete(`/api/v1/accounts/admin/users/${merchantId}/`)
      return response.data
    },
    onSuccess: () => {
      toast.success('Merchant deleted successfully')
      setIsEditDialogOpen(false)
      setSelectedMerchant(null)
      queryClient.invalidateQueries({ queryKey: ['admin-merchants'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to delete merchant')
    }
  })

  const handleViewMerchant = (merchant: Merchant) => {
    setSelectedMerchant(merchant)
    setIsViewDialogOpen(true)
  }

  const handleEditMerchant = (merchant: Merchant) => {
    setSelectedMerchant(merchant)
    setEditFormData({
      email: merchant.email,
      first_name: merchant.first_name,
      last_name: merchant.last_name,
      phone: merchant.phone || '',
      business_name: merchant.business_name || '',
      business_address: merchant.business_address || '',
      business_type: merchant.business_type || ''
    })
    setIsEditDialogOpen(true)
  }

  const handleToggleMerchantStatus = (merchant: Merchant) => {
    if (window.confirm(`Are you sure you want to ${merchant.is_active ? 'suspend' : 'activate'} this merchant?`)) {
      toggleMerchantStatusMutation.mutate(merchant)
    }
  }

  const handleCreateMerchant = () => {
    if (!createFormData.email || !createFormData.first_name || !createFormData.last_name || !createFormData.business_name) {
      toast.error('Please fill in all required fields')
      return
    }
    createMerchantMutation.mutate(createFormData)
  }

  const handleInviteMerchant = () => {
    if (!inviteFormData.email || !inviteFormData.business_name) {
      toast.error('Please fill in all required fields')
      return
    }
    inviteMerchantMutation.mutate(inviteFormData)
  }

  const getMerchantStatusColor = (isActive: boolean) => {
    return isActive 
      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
      : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
  }

  const getKYCStatusColor = (status?: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'rejected':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <>
      <div className="w-full space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 bg-clip-text text-transparent flex items-center gap-3">
              <Building2 className="h-8 w-8 text-blue-600" />
              Merchant Management
            </h1>
            <p className="text-slate-600 mt-1 text-base">Manage merchants and business accounts on the platform</p>
          </div>
          <div className="flex gap-3">
            <Button 
              className="bg-gradient-to-r from-blue-600 to-indigo-500 text-white hover:shadow-xl hover:shadow-blue-500/25 transition-all duration-300 hover:scale-105 px-6 py-3" 
              onClick={() => setIsInviteDialogOpen(true)}
            >
              <Mail className="h-5 w-5 mr-2" />
              Invite Merchant
            </Button>
            <Button 
              className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white hover:shadow-xl hover:shadow-blue-500/25 transition-all duration-300 hover:scale-105 px-6 py-3" 
              onClick={() => setIsCreateDialogOpen(true)}
            >
              <Plus className="h-5 w-5 mr-2" />
              Create Merchant
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('merchants')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md transition-all duration-200 ${
              activeTab === 'merchants'
                ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 dark:hover:text-slate-300'
            }`}
          >
            <Building2 className="h-4 w-4" />
            Existing Merchants ({merchants.length})
          </button>
          <button
            onClick={() => setActiveTab('invitations')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md transition-all duration-200 ${
              activeTab === 'invitations'
                ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 dark:hover:text-slate-300'
            }`}
          >
            <Mail className="h-4 w-4" />
            Invitations ({invitations.filter(i => !i.is_accepted).length})
          </button>
        </div>

        <Card className="bg-white/40 backdrop-blur-xl border-white/30 shadow-xl shadow-blue-500/5 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-500">
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                <Input
                  placeholder={`Search ${activeTab === 'merchants' ? 'merchants' : 'invitations'} by email or business name...`}
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10 bg-white/50 backdrop-blur-sm border-white/30 focus:border-blue-300"
                />
              </div>
              {activeTab === 'merchants' && (
                <Button 
                  variant="outline" 
                  className={`backdrop-blur-sm border-white/30 shadow-lg shadow-blue-500/5 transition-all duration-300 ${
                    showInactive ? 'bg-blue-100 hover:bg-blue-200 border-blue-300' : 'bg-white/50 hover:bg-white/70 hover:border-blue-200/50'
                  }`}
                  onClick={() => setShowInactive(!showInactive)}
                >
                  <Filter className="h-4 w-4 mr-2" />
                  {showInactive ? 'Hide Inactive' : 'Show Inactive'}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {activeTab === 'merchants' ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-4 font-medium">Business</th>
                      <th className="text-left p-4 font-medium">Contact</th>
                      <th className="text-left p-4 font-medium">KYC Status</th>
                      <th className="text-left p-4 font-medium">Status</th>
                      <th className="text-left p-4 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {merchantsLoading ? (
                      <tr>
                        <td colSpan={5} className="text-center p-8 text-muted-foreground">
                          Loading merchants...
                        </td>
                      </tr>
                    ) : merchants.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center p-8 text-muted-foreground">
                          No merchants found
                        </td>
                      </tr>
                    ) : (
                      merchants.map((merchant) => (
                        <tr key={merchant.id} className="border-b hover:bg-muted/50">
                          <td className="p-4">
                            <div>
                              <div className="font-medium">{merchant.business_name || 'N/A'}</div>
                              <div className="text-sm text-slate-500">{merchant.business_type || 'N/A'}</div>
                            </div>
                          </td>
                          <td className="p-4">
                            <div>
                              <div className="font-medium">{merchant.first_name} {merchant.last_name}</div>
                              <div className="text-sm text-slate-500">{merchant.email}</div>
                              {merchant.phone && (
                                <div className="text-sm text-slate-500 flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  {merchant.phone}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="p-4">
                            <Badge className={`text-xs ${getKYCStatusColor(merchant.kyc_status)}`}>
                              {merchant.kyc_status?.toUpperCase() || 'NOT_STARTED'}
                            </Badge>
                          </td>
                          <td className="p-4">
                            <span className={`px-2 py-1 rounded-full text-xs ${getMerchantStatusColor(merchant.is_active)}`}>
                              {merchant.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="flex gap-2">
                              <Button variant="ghost" size="sm" onClick={() => handleViewMerchant(merchant)}>View</Button>
                              <Button variant="ghost" size="sm" onClick={() => handleEditMerchant(merchant)}>Edit</Button>
                              <Button variant="ghost" size="sm" onClick={() => handleToggleMerchantStatus(merchant)}>
                                {merchant.is_active ? 'Suspend' : 'Activate'}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-4 font-medium">Business</th>
                      <th className="text-left p-4 font-medium">Email</th>
                      <th className="text-left p-4 font-medium">Invited By</th>
                      <th className="text-left p-4 font-medium">Status</th>
                      <th className="text-left p-4 font-medium">Expires</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invitationsLoading ? (
                      <tr>
                        <td colSpan={5} className="text-center p-8 text-muted-foreground">
                          Loading invitations...
                        </td>
                      </tr>
                    ) : invitations.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center p-8 text-muted-foreground">
                          No invitations found
                        </td>
                      </tr>
                    ) : (
                      invitations.map((invitation) => (
                        <tr key={invitation.id} className="border-b hover:bg-muted/50">
                          <td className="p-4 font-medium">{invitation.business_name}</td>
                          <td className="p-4">{invitation.email}</td>
                          <td className="p-4 text-sm">{invitation.invited_by}</td>
                          <td className="p-4">
                            <Badge className={invitation.is_accepted ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                              {invitation.is_accepted ? 'Accepted' : 'Pending'}
                            </Badge>
                          </td>
                          <td className="p-4 text-sm">
                            {new Date(invitation.expires_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Showing {activeTab === 'merchants' ? merchants.length : invitations.length} {activeTab === 'merchants' ? 'merchants' : 'invitations'}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled>Previous</Button>
                <Button variant="outline" size="sm" disabled>Next</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Merchant Details</DialogTitle>
            <DialogDescription>
              View detailed information about this merchant.
            </DialogDescription>
          </DialogHeader>
          {selectedMerchant && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right font-medium">ID:</Label>
                <span className="col-span-3">{selectedMerchant.id}</span>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right font-medium">Business Name:</Label>
                <span className="col-span-3">{selectedMerchant.business_name || 'N/A'}</span>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right font-medium">Business Type:</Label>
                <span className="col-span-3">{selectedMerchant.business_type || 'N/A'}</span>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right font-medium">Contact Name:</Label>
                <span className="col-span-3">{selectedMerchant.first_name} {selectedMerchant.last_name}</span>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right font-medium">Email:</Label>
                <span className="col-span-3">{selectedMerchant.email}</span>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right font-medium">Phone:</Label>
                <span className="col-span-3">{selectedMerchant.phone || 'N/A'}</span>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right font-medium">Business Address:</Label>
                <span className="col-span-3">{selectedMerchant.business_address || 'N/A'}</span>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right font-medium">KYC Status:</Label>
                <Badge className={`col-span-3 ${getKYCStatusColor(selectedMerchant.kyc_status)}`}>
                  {selectedMerchant.kyc_status?.toUpperCase() || 'NOT_STARTED'}
                </Badge>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right font-medium">Status:</Label>
                <span className={`col-span-3 px-2 py-1 rounded-full text-xs inline-block w-fit ${getMerchantStatusColor(selectedMerchant.is_active)}`}>
                  {selectedMerchant.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right font-medium">Created:</Label>
                <span className="col-span-3">{new Date(selectedMerchant.created_at).toLocaleDateString()}</span>
              </div>
              {selectedMerchant.last_login && (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right font-medium">Last Login:</Label>
                  <span className="col-span-3">{new Date(selectedMerchant.last_login).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Create New Merchant</DialogTitle>
            <DialogDescription>
              Add a new merchant to the platform. They will receive an email with setup instructions.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-96 overflow-y-auto">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="business_name" className="text-right">Business Name *</Label>
              <Input
                id="business_name"
                value={createFormData.business_name}
                onChange={(e) => setCreateFormData(prev => ({ ...prev, business_name: e.target.value }))}
                className="col-span-3"
                placeholder="Business Name"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="business_type" className="text-right">Business Type</Label>
              <Input
                id="business_type"
                value={createFormData.business_type}
                onChange={(e) => setCreateFormData(prev => ({ ...prev, business_type: e.target.value }))}
                className="col-span-3"
                placeholder="Retail, Restaurant, etc."
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">Email *</Label>
              <Input
                id="email"
                type="email"
                value={createFormData.email}
                onChange={(e) => setCreateFormData(prev => ({ ...prev, email: e.target.value }))}
                className="col-span-3"
                placeholder="merchant@business.com"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="first_name" className="text-right">First Name *</Label>
              <Input
                id="first_name"
                value={createFormData.first_name}
                onChange={(e) => setCreateFormData(prev => ({ ...prev, first_name: e.target.value }))}
                className="col-span-3"
                placeholder="John"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="last_name" className="text-right">Last Name *</Label>
              <Input
                id="last_name"
                value={createFormData.last_name}
                onChange={(e) => setCreateFormData(prev => ({ ...prev, last_name: e.target.value }))}
                className="col-span-3"
                placeholder="Doe"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="phone" className="text-right">Phone</Label>
              <Input
                id="phone"
                value={createFormData.phone}
                onChange={(e) => setCreateFormData(prev => ({ ...prev, phone: e.target.value }))}
                className="col-span-3"
                placeholder="+233XXXXXXXXX"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="business_address" className="text-right">Business Address</Label>
              <Input
                id="business_address"
                value={createFormData.business_address}
                onChange={(e) => setCreateFormData(prev => ({ ...prev, business_address: e.target.value }))}
                className="col-span-3"
                placeholder="123 Business St, Accra, Ghana"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="password" className="text-right">Password</Label>
              <Input
                id="password"
                type="password"
                value={createFormData.password}
                onChange={(e) => setCreateFormData(prev => ({ ...prev, password: e.target.value }))}
                className="col-span-3"
                placeholder="Leave empty for auto-generated"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)} disabled={createMerchantMutation.isPending}>
              Cancel
            </Button>
            <Button onClick={handleCreateMerchant} disabled={createMerchantMutation.isPending} className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white">
              {createMerchantMutation.isPending ? 'Creating...' : 'Create Merchant'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invite Dialog */}
      <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Invite Merchant</DialogTitle>
            <DialogDescription>
              Send an invitation to a business to join SikaRemit as a merchant.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="invite_email" className="text-right">Email *</Label>
              <Input
                id="invite_email"
                type="email"
                value={inviteFormData.email}
                onChange={(e) => setInviteFormData(prev => ({ ...prev, email: e.target.value }))}
                className="col-span-3"
                placeholder="merchant@business.com"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="invite_business_name" className="text-right">Business Name *</Label>
              <Input
                id="invite_business_name"
                value={inviteFormData.business_name}
                onChange={(e) => setInviteFormData(prev => ({ ...prev, business_name: e.target.value }))}
                className="col-span-3"
                placeholder="Business Name"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="invite_business_type" className="text-right">Business Type</Label>
              <Input
                id="invite_business_type"
                value={inviteFormData.business_type}
                onChange={(e) => setInviteFormData(prev => ({ ...prev, business_type: e.target.value }))}
                className="col-span-3"
                placeholder="Retail, Restaurant, etc."
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="invite_message" className="text-right">Message</Label>
              <textarea
                id="invite_message"
                value={inviteFormData.message}
                onChange={(e) => setInviteFormData(prev => ({ ...prev, message: e.target.value }))}
                className="col-span-3 p-2 border rounded-md resize-none"
                rows={3}
                placeholder="Optional message to the merchant..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsInviteDialogOpen(false)} disabled={inviteMerchantMutation.isPending}>
              Cancel
            </Button>
            <Button onClick={handleInviteMerchant} disabled={inviteMerchantMutation.isPending} className="bg-gradient-to-r from-blue-600 to-indigo-500 text-white">
              {inviteMerchantMutation.isPending ? 'Sending...' : 'Send Invitation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Merchant</DialogTitle>
            <DialogDescription>
              Update merchant information. Changes will be saved immediately.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-96 overflow-y-auto">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit_business_name" className="text-right">Business Name *</Label>
              <Input
                id="edit_business_name"
                value={editFormData.business_name}
                onChange={(e) => setEditFormData(prev => ({ ...prev, business_name: e.target.value }))}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit_business_type" className="text-right">Business Type</Label>
              <Input
                id="edit_business_type"
                value={editFormData.business_type}
                onChange={(e) => setEditFormData(prev => ({ ...prev, business_type: e.target.value }))}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit_email" className="text-right">Email *</Label>
              <Input
                id="edit_email"
                type="email"
                value={editFormData.email}
                onChange={(e) => setEditFormData(prev => ({ ...prev, email: e.target.value }))}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit_first_name" className="text-right">First Name *</Label>
              <Input
                id="edit_first_name"
                value={editFormData.first_name}
                onChange={(e) => setEditFormData(prev => ({ ...prev, first_name: e.target.value }))}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit_last_name" className="text-right">Last Name *</Label>
              <Input
                id="edit_last_name"
                value={editFormData.last_name}
                onChange={(e) => setEditFormData(prev => ({ ...prev, last_name: e.target.value }))}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit_phone" className="text-right">Phone</Label>
              <Input
                id="edit_phone"
                value={editFormData.phone}
                onChange={(e) => setEditFormData(prev => ({ ...prev, phone: e.target.value }))}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit_business_address" className="text-right">Business Address</Label>
              <Input
                id="edit_business_address"
                value={editFormData.business_address}
                onChange={(e) => setEditFormData(prev => ({ ...prev, business_address: e.target.value }))}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter className="flex justify-between">
            <Button
              variant="destructive"
              onClick={() => {
                if (window.confirm(`Are you sure you want to permanently delete merchant "${selectedMerchant?.email}"? This action cannot be undone.`)) {
                  if (selectedMerchant) {
                    deleteMerchantMutation.mutate(selectedMerchant.id)
                  }
                }
              }}
              disabled={deleteMerchantMutation.isPending}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleteMerchantMutation.isPending ? 'Deleting...' : 'Delete Merchant'}
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={updateMerchantMutation.isPending}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (!editFormData.email || !editFormData.first_name || !editFormData.last_name || !editFormData.business_name) {
                    toast.error('Please fill in all required fields')
                    return
                  }
                  if (selectedMerchant) {
                    updateMerchantMutation.mutate({ merchantId: selectedMerchant.id, userData: editFormData })
                  }
                }}
                disabled={updateMerchantMutation.isPending}
                className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white"
              >
                {updateMerchantMutation.isPending ? 'Updating...' : 'Update Merchant'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
