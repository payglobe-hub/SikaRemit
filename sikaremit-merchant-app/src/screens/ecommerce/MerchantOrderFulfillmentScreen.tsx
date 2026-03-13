// Merchant Order Fulfillment Screen - Real order processing
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
  FlatList,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { Card, Button } from '../../components/ui';
import { merchantDashboardService, MerchantOrder } from '../../services/merchantDashboardService';
import { BorderRadius, FontSize, Spacing } from '../../constants/theme';

const MerchantOrderFulfillmentScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();

  const [orders, setOrders] = useState<MerchantOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    fetchOrders();
  }, [filterStatus]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      let ordersData: MerchantOrder[];

      if (filterStatus === 'pending') {
        ordersData = await merchantDashboardService.getPendingOrders();
      } else {
        const response = await merchantDashboardService.getOrders({
          status: filterStatus !== 'all' ? filterStatus : undefined,
          page_size: 50
        });
        ordersData = response.results;
      }

      setOrders(ordersData);
    } catch (error: any) {
      console.error('Error fetching orders:', error);
      Alert.alert('Error', 'Failed to load orders. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchOrders();
    setRefreshing(false);
  };

  const handleUpdateOrderStatus = (order: MerchantOrder) => {
    const actions: Array<{text: string; onPress?: () => void; style?: 'default' | 'cancel' | 'destructive'}> = [];

    if (order.status === 'confirmed') {
      actions.push({
        text: 'Start Processing',
        onPress: () => updateOrderStatus(order, 'processing')
      });
    } else if (order.status === 'processing') {
      actions.push({
        text: 'Mark as Shipped',
        onPress: () => promptShippingDetails(order)
      });
    } else if (order.status === 'shipped') {
      actions.push({
        text: 'Mark as Delivered',
        onPress: () => updateOrderStatus(order, 'delivered')
      });
    }

    actions.push({ text: 'Cancel', style: 'cancel' });

    Alert.alert(
      'Update Order Status',
      `Current status: ${order.status_display}`,
      actions
    );
  };

  const updateOrderStatus = async (order: MerchantOrder, newStatus: string) => {
    try {
      await merchantDashboardService.updateOrderStatus(order.id, newStatus);
      setOrders(prev => prev.map(o =>
        o.id === order.id ? { ...o, status: newStatus } : o
      ));
      Alert.alert('Success', `Order status updated to ${newStatus}`);
    } catch (error: any) {
      console.error('Error updating order status:', error);
      Alert.alert('Error', 'Failed to update order status. Please try again.');
    }
  };

  const promptShippingDetails = (order: MerchantOrder) => {
    // In a real app, you'd show a form for shipping details
    // For now, we'll show a simple alert
    Alert.alert(
      'Shipping Details',
      'Enter shipping information:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Ship Order',
          onPress: () => navigation.navigate('MerchantShippingForm', { order })
        }
      ]
    );
  };

  const handleViewOrderDetails = (order: MerchantOrder) => {
    navigation.navigate('MerchantOrderDetail', { order });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return colors.warning;
      case 'processing': return colors.info;
      case 'shipped': return colors.primary;
      case 'delivered': return colors.success;
      case 'cancelled': return colors.error;
      default: return colors.textSecondary;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed': return 'time-outline';
      case 'processing': return 'cog-outline';
      case 'shipped': return 'airplane-outline';
      case 'delivered': return 'checkmark-circle-outline';
      case 'cancelled': return 'close-circle-outline';
      default: return 'help-circle-outline';
    }
  };

  const renderOrderCard = ({ item }: { item: MerchantOrder }) => (
    <Card style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <View style={styles.orderInfo}>
          <Text style={[styles.orderNumber, { color: colors.text }]}>
            Order #{item.order_number}
          </Text>
          <Text style={[styles.customerName, { color: colors.textSecondary }]}>
            {item.customer_name}
          </Text>
        </View>
        <View style={[styles.statusContainer, { backgroundColor: getStatusColor(item.status) + '20' }]}>
          <Ionicons name={getStatusIcon(item.status)} size={16} color={getStatusColor(item.status)} />
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {item.status_display}
          </Text>
        </View>
      </View>

      <View style={styles.orderDetails}>
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Items:</Text>
          <Text style={[styles.detailValue, { color: colors.text }]}>
            {item.items_count} item{item.items_count !== 1 ? 's' : ''}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Total:</Text>
          <Text style={[styles.detailValue, { color: colors.primary, fontWeight: 'bold' }]}>
            ${item.total.toFixed(2)}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Date:</Text>
          <Text style={[styles.detailValue, { color: colors.text }]}>
            {new Date(item.created_at).toLocaleDateString()}
          </Text>
        </View>
      </View>

      <View style={styles.orderActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.viewButton, { borderColor: colors.primary }]}
          onPress={() => handleViewOrderDetails(item)}
        >
          <Ionicons name="eye-outline" size={16} color={colors.primary} />
          <Text style={[styles.actionText, { color: colors.primary }]}>View Details</Text>
        </TouchableOpacity>

        {(item.status === 'confirmed' || item.status === 'processing' || item.status === 'shipped') && (
          <TouchableOpacity
            style={[styles.actionButton, styles.updateButton, { borderColor: colors.accent }]}
            onPress={() => handleUpdateOrderStatus(item)}
          >
            <Ionicons name="refresh-outline" size={16} color={colors.accent} />
            <Text style={[styles.actionText, { color: colors.accent }]}>Update Status</Text>
          </TouchableOpacity>
        )}
      </View>

      {item.status === 'shipped' && (
        <View style={[styles.shippedBanner, { backgroundColor: colors.info + '20' }]}>
          <Ionicons name="airplane" size={16} color={colors.info} />
          <Text style={[styles.shippedText, { color: colors.info }]}>
            Shipped on {new Date(item.shipped_at!).toLocaleDateString()}
          </Text>
        </View>
      )}

      {item.status === 'delivered' && (
        <View style={[styles.deliveredBanner, { backgroundColor: colors.success + '20' }]}>
          <Ionicons name="checkmark-circle" size={16} color={colors.success} />
          <Text style={[styles.deliveredText, { color: colors.success }]}>
            Delivered on {new Date(item.delivered_at!).toLocaleDateString()}
          </Text>
        </View>
      )}
    </Card>
  );

  const renderFilterChip = (status: string, label: string) => (
    <TouchableOpacity
      key={status}
      style={[
        styles.filterChip,
        filterStatus === status && { backgroundColor: colors.primary }
      ]}
      onPress={() => setFilterStatus(status)}
    >
      <Text style={[
        styles.filterText,
        filterStatus === status && { color: 'white' }
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Order Fulfillment</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Loading orders...
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
        <Text style={[styles.headerTitle, { color: colors.text }]}>Order Fulfillment</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Status Filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filtersContainer}
        contentContainerStyle={styles.filtersContent}
      >
        {renderFilterChip('all', 'All Orders')}
        {renderFilterChip('pending', 'Pending Action')}
        {renderFilterChip('confirmed', 'Confirmed')}
        {renderFilterChip('processing', 'Processing')}
        {renderFilterChip('shipped', 'Shipped')}
        {renderFilterChip('delivered', 'Delivered')}
      </ScrollView>

      <FlatList
        data={orders}
        renderItem={renderOrderCard}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.ordersList}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="clipboard-outline" size={64} color={colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Orders Found</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {filterStatus === 'all'
                ? 'You haven\'t received any orders yet'
                : `No orders with status "${filterStatus}"`
              }
            </Text>
          </View>
        }
      />
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
  filtersContainer: {
    marginBottom: Spacing.sm,
  },
  filtersContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    backgroundColor: '#f0f0f0',
  },
  filterText: {
    fontSize: FontSize.sm,
    color: '#666',
  },
  ordersList: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxxl,
  },
  orderCard: {
    marginBottom: Spacing.md,
    padding: Spacing.lg,
  },
  orderHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  orderInfo: {
    flex: 1,
  },
  orderNumber: {
    fontSize: FontSize.md,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  customerName: {
    fontSize: FontSize.sm,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.md,
  },
  statusText: {
    fontSize: FontSize.xs,
    fontWeight: '600',
  },
  orderDetails: {
    marginBottom: Spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  detailLabel: {
    fontSize: FontSize.sm,
  },
  detailValue: {
    fontSize: FontSize.sm,
    fontWeight: '500',
  },
  orderActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
  },
  viewButton: {
    flex: 2,
  },
  updateButton: {
    flex: 2,
  },
  actionText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  shippedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.sm,
  },
  shippedText: {
    fontSize: FontSize.sm,
    fontWeight: '500',
  },
  deliveredBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.sm,
  },
  deliveredText: {
    fontSize: FontSize.sm,
    fontWeight: '500',
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
});

export default MerchantOrderFulfillmentScreen;
