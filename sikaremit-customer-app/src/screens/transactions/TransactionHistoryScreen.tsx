import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Animated, { 
  FadeInDown, 
  FadeInUp,
  FadeInRight,
  useSharedValue, 
  useAnimatedStyle, 
  withSpring,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { Card, Button } from '../../components/ui';
import { useTheme } from '../../context/ThemeContext';
import { useWalletStore } from '../../store/walletStore';
import { Transaction } from '../../types';
import { 
  BorderRadius, 
  FontSize, 
  FontWeight, 
  Spacing, 
  Shadow, 
  AnimationConfig, 
  ComponentSize 
} from '../../constants/theme';

const { width } = Dimensions.get('window');

const TransactionHistoryScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { transactions, fetchTransactions, isLoading } = useWalletStore();
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'send' | 'receive' | 'bills'>('all');

  useEffect(() => {
    fetchTransactions(50);
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTransactions(50);
    setRefreshing(false);
  };

  const filters = [
    { key: 'all', label: 'All', icon: 'list' },
    { key: 'send', label: 'Sent', icon: 'arrow-up' },
    { key: 'receive', label: 'Received', icon: 'arrow-down' },
    { key: 'bills', label: 'Bills', icon: 'receipt' },
  ];

  const filteredTransactions = transactions.filter((t) => {
    if (filter === 'all') return true;
    if (filter === 'bills') return t.type === 'bill_payment';
    return t.type === filter;
  });

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'send':
        return 'arrow-up';
      case 'receive':
        return 'arrow-down';
      case 'bill_payment':
        return 'receipt';
      case 'airtime':
        return 'phone-portrait';
      case 'data_bundle':
        return 'wifi';
      case 'remittance':
        return 'globe';
      default:
        return 'card';
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'send':
        return colors.error;
      case 'receive':
        return colors.success;
      case 'bill_payment':
        return colors.warning;
      case 'airtime':
        return colors.primary;
      case 'data_bundle':
        return colors.accent;
      case 'remittance':
        return colors.secondary;
      default:
        return colors.text;
    }
  };

  const getTransactionTitle = (transaction: Transaction) => {
    switch (transaction.type) {
      case 'send':
        return `Sent to ${transaction.description || 'Unknown'}`;
      case 'receive':
        return `Received from ${transaction.description || 'Unknown'}`;
      case 'bill_payment':
        return `Bill Payment - ${transaction.description || 'Utility'}`;
      case 'topup':
        return `Topup - ${transaction.description || 'Mobile'}`;
      case 'remittance':
        return `Remittance to ${transaction.description || 'International'}`;
      default:
        return transaction.description || 'Transaction';
    }
  };

  const formatAmount = (amount: number, type: string) => {
    const prefix = type === 'send' ? '-GHS ' : '+GHS ';
    return prefix + amount.toLocaleString();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays - 1} days ago`;
    return date.toLocaleDateString();
  };

  const handleFilterPress = (filterKey: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFilter(filterKey as any);
  };

  const handleTransactionPress = (transaction: Transaction) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // Navigate to transaction details
    // navigation.navigate('TransactionDetails', { transaction });
  };

  const renderTransactionItem = ({ item, index }: { item: Transaction; index: number }) => (
    <Animated.View
      entering={FadeInRight.duration(400).delay(index * 50)}
      style={styles.transactionItem}
    >
      <TouchableOpacity
        onPress={() => handleTransactionPress(item)}
        activeOpacity={0.7}
      >
        <Card variant="default" padding="md" style={styles.transactionCard}>
          <View style={styles.transactionHeader}>
            <View style={[
              styles.transactionIcon,
              { backgroundColor: getTransactionColor(item.type) + '20' }
            ]}>
              <Ionicons 
                name={getTransactionIcon(item.type) as any} 
                size={20} 
                color={getTransactionColor(item.type)} 
              />
            </View>
            <View style={styles.transactionInfo}>
              <Text style={[styles.transactionTitle, { color: colors.text }]}>
                {getTransactionTitle(item)}
              </Text>
              <Text style={[styles.transactionDate, { color: colors.textMuted }]}>
                {formatDate(item.created_at)}
              </Text>
            </View>
            <Text style={[
              styles.transactionAmount,
              { color: getTransactionColor(item.type) }
            ]}>
              {formatAmount(item.amount, item.type)}
            </Text>
          </View>
          
          {item.status === 'pending' && (
            <View style={styles.pendingBadge}>
              <Text style={[styles.pendingText, { color: colors.warning }]}>
                Pending
              </Text>
            </View>
          )}
        </Card>
      </TouchableOpacity>
    </Animated.View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={[
        styles.emptyIcon,
        { backgroundColor: colors.primary + '15' }
      ]}>
        <Ionicons name="receipt-outline" size={48} color={colors.primary} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>
        No Transactions Yet
      </Text>
      <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
        Your transaction history will appear here once you start using SikaRemit
      </Text>
      <Button
        title="Start Transacting"
        onPress={() => navigation.goBack()}
        variant="outline"
        size="lg"
        style={styles.emptyButton}
      />
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <Animated.View entering={FadeInDown.duration(600)} style={styles.header}>
        <View style={[styles.headerContent, { paddingTop: insets.top + Spacing.md }]}>
          <Text style={[styles.title, { color: colors.text }]}>
            Transaction History
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {filteredTransactions.length} transactions
          </Text>
        </View>
      </Animated.View>

      {/* Filter Tabs */}
      <Animated.View entering={FadeInUp.duration(800).delay(200)} style={styles.filterSection}>
        <View style={styles.filterContainer}>
          {filters.map((filterItem, index) => (
            <Animated.View
              key={filterItem.key}
              entering={FadeInUp.duration(400).delay(400 + index * 100)}
            >
              <TouchableOpacity
                style={[
                  styles.filterTab,
                  {
                    backgroundColor: filter === filterItem.key 
                      ? colors.primary + '15'
                      : colors.surface,
                    borderColor: filter === filterItem.key 
                      ? colors.primary
                      : colors.borderLight,
                  }
                ]}
                onPress={() => handleFilterPress(filterItem.key)}
              >
                <Ionicons 
                  name={filterItem.icon as any} 
                  size={16} 
                  color={filter === filterItem.key ? colors.primary : colors.textMuted} 
                />
                <Text style={[
                  styles.filterText,
                  { color: filter === filterItem.key ? colors.primary : colors.text }
                ]}>
                  {filterItem.label}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          ))}
        </View>
      </Animated.View>

      {/* Transaction List */}
      <Animated.View entering={FadeInUp.duration(800).delay(400)} style={styles.listSection}>
        <FlatList
          data={filteredTransactions}
          renderItem={renderTransactionItem}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmptyState}
        />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    marginBottom: Spacing.lg,
  },
  headerContent: {
    paddingHorizontal: Spacing.lg,
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold as any,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: FontSize.sm,
  },
  filterSection: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  filterContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 2,
    gap: Spacing.xs,
  },
  filterText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold as any,
  },
  listSection: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  listContent: {
    paddingBottom: Spacing.xxl,
  },
  transactionItem: {
    marginBottom: Spacing.md,
  },
  transactionCard: {
    ...Shadow.card,
  },
  transactionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  transactionIcon: {
    width: ComponentSize.avatar.md,
    height: ComponentSize.avatar.md,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold as any,
    marginBottom: Spacing.xs,
  },
  transactionDate: {
    fontSize: FontSize.sm,
  },
  transactionAmount: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold as any,
  },
  pendingBadge: {
    marginTop: Spacing.sm,
    alignSelf: 'flex-start',
  },
  pendingText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium as any,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xxxl,
  },
  emptyIcon: {
    width: ComponentSize.avatar.xl,
    height: ComponentSize.avatar.xl,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold as any,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: FontSize.md,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  emptyButton: {
    maxWidth: 200,
  },
});

export default TransactionHistoryScreen;
