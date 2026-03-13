'use client'

import React, { useState } from 'react'
import { useSessionManagement } from '../hooks/useSessionManagement'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Shield, LogOut, Smartphone, Clock } from 'lucide-react'
import { toast } from 'sonner'

export function SessionManagement() {
  const {
    sessions,
    loading,
    error,
    fetchSessions,
    logoutAllDevices,
    logoutOtherDevices,
    totalSessions
  } = useSessionManagement()

  const [logoutAllLoading, setLogoutAllLoading] = useState(false)
  const [logoutOtherLoading, setLogoutOtherLoading] = useState(false)

  const handleLogoutAllDevices = async () => {
    try {
      setLogoutAllLoading(true)
      toast.error('Logout all devices functionality is disabled in localStorage-free mode')
      // Note: This functionality would require server-side session management
      // For now, we'll disable it to avoid localStorage dependency
    } catch (err) {
      toast.error('Failed to logout from all devices')
    } finally {
      setLogoutAllLoading(false)
    }
  }

  const handleLogoutOtherDevices = async () => {
    try {
      setLogoutOtherLoading(true)
      toast.error('Logout other devices functionality is disabled in localStorage-free mode')
      // Note: This functionality would require server-side session management
      // For now, we'll disable it to avoid localStorage dependency
    } catch (err) {
      toast.error('Failed to logout from other devices')
    } finally {
      setLogoutOtherLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const getDeviceIcon = (userAgent: string) => {
    if (userAgent.includes('Mobile') || userAgent.includes('Android') || userAgent.includes('iPhone')) {
      return <Smartphone className="h-4 w-4" />
    }
    return <Shield className="h-4 w-4" />
  }

  if (loading && sessions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Active Sessions
          </CardTitle>
          <CardDescription>
            Manage your active login sessions across devices
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading sessions...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Active Sessions
          <Badge variant="secondary">{totalSessions}</Badge>
        </CardTitle>
        <CardDescription>
          Manage your active login sessions across devices
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
            Error: {error}
          </div>
        )}

        {/* Session Actions */}
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleLogoutOtherDevices}
            disabled={loading || totalSessions <= 1}
            className="flex items-center gap-2"
          >
            <LogOut className="h-4 w-4" />
            Logout Other Devices
          </Button>
          <Button
            variant="destructive"
            onClick={handleLogoutAllDevices}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <LogOut className="h-4 w-4" />
            Logout All Devices
          </Button>
          <Button
            variant="outline"
            onClick={fetchSessions}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <Clock className="h-4 w-4" />
            Refresh
          </Button>
        </div>

        <Separator />

        {/* Sessions List */}
        <div className="space-y-3">
          {sessions.length === 0 ? (
            <div className="text-center py-8">
              <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No active sessions found</p>
            </div>
          ) : (
            sessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-card"
              >
                <div className="flex items-center gap-3">
                  {getDeviceIcon(session.user_agent)}
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">Device {session.id}</p>
                      {session.is_current && (
                        <Badge variant="default" className="text-xs">
                          Current
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      IP: {session.ip_address}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Created: {formatDate(session.created_at)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Expires: {formatDate(session.expires_at)}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Security Info */}
        <div className="mt-6 p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
          <div className="flex items-start gap-2">
            <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-blue-900 dark:text-blue-100">Security Tips</p>
              <ul className="text-blue-700 dark:text-blue-300 mt-1 space-y-1">
                <li>• Regularly review your active sessions</li>
                <li>• Logout from devices you don't recognize</li>
                <li>• Use "Logout All Devices" if you suspect unauthorized access</li>
                <li>• Enable two-factor authentication for extra security</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
