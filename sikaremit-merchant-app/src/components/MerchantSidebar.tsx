'use client'

import React, { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Dimensions } from 'react-native'
import { merchantDesignTokens, getNavigationColor } from '../constants/designTokens'
import { merchantIcons } from '../constants/merchantIcons'

// Merchant Navigation Items - PERFECTLY MATCHING ADMIN STRUCTURE
const MERCHANT_NAVIGATION = [
  {
    title: 'Dashboard',
    href: 'MerchantDashboard',
    icon: 'dashboard',
    description: 'Business overview and quick stats',
    category: 'core'
  },
  {
    title: 'Analytics',
    href: 'Analytics',
    icon: 'analytics',
    description: 'Business insights and performance',
    category: 'business'
  },
  {
    title: 'Transactions',
    href: 'Receipts',
    icon: 'receipts',
    description: 'Payment history and records',
    category: 'business'
  },
  {
    title: 'Devices',
    href: 'Devices',
    icon: 'devices',
    description: 'Payment terminals and equipment',
    category: 'business'
  },
  {
    title: 'Point of Sale',
    href: 'POSHome',
    icon: 'pos',
    description: 'POS system and payments',
    category: 'business'
  },
  {
    title: 'Settings',
    href: 'Settings',
    icon: 'settings',
    description: 'Account and business settings',
    category: 'system'
  }
]

type MerchantScreenType = 'MerchantDashboard' | 'Analytics' | 'Devices' | 'Receipts' | 'POSHome'

interface MerchantSidebarProps {
  isOpen?: boolean
  onClose?: () => void
  onToggleCollapsed?: (collapsed: boolean) => void
  collapsed?: boolean
  onScreenChange?: (screen: MerchantScreenType) => void
  currentScreen?: MerchantScreenType
}

