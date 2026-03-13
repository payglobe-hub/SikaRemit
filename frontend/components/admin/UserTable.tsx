'use client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Search, Filter, MoreHorizontal } from 'lucide-react'
import { User } from '@/hooks/useUserManagement'

interface UserTableProps {
  users: User[]
  isLoading: boolean
  onViewUser: (user: User) => void
  onEditUser: (user: User) => void
  onToggleStatus: (user: User) => void
  onDeleteUser: (user: User) => void
  getRoleInfo: (role: string) => any
  isToggling?: boolean
  isDeleting?: boolean
}

export function UserTable({ 
  users, 
  isLoading, 
  onViewUser, 
  onEditUser, 
  onToggleStatus, 
  onDeleteUser, 
  getRoleInfo,
  isToggling = false,
  isDeleting = false 
}: UserTableProps) {
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
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="border-b">
            <TableHead className="text-left p-4 font-medium">User</TableHead>
            <TableHead className="text-left p-4 font-medium">Role</TableHead>
            <TableHead className="text-left p-4 font-medium">Status</TableHead>
            <TableHead className="text-left p-4 font-medium">KYC Status</TableHead>
            <TableHead className="text-left p-4 font-medium">Created</TableHead>
            <TableHead className="text-left p-4 font-medium">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center p-8 text-muted-foreground">
                Loading users...
              </TableCell>
            </TableRow>
          ) : users.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center p-8 text-muted-foreground">
                No users found
              </TableCell>
            </TableRow>
          ) : (
            users.map((user) => {
              const roleInfo = getRoleInfo(user.role)
              return (
                <TableRow key={user.id} className="border-b hover:bg-muted/50">
                  <TableCell className="p-4">
                    <div>
                      <div className="font-medium">{user.first_name} {user.last_name}</div>
                      <div className="text-sm text-slate-500">{user.email}</div>
                      {user.phone && (
                        <div className="text-sm text-slate-500">{user.phone}</div>
                      )}
                      {user.business_name && (
                        <div className="text-sm text-slate-500">{user.business_name}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="p-4">
                    <Badge 
                      variant="secondary" 
                      className={`${roleInfo.bgColor} ${roleInfo.color} border-none`}
                    >
                      <span className="mr-1">{roleInfo.icon}</span>
                      {roleInfo.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="p-4">
                    <Badge className={getStatusColor(user.is_active)}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="p-4">
                    <Badge className={`text-xs ${getKYCStatusColor(user.kyc_status)}`}>
                      {user.kyc_status?.replace('_', ' ').toUpperCase() || 'NOT_STARTED'}
                    </Badge>
                  </TableCell>
                  <TableCell className="p-4 text-sm">
                    {new Date(user.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="p-4">
                    <div className="flex gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => onViewUser(user)}
                        className="hover:bg-white/50 text-slate-600 hover:text-blue-600 transition-all duration-300"
                      >
                        View
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => onEditUser(user)}
                        className="hover:bg-white/50 text-slate-600 hover:text-blue-600 transition-all duration-300"
                      >
                        Edit
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => onToggleStatus(user)}
                        disabled={isToggling}
                        className="hover:bg-white/50 text-slate-600 hover:text-orange-600 transition-all duration-300"
                      >
                        {user.is_active ? 'Suspend' : 'Activate'}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })
          )}
        </TableBody>
      </Table>
    </div>
  )
}
