'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus, Monitor, Smartphone, Store, Settings, Power, PowerOff } from 'lucide-react'
import { toast } from 'sonner'
import api from '@/lib/api/axios'

interface DeviceManagementProps {
  devices: any[];
  onDeviceUpdate: (device?: any) => void;
}

const DeviceManagement = ({ devices, onDeviceUpdate }: DeviceManagementProps) => {
  const [isRegisterDialogOpen, setIsRegisterDialogOpen] = useState(false)
  const [registerForm, setRegisterForm] = useState({
    device_type: '',
    device_name: '',
    device_info: {}
  })

  const deviceTypeIcons = {
    virtual_terminal: Monitor,
    mobile_reader: Smartphone,
    countertop: Store,
    integrated: Settings,
    kiosk: Store
  }

  const deviceTypeLabels = {
    virtual_terminal: 'Virtual Terminal',
    mobile_reader: 'Mobile Reader',
    countertop: 'Countertop Terminal',
    integrated: 'Integrated POS',
    kiosk: 'Kiosk'
  }

  const handleRegisterDevice = async () => {
    try {
      const response = await api.post('/api/v1/payments/pos/register-device/', registerForm)
      
      toast.success('Device registered successfully')
      setIsRegisterDialogOpen(false)
      setRegisterForm({ device_type: '', device_name: '', device_info: {} })
      onDeviceUpdate(null)
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to register device'
      toast.error(errorMessage)
    }
  }

  const handleDeviceAction = async (deviceId: string, action: string) => {
    try {
      const response = await api.post(`/api/v1/payments/pos/devices/${deviceId}/${action}/`)
      
      toast.success(`Device ${action}d successfully`)
      onDeviceUpdate(null)
    } catch (error) {
      toast.error(`Failed to ${action} device`)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>POS Devices</CardTitle>
            <CardDescription>
              Manage your point of sale hardware and devices
            </CardDescription>
          </div>
          <Dialog open={isRegisterDialogOpen} onOpenChange={setIsRegisterDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Register Device
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Register New POS Device</DialogTitle>
                <DialogDescription>
                  Add a new POS device to your merchant account
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="device_type">Device Type</Label>
                  <Select
                    value={registerForm.device_type}
                    onValueChange={(value) => setRegisterForm(prev => ({ ...prev, device_type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select device type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="virtual_terminal">Virtual Terminal</SelectItem>
                      <SelectItem value="mobile_reader">Mobile Reader</SelectItem>
                      <SelectItem value="countertop">Countertop Terminal</SelectItem>
                      <SelectItem value="integrated">Integrated POS</SelectItem>
                      <SelectItem value="kiosk">Kiosk</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="device_name">Device Name</Label>
                  <Input
                    id="device_name"
                    value={registerForm.device_name}
                    onChange={(e) => setRegisterForm(prev => ({ ...prev, device_name: e.target.value }))}
                    placeholder="Enter device name"
                  />
                </div>
                <Button onClick={handleRegisterDevice} className="w-full">
                  Register Device
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {devices.length === 0 ? (
            <div className="text-center py-8">
              <Monitor className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No POS devices registered</h3>
              <p className="text-muted-foreground mb-4">
                Register your first POS device to start accepting payments
              </p>
              <Button onClick={() => setIsRegisterDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Register Your First Device
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Device</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Seen</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {devices.map((device) => {
                  const Icon = (deviceTypeIcons as any)[device.device_type] || Monitor
                  return (
                    <TableRow key={device.device_id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          <div>
                            <p className="font-medium">{device.device_name}</p>
                            <p className="text-sm text-muted-foreground">{device.device_id}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {(deviceTypeLabels as any)[device.device_type] || device.device_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={device.status === 'active' ? 'default' : 'secondary'}>
                          {device.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {device.last_seen ? new Date(device.last_seen).toLocaleString() : 'Never'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {device.status === 'active' ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeviceAction(device.id, 'deactivate')}
                            >
                              <PowerOff className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeviceAction(device.id, 'activate')}
                            >
                              <Power className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default DeviceManagement
