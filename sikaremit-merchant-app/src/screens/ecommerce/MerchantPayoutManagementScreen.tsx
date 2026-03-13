// Merchant Payout Management Screen - Real revenue and payout tracking
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { Card, Button } from '../../components/ui';
import { merchantDashboardService } from '../../services/merchantDashboardService';
import { BorderRadius, FontSize, Spacing } from '@sikaremit/mobile-shared/constants/theme';

interface PendingRevenue {
  store: {
    id: string;
    name: string;
    merchant_name: string;
  };
  total_amount: number;
  order_count: number;
  item_count: number;
  orders: Array<{
    id: string;
    order_number: string;
    date: string;
  }>;
}

interface RevenueSummary {
  period_days: number;
  summary: {
    gross_revenue: string;
    platform_fees: string;
    net_revenue: string;
    settled_amount: string;
    pending_amount: string;
  };
  statistics: {
    total_orders: number;
    total_items_sold: number;
  };
}

const MerchantPayoutManagementScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();

  const [pendingRevenue, setPendingRevenue] = useState<PendingRevenue[]>([]);
  const [revenueSummary, setRevenueSummary] = useState<RevenueSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'pending' | 'history'>('overview');

  useEffect(() => {
    if (activeTab === 'overview') {
      fetchRevenueSummary();
    } else if (activeTab === 'pending') {
      fetchPendingRevenue();
    }
  }, [activeTab]);

  const fetchRevenueSummary = async () => {
    try {
      setLoading(true);
      const summary = await merchantDashboardService.getRevenueSummary();
      setRevenueSummary(summary);
    } catch (error: any) {
      console.error('Error fetching revenue summary:', error);
      Alert.alert('Error', 'Failed to load revenue summary. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingRevenue = async () => {
    try {
      setLoading(true);
      const revenue = await merchantDashboardService.getPendingRevenue();
      setPendingRevenue(revenue);
    } catch (error: any) {
      console.error('Error fetching pending revenue:', error);
      Alert.alert('Error', 'Failed to load pending revenue. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    if (activeTab === 'overview') {
      await fetchRevenueSummary();
    } else if (activeTab === 'pending') {
      await fetchPendingRevenue();
    }
    setRefreshing(false);
  };

  const handleRequestPayout = async () => {
    if (!revenueSummary || parseFloat(revenueSummary.summary.pending_amount) <= 0) {
      Alert.alert('No Pending Revenue', 'You have no pending revenue available for payout.');
      return;
    }

    Alert.alert(
      'Request Payout',
      `Request payout for $${revenueSummary.summary.pending_amount}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Request Payout',
          onPress: async () => {
            try {
              await merchantDashboardService.requestPayout();
              Alert.alert('Success', 'Payout request submitted successfully');
              // Refresh data
              await fetchRevenueSummary();
              await fetchPendingRevenue();
            } catch (error: any) {
              console.error('Error requesting payout:', error);
              Alert.alert('Error', 'Failed to request payout. Please try again.');
            }
          }
        }
      ]
    );
  };

  const renderTabButton = (tab: typeof activeTab, label: string) => (
    <TouchableOpacity
      style={[
        styles.tabButton,
        activeTab === tab && { backgroundColor: colors.primary }
      ]}
      onPress={() => setActiveTab(tab)}
    >
      <Text style={[
        styles.tabText,
        activeTab === tab && { color: 'white' }
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderOverviewTab = () => {
    if (!revenueSummary) return null;

    return (
      <ScrollView
        style={styles.tabContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Revenue Summary Cards */}
        <View style={styles.summaryCards}>
          <Card style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <Ionicons name="trending-up-outline" size={24} color={colors.success} />
              <Text style={[styles.summaryTitle, { color: colors.text }]}>Total Revenue</Text>
            </View>
            <Text style={[styles.summaryValue, { color: colors.success }]}>
              ${revenueSummary.summary.gross_revenue}
            </Text>
            <Text style={[styles.summarySubtitle, { color: colors.textSecondary }]}>
              Last {revenueSummary.period_days} days
            </Text>
          </Card>

          <Card style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <Ionicons name="cash-outline" size={24} color={colors.primary} />
              <Text style={[styles.summaryTitle, { color: colors.text }]}>Available Balance</Text>
            </View>
            <Text style={[styles.summaryValue, { color: colors.primary }]}>
              ${revenueSummary.summary.pending_amount}
            </Text>
            <Text style={[styles.summarySubtitle, { color: colors.textSecondary }]}>
              Ready for payout
            </Text>
          </Card>

          <Card style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <Ionicons name="checkmark-done-outline" size={24} color={colors.info} />
              <Text style={[styles.summaryTitle, { color: colors.text }]}>Settled</Text>
            </View>
            <Text style={[styles.summaryValue, { color: colors.info }]}>
              ${revenueSummary.summary.settled_amount}
            </Text>
            <Text style={[styles.summarySubtitle, { color: colors.textSecondary }]}>
              Already paid out
            </Text>
          </Card>
        </View>

        {/* Statistics */}
        <Card style={styles.statsCard}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Period Statistics</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.primary }]}>
                {revenueSummary.statistics.total_orders}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Orders</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.accent }]}>
                {revenueSummary.statistics.total_items_sold}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Items Sold</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: colors.warning }]}>
                ${revenueSummary.summary.platform_fees}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Platform Fees</Text>
            </View>
          </View>
        </Card>

        {/* Payout Action */}
        {parseFloat(revenueSummary.summary.pending_amount) > 0 && (
          <Card style={styles.payoutCard}>
            <Text style={[styles.payoutTitle, { color: colors.text }]}>
              Request Payout
            </Text>
            <Text style={[styles.payoutText, { color: colors.textSecondary }]}>
              Request a payout for your available balance of ${revenueSummary.summary.pending_amount}
            </Text>
            <Button
              title="Request Payout"
              onPress={handleRequestPayout}
              style={styles.payoutButton}
            />
          </Card>
        )}
      </ScrollView>
    );
  };

  const renderPendingTab = () => (
    <ScrollView
      style={styles.tabContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      showsVerticalScrollIndicator={false}
    >
      {pendingRevenue.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="wallet-outline" size={64} color={colors.textSecondary} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No Pending Revenue</Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            All your revenue has been settled or there are no completed orders yet.
          </Text>
        </View>
      ) : (
        <View style={styles.pendingRevenueList}>
          {pendingRevenue.map((revenue, index) => (
            <Card key={index} style={styles.revenueCard}>
              <View style={styles.revenueHeader}>
                <View style={styles.revenueInfo}>
                  <Text style={[styles.storeName, { color: colors.text }]}>
                    {revenue.store.name}
                  </Text>
                  <Text style={[styles.merchantName, { color: colors.textSecondary }]}>
                    {revenue.store.merchant_name}
                  </Text>
                </View>
                <View style={styles.amountContainer}>
                  <Text style={[styles.amount, { color: colors.primary }]}>
                    ${revenue.total_amount.toFixed(2)}
                  </Text>
                  <Text style={[styles.amountLabel, { color: colors.textSecondary }]}>
                    Available
                  </Text>
                </View>
              </View>

              <View style={styles.revenueStats}>
                <View style={styles.statBadge}>
                  <Text style={[styles.statBadgeText, { color: colors.primary }]}>
                    {revenue.order_count} orders
                  </Text>
                </View>
                <View style={styles.statBadge}>
                  <Text style={[styles.statBadgeText, { color: colors.accent }]}>
                    {revenue.item_count} items
                  </Text>
                </View>
              </View>

              {revenue.orders.length > 0 && (
                <View style={styles.recentOrders}>
                  <Text style={[styles.recentOrdersTitle, { color: colors.text }]}>
                    Recent Orders:
                  </Text>
                  {revenue.orders.slice(0, 3).map((order, idx) => (
                    <Text key={idx} style={[styles.orderItem, { color: colors.textSecondary }]}>
                      #{order.order_number} - {order.date}
                    </Text>
                  ))}
                </View>
              )}
            </Card>
          ))}
        </View>
      )}
    </ScrollView>
  );

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Revenue & Payouts</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Loading revenue data...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Revenue & Payouts</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        {renderTabButton('overview', 'Overview')}
        {renderTabButton('pending', 'Pending')}
        {renderTabButton('history', 'History')}
      </View>

      {/* Tab Content */}
      {activeTab === 'overview' && renderOverviewTab()}
      {activeTab === 'pending' && renderPendingTab()}
      {activeTab === 'history' && (
        <View style={styles.comingSoon}>
          <Ionicons name="time-outline" size={48} color={colors.textSecondary} />
          <Text style={[styles.comingSoonText, { color: colors.textSecondary }]}>
            Payout history coming soon
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: FontSize.xl,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  tabButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
  },
  tabText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: '#666',
  },
  tabContent: {
    flex: 1,
    padding: Spacing.lg,
  },
  summaryCards: {
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  summaryCard: {
    padding: Spacing.lg,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  summaryTitle: {
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  summaryValue: {
    fontSize: FontSize.xxl,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  summarySubtitle: {
    fontSize: FontSize.sm,
  },
  statsCard: {
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: 'bold',
    marginBottom: Spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: FontSize.xl,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: FontSize.sm,
  },
  payoutCard: {
    padding: Spacing.lg,
  },
  payoutTitle: {
    fontSize: FontSize.lg,
    fontWeight: 'bold',
    marginBottom: Spacing.sm,
  },
  payoutText: {
    fontSize: FontSize.md,
    lineHeight: 20,
    marginBottom: Spacing.lg,
  },
  payoutButton: {
    alignSelf: 'flex-start',
  },
  pendingRevenueList: {
    gap: Spacing.md,
  },
  revenueCard: {
    padding: Spacing.lg,
  },
  revenueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  revenueInfo: {
    flex: 1,
  },
  storeName: {
    fontSize: FontSize.lg,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  merchantName: {
    fontSize: FontSize.sm,
  },
  amountContainer: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: FontSize.xl,
    fontWeight: 'bold',
  },
  amountLabel: {
    fontSize: FontSize.sm,
  },
  revenueStats: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  statBadge: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  statBadgeText: {
    fontSize: FontSize.sm,
    fontWeight: '500',
  },
  recentOrders: {
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: Spacing.md,
  },
  recentOrdersTitle: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  orderItem: {
    fontSize: FontSize.sm,
    marginBottom: 2,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: FontSize.md,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xxxl,
  },
  emptyTitle: {
    fontSize: FontSize.xl,
    fontWeight: 'bold',
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    fontSize: FontSize.md,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.xl,
  },
  comingSoon: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  comingSoonText: {
    fontSize: FontSize.md,
    marginTop: Spacing.md,
  },
});

export default MerchantPayoutManagementScreen;
