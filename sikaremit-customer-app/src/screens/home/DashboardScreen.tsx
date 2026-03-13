import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Animated, { 
  FadeInDown, 
  FadeInRight, 
  FadeInUp,
  useSharedValue, 
  useAnimatedStyle, 
  withSpring,
  withTiming,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { Card, SkeletonBalanceCard, SkeletonQuickActions, SkeletonInsights, SkeletonTransaction } from '../../components/ui';
import { useTheme } from '../../context/ThemeContext';
import { useAuthStore } from '../../store/authStore';
import notificationService from '../../services/notificationService';
import { useWalletStore } from '../../store/walletStore';
import { BorderRadius, FontSize, FontWeight, Shadow, Spacing, AnimationConfig, ComponentSize } from '../../constants/theme';
import { Transaction, Wallet } from '../../types';

const { width } = Dimensions.get('window');

const DashboardScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const { user } = useAuthStore();
  const { wallets, transactions, fetchWallets, fetchTransactions, isLoading } = useWalletStore();
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const count = await notificationService.getUnreadCount();
      setUnreadCount(count);
    } catch (error) {
      // Silently fail - badge just won't show
    }
  }, []);

  useEffect(() => {
    fetchWallets();
    fetchTransactions(50);
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchWallets(), fetchTransactions(5)]);
    setRefreshing(false);
  };

  const quickActions = [
    { icon: 'add-circle', label: 'Deposit', color: colors.success, screen: 'Deposit' },
    { icon: 'send', label: 'Transfer', color: colors.primary, screen: 'SendMoney' },
    { icon: 'phone-portrait', label: 'Airtime', color: colors.accent, screen: 'Airtime' },
    { icon: 'cellular', label: 'Data', color: colors.info, screen: 'DataBundle' },
    { icon: 'receipt', label: 'Bills', color: '#EC4899', screen: 'BillPayment' },
    // Temporarily hidden - no permission for international transfers
    // { icon: 'globe', label: 'Remit', color: '#8B5CF6', screen: 'Remittance' },
    { icon: 'download', label: 'Request', color: colors.error, screen: 'RequestMoney' },
    { icon: 'qr-code', label: 'QR Pay', color: colors.info, screen: 'QRScanner' },
  ];

  const totalBalance = wallets.reduce((sum, w) => sum + w.balance, 0);
  const [balanceVisible, setBalanceVisible] = useState(true);

  const spendingInsights = useMemo(() => {
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();
    
    let totalSpent = 0;
    let totalReceived = 0;
    let transactionCount = 0;
    
    transactions.forEach((t: Transaction) => {
      const txDate = new Date(t.created_at);
      if (txDate.getMonth() === thisMonth && txDate.getFullYear() === thisYear) {
        transactionCount++;
        if (t.type === 'send' || t.type === 'bill_payment' || t.type === 'remittance') {
          totalSpent += t.amount;
        } else if (t.type === 'receive') {
          totalReceived += t.amount;
        }
      }
    });
    
    return { totalSpent, totalReceived, transactionCount };
  }, [transactions]);

  const getCurrencyFlag = (currency: string) => {
    const flags: Record<string, string> = {
      GHS: '🇬🇭',
      USD: '🇺🇸',
      EUR: '🇪🇺',
      GBP: '🇬🇧',
    };
    return flags[currency] || '💱';
  };

  const formatCurrency = (amount: number, currency = 'GHS') => {
    return new Intl.NumberFormat('en-GH', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const handleQuickAction = (screen: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate(screen);
  };

  const recentTransactions = transactions.slice(0, 3);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        contentContainerStyle={[styles.contentContainer, { paddingTop: insets.top + Spacing.lg }]}
      >
        {/* Header */}
        <Animated.View entering={FadeInDown.duration(600)} style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Text style={[styles.greeting, { color: colors.textSecondary }]}>
                Good morning,
              </Text>
              <Text style={[styles.userName, { color: colors.text }]}>
                {user?.first_name || user?.email?.split('@')[0]}
              </Text>
            </View>
            <TouchableOpacity 
              style={[styles.notificationButton, { backgroundColor: colors.surface }]}
              onPress={() => navigation.navigate('Notifications')}
            >
              <Ionicons name="notifications-outline" size={24} color={colors.text} />
              {unreadCount > 0 && (
                <View style={[styles.notificationBadge, { backgroundColor: colors.error || '#ef4444' }]}>
                  <Text style={styles.notificationBadgeText}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Balance Card */}
        <Animated.View entering={FadeInUp.duration(800).delay(200)} style={styles.balanceSection}>
          <LinearGradient
            colors={colors.gradient.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.balanceCard, Shadow.floating]}
          >
            <View style={styles.balanceHeader}>
              <Text style={styles.balanceLabel}>Total Balance</Text>
              <TouchableOpacity onPress={() => setBalanceVisible(!balanceVisible)}>
                <Ionicons 
                  name={balanceVisible ? 'eye-off' : 'eye'} 
                  size={20} 
                  color="rgba(255,255,255,0.8)" 
                />
              </TouchableOpacity>
            </View>
            <Text style={styles.balanceAmount}>
              {balanceVisible ? formatCurrency(totalBalance) : '••••••••'}
            </Text>
            <View style={styles.balanceFooter}>
              <Text style={styles.balanceChange}>+12.5% this month</Text>
              <Text style={styles.balancePeriod}>vs last month</Text>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Quick Actions */}
        <Animated.View entering={FadeInUp.duration(800).delay(400)} style={styles.quickActionsSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            {quickActions.map((action, index) => (
              <Animated.View
                key={action.screen}
                entering={FadeInUp.duration(600).delay(600 + index * 100)}
              >
                <TouchableOpacity
                  style={[styles.quickAction, { backgroundColor: colors.surface }]}
                  onPress={() => handleQuickAction(action.screen)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.quickActionIcon, { backgroundColor: action.color + '20' }]}>
                    <Ionicons name={action.icon as any} size={24} color={action.color} />
                  </View>
                  <Text style={[styles.quickActionLabel, { color: colors.text }]}>
                    {action.label}
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            ))}
          </View>
        </Animated.View>

        {/* Spending Insights */}
        <Animated.View entering={FadeInUp.duration(800).delay(800)} style={styles.insightsSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Monthly Insights</Text>
          <Card variant="glass" padding="lg">
            <View style={styles.insightsGrid}>
              <View style={styles.insightItem}>
                <Text style={[styles.insightLabel, { color: colors.textSecondary }]}>Spent</Text>
                <Text style={[styles.insightValue, { color: colors.error }]}>
                  {formatCurrency(spendingInsights.totalSpent)}
                </Text>
              </View>
              <View style={styles.insightDivider} />
              <View style={styles.insightItem}>
                <Text style={[styles.insightLabel, { color: colors.textSecondary }]}>Received</Text>
                <Text style={[styles.insightValue, { color: colors.success }]}>
                  {formatCurrency(spendingInsights.totalReceived)}
                </Text>
              </View>
              <View style={styles.insightDivider} />
              <View style={styles.insightItem}>
                <Text style={[styles.insightLabel, { color: colors.textSecondary }]}>Transactions</Text>
                <Text style={[styles.insightValue, { color: colors.primary }]}>
                  {spendingInsights.transactionCount}
                </Text>
              </View>
            </View>
          </Card>
        </Animated.View>

        {/* Recent Transactions */}
        <Animated.View entering={FadeInUp.duration(800).delay(1000)} style={styles.transactionsSection}>
          <View style={styles.transactionsHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Activity</Text>
            <TouchableOpacity onPress={() => navigation.navigate('TransactionHistory')}>
              <Text style={[styles.seeAll, { color: colors.primary }]}>See all</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.transactionsList}>
            {recentTransactions.map((transaction, index) => (
              <Animated.View
                key={transaction.id}
                entering={FadeInRight.duration(600).delay(1200 + index * 100)}
              >
                <Card variant="default" padding="md" style={styles.transactionItem}>
                  <View style={styles.transactionLeft}>
                    <View style={[styles.transactionIcon, { backgroundColor: colors.primary + '20' }]}>
                      <Ionicons 
                        name={
                          transaction.type === 'send' ? 'arrow-up' :
                          transaction.type === 'receive' ? 'arrow-down' :
                          transaction.type === 'bill_payment' ? 'receipt' : 'swap-horizontal'
                        } 
                        size={20} 
                        color={colors.primary} 
                      />
                    </View>
                    <View>
                      <Text style={[styles.transactionTitle, { color: colors.text }]}>
                        {transaction.description || transaction.type.replace('_', ' ')}
                      </Text>
                      <Text style={[styles.transactionDate, { color: colors.textMuted }]}>
                        {new Date(transaction.created_at).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>
                  <Text style={[
                    styles.transactionAmount,
                    { 
                      color: transaction.type === 'send' || transaction.type === 'bill_payment' 
                        ? colors.error 
                        : colors.success 
                    }
                  ]}>
                    {transaction.type === 'send' || transaction.type === 'bill_payment' ? '-' : '+'}
                    {formatCurrency(transaction.amount)}
                  </Text>
                </Card>
              </Animated.View>
            ))}
          </View>
        </Animated.View>

        <View style={{ height: Spacing.xxxl }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: Spacing.xxl,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium as any,
    textTransform: 'capitalize',
  },
  userName: {
    fontSize: FontSize.xxxl,
    fontWeight: FontWeight.bold as any,
    marginTop: Spacing.xs,
  },
  notificationButton: {
    width: ComponentSize.iconButton.md,
    height: ComponentSize.iconButton.md,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.card,
  },
  notificationBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  notificationBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700' as any,
    lineHeight: 12,
  },
  balanceSection: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xxl,
  },
  balanceCard: {
    borderRadius: BorderRadius.xxl,
    padding: Spacing.xl,
    position: 'relative',
    overflow: 'hidden',
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  balanceLabel: {
    fontSize: FontSize.md,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: FontWeight.medium as any,
  },
  balanceAmount: {
    fontSize: FontSize.display,
    fontWeight: FontWeight.bold as any,
    color: '#FFFFFF',
    marginBottom: Spacing.md,
  },
  balanceFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  balanceChange: {
    fontSize: FontSize.sm,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: FontWeight.semibold as any,
    marginRight: Spacing.xs,
  },
  balancePeriod: {
    fontSize: FontSize.sm,
    color: 'rgba(255,255,255,0.7)',
  },
  quickActionsSection: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xxl,
  },
  sectionTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold as any,
    marginBottom: Spacing.lg,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickAction: {
    width: (width - Spacing.lg * 2 - Spacing.md) / 4,
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    ...Shadow.card,
  },
  quickActionIcon: {
    width: ComponentSize.quickAction - Spacing.md * 2,
    height: ComponentSize.quickAction - Spacing.md * 2,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  quickActionLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium as any,
    textAlign: 'center',
  },
  insightsSection: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xxl,
  },
  insightsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  insightItem: {
    flex: 1,
    alignItems: 'center',
  },
  insightLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium as any,
    marginBottom: Spacing.xs,
  },
  insightValue: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold as any,
  },
  insightDivider: {
    width: 1,
    height: Spacing.lg,
    backgroundColor: '#E5E7EB',
    marginHorizontal: Spacing.md,
  },
  transactionsSection: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  transactionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  seeAll: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold as any,
  },
  transactionsList: {
    gap: Spacing.sm,
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  transactionIcon: {
    width: ComponentSize.avatar.sm,
    height: ComponentSize.avatar.sm,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  transactionTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold as any,
  },
  transactionDate: {
    fontSize: FontSize.sm,
    marginTop: 2,
  },
  transactionAmount: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold as any,
  },
});

export default DashboardScreen;
