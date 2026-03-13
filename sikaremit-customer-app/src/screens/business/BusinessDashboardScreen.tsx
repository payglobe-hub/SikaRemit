import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Card } from '@/components/ui';
import { useTheme } from '@/context/ThemeContext';
import { b2bService } from '@sikaremit/mobile-shared/services/b2bService';
import { BusinessAccount, BusinessAnalytics, BulkPayment } from '@sikaremit/mobile-shared/types/b2b';
import { BorderRadius, FontSize, FontWeight, Shadow, Spacing } from '@/constants/theme';

const { width } = Dimensions.get('window');

const BusinessDashboardScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { colors } = useTheme();

  const [businessAccount, setBusinessAccount] = useState<BusinessAccount | null>(null);
  const [analytics, setAnalytics] = useState<BusinessAnalytics | null>(null);
  const [recentPayments, setRecentPayments] = useState<BulkPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const loadDashboardData = async (isRetry = false) => {
    try {
      setLoading(true);
      setError(null);

      if (isRetry) {
        setRetryCount(prev => prev + 1);
      }

      // Get current user's business account
      const businessAccount = await b2bService.getCurrentUserBusinessAccount();

      if (!businessAccount) {
        // User doesn't have a business account - they might need to create one
        Alert.alert(
          'No Business Account',
          'You need to create a business account to access this feature.',
          [
            { text: 'Create Account', onPress: () => navigation.navigate('BusinessOnboarding') },
            { text: 'Cancel', style: 'cancel', onPress: () => navigation.goBack() }
          ]
        );
        return;
      }

      // Get analytics for the business account with error handling
      let analytics = null;
      try {
        analytics = await b2bService.getBusinessAnalytics(businessAccount.id);
      } catch (analyticsError: any) {
        console.warn('Failed to load analytics:', analyticsError);
        // Continue without analytics - show empty state
      }

      // Get recent bulk payments with error handling
      let recentPayments: any[] = [];
      try {
        const payments = await b2bService.getBulkPayments(businessAccount.id);
        recentPayments = payments.slice(0, 3); // Show only 3 most recent
      } catch (paymentsError: any) {
        console.warn('Failed to load recent payments:', paymentsError);
        // Continue without payments - show empty state
      }

      setBusinessAccount(businessAccount);
      setAnalytics(analytics);
      setRecentPayments(recentPayments);
      setRetryCount(0); // Reset retry count on success

    } catch (error: any) {
      console.error('Failed to load dashboard data:', error);

      let errorMessage = 'Failed to load dashboard data. Please try again.';

      // Handle specific error types
      if (error.code === 'NETWORK_ERROR' || !navigator.onLine) {
        errorMessage = 'Network connection error. Please check your internet connection.';
      } else if (error.response?.status === 401) {
        errorMessage = 'Authentication error. Please log in again.';
        // Could navigate to login screen here
      } else if (error.response?.status === 403) {
        errorMessage = 'You do not have permission to access this feature.';
      } else if (error.response?.status >= 500) {
        errorMessage = 'Server error. Please try again later.';
      }

      setError(errorMessage);

      // Show retry option for recoverable errors
      if (retryCount < 3) {
        Alert.alert(
          'Error',
          errorMessage,
          [
            { text: 'Retry', onPress: () => loadDashboardData(true) },
            { text: 'Cancel', style: 'cancel' }
          ]
        );
      } else {
        Alert.alert('Error', `${errorMessage}\n\nMaximum retry attempts reached.`);
      }
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const handleQuickAction = (action: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    switch (action) {
      case 'bulk_payment':
        navigation.navigate('BulkPayment');
        break;
      case 'user_management':
        navigation.navigate('BusinessUsers');
        break;
      case 'analytics':
        navigation.navigate('BusinessAnalytics');
        break;
      case 'compliance':
        navigation.navigate('BusinessCompliance');
        break;
    }
  };

  const renderQuickActions = () => {
    const actions = [
      {
        id: 'bulk_payment',
        title: 'Bulk Payment',
        subtitle: 'Pay employees & vendors',
        icon: 'cash-outline',
        color: colors.success,
      },
      {
        id: 'user_management',
        title: 'Team',
        subtitle: 'Manage users & roles',
        icon: 'people-outline',
        color: colors.primary,
      },
      {
        id: 'analytics',
        title: 'Reports',
        subtitle: 'Business analytics',
        icon: 'bar-chart-outline',
        color: colors.accent,
      },
      {
        id: 'compliance',
        title: 'Compliance',
        subtitle: 'KYC & compliance',
        icon: 'shield-checkmark-outline',
        color: colors.info,
      },
    ];

    return (
      <View style={styles.quickActionsGrid}>
        {actions.map((action) => (
          <TouchableOpacity
            key={action.id}
            style={[styles.quickActionCard, { backgroundColor: colors.surface }]}
            onPress={() => handleQuickAction(action.id)}
            activeOpacity={0.8}
          >
            <View style={[styles.actionIcon, { backgroundColor: action.color + '20' }]}>
              <Ionicons name={action.icon as any} size={24} color={action.color} />
            </View>
            <Text style={[styles.actionTitle, { color: colors.text }]}>{action.title}</Text>
            <Text style={[styles.actionSubtitle, { color: colors.textSecondary }]}>
              {action.subtitle}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderMetricsCards = () => {
    if (!analytics) return null;

    const metrics = [
      {
        title: 'Total Volume',
        value: `₵${(analytics.total_volume / 1000).toFixed(0)}K`,
        change: '+12.5%',
        icon: 'trending-up-outline',
        color: colors.success,
      },
      {
        title: 'Active Users',
        value: analytics.active_users.toString(),
        change: `${analytics.total_users} total`,
        icon: 'people-outline',
        color: colors.primary,
      },
      {
        title: 'Monthly Transactions',
        value: analytics.monthly_transactions.toString(),
        change: `₵${(analytics.monthly_volume / 1000).toFixed(0)}K`,
        icon: 'swap-horizontal-outline',
        color: colors.accent,
      },
      {
        title: 'Success Rate',
        value: `${((analytics.total_payments - analytics.failed_payments) / analytics.total_payments * 100).toFixed(1)}%`,
        change: `${analytics.failed_payments} failed`,
        icon: 'checkmark-circle-outline',
        color: colors.info,
      },
    ];

    return (
      <View style={styles.metricsGrid}>
        {metrics.map((metric, index) => (
          <Card key={index} variant="default" padding="md" style={styles.metricCard}>
            <View style={styles.metricHeader}>
              <View style={[styles.metricIcon, { backgroundColor: metric.color + '20' }]}>
                <Ionicons name={metric.icon as any} size={20} color={metric.color} />
              </View>
              <Text style={[styles.metricChange, { color: metric.color }]}>{metric.change}</Text>
            </View>
            <Text style={[styles.metricValue, { color: colors.text }]}>{metric.value}</Text>
            <Text style={[styles.metricTitle, { color: colors.textSecondary }]}>{metric.title}</Text>
          </Card>
        ))}
      </View>
    );
  };

  const renderRecentPayments = () => {
    return (
      <Card variant="default" padding="lg" style={styles.recentPaymentsCard}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Payments</Text>
          <TouchableOpacity>
            <Text style={[styles.seeAllText, { color: colors.primary }]}>See all</Text>
          </TouchableOpacity>
        </View>

        {recentPayments.map((payment) => (
          <View key={payment.id} style={styles.paymentItem}>
            <View style={styles.paymentLeft}>
              <View style={[styles.paymentIcon, {
                backgroundColor: payment.status === 'completed' ? colors.success + '20' :
                               payment.status === 'processing' ? colors.warning + '20' :
                               colors.error + '20'
              }]}>
                <Ionicons
                  name={payment.status === 'completed' ? 'checkmark-circle' :
                        payment.status === 'processing' ? 'time' : 'close-circle'}
                  size={20}
                  color={payment.status === 'completed' ? colors.success :
                         payment.status === 'processing' ? colors.warning :
                         colors.error}
                />
              </View>
              <View>
                <Text style={[styles.paymentName, { color: colors.text }]}>{payment.name}</Text>
                <Text style={[styles.paymentDate, { color: colors.textSecondary }]}>
                  {new Date(payment.created_at).toLocaleDateString()}
                </Text>
              </View>
            </View>
            <View style={styles.paymentRight}>
              <Text style={[styles.paymentAmount, { color: colors.primary }]}>
                ₵{payment.total_amount.toLocaleString()}
              </Text>
              <Text style={[styles.paymentStatus, {
                color: payment.status === 'completed' ? colors.success :
                       payment.status === 'processing' ? colors.warning :
                       colors.error
              }]}>
                {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
              </Text>
            </View>
          </View>
        ))}
      </Card>
    );
  };

  const renderErrorState = () => (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Business Dashboard
          </Text>
          <View style={{ width: 24 }} />
        </View>
      </View>

      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color={colors.error} />
        <Text style={[styles.errorTitle, { color: colors.text }]}>
          Something went wrong
        </Text>
        <Text style={[styles.errorMessage, { color: colors.textSecondary }]}>
          {error}
        </Text>
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: colors.primary }]}
          onPress={() => loadDashboardData(true)}
        >
          <Ionicons name="refresh" size={20} color="white" />
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (error && !businessAccount) {
    return renderErrorState();
  }

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {businessAccount?.business_name || 'Business Dashboard'}
          </Text>
          <TouchableOpacity onPress={() => navigation.navigate('BusinessSettings')}>
            <Ionicons name="settings-outline" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Business Info Card */}
        <LinearGradient
          colors={colors.gradient.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.businessCard, Shadow.floating]}
        >
          <View style={styles.businessCardContent}>
            <Ionicons name="business-outline" size={32} color="#FFFFFF" />
            <View style={styles.businessInfo}>
              <Text style={styles.businessName}>{businessAccount?.business_name}</Text>
              <Text style={styles.businessType}>
                {businessAccount?.account_type} • {businessAccount?.account_tier}
              </Text>
            </View>
            <View style={[styles.complianceBadge, {
              backgroundColor: businessAccount?.compliance_status === 'approved' ? '#10B981' :
                             businessAccount?.compliance_status === 'pending' ? '#F59E0B' : '#EF4444'
            }]}>
              <Text style={styles.complianceText}>
                {businessAccount?.compliance_status === 'approved' ? 'Verified' :
                 businessAccount?.compliance_status === 'pending' ? 'Pending' : 'Review'}
              </Text>
            </View>
          </View>
        </LinearGradient>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Actions</Text>
          {renderQuickActions()}
        </View>

        {/* Metrics */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>This Month</Text>
          {renderMetricsCards()}
        </View>

        {/* Recent Payments */}
        {renderRecentPayments()}

        <View style={{ height: Spacing.xxxl }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5e9',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  businessCard: {
    margin: 16,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
  },
  businessCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  businessInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  businessName: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold as any,
    color: '#FFFFFF',
    marginBottom: 2,
  },
  businessType: {
    fontSize: FontSize.sm,
    color: 'rgba(255,255,255,0.8)',
  },
  complianceBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.lg,
  },
  complianceText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium as any,
    color: '#FFFFFF',
  },
  section: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold as any,
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  seeAllText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium as any,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickActionCard: {
    width: (width - Spacing.lg * 2 - Spacing.md) / 2,
    alignItems: 'center',
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    ...Shadow.card,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  actionTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold as any,
    marginBottom: 2,
  },
  actionSubtitle: {
    fontSize: FontSize.sm,
    textAlign: 'center',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  metricCard: {
    width: (width - Spacing.lg * 2 - Spacing.md) / 2,
    marginBottom: Spacing.md,
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  metricIcon: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricValue: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold as any,
    marginBottom: 2,
  },
  metricTitle: {
    fontSize: FontSize.sm,
  },
  metricChange: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium as any,
  },
  recentPaymentsCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  paymentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  paymentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  paymentIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  paymentName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium as any,
    marginBottom: 2,
  },
  paymentDate: {
    fontSize: FontSize.sm,
  },
  paymentRight: {
    alignItems: 'flex-end',
  },
  paymentAmount: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold as any,
    marginBottom: 2,
  },
  paymentStatus: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium as any,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  errorTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold as any,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: FontSize.md,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    lineHeight: 22,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    ...Shadow.card,
  },
  retryButtonText: {
    color: 'white',
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium as any,
    marginLeft: Spacing.sm,
  },
});

export default BusinessDashboardScreen;
