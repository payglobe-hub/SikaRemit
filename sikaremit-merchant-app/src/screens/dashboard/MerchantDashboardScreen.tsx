import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { merchantDesignTokens, getNavigationColor, merchantIcons } from '../../constants';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiClient } from '../../services/api';
import MerchantLayout from '../../components/MerchantLayout';
import { RootStackParamList } from '../../navigation/RootNavigator';

const { width } = Dimensions.get('window');

interface DashboardData {
  overview: {
    totalRevenue: number;
    totalTransactions: number;
    activeDevices: number;
    growthRate: number;
  };
  recentTransactions: Array<{
    id: string;
    amount: number;
    payment_method: string;
    status: string;
    created_at: string;
    customer_name?: string;
  }>;
  deviceStatus: {
    total: number;
    active: number;
    offline: number;
    maintenance: number;
  };
  quickStats: {
    todayRevenue: number;
    todayTransactions: number;
    pendingReceipts: number;
    lowBatteryDevices: number;
  };
}

const MerchantDashboardScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Consume from existing SikaRemit backend API
      const response = await apiClient.get('/merchant/dashboard/');
      
      if (response.data.success) {
        setDashboardData(response.data);
      } else {
        throw new Error(response.data.error || 'Failed to load dashboard');
      }
    } catch (error) {
      console.error('Dashboard loading failed:', error);
      // Show error state or use mock data
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  const navigateToScreen = (screen: string) => {
    // Navigation now handled by sidebar in layout
    
  };

  const renderOverviewCards = () => {
    if (!dashboardData) return null;

    const { overview } = dashboardData;

    return (
      <View style={styles.overviewContainer}>
        <TouchableOpacity
          style={styles.overviewCard}
          onPress={() => navigateToScreen('Analytics')}
        >
          <Text style={styles.overviewLabel}>Total Revenue</Text>
          <Text style={styles.overviewValue}>â‚µ{overview.totalRevenue.toLocaleString()}</Text>
          <Text style={[styles.overviewChange, { color: overview.growthRate >= 0 ? '#4CAF50' : '#F44336' }]}>
            {overview.growthRate >= 0 ? '+' : ''}{overview.growthRate}% vs last period
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.overviewCard}
          onPress={() => navigateToScreen('Receipts')}
        >
          <Text style={styles.overviewLabel}>Transactions</Text>
          <Text style={styles.overviewValue}>{overview.totalTransactions.toLocaleString()}</Text>
          <Text style={styles.overviewSubtext}>All time</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.overviewCard}
          onPress={() => navigateToScreen('Devices')}
        >
          <Text style={styles.overviewLabel}>Active Devices</Text>
          <Text style={styles.overviewValue}>{overview.activeDevices}</Text>
          <Text style={styles.overviewSubtext}>Online now</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderQuickActions = () => (
    <View style={styles.quickActionsContainer}>
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.quickActionsGrid}>
        <TouchableOpacity
          style={styles.quickActionButton}
          onPress={() => navigateToScreen('POSHome')}
        >
          <View style={[styles.quickActionIcon, { backgroundColor: getNavigationColor('pos').bgColor }]}>
            <merchantIcons.pos size={24} color={getNavigationColor('pos').iconColor} />
          </View>
          <Text style={styles.quickActionText}>Start POS</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickActionButton}
          onPress={() => navigateToScreen('Analytics')}
        >
          <View style={[styles.quickActionIcon, { backgroundColor: getNavigationColor('analytics').bgColor }]}>
            <merchantIcons.analytics size={24} color={getNavigationColor('analytics').iconColor} />
          </View>
          <Text style={styles.quickActionText}>Analytics</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickActionButton}
          onPress={() => navigateToScreen('Devices')}
        >
          <View style={[styles.quickActionIcon, { backgroundColor: getNavigationColor('devices').bgColor }]}>
            <merchantIcons.devices size={24} color={getNavigationColor('devices').iconColor} />
          </View>
          <Text style={styles.quickActionText}>Devices</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickActionButton}
          onPress={() => navigateToScreen('Receipts')}
        >
          <View style={[styles.quickActionIcon, { backgroundColor: getNavigationColor('receipts').bgColor }]}>
            <merchantIcons.receipts size={24} color={getNavigationColor('receipts').iconColor} />
          </View>
          <Text style={styles.quickActionText}>Receipts</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderQuickStats = () => {
    if (!dashboardData) return null;

    const { quickStats } = dashboardData;

    return (
      <View style={styles.quickStatsContainer}>
        <Text style={styles.sectionTitle}>Today's Overview</Text>
        <View style={styles.quickStatsGrid}>
          <View style={styles.quickStatItem}>
            <Text style={styles.quickStatValue}>â‚µ{quickStats.todayRevenue.toLocaleString()}</Text>
            <Text style={styles.quickStatLabel}>Revenue</Text>
          </View>
          <View style={styles.quickStatItem}>
            <Text style={styles.quickStatValue}>{quickStats.todayTransactions}</Text>
            <Text style={styles.quickStatLabel}>Transactions</Text>
          </View>
          <View style={styles.quickStatItem}>
            <Text style={styles.quickStatValue}>{quickStats.pendingReceipts}</Text>
            <Text style={styles.quickStatLabel}>Pending</Text>
          </View>
          <View style={styles.quickStatItem}>
            <Text style={styles.quickStatValue}>{quickStats.lowBatteryDevices}</Text>
            <Text style={styles.quickStatLabel}>Low Battery</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderDeviceStatus = () => {
    if (!dashboardData) return null;

    const { deviceStatus } = dashboardData;

    return (
      <View style={styles.deviceStatusContainer}>
        <Text style={styles.sectionTitle}>Device Status</Text>
        <View style={styles.deviceStatusGrid}>
          <View style={styles.deviceStatusItem}>
            <View style={[styles.deviceStatusDot, { backgroundColor: '#4CAF50' }]} />
            <Text style={styles.deviceStatusLabel}>Active</Text>
            <Text style={styles.deviceStatusValue}>{deviceStatus.active}</Text>
          </View>
          <View style={styles.deviceStatusItem}>
            <View style={[styles.deviceStatusDot, { backgroundColor: '#F44336' }]} />
            <Text style={styles.deviceStatusLabel}>Offline</Text>
            <Text style={styles.deviceStatusValue}>{deviceStatus.offline}</Text>
          </View>
          <View style={styles.deviceStatusItem}>
            <View style={[styles.deviceStatusDot, { backgroundColor: '#FF9800' }]} />
            <Text style={styles.deviceStatusLabel}>Maintenance</Text>
            <Text style={styles.deviceStatusValue}>{deviceStatus.maintenance}</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderRecentTransactions = () => {
    if (!dashboardData?.recentTransactions) return null;

    return (
      <View style={styles.recentTransactionsContainer}>
        <View style={styles.recentTransactionsHeader}>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
          <TouchableOpacity onPress={() => navigateToScreen('Receipts')}>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>
        
        {dashboardData.recentTransactions.slice(0, 5).map((transaction) => (
          <View key={transaction.id} style={styles.transactionItem}>
            <View style={styles.transactionInfo}>
              <Text style={styles.transactionAmount}>â‚µ{transaction.amount.toFixed(2)}</Text>
              <Text style={styles.transactionMethod}>{transaction.payment_method}</Text>
              {transaction.customer_name && (
                <Text style={styles.transactionCustomer}>{transaction.customer_name}</Text>
              )}
            </View>
            <View style={styles.transactionMeta}>
              <Text style={styles.transactionTime}>
                {new Date(transaction.created_at).toLocaleTimeString()}
              </Text>
              <View style={[
                styles.transactionStatus,
                { backgroundColor: getStatusColor(transaction.status) }
              ]}>
                <Text style={styles.transactionStatusText}>
                  {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                </Text>
              </View>
            </View>
          </View>
        ))}
      </View>
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#4CAF50';
      case 'pending': return '#FF9800';
      case 'failed': return '#F44336';
      default: return '#666';
    }
  };

  if (loading && !dashboardData) {
    return (
      <MerchantLayout title="MerchantDashboard">
        <View style={[styles.container, styles.loadingContainer]}>
          <ActivityIndicator size="large" color={merchantDesignTokens.colors.primary[500]} />
          <Text style={styles.loadingText}>Loading dashboard...</Text>
        </View>
      </MerchantLayout>
    );
  }

  return (
    <MerchantLayout title="MerchantDashboard">
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Overview Cards */}
        {renderOverviewCards()}

        {/* Quick Actions */}
        {renderQuickActions()}

        {/* Quick Stats */}
        {renderQuickStats()}

        {/* Device Status */}
        {renderDeviceStatus()}

        {/* Recent Transactions */}
        {renderRecentTransactions()}

        {/* Bottom padding */}
        <View style={{ height: 20 }} />
      </ScrollView>
    </MerchantLayout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: merchantDesignTokens.colors.surface.secondary,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: merchantDesignTokens.spacing.lg,
    fontSize: merchantDesignTokens.typography.fontSize.base,
    color: merchantDesignTokens.colors.text.secondary,
    fontFamily: merchantDesignTokens.typography.fontFamily.sans[0],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: merchantDesignTokens.spacing.lg,
    paddingVertical: merchantDesignTokens.spacing.lg,
    backgroundColor: merchantDesignTokens.colors.primary[500],
    ...merchantDesignTokens.shadows.sm,
  },
  headerTitle: {
    fontSize: merchantDesignTokens.typography.fontSize.lg,
    fontWeight: merchantDesignTokens.typography.fontWeight.semibold,
    color: merchantDesignTokens.colors.text.inverse,
    fontFamily: merchantDesignTokens.typography.fontFamily.sans[0],
  },
  refreshButton: {
    padding: 8,
  },
  refreshButtonText: {
    fontSize: merchantDesignTokens.typography.fontSize.xl,
    color: merchantDesignTokens.colors.text.inverse,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: merchantDesignTokens.spacing.lg,
  },
  overviewContainer: {
    marginBottom: merchantDesignTokens.spacing['3xl'],
  },
  overviewCard: {
    backgroundColor: merchantDesignTokens.colors.surface.primary,
    padding: merchantDesignTokens.spacing['2xl'],
    borderRadius: merchantDesignTokens.borderRadius.xl,
    alignItems: 'center',
    marginBottom: merchantDesignTokens.spacing.md,
    ...merchantDesignTokens.shadows.md,
  },
  overviewLabel: {
    fontSize: merchantDesignTokens.typography.fontSize.sm,
    color: merchantDesignTokens.colors.text.secondary,
    marginBottom: merchantDesignTokens.spacing.sm,
    fontFamily: merchantDesignTokens.typography.fontFamily.sans[0],
  },
  overviewValue: {
    fontSize: merchantDesignTokens.typography.fontSize['2xl'],
    fontWeight: merchantDesignTokens.typography.fontWeight.bold,
    color: merchantDesignTokens.colors.text.primary,
    marginBottom: merchantDesignTokens.spacing.xs,
    fontFamily: merchantDesignTokens.typography.fontFamily.sans[0],
  },
  overviewChange: {
    fontSize: merchantDesignTokens.typography.fontSize.xs,
    fontWeight: merchantDesignTokens.typography.fontWeight.medium,
    fontFamily: merchantDesignTokens.typography.fontFamily.sans[0],
  },
  overviewSubtext: {
    fontSize: merchantDesignTokens.typography.fontSize.xs,
    color: merchantDesignTokens.colors.text.tertiary,
    fontFamily: merchantDesignTokens.typography.fontFamily.sans[0],
  },
  quickActionsContainer: {
    marginBottom: merchantDesignTokens.spacing['3xl'],
  },
  sectionTitle: {
    fontSize: merchantDesignTokens.typography.fontSize.lg,
    fontWeight: merchantDesignTokens.typography.fontWeight.semibold,
    color: merchantDesignTokens.colors.text.primary,
    marginBottom: merchantDesignTokens.spacing.lg,
    fontFamily: merchantDesignTokens.typography.fontFamily.sans[0],
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickActionButton: {
    width: (width - merchantDesignTokens.spacing['5xl']) / 2,
    backgroundColor: merchantDesignTokens.colors.surface.primary,
    padding: merchantDesignTokens.spacing['2xl'],
    borderRadius: merchantDesignTokens.borderRadius.xl,
    alignItems: 'center',
    marginBottom: merchantDesignTokens.spacing.md,
    ...merchantDesignTokens.shadows.md,
  },
  quickActionIcon: {
    width: merchantDesignTokens.spacing['6xl'],
    height: merchantDesignTokens.spacing['6xl'],
    borderRadius: merchantDesignTokens.borderRadius['3xl'],
    backgroundColor: getNavigationColor('pos').bgColor,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: merchantDesignTokens.spacing.md,
  },
  quickActionIconText: {
    fontSize: 24,
  },
  quickActionText: {
    fontSize: merchantDesignTokens.typography.fontSize.sm,
    fontWeight: merchantDesignTokens.typography.fontWeight.semibold,
    color: merchantDesignTokens.colors.text.primary,
    fontFamily: merchantDesignTokens.typography.fontFamily.sans[0],
  },
  quickStatsContainer: {
    marginBottom: merchantDesignTokens.spacing['3xl'],
  },
  quickStatsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickStatItem: {
    flex: 1,
    backgroundColor: merchantDesignTokens.colors.surface.primary,
    padding: merchantDesignTokens.spacing.lg,
    borderRadius: merchantDesignTokens.borderRadius.xl,
    alignItems: 'center',
    marginHorizontal: merchantDesignTokens.spacing.xs,
    ...merchantDesignTokens.shadows.md,
  },
  quickStatValue: {
    fontSize: merchantDesignTokens.typography.fontSize.lg,
    fontWeight: merchantDesignTokens.typography.fontWeight.bold,
    color: merchantDesignTokens.colors.text.primary,
    marginBottom: merchantDesignTokens.spacing.xs,
    fontFamily: merchantDesignTokens.typography.fontFamily.sans[0],
  },
  quickStatLabel: {
    fontSize: merchantDesignTokens.typography.fontSize.xs,
    color: merchantDesignTokens.colors.text.secondary,
    fontFamily: merchantDesignTokens.typography.fontFamily.sans[0],
  },
  deviceStatusContainer: {
    marginBottom: merchantDesignTokens.spacing['3xl'],
  },
  deviceStatusGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  deviceStatusItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: merchantDesignTokens.colors.surface.primary,
    padding: merchantDesignTokens.spacing.md,
    borderRadius: merchantDesignTokens.borderRadius.lg,
    marginHorizontal: merchantDesignTokens.spacing.xs,
    ...merchantDesignTokens.shadows.md,
  },
  deviceStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  deviceStatusLabel: {
    fontSize: merchantDesignTokens.typography.fontSize.xs,
    color: merchantDesignTokens.colors.text.secondary,
    flex: 1,
    fontFamily: merchantDesignTokens.typography.fontFamily.sans[0],
  },
  deviceStatusValue: {
    fontSize: merchantDesignTokens.typography.fontSize.sm,
    fontWeight: merchantDesignTokens.typography.fontWeight.semibold,
    color: merchantDesignTokens.colors.text.primary,
    fontFamily: merchantDesignTokens.typography.fontFamily.sans[0],
  },
  recentTransactionsContainer: {
    marginBottom: merchantDesignTokens.spacing['3xl'],
  },
  recentTransactionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: merchantDesignTokens.spacing.lg,
  },
  seeAllText: {
    fontSize: merchantDesignTokens.typography.fontSize.sm,
    color: merchantDesignTokens.colors.primary[500],
    fontWeight: merchantDesignTokens.typography.fontWeight.medium,
    fontFamily: merchantDesignTokens.typography.fontFamily.sans[0],
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: merchantDesignTokens.colors.surface.primary,
    padding: merchantDesignTokens.spacing.lg,
    borderRadius: merchantDesignTokens.borderRadius.lg,
    marginBottom: merchantDesignTokens.spacing.sm,
    ...merchantDesignTokens.shadows.xs,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionAmount: {
    fontSize: merchantDesignTokens.typography.fontSize.base,
    fontWeight: merchantDesignTokens.typography.fontWeight.semibold,
    color: merchantDesignTokens.colors.text.primary,
    marginBottom: merchantDesignTokens.spacing.xs,
    fontFamily: merchantDesignTokens.typography.fontFamily.sans[0],
  },
  transactionMethod: {
    fontSize: merchantDesignTokens.typography.fontSize.xs,
    color: merchantDesignTokens.colors.text.secondary,
    marginBottom: merchantDesignTokens.spacing.xs,
    fontFamily: merchantDesignTokens.typography.fontFamily.sans[0],
  },
  transactionCustomer: {
    fontSize: merchantDesignTokens.typography.fontSize.xs,
    color: merchantDesignTokens.colors.text.tertiary,
    fontFamily: merchantDesignTokens.typography.fontFamily.sans[0],
  },
  transactionMeta: {
    alignItems: 'flex-end',
  },
  transactionTime: {
    fontSize: merchantDesignTokens.typography.fontSize.xs,
    color: merchantDesignTokens.colors.text.secondary,
    marginBottom: merchantDesignTokens.spacing.xs,
    fontFamily: merchantDesignTokens.typography.fontFamily.sans[0],
  },
  transactionStatus: {
    paddingHorizontal: merchantDesignTokens.spacing.sm,
    paddingVertical: merchantDesignTokens.spacing.xs,
    borderRadius: merchantDesignTokens.borderRadius.lg,
  },
  transactionStatusText: {
    fontSize: merchantDesignTokens.typography.fontSize['2xs'],
    color: merchantDesignTokens.colors.text.inverse,
    fontWeight: merchantDesignTokens.typography.fontWeight.medium,
    fontFamily: merchantDesignTokens.typography.fontFamily.sans[0],
  },
});

export default MerchantDashboardScreen;

