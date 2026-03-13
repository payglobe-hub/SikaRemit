'use client'

import { useEffect } from 'react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { UserCheck, Plus } from 'lucide-react'
import { useUserManagement } from '@/hooks/useUserManagement'
import { UserTable } from '@/components/admin/UserTable'
import { UserFilters } from '@/components/admin/UserFilters'
import { UserDialogs } from '@/components/admin/UserDialogs'

export default function AdminCustomersPage() {
  // Use the shared hook with customer-specific filtering
  const userManagement = useUserManagement(true)
  
  const {
    users,
    allUsers,
    isLoading,
    filters,
    formData,
    selectedUser,
    showCreateDialog,
    showEditDialog,
    showViewDialog,
    setShowCreateDialog,
    setShowEditDialog,
    setShowViewDialog,
    setFormData,
    handleSearch,
    handleFilterChange,
    handleCreateUser,
    handleUpdateUser,
    handleViewUser,
    handleEditUser,
    handleToggleUserStatus,
    handleDeleteUser,
    resetFilters,
    getRoleInfo,
    isCreating,
    isUpdating,
    isToggling,
    isDeleting
  } = userManagement

  // Set initial filter to customers only
  useEffect(() => {
    handleFilterChange('user_type', 'customer')
  }, [])

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 via-green-500 to-emerald-500 bg-clip-text text-transparent flex items-center gap-3">
            <UserCheck className="h-8 w-8 text-green-600" />
            Customer Management
          </h1>
          <p className="text-slate-600 mt-1 text-base">
            Manage customers on the platform
          </p>
        </div>
        <Button 
          className="bg-gradient-to-r from-green-600 to-emerald-500 text-white hover:shadow-xl hover:shadow-green-500/25 transition-all duration-300 hover:scale-105 px-6 py-3" 
          onClick={() => setShowCreateDialog(true)}
        >
          <Plus className="h-5 w-5 mr-2" />
          Create Customer
        </Button>
      </div>

      {/* Filters */}
      <Card className="bg-white/40 backdrop-blur-xl border-white/30 shadow-xl shadow-green-500/5">
        <CardHeader>
          <UserFilters
            filters={filters}
            onFilterChange={handleFilterChange}
            onSearch={handleSearch}
            onReset={resetFilters}
            userCount={allUsers.length}
            filteredCount={users.length}
          />
        </CardHeader>
      </Card>

      {/* Customers Table */}
      <Card className="bg-white/40 backdrop-blur-xl border-white/30 shadow-xl shadow-green-500/5 hover:shadow-2xl hover:shadow-green-500/10 transition-all duration-500">
        <CardContent className="p-0">
          <UserTable
            users={users}
            isLoading={isLoading}
            onViewUser={handleViewUser}
            onEditUser={handleEditUser}
            onToggleStatus={handleToggleUserStatus}
            onDeleteUser={handleDeleteUser}
            getRoleInfo={getRoleInfo}
            isToggling={isToggling}
            isDeleting={isDeleting}
          />
        </CardContent>
      </Card>

      {/* Dialogs */}
      <UserDialogs
        showCreateDialog={showCreateDialog}
        showEditDialog={showEditDialog}
        showViewDialog={showViewDialog}
        selectedUser={selectedUser}
        formData={formData}
        setFormData={setFormData}
        setShowCreateDialog={setShowCreateDialog}
        setShowEditDialog={setShowEditDialog}
        setShowViewDialog={setShowViewDialog}
        onCreateUser={handleCreateUser}
        onUpdateUser={handleUpdateUser}
        onDeleteUser={handleDeleteUser}
        getRoleInfo={getRoleInfo}
        isCreating={isCreating}
        isUpdating={isUpdating}
        isDeleting={isDeleting}
        showAdminOptions={false}
      />
    </div>
  )
}
