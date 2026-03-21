'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'
import { 
  Shield, Users, Settings, Activity, Clock, AlertTriangle, 
  UserPlus, UserX, Search, Filter, Download, Eye, EyeOff,
  Lock, Unlock, ChevronDown, ChevronUp, RefreshCw
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
  suspendAdmin,
  activateAdmin,
  terminateAdminSession,
  getPermissionOverview,
  ADMIN_LEVEL_LABELS,
  ADMIN_LEVEL_COLORS,
  RISK_LEVELS,
  formatDuration
} from '@/lib/api/admin-hierarchy'

export function AdminHierarchyDashboard() {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState('overview')
  const [loading, setLoading] = useState(true)
  const [adminProfiles, setAdminProfiles] = useState<AdminProfile[]>([])
  const [activityLogs, setActivityLogs] = useState<AdminActivityLog[]>([])
  const [activeSessions, setActiveSessions] = useState<AdminSession[]>([])
  const [adminRoles, setAdminRoles] = useState<AdminRole[]>([])
  const [permissionOverview, setPermissionOverview] = useState<any>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterLevel, setFilterLevel] = useState<number | null>(null)
  const [filterStatus, setFilterStatus] = useState<string | null>(null)

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
      
      setAdminProfiles(profiles)
      setActivityLogs(logs)
      setActiveSessions(sessions)
      setAdminRoles(roles)
      setPermissionOverview(permissions)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load admin data',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
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

  const filteredProfiles = adminProfiles.filter(profile => {
    const matchesSearch = profile.user_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         profile.user_name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesLevel = !filterLevel || profile.role_level === filterLevel
    const matchesStatus = !filterStatus || 
                         (filterStatus === 'active' && profile.is_active && !profile.is_suspended) ||
                         (filterStatus === 'suspended' && profile.is_suspended)
    return matchesSearch && matchesLevel && matchesStatus
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin Hierarchy</h1>
          <p className="text-muted-foreground">Manage admin roles, permissions, and monitor activity</p>
        </div>
        <Button onClick={loadData} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="admins">Admins</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
          <TabsTrigger value="roles">Roles</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Admins</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{adminProfiles.length}</div>
                <p className="text-xs text-muted-foreground">
                  {adminProfiles.filter(p => p.is_active && !p.is_suspended).length} active
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{activeSessions.length}</div>
                <p className="text-xs text-muted-foreground">Currently logged in</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{activityLogs.length}</div>
                <p className="text-xs text-muted-foreground">Last 24 hours</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Your Level</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {permissionOverview?.user_level ? ADMIN_LEVEL_LABELS[permissionOverview.user_level as keyof typeof ADMIN_LEVEL_LABELS] : 'Unknown'}
                </div>
                <p className="text-xs text-muted-foreground">
                  {permissionOverview?.user_permissions?.length || 0} permissions
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Admin Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(ADMIN_LEVEL_LABELS).slice(0, 4).map(([level, label]) => {
                  const count = adminProfiles.filter(p => p.role_level === parseInt(level)).length
                  const color = ADMIN_LEVEL_COLORS[level as unknown as keyof typeof ADMIN_LEVEL_COLORS]
                  return (
                    <div key={level} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className={`text-${color}-600 border-${color}-600`}>
                          {String(label)}
                        </Badge>
                        <span className="text-sm text-muted-foreground">{count} admins</span>
                      </div>
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div 
                          className={`bg-${color}-600 h-2 rounded-full`}
                          style={{ width: `${(count / adminProfiles.length) * 100}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="admins" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Admin Management</CardTitle>
              <CardDescription>Manage admin accounts and permissions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-4 mb-6">
                <div className="flex-1">
                  <Input
                    placeholder="Search admins..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="max-w-sm"
                  />
                </div>
                <Select value={filterLevel?.toString() || ''} onValueChange={(value) => setFilterLevel(value ? parseInt(value) as number : null)}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Filter by level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Levels</SelectItem>
                    {Object.entries(ADMIN_LEVEL_LABELS).slice(0, 4).map(([level, label]) => (
                      <SelectItem key={level} value={level}>{String(label)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterStatus || ''} onValueChange={(value) => setFilterStatus(value || null)}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Admin</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Login</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProfiles.map((profile) => {
                    const levelColor = ADMIN_LEVEL_COLORS[profile.role_level as keyof typeof ADMIN_LEVEL_COLORS];
                    return (
                    <TableRow key={profile.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{profile.user_name}</div>
                          <div className="text-sm text-muted-foreground">{profile.user_email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={`text-${levelColor}-600 border-${levelColor}-600`}
                        >
                          {profile.role_name}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {profile.is_suspended ? (
                            <>
                              <Badge variant="destructive">Suspended</Badge>
                              <AlertTriangle className="h-4 w-4 text-red-500" />
                            </>
                          ) : profile.is_active ? (
                            <Badge variant="default">Active</Badge>
                          ) : (
                            <Badge variant="secondary">Inactive</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {profile.last_login_time ? (
                          <div className="text-sm">
                            {new Date(profile.last_login_time).toLocaleDateString()}
                            <div className="text-muted-foreground">
                              {new Date(profile.last_login_time).toLocaleTimeString()}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Never</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {profile.is_suspended ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleActivateAdmin(profile.id)}
                            >
                              <Unlock className="h-4 w-4 mr-1" />
                              Activate
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleSuspendAdmin(profile.id, 'Manual suspension')}
                            >
                              <Lock className="h-4 w-4 mr-1" />
                              Suspend
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Admin Activity Log</CardTitle>
              <CardDescription>Monitor admin actions and system changes</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Admin</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Resource</TableHead>
                    <TableHead>Risk</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activityLogs.slice(0, 20).map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{log.admin_user_name}</div>
                          <div className="text-sm text-muted-foreground">{log.admin_user_email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{log.action_display}</div>
                        <div className="text-sm text-muted-foreground">{log.description}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{log.resource_type}</div>
                          <div className="text-muted-foreground">{log.resource_id}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={log.risk_level === 'high' || log.risk_level === 'urgent' ? 'destructive' : 'outline'}
                          className={`text-${RISK_LEVELS[log.risk_level as keyof typeof RISK_LEVELS].color}-600`}
                        >
                          {RISK_LEVELS[log.risk_level as keyof typeof RISK_LEVELS].label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {new Date(log.timestamp).toLocaleString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {log.success ? (
                            <Badge variant="default">Success</Badge>
                          ) : (
                            <Badge variant="destructive">Failed</Badge>
                          )}
                          {log.requires_review && (
                            <AlertTriangle className="h-4 w-4 text-yellow-500" />
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sessions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Active Sessions</CardTitle>
              <CardDescription>Monitor currently logged in admin sessions</CardDescription>
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
                  {activeSessions.map((session) => (
                    <TableRow key={session.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{session.admin_user_name}</div>
                          <div className="text-sm text-muted-foreground">{session.admin_user_email}</div>
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
                        <Badge variant={session.is_active ? 'default' : 'secondary'}>
                          {session.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleTerminateSession(session.id)}
                        >
                          <EyeOff className="h-4 w-4 mr-1" />
                          Terminate
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roles" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Admin Roles</CardTitle>
              <CardDescription>Manage admin roles and permissions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {adminRoles.map((role) => (
                  <div key={role.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold">{role.display_name}</h3>
                        <p className="text-muted-foreground">{role.description}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge 
                          variant="outline"
                          className={`text-${ADMIN_LEVEL_COLORS[role.level as unknown as keyof typeof ADMIN_LEVEL_COLORS]}-600 border-${ADMIN_LEVEL_COLORS[role.level as unknown as keyof typeof ADMIN_LEVEL_COLORS]}-600`}
                        >
                          Level {role.level}
                        </Badge>
                        {role.is_active ? (
                          <Badge variant="default">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {role.permission_details.map((permission: any) => (
                        <div key={permission.key} className="text-sm">
                          <div className="font-medium">{permission.description}</div>
                          <div className="text-muted-foreground">{permission.category}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
