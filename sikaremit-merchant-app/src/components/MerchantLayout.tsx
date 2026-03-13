'use client'

import React, { useState, useEffect } from 'react'
import { View, StyleSheet, Dimensions, TouchableOpacity, Modal, Text, ScrollView } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { merchantDesignTokens } from '../constants/designTokens'
import MerchantSidebar from './MerchantSidebar'
import MerchantHeader from './MerchantHeader'
import MerchantScreenRouter, { MerchantScreenType } from './MerchantScreenRouter'
import { MERCHANT_NAVIGATION_ITEMS } from '../constants/merchant-navigation'

const { width: screenWidth } = Dimensions.get('window')

interface MerchantLayoutProps {
  children?: React.ReactNode // Made optional since we'll use screen router
  title?: string
  initialScreen?: MerchantScreenType
  showHeader?: boolean // Add showHeader prop
}

const MerchantLayout: React.FC<MerchantLayoutProps> = ({
  children,
  title,
  initialScreen = 'MerchantDashboard',
  showHeader = true // Default to true for backward compatibility
}) => {
  const insets = useSafeAreaInsets()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [currentScreen, setCurrentScreen] = useState<MerchantScreenType>(initialScreen)

  // Handle responsive behavior
  useEffect(() => {
    const updateSidebarState = () => {
      const isLargeScreen = screenWidth >= merchantDesignTokens.breakpoints.lg
      setSidebarOpen(isLargeScreen)
      setSidebarCollapsed(!isLargeScreen) // Collapse on smaller screens
    }

    updateSidebarState()
    // Note: In a real app, you'd add a listener for dimension changes
  }, [])

  const handleMenuClick = () => {
    setSidebarOpen(!sidebarOpen)
  }

  const handleCloseSidebar = () => {
    setSidebarOpen(false)
  }

  const handleToggleCollapsed = (collapsed: boolean) => {
    setSidebarCollapsed(collapsed)
  }

  const handleScreenChange = (screen: MerchantScreenType) => {
    setCurrentScreen(screen)
  }

  // Handle responsive behavior
  useEffect(() => {
    const updateSidebarState = () => {
      const isLargeScreen = screenWidth >= merchantDesignTokens.breakpoints.lg
      setSidebarOpen(isLargeScreen)
      setSidebarCollapsed(!isLargeScreen) // Collapse on smaller screens
    }

    updateSidebarState()
    // Note: In a real app, you'd add a listener for dimension changes
  }, [])

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Sidebar Overlay for Mobile - EXACT admin pattern */}
      {sidebarOpen && screenWidth < merchantDesignTokens.breakpoints.lg && (
        <Modal
          visible={sidebarOpen}
          transparent={true}
          animationType="fade"
          onRequestClose={handleCloseSidebar}
        >
          <TouchableOpacity
            style={styles.overlay}
            activeOpacity={1}
            onPress={handleCloseSidebar}
          >
            <View style={styles.sidebarWrapper}>
              <MerchantSidebar
                isOpen={sidebarOpen}
                onClose={handleCloseSidebar}
                onToggleCollapsed={handleToggleCollapsed}
                collapsed={sidebarCollapsed}
                onScreenChange={handleScreenChange}
                currentScreen={currentScreen}
              />
            </View>
          </TouchableOpacity>
        </Modal>
      )}

      {/* Fixed Header - Only render if showHeader is true - EXACT admin structure */}
      {showHeader && (
        <View style={styles.screenHeader}>
          <MerchantHeader
            onMenuClick={handleMenuClick}
            sidebarOpen={sidebarOpen}
            sidebarCollapsed={sidebarCollapsed}
            title={title}
          />
        </View>
      )}

      {/* Main Content Area - EXACT admin layout */}
      <View style={[styles.contentArea, showHeader ? { marginTop: merchantDesignTokens.components.header.height } : {}]}>
        {/* Sidebar - Desktop - EXACT admin positioning */}
        {screenWidth >= merchantDesignTokens.breakpoints.lg && (
          <MerchantSidebar
            isOpen={sidebarOpen}
            onClose={handleCloseSidebar}
            onToggleCollapsed={handleToggleCollapsed}
            collapsed={sidebarCollapsed}
            onScreenChange={handleScreenChange}
            currentScreen={currentScreen}
          />
        )}

        {/* Main Content - EXACT admin structure */}
        <View style={[
          styles.mainContent,
          {
            marginLeft: screenWidth >= merchantDesignTokens.breakpoints.lg
              ? (sidebarCollapsed
                  ? merchantDesignTokens.components.sidebar.width.collapsed
                  : merchantDesignTokens.components.sidebar.width.expanded)
              : 0
          }
        ]}>
          <ScrollView style={styles.contentWrapper}>
            <View style={styles.content}>
              {children ? children : (
                <MerchantScreenRouter currentScreen={currentScreen} />
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: merchantDesignTokens.colors.surface.secondary, // EXACT admin: bg-gray-50
  },
  overlay: {
    flex: 1,
    backgroundColor: merchantDesignTokens.colors.surface.overlay, // EXACT admin: backdrop
  },
  sidebarWrapper: {
    flex: 1,
  },
  screenHeader: {
    position: 'absolute', // Fixed positioning to stay at top while scrolling
    top: 0,
    left: 0,
    right: 0,
    zIndex: 30, // EXACT admin: z-30
    elevation: 10,
  },
  contentArea: {
    flex: 1,
    flexDirection: 'row', // EXACT admin: flex row layout
  },
  mainContent: {
    flex: 1,
    backgroundColor: merchantDesignTokens.colors.surface.secondary, // EXACT admin: bg-gray-50
    minHeight: '100%', // EXACT admin: full height
  },
  contentWrapper: {
    flex: 1,
    // Remove overflow: 'hidden' to allow ScrollView to work
  },
  content: {
    flex: 1,
    padding: merchantDesignTokens.spacing.lg, // EXACT admin: p-6
    maxWidth: merchantDesignTokens.breakpoints['2xl'], // EXACT admin: max-w-7xl
    alignSelf: 'center',
    width: '100%',
  },
})

export default MerchantLayout
