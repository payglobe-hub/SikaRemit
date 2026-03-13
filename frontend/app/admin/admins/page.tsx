'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'
import { 
  Shield, Users, Settings, Activity, Clock, AlertTriangle, 
  UserPlus, UserX, Search, Filter, Download, Eye, EyeOff,
  Lock, Unlock, ChevronDown, ChevronUp, RefreshCw, Crown,
  Key, History, Monitor, Ban, CheckCircle
} from 'lucide-react'

import { 
  AdminProfile, 
  AdminActivityLog, 
  AdminSession, 
  AdminRole,
  getAdminProfiles, 
  getAdminActivityLogs, 
  getAdminSessions,
  getAdminRoles,
  createAdminProfile,
  suspendAdmin,
  activateAdmin,
  terminateAdminSession,
  getPermissionOverview,
  ADMIN_LEVEL_LABELS,
  ADMIN_LEVEL_COLORS,
  RISK_LEVELS,
  formatDuration
} from '@/lib/api/admin-hierarchy'
import { PermissionGuard } from '@/components/ui/permission-guard'

export default function AdminManagementPage() {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState('admins')
  const [loading, setLoading] = useState(true)
  const [adminProfiles, setAdminProfiles] = useState<AdminProfile[]>([])
  const [activityLogs, setActivityLogs] = useState<AdminActivityLog[]>([])
  const [activeSessions, setActiveSessions] = useState<AdminSession[]>([])
  const [adminRoles, setAdminRoles] = useState<AdminRole[]>([])
  const [permissionOverview, setPermissionOverview] = useState<any>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRole, setFilterRole] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showPermissionsDialog, setShowPermissionsDialog] = useState(false)
  const [selectedAdmin, setSelectedAdmin] = useState<AdminProfile | null>(null)
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set())

  // Create admin form state
  const [createFormData, setCreateFormData] = useState({
    email: '',
    first_name: '',
    last_name: '',
    password: '',
    role: 0,
    employee_id: '',
    department: '',
    session_timeout_minutes: 480,
    require_mfa: false,
    managed_by: 0
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [profiles, logs, sessions, roles, permissions] = await Promise.all([
        getAdminProfiles(),
        getAdminActivityLogs({}),
        getAdminSessions({ is_active: true }),
        getAdminRoles(),
        getPermissionOverview()
      ])
      
      setAdminProfiles(Array.isArray(profiles) ? profiles : [])
      setActivityLogs(Array.isArray(logs) ? logs : [])
      setActiveSessions(Array.isArray(sessions) ? sessions : [])
      setAdminRoles(Array.isArray(roles) ? roles : [])
      setPermissionOverview(permissions)
    } catch (error) {
      console.error('Error loading admin data:', error)
      toast({
        title: 'Error',
        description: 'Failed to load admin data',
        variant: 'destructive'
      })
      // Set empty arrays on error to prevent further issues
      setAdminProfiles([])
      setActivityLogs([])
      setActiveSessions([])
      setAdminRoles([])
    } finally {
      setLoading(false)
    }
  }

  const handleCreateAdmin = async () => {
    if (!createFormData.email || !createFormData.first_name || !createFormData.last_name || !createFormData.role) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive'
      })
      return
    }

    try {
      await createAdminProfile(createFormData)
      toast({
        title: 'Success',
        description: 'Admin created successfully'
      })
      setShowCreateDialog(false)
      setCreateFormData({
        email: '',
        first_name: '',
        last_name: '',
        password: '',
        role: 0,
        employee_id: '',
        department: '',
        session_timeout_minutes: 480,
        require_mfa: false,
        managed_by: 0
      })
      loadData()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to create admin',
        variant: 'destructive'
      })
    }
  }

  const handleSuspendAdmin = async (adminId: number, reason: string) => {
    try {
      await suspendAdmin(adminId, reason)
      toast({
        title: 'Success',
        description: 'Admin suspended successfully'
      })
      loadData()
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to suspend admin',
        variant: 'destructive'
      })
    }
  }

  const handleActivateAdmin = async (adminId: number) => {
    try {
      await activateAdmin(adminId)
      toast({
        title: 'Success',
        description: 'Admin activated successfully'
      })
      loadData()
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to activate admin',
        variant: 'destructive'
      })
    }
  }

  const handleTerminateSession = async (sessionId: number) => {
    try {
      await terminateAdminSession(sessionId)
      toast({
        title: 'Success',
        description: 'Session terminated successfully'
      })
      loadData()
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to terminate session',
        variant: 'destructive'
      })
    }
  }

  const toggleRowExpansion = (adminId: number) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(adminId)) {
      newExpanded.delete(adminId)
    } else {
      newExpanded.add(adminId)
    }
    setExpandedRows(newExpanded)
  }

  const filteredAdmins = (adminProfiles || []).filter(admin => {
    const matchesSearch = admin.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         admin.user_name?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRole = filterRole === 'all' || admin.role.toString() === filterRole
    const matchesStatus = !filterStatus || 
                         (filterStatus === 'active' && admin.is_active) ||
                         (filterStatus === 'inactive' && !admin.is_active)
    return matchesSearch && matchesRole && matchesStatus
  })

  const getRoleBadgeColor = (level: number) => {
    const colors = {
      1: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      2: 'bg-blue-100 text-blue-800 border-blue-200', 
      3: 'bg-green-100 text-green-800 border-green-200',
      4: 'bg-orange-100 text-orange-800 border-orange-200'
    }
    return colors[level as keyof typeof colors] || 'bg-gray-100 text-gray-800 border-gray-200'
  }

  const getStatusBadgeColor = (isActive: boolean, suspendedAt: string | null | undefined) => {
    if (suspendedAt) {
      return 'bg-red-100 text-red-800 border-red-200'
    }
    return isActive ? 'bg-green-100 text-green-800 border-green-200' : 'bg-gray-100 text-gray-800 border-gray-200'
  }

  const getStatusText = (isActive: boolean, suspendedAt: string | null | undefined) => {
    if (suspendedAt) return 'Suspended'
    return isActive ? 'Active' : 'Inactive'
  }

  return (
    <PermissionGuard
      role={['super_admin']}
      fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-2">
            <h2 className="text-xl font-semibold">Access Denied</h2>
            <p className="text-muted-foreground">You do not have permission to manage admin users.</p>
          </div>
        </div>
      }
    >
    <div className="w-full space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-500 bg-clip-text text-transparent flex items-center gap-3">
            <Crown className="h-8 w-8 text-blue-600" />
            Admin Management
          </h1>
          <p className="text-slate-600 mt-1 text-base">Manage admin users, roles, permissions, and monitor activity</p>
        </div>
        <div className="flex gap-3">
          <Button onClick={loadData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setShowCreateDialog(true)} className="bg-gradient-to-r from-blue-600 to-indigo-500 text-white hover:shadow-xl hover:shadow-blue-500/25 transition-all duration-300 hover:scale-105">
            <UserPlus className="h-5 w-5 mr-2" />
            Create Admin
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {permissionOverview && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-white/40 backdrop-blur-xl border-white/30 shadow-xl shadow-blue-500/5">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Total Admins</p>
                  <p className="text-2xl font-bold text-slate-900">{permissionOverview.total_admins || 0}</p>
                </div>
                <Users className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white/40 backdrop-blur-xl border-white/30 shadow-xl shadow-blue-500/5">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Active Sessions</p>
                  <p className="text-2xl font-bold text-slate-900">{activeSessions.length}</p>
                </div>
                <Monitor className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white/40 backdrop-blur-xl border-white/30 shadow-xl shadow-blue-500/5">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Recent Activity</p>
                  <p className="text-2xl font-bold text-slate-900">{activityLogs.length}</p>
                </div>
                <Activity className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white/40 backdrop-blur-xl border-white/30 shadow-xl shadow-blue-500/5">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Unique Roles</p>
                  <p className="text-2xl font-bold text-slate-900">{adminRoles.length}</p>
                </div>
                <Shield className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-white/40 backdrop-blur-xl border-white/30">
          <TabsTrigger value="admins" className="data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700">
            <Users className="h-4 w-4 mr-2" />
            Admins
          </TabsTrigger>
          <TabsTrigger value="sessions" className="data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700">
            <Monitor className="h-4 w-4 mr-2" />
            Sessions
          </TabsTrigger>
          <TabsTrigger value="activity" className="data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700">
            <History className="h-4 w-4 mr-2" />
            Activity
          </TabsTrigger>
          <TabsTrigger value="permissions" className="data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700">
            <Key className="h-4 w-4 mr-2" />
            Permissions
          </TabsTrigger>
        </TabsList>

        {/* Admins Tab */}
        <TabsContent value="admins" className="space-y-6">
          <Card className="bg-white/40 backdrop-blur-xl border-white/30 shadow-xl shadow-blue-500/5">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Crown className="h-5 w-5 text-blue-600" />
                    Admin Profiles
                  </CardTitle>
                  <CardDescription>Manage admin users and their roles</CardDescription>
                </div>
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Search admins..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 bg-white/50 backdrop-blur-sm border-white/30 w-64"
                    />
                  </div>
                  <Select value={filterRole} onValueChange={setFilterRole}>
                    <SelectTrigger className="bg-white/50 backdrop-blur-sm border-white/30 w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      {adminRoles.map(role => (
                        <SelectItem key={role.id} value={role.id.toString()}>
                          {role.display_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={filterStatus || 'all'} onValueChange={(value) => setFilterStatus(value === 'all' ? null : value)}>
                    <SelectTrigger className="bg-white/50 backdrop-blur-sm border-white/30 w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Admin</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Login</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        Loading admin profiles...
                      </TableCell>
                    </TableRow>
                  ) : filteredAdmins.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        No admin profiles found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAdmins.map((admin) => (
                      <React.Fragment key={admin.id}>
                        <TableRow className="hover:bg-white/30">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center text-white font-semibold">
                                {admin.user_name?.split(' ').map(n => n[0]).join('') || 'A'}
                              </div>
                              <div>
                                <div className="font-medium">{admin.user_name}</div>
                                <div className="text-sm text-slate-500">{admin.user_email}</div>
                                <div className="text-xs text-slate-400">ID: {admin.employee_id || 'N/A'}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={getRoleBadgeColor(admin.role_level || 1)}>
                              {admin.role_name}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">{admin.department || 'N/A'}</div>
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusBadgeColor(admin.is_active, admin.suspended_at)}>
                              {getStatusText(admin.is_active, admin.suspended_at)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {admin.last_login_time ? 
                                new Date(admin.last_login_time).toLocaleDateString() : 
                                'Never'
                              }
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleRowExpansion(admin.id)}
                              >
                                {expandedRows.has(admin.id) ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedAdmin(admin)
                                  setShowPermissionsDialog(true)
                                }}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {admin.is_active && !admin.suspended_at ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    if (window.confirm('Are you sure you want to suspend this admin?')) {
                                      handleSuspendAdmin(admin.id, 'Suspended by super admin')
                                    }
                                  }}
                                >
                                  <Ban className="h-4 w-4 text-red-600" />
                                </Button>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleActivateAdmin(admin.id)}
                                >
                                  <CheckCircle className="h-4 w-4 text-green-600" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                        {expandedRows.has(admin.id) && (
                          <TableRow>
                            <TableCell colSpan={6} className="bg-slate-50/50">
                              <div className="p-4 space-y-4">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                  <div>
                                    <span className="font-medium">Session Timeout:</span>
                                    <div>{admin.session_timeout_minutes} minutes</div>
                                  </div>
                                  <div>
                                    <span className="font-medium">MFA Required:</span>
                                    <div>{admin.require_mfa ? 'Yes' : 'No'}</div>
                                  </div>
                                  <div>
                                    <span className="font-medium">Created:</span>
                                    <div>{new Date(admin.created_at).toLocaleDateString()}</div>
                                  </div>
                                  <div>
                                    <span className="font-medium">Last Login IP:</span>
                                    <div>{admin.last_login_ip || 'N/A'}</div>
                                  </div>
                                </div>
                                {admin.managed_by && (
                                  <div className="text-sm">
                                    <span className="font-medium">Managed by:</span>
                                    <div>{admin.manager_name}</div>
                                  </div>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sessions Tab */}
        <TabsContent value="sessions" className="space-y-6">
          <Card className="bg-white/40 backdrop-blur-xl border-white/30 shadow-xl shadow-blue-500/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Monitor className="h-5 w-5 text-blue-600" />
                Active Admin Sessions
              </CardTitle>
              <CardDescription>Monitor and manage active admin sessions</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Admin</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead>Started</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        Loading sessions...
                      </TableCell>
                    </TableRow>
                  ) : activeSessions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        No active sessions
                      </TableCell>
                    </TableRow>
                  ) : (
                    activeSessions.map((session) => (
                      <TableRow key={session.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{session.admin_user_name}</div>
                            <div className="text-sm text-slate-500">{session.admin_user_email}</div>
                          </div>
                        </TableCell>
                        <TableCell>{session.ip_address}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {new Date(session.started_at).toLocaleString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {formatDuration(session.duration_minutes)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-green-100 text-green-800 border-green-200">
                            Active
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (window.confirm('Are you sure you want to terminate this session?')) {
                                handleTerminateSession(session.id)
                              }
                            }}
                          >
                            <Ban className="h-4 w-4 text-red-600" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity" className="space-y-6">
          <Card className="bg-white/40 backdrop-blur-xl border-white/30 shadow-xl shadow-blue-500/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5 text-blue-600" />
                Admin Activity Logs
              </CardTitle>
              <CardDescription>Recent admin actions and system events</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Admin</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Resource</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead>Timestamp</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        Loading activity logs...
                      </TableCell>
                    </TableRow>
                  ) : activityLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        No recent activity
                      </TableCell>
                    </TableRow>
                  ) : (
                    activityLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{log.admin_user_name}</div>
                            <div className="text-sm text-slate-500">{log.admin_user_email}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {log.action}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{log.resource_type}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm max-w-xs truncate">{log.description}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{log.ip_address}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {new Date(log.timestamp).toLocaleString()}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Permissions Tab */}
        <TabsContent value="permissions" className="space-y-6">
          <Card className="bg-white/40 backdrop-blur-xl border-white/30 shadow-xl shadow-blue-500/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5 text-blue-600" />
                Permission Overview
              </CardTitle>
              <CardDescription>System-wide permission statistics and role distribution</CardDescription>
            </CardHeader>
            <CardContent>
              {permissionOverview ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Role Distribution</h3>
                    <div className="space-y-3">
                      {adminRoles.map((role) => (
                        <div key={role.id} className="flex items-center justify-between p-3 bg-white/50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <Badge className={getRoleBadgeColor(role.level)}>
                              {role.display_name}
                            </Badge>
                            <span className="text-sm text-slate-600">{role.description}</span>
                          </div>
                          <div className="text-sm font-medium">
                            {permissionOverview.role_distribution?.[role.name] || 0} admins
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Permission Categories</h3>
                    <div className="space-y-3">
                      {Object.entries(permissionOverview.permission_categories || {}).map(([category, count]) => (
                        <div key={category} className="flex items-center justify-between p-3 bg-white/50 rounded-lg">
                          <span className="text-sm font-medium capitalize">{category.replace('_', ' ')}</span>
                          <span className="text-sm text-slate-600">{count as number} permissions</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  Loading permission overview...
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Admin Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-blue-600" />
              Create New Admin
            </DialogTitle>
            <DialogDescription>
              Add a new admin user to the system. They will have access based on their assigned role.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">First Name *</Label>
                <Input
                  id="first_name"
                  value={createFormData.first_name}
                  onChange={(e) => setCreateFormData(prev => ({ ...prev, first_name: e.target.value }))}
                  placeholder="John"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Last Name *</Label>
                <Input
                  id="last_name"
                  value={createFormData.last_name}
                  onChange={(e) => setCreateFormData(prev => ({ ...prev, last_name: e.target.value }))}
                  placeholder="Doe"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                value={createFormData.email}
                onChange={(e) => setCreateFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="admin@sikaremit.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={createFormData.password}
                onChange={(e) => setCreateFormData(prev => ({ ...prev, password: e.target.value }))}
                placeholder="Leave empty for auto-generated"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="role">Admin Role *</Label>
                <Select value={createFormData.role.toString()} onValueChange={(value) => setCreateFormData(prev => ({ ...prev, role: parseInt(value) }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {adminRoles.map(role => (
                      <SelectItem key={role.id} value={role.id.toString()}>
                        <div className="flex items-center gap-2">
                          <Badge className={getRoleBadgeColor(role.level)}>
                            {role.display_name}
                          </Badge>
                          <span>{role.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="employee_id">Employee ID</Label>
                <Input
                  id="employee_id"
                  value={createFormData.employee_id}
                  onChange={(e) => setCreateFormData(prev => ({ ...prev, employee_id: e.target.value }))}
                  placeholder="EMP001"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Input
                id="department"
                value={createFormData.department}
                onChange={(e) => setCreateFormData(prev => ({ ...prev, department: e.target.value }))}
                placeholder="Operations"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="session_timeout_minutes">Session Timeout (minutes)</Label>
                <Input
                  id="session_timeout_minutes"
                  type="number"
                  value={createFormData.session_timeout_minutes}
                  onChange={(e) => setCreateFormData(prev => ({ ...prev, session_timeout_minutes: parseInt(e.target.value) || 480 }))}
                  min="30"
                  max="1440"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="managed_by">Managed By</Label>
                <Select value={createFormData.managed_by.toString()} onValueChange={(value) => setCreateFormData(prev => ({ ...prev, managed_by: parseInt(value) || 0 }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select manager (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">No Manager</SelectItem>
                    {(adminProfiles || [])
                      .filter(admin => admin.is_active && !admin.is_suspended)
                      .map(admin => (
                        <SelectItem key={admin.id} value={admin.id.toString()}>
                          {admin.user_name} ({admin.role_name})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="require_mfa"
                checked={createFormData.require_mfa}
                onCheckedChange={(checked) => setCreateFormData(prev => ({ ...prev, require_mfa: checked as boolean }))}
              />
              <Label htmlFor="require_mfa">Require Multi-Factor Authentication</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateAdmin} className="bg-gradient-to-r from-blue-600 to-indigo-500 text-white">
              Create Admin
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Permissions Dialog */}
      <Dialog open={showPermissionsDialog} onOpenChange={setShowPermissionsDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5 text-blue-600" />
              Admin Permissions
            </DialogTitle>
            <DialogDescription>
              View detailed permissions for {selectedAdmin?.user_name}
            </DialogDescription>
          </DialogHeader>
          {selectedAdmin && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Role</Label>
                  <Badge className={getRoleBadgeColor(selectedAdmin.role_level || 1)}>
                    {selectedAdmin.role_name}
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium">Level</Label>
                  <div className="text-sm">{selectedAdmin.role_level}</div>
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium">Effective Permissions</Label>
                <div className="mt-2 space-y-2 max-h-60 overflow-y-auto">
                  {selectedAdmin.effective_permissions?.map((permission: string) => (
                    <div key={permission} className="flex items-center gap-2 p-2 bg-slate-50 rounded">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm capitalize">{permission.replace('_', ' ')}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setShowPermissionsDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </PermissionGuard>
  )
}
