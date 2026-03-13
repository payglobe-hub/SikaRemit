'use client'

import React from 'react'
import { View } from 'react-native'
import MerchantDashboardScreen from '../screens/dashboard/MerchantDashboardScreen'
import AnalyticsScreen from '../screens/analytics/AnalyticsScreen'
import DevicesScreen from '../screens/devices/DevicesScreen'
import ReceiptsScreen from '../screens/receipts/ReceiptsScreen'
import SoftPOSHomeScreen from '../screens/pos/SoftPOSHomeScreen'
import MerchantStoreManagementScreen from '../screens/ecommerce/MerchantStoreManagementScreen'
import MerchantProductManagementScreen from '../screens/ecommerce/MerchantProductManagementScreen'
import MerchantOrderFulfillmentScreen from '../screens/ecommerce/MerchantOrderFulfillmentScreen'
import MerchantPayoutManagementScreen from '../screens/ecommerce/MerchantPayoutManagementScreen'

export type MerchantScreenType =
  | 'MerchantDashboard'
  | 'Analytics'
  | 'Devices'
  | 'Receipts'
  | 'POSHome'
  | 'Stores'
  | 'Products'
  | 'Orders'
  | 'Payouts'

interface MerchantScreenRouterProps {
  currentScreen: MerchantScreenType
}

const MerchantScreenRouter: React.FC<MerchantScreenRouterProps> = ({ currentScreen }) => {
  const renderCurrentScreen = () => {
    switch (currentScreen) {
      case 'MerchantDashboard':
        return <MerchantDashboardScreen />
      case 'Analytics':
        return <AnalyticsScreen />
      case 'Devices':
        return <DevicesScreen />
      case 'Receipts':
        return <ReceiptsScreen />
      case 'POSHome':
        return <SoftPOSHomeScreen />
      case 'Stores':
        return <MerchantStoreManagementScreen />
      case 'Products':
        return <MerchantProductManagementScreen />
      case 'Orders':
        return <MerchantOrderFulfillmentScreen />
      case 'Payouts':
        return <MerchantPayoutManagementScreen />
      default:
        return <MerchantDashboardScreen />
    }
  }

  return (
    <View style={{ flex: 1 }}>
      {renderCurrentScreen()}
    </View>
  )
}

export default MerchantScreenRouter