const MerchantSidebar: React.FC<MerchantSidebarProps> = ({
  isOpen,
  onClose,
  onToggleCollapsed,
  collapsed = false,
  onScreenChange,
  currentScreen = 'MerchantDashboard'
}) => {
  const [user, setUser] = useState({ name: 'Merchant User', email: 'merchant@sikaremit.com' })

  const handleToggleCollapsed = () => {
    const newCollapsed = !collapsed
    onToggleCollapsed?.(newCollapsed)
  }

  const handleNavigation = (screen: MerchantScreenType) => {
    onScreenChange?.(screen)
    // Close sidebar on mobile after navigation
    if (onClose) {
      onClose()
    }
  }

  // Apply EXACT admin color scheme for consistency
  const navigationWithUnifiedColors = MERCHANT_NAVIGATION.map(item => {
    // Core merchant functions - BLUE (like admin Dashboard)
    if (item.title === 'Dashboard') {
      return { ...item, iconColor: merchantDesignTokens.colors.primary[500], bgColor: merchantDesignTokens.colors.primary[50] }
    }

    // Business operations - EMERALD (like admin Customers/Merchants)
    if (['Analytics', 'Transactions', 'Devices', 'Point of Sale'].includes(item.title)) {
      return { ...item, iconColor: '#22c55e', bgColor: '#dcfce7' }
    }

    // System & configuration - GRAY (like admin Settings)
    return { ...item, iconColor: merchantDesignTokens.colors.gray[500], bgColor: merchantDesignTokens.colors.gray[100] }
  })

  return (
    <View style={[
      styles.sidebar,
      isOpen ? styles.sidebarOpen : styles.sidebarClosed,
      collapsed ? styles.sidebarCollapsed : styles.sidebarExpanded
    ]}>
      <View style={styles.sidebarContent}>
        {/* Mobile close button - EXACT admin styling */}
        <TouchableOpacity
          style={styles.closeButton}
          onPress={onClose}
        >
          <merchantIcons.logout size={20} color={merchantDesignTokens.colors.gray[500]} />
        </TouchableOpacity>

        {/* Navigation - EXACT admin structure */}
        <ScrollView
          style={styles.navigation}
          contentContainerStyle={styles.navigationContent}
          showsVerticalScrollIndicator={false}
        >
          {navigationWithUnifiedColors.map((item) => {
            const IconComponent = merchantIcons[item.icon as keyof typeof merchantIcons]
            const isActive = currentScreen === item.href
            return (
              <TouchableOpacity
                key={item.title}
                style={[
                  styles.navItem,
                  collapsed && styles.navItemCollapsed,
                  isActive && styles.navItemActive
                ]}
                onPress={() => handleNavigation(item.href as MerchantScreenType)}
              >
                {/* Icon - EXACT admin styling */}
                <View style={[
                  styles.iconContainer,
                  isActive ? styles.iconContainerActive : { backgroundColor: item.bgColor + '20' }
                ]}>
                  <IconComponent 
                    size={16} 
                    color={isActive ? merchantDesignTokens.colors.primary[600] : item.iconColor} 
                  />
                </View>

                {/* Text - Hidden when collapsed */}
                {!collapsed && (
                  <Text style={[
                    styles.navText,
                    isActive && styles.navTextActive
                  ]}>
                    {item.title}
                  </Text>
                )}

                {/* Tooltip for collapsed state - EXACT admin styling */}
                {collapsed && (
                  <View style={styles.tooltip}>
                    <Text style={styles.tooltipText}>
                      {item.title}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            )
          })}
        </ScrollView>

        {/* User section - EXACT admin styling */}
        <View style={styles.userSection}>
          <TouchableOpacity style={[
            styles.userButton,
            collapsed && styles.userButtonCollapsed
          ]}>
            {/* Avatar - EXACT admin styling */}
            <View style={[
              styles.avatar,
              styles.avatarRing
            ]}>
              <Text style={styles.avatarText}>
                {user?.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || 'M'}
              </Text>
              <View style={styles.avatarGlow} />
            </View>

            {/* User info - Hidden when collapsed */}
            {!collapsed && (
              <View style={styles.userInfo}>
                <Text style={styles.userName}>
                  {user?.name || 'Merchant'}
                </Text>
                <Text style={styles.userEmail}>
                  {user?.email || 'merchant@sikaremit.com'}
                </Text>
              </View>
            )}

            {/* Chevron - Hidden when collapsed */}
            {!collapsed && (
              <merchantIcons.settings size={16} color={merchantDesignTokens.colors.gray[500]} />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  sidebar: {
    position: 'absolute',
    left: 0,
    top: 64, // EXACT admin: top-16 (64px)
    bottom: 0,
    backgroundColor: merchantDesignTokens.colors.surface.primary,
    borderRightWidth: 1,
    borderRightColor: merchantDesignTokens.colors.border.default,
    zIndex: 30, // EXACT admin: z-30
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  sidebarOpen: {
    transform: [{ translateX: 0 }],
  },
  sidebarClosed: {
    transform: [{ translateX: -300 }],
  },
  sidebarCollapsed: {
    width: merchantDesignTokens.components.sidebar.width.collapsed,
  },
  sidebarExpanded: {
    width: merchantDesignTokens.components.sidebar.width.expanded,
  },
  sidebarContent: {
    flex: 1,
    // No padding top - sidebar starts at header bottom
  },
  closeButton: {
    position: 'absolute',
    top: merchantDesignTokens.spacing.md,
    right: merchantDesignTokens.spacing.md,
    zIndex: 10,
    padding: merchantDesignTokens.spacing.sm,
    borderRadius: merchantDesignTokens.borderRadius.md,
    backgroundColor: 'transparent',
  },
  navigation: {
    flex: 1,
    paddingVertical: merchantDesignTokens.spacing.md,
    paddingHorizontal: merchantDesignTokens.spacing.xs, // EXACT admin: p-3
  },
  navigationContent: {
    gap: merchantDesignTokens.spacing.xs,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: merchantDesignTokens.spacing.md, // EXACT admin: gap-3
    paddingHorizontal: merchantDesignTokens.spacing.md, // EXACT admin: px-3
    paddingVertical: 10, // EXACT admin: py-2.5
    borderRadius: merchantDesignTokens.borderRadius.md, // EXACT admin: rounded-lg
  },
  navItemCollapsed: {
    justifyContent: 'center',
    paddingHorizontal: merchantDesignTokens.spacing.sm,
  },
  navItemActive: {
    backgroundColor: merchantDesignTokens.colors.primary[50], // EXACT admin: bg-blue-50
    borderLeftWidth: 4, // EXACT admin: border-l-4
    borderLeftColor: merchantDesignTokens.colors.primary[500], // EXACT admin: border-blue-500
    shadowColor: merchantDesignTokens.colors.primary[500],
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  iconContainer: {
    flexShrink: 0,
    width: 32, // EXACT admin: w-8
    height: 32, // EXACT admin: h-8
    borderRadius: merchantDesignTokens.borderRadius.md, // EXACT admin: rounded-lg
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainerActive: {
    backgroundColor: merchantDesignTokens.colors.primary[100], // EXACT admin: bg-blue-100
  },
  navText: {
    fontSize: merchantDesignTokens.typography.fontSize.sm, // EXACT admin: text-sm
    fontWeight: merchantDesignTokens.typography.fontWeight.medium, // EXACT admin: font-medium
    color: merchantDesignTokens.colors.text.primary,
    fontFamily: merchantDesignTokens.typography.fontFamily.sans[0],
    flex: 1,
  },
  navTextActive: {
    color: merchantDesignTokens.colors.primary[700], // EXACT admin: text-blue-700
  },
  tooltip: {
    position: 'absolute',
    left: '100%',
    marginLeft: merchantDesignTokens.spacing.sm,
    paddingHorizontal: merchantDesignTokens.spacing.sm,
    paddingVertical: merchantDesignTokens.spacing.xs,
    backgroundColor: merchantDesignTokens.colors.gray[900],
    borderRadius: merchantDesignTokens.borderRadius.sm,
    zIndex: 50,
    opacity: 0, // Hidden by default
  },
  tooltipText: {
    fontSize: merchantDesignTokens.typography.fontSize.xs,
    color: merchantDesignTokens.colors.text.inverse,
    fontFamily: merchantDesignTokens.typography.fontFamily.sans[0],
    fontWeight: merchantDesignTokens.typography.fontWeight.medium,
  },
  userSection: {
    padding: merchantDesignTokens.spacing.md, // EXACT admin: p-3
    borderTopWidth: 1,
    borderTopColor: merchantDesignTokens.colors.border.default,
  },
  userButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: merchantDesignTokens.spacing.md, // EXACT admin: gap-3
    padding: merchantDesignTokens.spacing.md, // EXACT admin: p-3
    borderRadius: merchantDesignTokens.borderRadius.md, // EXACT admin: rounded-lg
    backgroundColor: 'transparent', // EXACT admin: transparent background
  },
  userButtonCollapsed: {
    justifyContent: 'center',
    padding: merchantDesignTokens.spacing.sm,
  },
  avatar: {
    position: 'relative',
    flexShrink: 0,
    width: 32, // EXACT admin: w-8
    height: 32, // EXACT admin: h-8
    borderRadius: merchantDesignTokens.borderRadius.full,
    backgroundColor: merchantDesignTokens.colors.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2, // EXACT admin: ring-2
    borderColor: merchantDesignTokens.colors.primary[200], // EXACT admin: ring-blue-500/20
    shadowColor: merchantDesignTokens.colors.primary[500],
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  avatarRing: {
    // Additional ring styling
  },
  avatarGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: merchantDesignTokens.borderRadius.full,
    backgroundColor: merchantDesignTokens.colors.primary[100],
    opacity: 0,
  },
  avatarText: {
    fontSize: merchantDesignTokens.typography.fontSize.sm,
    fontWeight: merchantDesignTokens.typography.fontWeight.bold,
    color: merchantDesignTokens.colors.text.inverse,
    fontFamily: merchantDesignTokens.typography.fontFamily.sans[0],
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: merchantDesignTokens.typography.fontSize.sm, // EXACT admin: text-sm
    fontWeight: merchantDesignTokens.typography.fontWeight.medium, // EXACT admin: font-medium
    color: merchantDesignTokens.colors.text.primary,
    fontFamily: merchantDesignTokens.typography.fontFamily.sans[0],
  },
  userEmail: {
    fontSize: merchantDesignTokens.typography.fontSize.xs,
    color: merchantDesignTokens.colors.text.secondary,
    fontFamily: merchantDesignTokens.typography.fontFamily.sans[0],
  },
})

export default MerchantSidebar
