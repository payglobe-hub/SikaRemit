'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { CheckCircle, XCircle, AlertTriangle, Clock, Server, Database, Globe, Zap } from 'lucide-react'

export default function StatusPage() {
  const services = [
    {
      name: 'API Services',
      status: 'operational',
      uptime: '99.9%',
      lastIncident: 'None'
    },
    {
      name: 'Payment Processing',
      status: 'operational',
      uptime: '99.8%',
      lastIncident: '2 days ago'
    },
    {
      name: 'Database',
      status: 'operational',
      uptime: '99.9%',
      lastIncident: 'None'
    },
    {
      name: 'File Storage',
      status: 'operational',
      uptime: '99.7%',
      lastIncident: '1 week ago'
    },
    {
      name: 'Email Services',
      status: 'operational',
      uptime: '99.5%',
      lastIncident: '3 days ago'
    },
    {
      name: 'Mobile App',
      status: 'operational',
      uptime: '99.9%',
      lastIncident: 'None'
    }
  ]

  const incidents = [
    {
      title: 'Scheduled maintenance completed',
      date: '2024-01-15',
      status: 'resolved',
      description: 'Completed scheduled maintenance on payment processing systems.'
    },
    {
      title: 'Minor API slowdown',
      date: '2024-01-10',
      status: 'resolved',
      description: 'Temporary slowdown in API response times, now resolved.'
    }
  ]

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'operational':
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'degraded':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />
      case 'down':
        return <XCircle className="h-5 w-5 text-red-600" />
      default:
        return <Clock className="h-5 w-5 text-gray-600" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'operational':
        return <Badge className="bg-green-100 text-green-800">Operational</Badge>
      case 'degraded':
        return <Badge className="bg-yellow-100 text-yellow-800">Degraded</Badge>
      case 'down':
        return <Badge className="bg-red-100 text-red-800">Down</Badge>
      default:
        return <Badge variant="secondary">Unknown</Badge>
    }
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900">System Status</h1>
          </div>
          <p className="text-xl text-gray-600">
            All systems operational • Last updated: {new Date().toLocaleString()}
          </p>
        </div>

        {/* Overall Status */}
        <Card className="mb-8">
          <CardContent className="p-8">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
                <h2 className="text-2xl font-bold text-green-600">All Systems Operational</h2>
              </div>
              <p className="text-gray-600 mb-6">
                We're currently experiencing normal service. All systems are running smoothly.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-green-600">99.9%</div>
                  <div className="text-sm text-gray-600">Uptime (30 days)</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-600">1.2s</div>
                  <div className="text-sm text-gray-600">Avg Response Time</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-600">0</div>
                  <div className="text-sm text-gray-600">Active Incidents</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-orange-600">24/7</div>
                  <div className="text-sm text-gray-600">Monitoring</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Services Status */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-6">Service Status</h2>
          <div className="grid gap-4">
            {services.map((service, index) => (
              <Card key={index}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {getStatusIcon(service.status)}
                      <div>
                        <h3 className="font-semibold">{service.name}</h3>
                        <p className="text-sm text-gray-600">
                          {service.uptime} uptime • Last incident: {service.lastIncident}
                        </p>
                      </div>
                    </div>
                    {getStatusBadge(service.status)}
                  </div>
                  <div className="mt-4">
                    <div className="flex justify-between text-sm mb-1">
                      <span>Uptime (30 days)</span>
                      <span>{service.uptime}</span>
                    </div>
                    <Progress
                      value={parseFloat(service.uptime.replace('%', ''))}
                      className="h-2"
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Recent Incidents */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-6">Recent Incidents</h2>
          {incidents.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                <h3 className="font-semibold mb-2">No Recent Incidents</h3>
                <p className="text-gray-600">
                  All systems have been running smoothly. Check back later for updates.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {incidents.map((incident, index) => (
                <Card key={index}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold">{incident.title}</h3>
                          {getStatusBadge(incident.status)}
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{incident.description}</p>
                        <p className="text-xs text-gray-500">{incident.date}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Maintenance Schedule */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              Scheduled Maintenance
            </CardTitle>
            <CardDescription>
              Upcoming maintenance windows and system updates
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <Clock className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <h3 className="font-semibold mb-2">No Scheduled Maintenance</h3>
              <p className="text-gray-600">
                There are no upcoming maintenance windows scheduled at this time.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
