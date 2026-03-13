'use client'

import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import api from '@/lib/api/axios'

export interface User {
  id: number
  email: string
  first_name: string
  last_name: string
  user_type: number
  role: string
  is_active: boolean
  created_at: string
  phone?: string
  last_login?: string
  business_name?: string
  business_type?: string
  kyc_status?: string
}

export interface UserFilters {
  search: string
  user_type: 'all' | 'merchant' | 'customer' | 'admin'
  status: 'all' | 'active' | 'inactive'
  kyc_status: 'all' | 'approved' | 'pending' | 'rejected' | 'not_started'
  date_range: 'all' | 'today' | 'week' | 'month' | 'year'
}

export interface UserFormData {
  email: string
  first_name: string
  last_name: string
  user_type: string
  phone?: string
  business_name?: string
  business_type?: string
  business_address?: string
  password?: string
}

const initialFilters: UserFilters = {
  search: '',
  user_type: 'all',
  status: 'all',
  kyc_status: 'all',
  date_range: 'all'
}

const initialFormData: UserFormData = {
  email: '',
  first_name: '',
  last_name: '',
  user_type: '',
  phone: '',
  business_name: '',
  business_type: '',
  business_address: '',
  password: ''
}

export function useUserManagement(excludeAdmins: boolean = false) {
  const [filters, setFilters] = useState<UserFilters>(initialFilters)
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showViewDialog, setShowViewDialog] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [formData, setFormData] = useState<UserFormData>(initialFormData)

  const queryClient = useQueryClient()

  // Fetch users with filters
  const fetchUsers = useCallback(async (searchTerm: string = ''): Promise<User[]> => {
    const params: any = { search: searchTerm }
    
    if (excludeAdmins) {
      params.exclude_admins = 'true'
    }
    
    if (filters.user_type !== 'all') {
      params.user_type = filters.user_type === 'merchant' ? '5' : filters.user_type === 'customer' ? '6' : '1'
    }
    
    if (filters.status !== 'all') {
      params.is_active = filters.status === 'active'
    }
    
    if (filters.kyc_status !== 'all') {
      params.kyc_status = filters.kyc_status
    }

    const response = await api.get('/api/v1/accounts/admin/users/', { params })

    const data = response.data
    let users: User[] = []
    if (data.results && Array.isArray(data.results)) {
      users = data.results
    } else if (Array.isArray(data)) {
      users = data
    }
    return users
  }, [filters, excludeAdmins])

  const { data: allUsers = [], isLoading, refetch } = useQuery({
    queryKey: ['admin-users', debouncedSearch, filters],
    queryFn: () => fetchUsers(debouncedSearch),
    retry: false,
    staleTime: 30000 // 30 seconds
  })

  // Filter users based on client-side filters
  const filteredUsers = allUsers.filter(user => {
    // Status filter (if not handled by API)
    if (filters.status !== 'all') {
      const isActive = user.is_active
      if ((filters.status === 'active' && !isActive) || 
          (filters.status === 'inactive' && isActive)) {
        return false
      }
    }

    // KYC status filter (if not handled by API)
    if (filters.kyc_status !== 'all' && user.kyc_status) {
      if (user.kyc_status !== filters.kyc_status) {
        return false
      }
    }

    // Date range filter
    if (filters.date_range !== 'all') {
      const userDate = new Date(user.created_at)
      const now = new Date()
      let startDate: Date

      switch (filters.date_range) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
          break
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          break
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1)
          break
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1)
          break
        default:
          return true
      }

      if (userDate < startDate) {
        return false
      }
    }

    return true
  })

  // Mutations
  const createUserMutation = useMutation({
    mutationFn: async (userData: UserFormData) => {
      const payload = {
        ...userData,
        user_type: parseInt(userData.user_type, 10)
      }
      const response = await api.post('/api/v1/accounts/admin/users/', payload)
      return response.data
    },
    onSuccess: () => {
      toast.success('User created successfully')
      setShowCreateDialog(false)
      setFormData(initialFormData)
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to create user')
    }
  })

  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, userData }: { userId: number, userData: UserFormData }) => {
      const payload = {
        ...userData,
        user_type: parseInt(userData.user_type, 10)
      }
      const response = await api.patch(`/api/v1/accounts/admin/users/${userId}/`, payload)
      return response.data
    },
    onSuccess: () => {
      toast.success('User updated successfully')
      setShowEditDialog(false)
      setSelectedUser(null)
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update user')
    }
  })

  const toggleUserStatusMutation = useMutation({
    mutationFn: async (user: User) => {
      const response = await api.patch(`/api/v1/accounts/admin/users/${user.id}/`, {
        is_active: !user.is_active
      })
      return response.data
    },
    onSuccess: () => {
      toast.success('User status updated successfully')
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update user status')
    }
  })

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      const response = await api.delete(`/api/v1/accounts/admin/users/${userId}/`)
      return response.data
    },
    onSuccess: () => {
      toast.success('User deleted successfully')
      setShowEditDialog(false)
      setSelectedUser(null)
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to delete user')
    }
  })

  // Actions
  const handleSearch = useCallback((value: string) => {
    setFilters(prev => ({ ...prev, search: value }))
    setTimeout(() => setDebouncedSearch(value), 300)
  }, [])

  const handleFilterChange = useCallback((key: keyof UserFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }, [])

  const handleCreateUser = useCallback(() => {
    if (!formData.email || !formData.first_name || !formData.last_name || !formData.user_type) {
      toast.error('Please fill in all required fields')
      return
    }
    createUserMutation.mutate(formData)
  }, [formData, createUserMutation])

  const handleUpdateUser = useCallback(() => {
    if (!selectedUser || !formData.email || !formData.first_name || !formData.last_name || !formData.user_type) {
      toast.error('Please fill in all required fields')
      return
    }
    updateUserMutation.mutate({ userId: selectedUser.id, userData: formData })
  }, [selectedUser, formData, updateUserMutation])

  const handleViewUser = useCallback((user: User) => {
    setSelectedUser(user)
    setShowViewDialog(true)
  }, [])

  const handleEditUser = useCallback((user: User) => {
    setSelectedUser(user)
    setFormData({
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      user_type: user.user_type?.toString() || '6',
      phone: user.phone || '',
      business_name: user.business_name || '',
      business_type: user.business_type || '',
      business_address: '',
      password: ''
    })
    setShowEditDialog(true)
  }, [])

  const handleToggleUserStatus = useCallback((user: User) => {
    if (window.confirm(`Are you sure you want to ${user.is_active ? 'suspend' : 'activate'} this user?`)) {
      toggleUserStatusMutation.mutate(user)
    }
  }, [toggleUserStatusMutation])

  const handleDeleteUser = useCallback((user: User) => {
    if (window.confirm(`Are you sure you want to permanently delete user "${user.email}"? This action cannot be undone.`)) {
      deleteUserMutation.mutate(user.id)
    }
  }, [deleteUserMutation])

  const resetFilters = useCallback(() => {
    setFilters(initialFilters)
    setDebouncedSearch('')
  }, [])

  const getRoleInfo = useCallback((role: string) => {
    const roles: Record<string, { label: string, color: string, bgColor: string, icon: string }> = {
      'super_admin': { label: 'Super Admin', color: 'text-purple-700', bgColor: 'bg-purple-100', icon: '👑' },
      'business_admin': { label: 'Business Admin', color: 'text-blue-700', bgColor: 'bg-blue-100', icon: '👔' },
      'operations_admin': { label: 'Operations Admin', color: 'text-green-700', bgColor: 'bg-green-100', icon: '⚙️' },
      'verification_admin': { label: 'Verification Admin', color: 'text-orange-700', bgColor: 'bg-orange-100', icon: '🔍' },
      'merchant': { label: 'Merchant', color: 'text-blue-700', bgColor: 'bg-blue-100', icon: '🏪' },
      'customer': { label: 'Customer', color: 'text-green-700', bgColor: 'bg-green-100', icon: '👤' }
    }
    return roles[role] || { label: 'Unknown', color: 'text-gray-700', bgColor: 'bg-gray-100', icon: '❓' }
  }, [])

  return {
    // Data
    users: filteredUsers,
    allUsers,
    isLoading,
    filters,
    formData,
    selectedUser,
    
    // Dialog states
    showCreateDialog,
    showEditDialog,
    showViewDialog,
    
    // Actions
    setFilters,
    setFormData,
    setShowCreateDialog,
    setShowEditDialog,
    setShowViewDialog,
    setSelectedUser,
    
    handleSearch,
    handleFilterChange,
    handleCreateUser,
    handleUpdateUser,
    handleViewUser,
    handleEditUser,
    handleToggleUserStatus,
    handleDeleteUser,
    resetFilters,
    refetch,
    
    // Utilities
    getRoleInfo,
    
    // Mutation states
    isCreating: createUserMutation.isPending,
    isUpdating: updateUserMutation.isPending,
    isToggling: toggleUserStatusMutation.isPending,
    isDeleting: deleteUserMutation.isPending
  }
}
