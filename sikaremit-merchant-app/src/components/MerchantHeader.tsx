'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Modal, FlatList, Alert, TextInput, ScrollView, Platform } from 'react-native'
import { useNavigation, NavigationProp } from '@react-navigation/native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Appearance } from 'react-native'
import { merchantDesignTokens } from '../constants/designTokens'
import { merchantIcons } from '../constants/merchantIcons'
import { useAuthStore } from '../store/authStore'
import notificationService from '../services/notificationService'

// Notification icon helper - EXACT admin logic
function getNotificationIcon(type: string, level: string) {
  if (type?.includes('payment') || type?.includes('transaction') || type?.includes('merchant')) {
    return merchantIcons.analytics // Equivalent to CreditCard in admin
  }
  if (type?.includes('security') || level === 'security') {
    return merchantIcons.settings // Equivalent to Shield in admin
  }
  if (level === 'warning' || level === 'error') {
    return merchantIcons.devices // Equivalent to AlertTriangle in admin
  }
  return merchantIcons.receipts // Equivalent to Info in admin
}

// Generate breadcrumbs from navigation state - EXACT admin logic
function generateBreadcrumbs(currentRoute: string): Array<{ name: string; href: string; icon: any }> {
  const segments = currentRoute.split('/')
  const breadcrumbs = [{ name: 'Dashboard', href: 'MerchantDashboard', icon: merchantIcons.dashboard }]

  if (segments.length > 1) {
    const routeSegments = segments.slice(1)
    let currentPath = 'MerchantDashboard'

    routeSegments.forEach((segment, index) => {
      currentPath = segment
      const name = segment.charAt(0).toUpperCase() + segment.slice(1).replace('-', ' ')
      breadcrumbs.push({ name, href: currentPath, icon: merchantIcons.settings })
    })
  }

  return breadcrumbs
}

// Notification type for header display
interface HeaderNotification {
  id: string
  title: string
  message: string
  notification_type?: string
  level: string
  is_read: boolean
  created_at: string
}

type RootStackParamList = {
  MerchantDashboard: undefined
  Analytics: undefined
  Devices: undefined
  Receipts: undefined
  POSHome: undefined
  Settings: undefined
  Profile: undefined
}

interface MerchantHeaderProps {
  onMenuClick?: () => void
  sidebarOpen?: boolean
  sidebarCollapsed?: boolean
  title?: string
}

