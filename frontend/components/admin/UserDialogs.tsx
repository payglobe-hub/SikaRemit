'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { User, UserFormData, type UserFilters } from '@/hooks/useUserManagement'

interface UserDialogsProps {
  showCreateDialog: boolean
  showEditDialog: boolean
  showViewDialog: boolean
  selectedUser: User | null
  formData: UserFormData
  setFormData: (data: UserFormData) => void
  setShowCreateDialog: (show: boolean) => void
  setShowEditDialog: (show: boolean) => void
  setShowViewDialog: (show: boolean) => void
  onCreateUser: () => void
  onUpdateUser: () => void
  onDeleteUser: (user: User) => void
  getRoleInfo: (role: string) => any
  isCreating: boolean
  isUpdating: boolean
  isDeleting: boolean
  showAdminOptions?: boolean
}

export function UserDialogs({
  showCreateDialog,
  showEditDialog,
  showViewDialog,
  selectedUser,
  formData,
  setFormData,
  setShowCreateDialog,
  setShowEditDialog,
  setShowViewDialog,
  onCreateUser,
  onUpdateUser,
  onDeleteUser,
  getRoleInfo,
  isCreating,
  isUpdating,
  isDeleting,
  showAdminOptions = false
}: UserDialogsProps) {
  const handleFormChange = (field: keyof UserFormData, value: string) => {
    setFormData({ ...formData, [field]: value })
  }

  const getKYCStatusColor = (status?: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'rejected':
        return 'bg-red-100 text-red-800'
      case 'not_started':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusColor = (isActive: boolean) => {
    return isActive 
      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
      : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
  }

  return (
    <>
      {/* Create User Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
            <DialogDescription>
              Add a new user to the platform. They will receive an email with setup instructions.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleFormChange('email', e.target.value)}
                className="col-span-3"
                placeholder="user@example.com"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="first_name" className="text-right">First Name *</Label>
              <Input
                id="first_name"
                value={formData.first_name}
                onChange={(e) => handleFormChange('first_name', e.target.value)}
                className="col-span-3"
                placeholder="John"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="last_name" className="text-right">Last Name *</Label>
              <Input
                id="last_name"
                value={formData.last_name}
                onChange={(e) => handleFormChange('last_name', e.target.value)}
                className="col-span-3"
                placeholder="Doe"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="user_type" className="text-right">User Type *</Label>
              <Select value={formData.user_type} onValueChange={(value) => handleFormChange('user_type', value)}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select user type" />
                </SelectTrigger>
                <SelectContent>
                  {showAdminOptions && <SelectItem value="1">Super Admin</SelectItem>}
                  {showAdminOptions && <SelectItem value="2">Business Admin</SelectItem>}
                  {showAdminOptions && <SelectItem value="3">Operations Admin</SelectItem>}
                  {showAdminOptions && <SelectItem value="4">Verification Admin</SelectItem>}
                  <SelectItem value="5">Merchant</SelectItem>
                  <SelectItem value="6">Customer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="phone" className="text-right">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleFormChange('phone', e.target.value)}
                className="col-span-3"
                placeholder="+233XXXXXXXXX"
              />
            </div>
            {(formData.user_type === '5' || formData.user_type === '5') && (
              <>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="business_name" className="text-right">Business Name *</Label>
                  <Input
                    id="business_name"
                    value={formData.business_name}
                    onChange={(e) => handleFormChange('business_name', e.target.value)}
                    className="col-span-3"
                    placeholder="Business Name"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="business_type" className="text-right">Business Type</Label>
                  <Input
                    id="business_type"
                    value={formData.business_type}
                    onChange={(e) => handleFormChange('business_type', e.target.value)}
                    className="col-span-3"
                    placeholder="Retail, Restaurant, etc."
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="business_address" className="text-right">Business Address</Label>
                  <Input
                    id="business_address"
                    value={formData.business_address}
                    onChange={(e) => handleFormChange('business_address', e.target.value)}
                    className="col-span-3"
                    placeholder="123 Business St, Accra, Ghana"
                  />
                </div>
              </>
            )}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="password" className="text-right">Password</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => handleFormChange('password', e.target.value)}
                className="col-span-3"
                placeholder="Leave empty for auto-generated"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateDialog(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              onClick={onCreateUser}
              disabled={isCreating}
              className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white"
            >
              {isCreating ? 'Creating...' : 'Create User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View User Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
            <DialogDescription>
              View detailed information about this user.
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right font-medium">ID:</Label>
                <span className="col-span-3">{selectedUser.id}</span>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right font-medium">Email:</Label>
                <span className="col-span-3">{selectedUser.email}</span>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right font-medium">Name:</Label>
                <span className="col-span-3">{selectedUser.first_name} {selectedUser.last_name}</span>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right font-medium">Phone:</Label>
                <span className="col-span-3">{selectedUser.phone || 'N/A'}</span>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right font-medium">Role:</Label>
                <span className="col-span-3">
                  <Badge className={`${getRoleInfo(selectedUser.role).bgColor} ${getRoleInfo(selectedUser.role).color} border-none`}>
                    <span className="mr-1">{getRoleInfo(selectedUser.role).icon}</span>
                    {getRoleInfo(selectedUser.role).label}
                  </Badge>
                </span>
              </div>
              {selectedUser.business_name && (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right font-medium">Business Name:</Label>
                  <span className="col-span-3">{selectedUser.business_name}</span>
                </div>
              )}
              {selectedUser.business_type && (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right font-medium">Business Type:</Label>
                  <span className="col-span-3">{selectedUser.business_type}</span>
                </div>
              )}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right font-medium">Status:</Label>
                <span className="col-span-3">
                  <Badge className={getStatusColor(selectedUser.is_active)}>
                    {selectedUser.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </span>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right font-medium">KYC Status:</Label>
                <span className="col-span-3">
                  <Badge className={`text-xs ${getKYCStatusColor(selectedUser.kyc_status)}`}>
                    {selectedUser.kyc_status?.replace('_', ' ').toUpperCase() || 'NOT_STARTED'}
                  </Badge>
                </span>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right font-medium">Created:</Label>
                <span className="col-span-3">{new Date(selectedUser.created_at).toLocaleDateString()}</span>
              </div>
              {selectedUser.last_login && (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right font-medium">Last Login:</Label>
                  <span className="col-span-3">{new Date(selectedUser.last_login).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowViewDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information. Changes will be saved immediately.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit_email" className="text-right">Email *</Label>
              <Input
                id="edit_email"
                type="email"
                value={formData.email}
                onChange={(e) => handleFormChange('email', e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit_first_name" className="text-right">First Name *</Label>
              <Input
                id="edit_first_name"
                value={formData.first_name}
                onChange={(e) => handleFormChange('first_name', e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit_last_name" className="text-right">Last Name *</Label>
              <Input
                id="edit_last_name"
                value={formData.last_name}
                onChange={(e) => handleFormChange('last_name', e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit_user_type" className="text-right">User Type *</Label>
              <Select value={formData.user_type} onValueChange={(value) => handleFormChange('user_type', value)}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select user type" />
                </SelectTrigger>
                <SelectContent>
                  {showAdminOptions && <SelectItem value="1">Super Admin</SelectItem>}
                  {showAdminOptions && <SelectItem value="2">Business Admin</SelectItem>}
                  {showAdminOptions && <SelectItem value="3">Operations Admin</SelectItem>}
                  {showAdminOptions && <SelectItem value="4">Verification Admin</SelectItem>}
                  <SelectItem value="5">Merchant</SelectItem>
                  <SelectItem value="6">Customer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit_phone" className="text-right">Phone</Label>
              <Input
                id="edit_phone"
                value={formData.phone}
                onChange={(e) => handleFormChange('phone', e.target.value)}
                className="col-span-3"
              />
            </div>
            {(formData.user_type === '5' || formData.user_type === '5') && (
              <>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit_business_name" className="text-right">Business Name</Label>
                  <Input
                    id="edit_business_name"
                    value={formData.business_name}
                    onChange={(e) => handleFormChange('business_name', e.target.value)}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit_business_type" className="text-right">Business Type</Label>
                  <Input
                    id="edit_business_type"
                    value={formData.business_type}
                    onChange={(e) => handleFormChange('business_type', e.target.value)}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit_business_address" className="text-right">Business Address</Label>
                  <Input
                    id="edit_business_address"
                    value={formData.business_address}
                    onChange={(e) => handleFormChange('business_address', e.target.value)}
                    className="col-span-3"
                  />
                </div>
              </>
            )}
          </div>
          <DialogFooter className="flex justify-between">
            <Button
              variant="destructive"
              onClick={() => selectedUser && onDeleteUser(selectedUser)}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeleting ? 'Deleting...' : 'Delete User'}
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowEditDialog(false)}
                disabled={isUpdating}
              >
                Cancel
              </Button>
              <Button
                onClick={onUpdateUser}
                disabled={isUpdating}
                className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white"
              >
                {isUpdating ? 'Updating...' : 'Update User'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
