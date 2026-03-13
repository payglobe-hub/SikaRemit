'use client'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Search, Filter, X, RotateCcw } from 'lucide-react'
import { type UserFilters } from '@/hooks/useUserManagement'

interface UserFiltersProps {
  filters: UserFilters
  onFilterChange: (key: keyof UserFilters, value: any) => void
  onSearch: (value: string) => void
  onReset: () => void
  userCount: number
  filteredCount: number
}

export function UserFilters({ 
  filters, 
  onFilterChange, 
  onSearch, 
  onReset, 
  userCount, 
  filteredCount 
}: UserFiltersProps) {
  const activeFiltersCount = Object.entries(filters).filter(([key, value]) => {
    if (key === 'search') return value !== ''
    return value !== 'all'
  }).length

  const getFilterBadgeColor = (filterType: string, value: string) => {
    switch (filterType) {
      case 'user_type':
        return value === 'merchant' ? 'bg-blue-100 text-blue-800' : 
               value === 'customer' ? 'bg-green-100 text-green-800' : 
               value === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
      case 'status':
        return value === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
      case 'kyc_status':
        return value === 'approved' ? 'bg-green-100 text-green-800' : 
               value === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
               value === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getFilterLabel = (filterType: string, value: string) => {
    switch (filterType) {
      case 'user_type':
        return value.charAt(0).toUpperCase() + value.slice(1)
      case 'status':
        return value.charAt(0).toUpperCase() + value.slice(1)
      case 'kyc_status':
        return value.replace('_', ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
      case 'date_range':
        return value.charAt(0).toUpperCase() + value.slice(1)
      default:
        return value
    }
  }

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
          <Input
            placeholder="Search users by email, name, or business..."
            value={filters.search}
            onChange={(e) => onSearch(e.target.value)}
            className="pl-10 bg-white/50 backdrop-blur-sm border-white/30 focus:border-blue-300"
          />
        </div>
        
        <div className="flex items-center gap-2">
          {activeFiltersCount > 0 && (
            <>
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                {activeFiltersCount} filter{activeFiltersCount > 1 ? 's' : ''} active
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={onReset}
                className="flex items-center gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Reset
              </Button>
            </>
          )}
          
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            Filters
          </Button>
        </div>
      </div>

      {/* Active Filters Display */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-sm text-slate-600">Active filters:</span>
          {Object.entries(filters).map(([key, value]) => {
            if (key === 'search' || value === 'all') return null
            
            return (
              <Badge
                key={key}
                className={`${getFilterBadgeColor(key, value)} flex items-center gap-1`}
              >
                {getFilterLabel(key, value)}
                <X
                  className="h-3 w-3 cursor-pointer hover:text-slate-800"
                  onClick={() => onFilterChange(key as keyof UserFilters, 'all')}
                />
              </Badge>
            )
          })}
        </div>
      )}

      {/* Advanced Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 p-4 bg-slate-50 rounded-lg">
        {/* User Type Filter */}
        <div>
          <label className="text-sm font-medium text-slate-700 mb-2 block">User Type</label>
          <Select value={filters.user_type} onValueChange={(value) => onFilterChange('user_type', value)}>
            <SelectTrigger className="bg-white/50 backdrop-blur-sm border-white/30">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="customer">Customers</SelectItem>
              <SelectItem value="merchant">Merchants</SelectItem>
              <SelectItem value="admin">Admins</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Status Filter */}
        <div>
          <label className="text-sm font-medium text-slate-700 mb-2 block">Status</label>
          <Select value={filters.status} onValueChange={(value) => onFilterChange('status', value)}>
            <SelectTrigger className="bg-white/50 backdrop-blur-sm border-white/30">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* KYC Status Filter */}
        <div>
          <label className="text-sm font-medium text-slate-700 mb-2 block">KYC Status</label>
          <Select value={filters.kyc_status} onValueChange={(value) => onFilterChange('kyc_status', value)}>
            <SelectTrigger className="bg-white/50 backdrop-blur-sm border-white/30">
              <SelectValue placeholder="All KYC" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All KYC Status</SelectItem>
              <SelectItem value="not_started">Not Started</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Date Range Filter */}
        <div>
          <label className="text-sm font-medium text-slate-700 mb-2 block">Date Range</label>
          <Select value={filters.date_range} onValueChange={(value) => onFilterChange('date_range', value)}>
            <SelectTrigger className="bg-white/50 backdrop-blur-sm border-white/30">
              <SelectValue placeholder="All Time" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Results Count */}
        <div className="flex items-end">
          <div className="text-sm text-slate-600">
            Showing <span className="font-medium text-slate-900">{filteredCount}</span> of{' '}
            <span className="font-medium text-slate-900">{userCount}</span> users
          </div>
        </div>
      </div>
    </div>
  )
}
