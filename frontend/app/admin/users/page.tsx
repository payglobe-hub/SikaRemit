'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Users, Plus } from 'lucide-react'
import { useUserManagement } from '@/hooks/useUserManagement'
import { UserTable } from '@/components/admin/UserTable'
import { UserFilters } from '@/components/admin/UserFilters'
import { UserDialogs } from '@/components/admin/UserDialogs'

export default function AdminUsersPage() {
  // Use the shared hook with excludeAdmins=true to exclude admin users
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

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 bg-clip-text text-transparent flex items-center gap-3">
            <Users className="h-8 w-8 text-blue-600" />
            User Management
          </h1>
          <p className="text-slate-600 mt-1 text-base">
            Manage customers and merchants on the platform
          </p>
        </div>
        <Button 
          className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white hover:shadow-xl hover:shadow-blue-500/25 transition-all duration-300 hover:scale-105 px-6 py-3" 
          onClick={() => setShowCreateDialog(true)}
        >
          <Plus className="h-5 w-5 mr-2" />
          Create User
        </Button>
      </div>

      {/* Filters */}
      <Card className="bg-white/40 backdrop-blur-xl border-white/30 shadow-xl shadow-blue-500/5">
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

      {/* Users Table */}
      <Card className="bg-white/40 backdrop-blur-xl border-white/30 shadow-xl shadow-blue-500/5 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-500">
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