const MerchantHeader: React.FC<MerchantHeaderProps> = ({
  onMenuClick,
  sidebarOpen = false,
  sidebarCollapsed = false,
  title
}) => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>()
  const [searchOpen, setSearchOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [themeMenuOpen, setThemeMenuOpen] = useState(false)
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system')
  const [notifications, setNotifications] = useState<HeaderNotification[]>([])
  const authUser = useAuthStore((state) => state.user)
  const authLogout = useAuthStore((state) => state.logout)
  const user = {
    name: authUser ? `${authUser.first_name || ''} ${authUser.last_name || ''}`.trim() || authUser.email?.split('@')[0] || 'Merchant' : 'Merchant',
    email: authUser?.email || ''
  }

  // Fetch notifications from API
  const fetchNotifications = useCallback(async () => {
    try {
      const data = await notificationService.getNotifications(5)
      setNotifications(data as unknown as HeaderNotification[])
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
    }
  }, [])

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  // Get current route name
  const currentRoute = title || 'MerchantDashboard'
  const breadcrumbs = generateBreadcrumbs(currentRoute)

  // Theme management
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('theme') as 'light' | 'dark' | 'system' || 'system'
        setTheme(savedTheme)
        applyTheme(savedTheme)
      } catch (error) {
        console.error('Error loading theme:', error)
      }
    }
    loadTheme()
  }, [])

  const applyTheme = (newTheme: 'light' | 'dark' | 'system') => {
    // React Native theme management would go here
    // For now, this is a placeholder for actual theme switching
    
  }

  const handleThemeChange = async (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme)
    try {
      await AsyncStorage.setItem('theme', newTheme)
    } catch (error) {
      console.error('Error saving theme:', error)
    }
    applyTheme(newTheme)
    setThemeMenuOpen(false)
  }

  // Global search items - EXACT admin structure
  const searchItems: Array<{ name: string; href: string; icon: any }> = [
    { name: 'Dashboard', href: 'MerchantDashboard', icon: merchantIcons.dashboard },
    { name: 'Analytics', href: 'Analytics', icon: merchantIcons.analytics },
    { name: 'Transactions', href: 'Receipts', icon: merchantIcons.receipts },
    { name: 'Devices', href: 'Devices', icon: merchantIcons.devices },
    { name: 'Point of Sale', href: 'POSHome', icon: merchantIcons.pos },
    { name: 'Settings', href: 'Settings', icon: merchantIcons.settings },
  ]

  const unreadCount = notifications.filter(n => !n.is_read).length

  const handleNavigation = (href: string) => {
    navigation.navigate(href as keyof RootStackParamList)
    setSearchOpen(false)
  }

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, is_read: true } : n)
    )
  }

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
  }

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: () => authLogout() }
      ]
    )
    setUserMenuOpen(false)
  }

  return (
    <View style={styles.header}>
      <View style={styles.headerContent}>
        {/* Left Section */}
        <View style={styles.leftSection}>
          {/* Mobile Menu Button */}
          <TouchableOpacity
            style={styles.menuButton}
            onPress={onMenuClick}
          >
            <merchantIcons.settings size={20} color={merchantDesignTokens.colors.gray[600]} />
          </TouchableOpacity>

          {/* Breadcrumbs */}
          <View style={styles.breadcrumbs}>
            {breadcrumbs.map((crumb, index) => (
              <View key={crumb.href} style={styles.breadcrumbItem}>
                {index > 0 && (
                  <View style={styles.breadcrumbSeparator}>
                    <merchantIcons.settings
                      size={16}
                      color={merchantDesignTokens.colors.gray[400]}
                    />
                  </View>
                )}
                {index === breadcrumbs.length - 1 ? (
                  <Text style={styles.breadcrumbActive}>
                    {crumb.name}
                  </Text>
                ) : (
                  <TouchableOpacity onPress={() => handleNavigation(crumb.href)}>
                    <Text style={styles.breadcrumbLink}>
                      {crumb.name}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        </View>

        {/* Center Section - Page Title (Mobile) */}
        <View style={styles.centerSection}>
          <Text style={styles.mobileTitle}>
            {breadcrumbs[breadcrumbs.length - 1]?.name}
          </Text>
        </View>

        {/* Right Section */}
        <View style={styles.rightSection}>
          {/* Global Search */}
          <TouchableOpacity
            style={styles.searchButton}
            onPress={() => setSearchOpen(true)}
          >
            <merchantIcons.analytics size={16} color={merchantDesignTokens.colors.gray[600]} />
            <Text style={styles.searchText}>Search...</Text>
            <View style={styles.kbdContainer}>
              <Text style={styles.kbdText}>âŒ˜K</Text>
            </View>
          </TouchableOpacity>

          {/* Mobile Search Button */}
          <TouchableOpacity
            style={styles.mobileSearchButton}
            onPress={() => setSearchOpen(true)}
          >
            <merchantIcons.analytics size={20} color={merchantDesignTokens.colors.gray[600]} />
          </TouchableOpacity>

          {/* Theme Toggle */}
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => setThemeMenuOpen(true)}
          >
            {theme === 'light' && <merchantIcons.dashboard size={20} color={merchantDesignTokens.colors.gray[600]} />}
            {theme === 'dark' && <merchantIcons.devices size={20} color={merchantDesignTokens.colors.gray[600]} />}
            {theme === 'system' && <merchantIcons.settings size={20} color={merchantDesignTokens.colors.gray[600]} />}
          </TouchableOpacity>

          {/* Notifications */}
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => setNotifOpen(true)}
          >
            {unreadCount > 0 ? (
              <View>
                <merchantIcons.receipts size={20} color={merchantDesignTokens.colors.primary[600]} />
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>
                    {unreadCount > 9 ? '9+' : unreadCount.toString()}
                  </Text>
                </View>
              </View>
            ) : (
              <merchantIcons.receipts size={20} color={merchantDesignTokens.colors.gray[600]} />
            )}
          </TouchableOpacity>

          {/* User Menu - EXACT admin styling */}
          <TouchableOpacity
            style={styles.profileButton}
            onPress={() => setUserMenuOpen(true)}
          >
            <View style={[
              styles.avatar,
              styles.avatarRing
            ]}>
              <Text style={styles.avatarText}>
                {user?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'M'}
              </Text>
              <View style={styles.avatarGlow} />
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Global Search Modal */}
      <Modal
        visible={searchOpen}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setSearchOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.searchModal}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search merchant functions..."
              autoFocus={true}
            />
            <ScrollView style={styles.searchResults}>
              <Text style={styles.searchGroupTitle}>Navigation</Text>
              {searchItems.map((item) => (
                <TouchableOpacity
                  key={item.href}
                  style={styles.searchItem}
                  onPress={() => handleNavigation(item.href)}
                >
                  <item.icon size={16} color={merchantDesignTokens.colors.gray[600]} />
                  <Text style={styles.searchItemText}>{item.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Notifications Modal */}
      <Modal
        visible={notifOpen}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setNotifOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.notificationsModal}>
            <View style={styles.notificationsHeader}>
              <Text style={styles.notificationsTitle}>Notifications</Text>
              {unreadCount > 0 && (
                <TouchableOpacity onPress={markAllAsRead}>
                  <Text style={styles.markAllReadText}>Mark all read</Text>
                </TouchableOpacity>
              )}
            </View>
            <ScrollView style={styles.notificationsList}>
              {notifications.length === 0 ? (
                <View style={styles.noNotifications}>
                  <merchantIcons.receipts size={40} color={merchantDesignTokens.colors.gray[300]} />
                  <Text style={styles.noNotificationsText}>No notifications</Text>
                </View>
              ) : (
                notifications.slice(0, 5).map((notif) => {
                  const IconComponent = getNotificationIcon(notif.notification_type || '', notif.level)
                  return (
                    <TouchableOpacity
                      key={notif.id}
                      style={[styles.notificationItem, !notif.is_read && styles.notificationUnread]}
                      onPress={() => markAsRead(notif.id)}
                    >
                      <View style={styles.notificationIcon}>
                        <IconComponent size={16} color={
                          notif.notification_type?.includes('security') ? merchantDesignTokens.colors.error[500] :
                          (notif.level === 'warning' || notif.level === 'error') ? merchantDesignTokens.colors.warning[500] :
                          merchantDesignTokens.colors.primary[500]
                        } />
                      </View>
                      <View style={styles.notificationContent}>
                        <Text style={[styles.notificationTitle, !notif.is_read && styles.notificationTitleUnread]}>
                          {notif.title}
                        </Text>
                        <Text style={styles.notificationMessage}>
                          {notif.message}
                        </Text>
                        <Text style={styles.notificationTime}>
                          {new Date(notif.created_at).toLocaleDateString()}
                        </Text>
                      </View>
                      {!notif.is_read && <View style={styles.unreadDot} />}
                    </TouchableOpacity>
                  )
                })
              )}
            </ScrollView>
            <TouchableOpacity
              style={styles.viewAllNotifications}
              onPress={() => {
                setNotifOpen(false)
                handleNavigation('Settings') // Navigate to settings or dedicated notifications screen
              }}
            >
              <Text style={styles.viewAllText}>View all notifications</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* User Menu Modal */}
      <Modal
        visible={userMenuOpen}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setUserMenuOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.userMenuModal}>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{user?.name}</Text>
              <Text style={styles.userEmail}>{user?.email}</Text>
              <View style={styles.userBadge}>
                <View style={styles.userBadgeDot} />
                <Text style={styles.userBadgeText}>Merchant</Text>
              </View>
            </View>
            <View style={styles.menuSeparator} />
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setUserMenuOpen(false)
                handleNavigation('Settings')
              }}
            >
              <merchantIcons.settings size={16} color={merchantDesignTokens.colors.gray[600]} />
              <Text style={styles.menuItemText}>Settings</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setUserMenuOpen(false)
                handleNavigation('Profile')
              }}
            >
              <merchantIcons.profile size={16} color={merchantDesignTokens.colors.gray[600]} />
              <Text style={styles.menuItemText}>Profile</Text>
            </TouchableOpacity>
            <View style={styles.menuSeparator} />
            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleLogout}
            >
              <merchantIcons.logout size={16} color={merchantDesignTokens.colors.error[600]} />
              <Text style={[styles.menuItemText, styles.logoutText]}>Sign out</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Theme Menu Modal */}
      <Modal
        visible={themeMenuOpen}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setThemeMenuOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.themeMenuModal}>
            <Text style={styles.themeMenuTitle}>Theme</Text>
            <View style={styles.menuSeparator} />
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleThemeChange('light')}
            >
              <merchantIcons.dashboard size={16} color={merchantDesignTokens.colors.gray[600]} />
              <Text style={styles.menuItemText}>Light</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleThemeChange('dark')}
            >
              <merchantIcons.devices size={16} color={merchantDesignTokens.colors.gray[600]} />
              <Text style={styles.menuItemText}>Dark</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleThemeChange('system')}
            >
              <merchantIcons.settings size={16} color={merchantDesignTokens.colors.gray[600]} />
              <Text style={styles.menuItemText}>System</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: merchantDesignTokens.colors.surface.primary, // EXACT admin: bg-white
    borderBottomWidth: 1, // EXACT admin: border-b
    borderBottomColor: merchantDesignTokens.colors.border.default, // EXACT admin: border-gray-200
    position: 'absolute', // React Native only supports absolute, relative, static
    top: 0,
    left: 0,
    right: 0,
    zIndex: 30, // EXACT admin: z-30
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: merchantDesignTokens.spacing.lg, // EXACT admin: px-6
    height: 64, // EXACT admin: h-16
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuButton: {
    padding: merchantDesignTokens.spacing.sm,
    borderRadius: merchantDesignTokens.borderRadius.md,
    marginRight: merchantDesignTokens.spacing.md,
    backgroundColor: 'transparent', // EXACT admin: hover:bg-gray-100 (simulated)
  },
  breadcrumbs: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  breadcrumbItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  breadcrumbSeparator: {
    marginHorizontal: merchantDesignTokens.spacing.xs,
  },
  breadcrumbActive: {
    fontSize: merchantDesignTokens.typography.fontSize.sm,
    fontWeight: merchantDesignTokens.typography.fontWeight.semibold, // EXACT admin: font-medium
    color: merchantDesignTokens.colors.text.primary, // EXACT admin: text-gray-900 dark:text-white
    fontFamily: merchantDesignTokens.typography.fontFamily.sans[0],
  },
  breadcrumbLink: {
    fontSize: merchantDesignTokens.typography.fontSize.sm,
    color: merchantDesignTokens.colors.text.secondary, // EXACT admin: text-gray-600 dark:text-gray-400
    fontFamily: merchantDesignTokens.typography.fontFamily.sans[0],
  },
  centerSection: {
    flex: 1,
    alignItems: 'center',
  },
  mobileTitle: {
    fontSize: merchantDesignTokens.typography.fontSize.lg,
    fontWeight: merchantDesignTokens.typography.fontWeight.semibold,
    color: merchantDesignTokens.colors.text.primary,
    fontFamily: merchantDesignTokens.typography.fontFamily.sans[0],
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: merchantDesignTokens.spacing.sm,
  },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: merchantDesignTokens.spacing.sm,
    paddingHorizontal: merchantDesignTokens.spacing.md, // EXACT admin: px-3
    paddingVertical: merchantDesignTokens.spacing.sm, // EXACT admin: py-2
    borderRadius: merchantDesignTokens.borderRadius.md, // EXACT admin: rounded-lg
    backgroundColor: merchantDesignTokens.colors.gray[50], // EXACT admin: hover:bg-gray-100
  },
  searchText: {
    fontSize: merchantDesignTokens.typography.fontSize.sm,
    color: merchantDesignTokens.colors.text.secondary,
    fontFamily: merchantDesignTokens.typography.fontFamily.sans[0],
  },
  kbdContainer: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: merchantDesignTokens.colors.gray[200],
    borderRadius: 4,
  },
  kbdText: {
    fontSize: 10,
    fontWeight: '500',
    color: merchantDesignTokens.colors.primary[600],
    fontFamily: 'monospace',
  },
  mobileSearchButton: {
    padding: merchantDesignTokens.spacing.sm,
    borderRadius: merchantDesignTokens.borderRadius.md,
    backgroundColor: merchantDesignTokens.colors.gray[50],
  },
  iconButton: {
    padding: merchantDesignTokens.spacing.sm,
    borderRadius: merchantDesignTokens.borderRadius.md,
    backgroundColor: 'transparent', // EXACT admin: hover:bg-gray-100
  },
  notificationBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: merchantDesignTokens.colors.error[500],
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  profileButton: {
    padding: merchantDesignTokens.spacing.xs,
    borderRadius: merchantDesignTokens.borderRadius.full,
    backgroundColor: 'transparent', // EXACT admin: hover:bg-gray-100
  },
  avatar: {
    position: 'relative',
    width: 40, // EXACT admin: h-10 w-10
    height: 40,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 100,
  },
  searchModal: {
    backgroundColor: merchantDesignTokens.colors.surface.primary,
    borderRadius: merchantDesignTokens.borderRadius.lg,
    width: '90%',
    maxWidth: 600,
    maxHeight: '70%',
    ...merchantDesignTokens.shadows.lg,
  },
  searchInput: {
    borderBottomWidth: 1,
    borderBottomColor: merchantDesignTokens.colors.border.default,
    padding: merchantDesignTokens.spacing.md,
    fontSize: merchantDesignTokens.typography.fontSize.base,
    fontFamily: merchantDesignTokens.typography.fontFamily.sans[0],
  },
  searchResults: {
    padding: merchantDesignTokens.spacing.md,
  },
  searchGroupTitle: {
    fontSize: merchantDesignTokens.typography.fontSize.sm,
    fontWeight: merchantDesignTokens.typography.fontWeight.semibold,
    color: merchantDesignTokens.colors.text.secondary,
    marginBottom: merchantDesignTokens.spacing.sm,
    textTransform: 'uppercase',
  },
  searchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: merchantDesignTokens.spacing.sm,
    borderRadius: merchantDesignTokens.borderRadius.md,
    gap: merchantDesignTokens.spacing.sm,
  },
  searchItemText: {
    fontSize: merchantDesignTokens.typography.fontSize.base,
    color: merchantDesignTokens.colors.text.primary,
    fontFamily: merchantDesignTokens.typography.fontFamily.sans[0],
  },
  notificationsModal: {
    backgroundColor: merchantDesignTokens.colors.surface.primary,
    borderRadius: merchantDesignTokens.borderRadius.lg,
    width: '90%',
    maxWidth: 400,
    maxHeight: '70%',
    ...merchantDesignTokens.shadows.lg,
  },
  notificationsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: merchantDesignTokens.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: merchantDesignTokens.colors.border.default,
  },
  notificationsTitle: {
    fontSize: merchantDesignTokens.typography.fontSize.lg,
    fontWeight: merchantDesignTokens.typography.fontWeight.semibold,
    color: merchantDesignTokens.colors.text.primary,
  },
  markAllReadText: {
    fontSize: merchantDesignTokens.typography.fontSize.sm,
    color: merchantDesignTokens.colors.primary[600],
    fontWeight: merchantDesignTokens.typography.fontWeight.medium,
  },
  notificationsList: {
    maxHeight: 300,
  },
  notificationItem: {
    flexDirection: 'row',
    padding: merchantDesignTokens.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: merchantDesignTokens.colors.border.default,
  },
  notificationUnread: {
    backgroundColor: merchantDesignTokens.colors.primary[50],
  },
  notificationIcon: {
    marginRight: merchantDesignTokens.spacing.sm,
    marginTop: 2,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: merchantDesignTokens.typography.fontSize.sm,
    fontWeight: merchantDesignTokens.typography.fontWeight.medium,
    color: merchantDesignTokens.colors.text.primary,
    marginBottom: 2,
  },
  notificationTitleUnread: {
    color: merchantDesignTokens.colors.text.primary,
  },
  notificationMessage: {
    fontSize: merchantDesignTokens.typography.fontSize.sm,
    color: merchantDesignTokens.colors.text.secondary,
    lineHeight: 16,
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: merchantDesignTokens.typography.fontSize.xs,
    color: merchantDesignTokens.colors.text.tertiary,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: merchantDesignTokens.colors.primary[500],
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  noNotifications: {
    alignItems: 'center',
    padding: merchantDesignTokens.spacing.xl,
  },
  noNotificationsText: {
    fontSize: merchantDesignTokens.typography.fontSize.base,
    color: merchantDesignTokens.colors.text.secondary,
    marginTop: merchantDesignTokens.spacing.sm,
  },
  viewAllNotifications: {
    padding: merchantDesignTokens.spacing.md,
    borderTopWidth: 1,
    borderTopColor: merchantDesignTokens.colors.border.default,
    alignItems: 'center',
  },
  viewAllText: {
    fontSize: merchantDesignTokens.typography.fontSize.sm,
    color: merchantDesignTokens.colors.primary[600],
    fontWeight: merchantDesignTokens.typography.fontWeight.medium,
  },
  userMenuModal: {
    backgroundColor: merchantDesignTokens.colors.surface.primary,
    borderRadius: merchantDesignTokens.borderRadius.lg,
    width: '90%',
    maxWidth: 300,
    ...merchantDesignTokens.shadows.lg,
  },
  userInfo: {
    padding: merchantDesignTokens.spacing.md,
  },
  userName: {
    fontSize: merchantDesignTokens.typography.fontSize.base,
    fontWeight: merchantDesignTokens.typography.fontWeight.semibold,
    color: merchantDesignTokens.colors.text.primary,
    marginBottom: 2,
  },
  userEmail: {
    fontSize: merchantDesignTokens.typography.fontSize.sm,
    color: merchantDesignTokens.colors.text.secondary,
    marginBottom: merchantDesignTokens.spacing.sm,
  },
  userBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: merchantDesignTokens.spacing.sm,
    paddingVertical: 4,
    borderRadius: merchantDesignTokens.borderRadius.lg,
    backgroundColor: merchantDesignTokens.colors.primary[50],
  },
  userBadgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: merchantDesignTokens.colors.primary[500],
    marginRight: merchantDesignTokens.spacing.xs,
  },
  userBadgeText: {
    fontSize: merchantDesignTokens.typography.fontSize.xs,
    fontWeight: merchantDesignTokens.typography.fontWeight.medium,
    color: merchantDesignTokens.colors.primary[700],
  },
  menuSeparator: {
    height: 1,
    backgroundColor: merchantDesignTokens.colors.border.default,
    marginHorizontal: merchantDesignTokens.spacing.md,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: merchantDesignTokens.spacing.md,
    gap: merchantDesignTokens.spacing.sm,
  },
  menuItemText: {
    fontSize: merchantDesignTokens.typography.fontSize.base,
    color: merchantDesignTokens.colors.text.primary,
    fontFamily: merchantDesignTokens.typography.fontFamily.sans[0],
  },
  logoutText: {
    color: merchantDesignTokens.colors.error[600],
  },
  themeMenuModal: {
    backgroundColor: merchantDesignTokens.colors.surface.primary,
    borderRadius: merchantDesignTokens.borderRadius.lg,
    width: '90%',
    maxWidth: 250,
    ...merchantDesignTokens.shadows.lg,
  },
  themeMenuTitle: {
    fontSize: merchantDesignTokens.typography.fontSize.lg,
    fontWeight: merchantDesignTokens.typography.fontWeight.semibold,
    color: merchantDesignTokens.colors.text.primary,
    padding: merchantDesignTokens.spacing.md,
    textAlign: 'center',
  },
})

export default MerchantHeader

