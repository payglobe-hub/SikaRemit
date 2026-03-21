'use client'

import { useState, useEffect } from 'react'
import api from '@/lib/api/axios'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Shield, Award, TrendingUp, Copy, Check, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TrustBadge {
  type: string
  name: string
  icon: string
  earned_at: string
  description?: string
}

interface TrustStatus {
  trust_level: string
  trust_score: number
  badges: TrustBadge[]
  verification_details: {
    name: string
    requirements: string[]
    benefits: string[]
    badge: string
  }
}

interface TrustBadgeDisplayProps {
  merchantId: number
  variant?: 'full' | 'compact' | 'icon'
  showEmbedCode?: boolean
}

export function TrustBadgeDisplay({
  merchantId,
  variant = 'full',
  showEmbedCode = false
}: TrustBadgeDisplayProps) {
  const [status, setStatus] = useState<TrustStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetchTrustStatus()
  }, [merchantId])

  const fetchTrustStatus = async () => {
    try {
      const response = await api.get(`/api/v1/merchants/${merchantId}/trust/status/`)
      const data = response.data
      
      if (data.success) {
        setStatus(data.verification_status)
      }
    } catch (error) {
      
    } finally {
      setLoading(false)
    }
  }

  const getTrustLevelColor = (level: string) => {
    const colors = {
      unverified: 'text-gray-500',
      basic: 'text-blue-500',
      verified: 'text-green-500',
      premium: 'text-purple-500',
      enterprise: 'text-orange-500'
    }
    return colors[level as keyof typeof colors] || 'text-gray-500'
  }

  const getTrustLevelBadge = (level: string) => {
    const variants = {
      unverified: 'secondary',
      basic: 'default',
      verified: 'default',
      premium: 'default',
      enterprise: 'default'
    }
    return variants[level as keyof typeof variants] || 'secondary'
  }

  const getEmbedCode = (type: 'standard' | 'compact' | 'icon') => {
    return `<!-- sikaremit Trust Badge -->
<div id="sikaremit-badge-${merchantId}" data-type="${type}"></div>
<script src="https://cdn.sikaremit.com/badge.js" data-merchant="${merchantId}"></script>`
  }

  const copyEmbedCode = (type: 'standard' | 'compact' | 'icon') => {
    navigator.clipboard.writeText(getEmbedCode(type))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-8 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!status) {
    return null
  }

  // Full Badge Display
  if (variant === 'full') {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="space-y-6">
            {/* Trust Level */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center",
                  "bg-sikaremit-primary/10"
                )}>
                  <Shield className={cn("w-6 h-6", getTrustLevelColor(status.trust_level))} />
                </div>
                <div>
                  <div className="font-semibold text-lg">
                    {status.verification_details.name}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    sikaremit Verified Merchant
                  </div>
                </div>
              </div>
              <Badge variant={getTrustLevelBadge(status.trust_level) as any} className="text-lg px-4 py-2">
                {status.trust_level}
              </Badge>
            </div>

            {/* Trust Score */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Trust Score</span>
                <span className="text-2xl font-bold text-sikaremit-primary">
                  {status.trust_score}/100
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-3">
                <div
                  className="bg-sikaremit-primary rounded-full h-3 transition-all duration-500"
                  style={{ width: `${status.trust_score}%` }}
                />
              </div>
            </div>

            {/* Earned Badges */}
            {status.badges.length > 0 && (
              <div>
                <div className="text-sm font-medium mb-3">Earned Badges</div>
                <div className="grid grid-cols-2 gap-3">
                  {status.badges.map((badge, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 p-3 rounded-lg bg-muted"
                    >
                      <Award className="w-5 h-5 text-sikaremit-primary flex-shrink-0" />
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{badge.name}</div>
                        {badge.description && (
                          <div className="text-xs text-muted-foreground truncate">
                            {badge.description}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Embed Code */}
            {showEmbedCode && (
              <div>
                <div className="text-sm font-medium mb-2">Embed on Your Website</div>
                <div className="space-y-2">
                  {(['standard', 'compact', 'icon'] as const).map((type) => (
                    <div key={type} className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyEmbedCode(type)}
                        className="flex-1"
                      >
                        {copied ? (
                          <Check className="w-4 h-4 mr-2" />
                        ) : (
                          <Copy className="w-4 h-4 mr-2" />
                        )}
                        {type.charAt(0).toUpperCase() + type.slice(1)} Badge
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Verification Link */}
            <Button variant="link" className="w-full" asChild>
              <a
                href={`https://sikaremit.com/verify/${merchantId}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Verify on sikaremit
                <ExternalLink className="w-4 h-4 ml-2" />
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Compact Badge
  if (variant === 'compact') {
    return (
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-sikaremit-primary/10 border border-sikaremit-primary/20">
        <Shield className={cn("w-5 h-5", getTrustLevelColor(status.trust_level))} />
        <div>
          <div className="text-sm font-semibold">{status.verification_details.name}</div>
          <div className="text-xs text-muted-foreground">Score: {status.trust_score}/100</div>
        </div>
      </div>
    )
  }

  // Icon Only
  return (
    <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-sikaremit-primary/10">
      <Shield className={cn("w-6 h-6", getTrustLevelColor(status.trust_level))} />
    </div>
  )
}
