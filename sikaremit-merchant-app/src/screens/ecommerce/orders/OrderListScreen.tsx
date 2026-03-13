/**
 * Order List Screen
 *
 * Shows filtered list of orders with search and status filtering
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { Card, Button } from '@/components/ui';
import { OrderService } from '@/services/ecommerce/OrderService';
import { Order, OrderStatus, OrderListRequest } from '@sikaremit/mobile-shared';

interface RouteParams {
  status?: OrderStatus;
}

const OrderListScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { colors } = useTheme();
  const { status: initialStatus } = route.params as RouteParams;

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | 'all'>(
    initialStatus || 'all'
  );
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Load orders
  const loadOrders = useCallback(async (pageNum = 1, refresh = false) => {
    try {
      if (refresh) {
        setRefreshing(true);
      } else if (pageNum === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const request: OrderListRequest = {
        page: pageNum,
        page_size: 20,
        sort_by: 'created_at',
        sort_order: 'desc',
      };

      if (searchQuery.trim()) {
        request.search = searchQuery.trim();
      }

      if (selectedStatus !== 'all') {
        request.status = selectedStatus;
      }

      const response = await OrderService.getOrders(request);

      if (pageNum === 1) {
        setOrders(response.orders);
      } else {
        setOrders(prev => [...prev, ...response.orders]);
      }

      setHasMore(response.page < response.total_pages);
      setPage(pageNum);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to load orders');
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [searchQuery, selectedStatus]);

  // Initial load and refresh when filters change
  useEffect(() => {
    loadOrders(1);
  }, [loadOrders]);

  // Refresh when screen focuses
  useFocusEffect(
    useCallback(() => {
      loadOrders(1, true);
    }, [loadOrders])
  );

  // Handle search
  const handleSearch = useCallback(() => {
    loadOrders(1);
  }, [loadOrders]);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    loadOrders(1, true);
  }, [loadOrders]);

  // Load more orders
  const handleLoadMore = useCallback(() => {
    if (hasMore && !loadingMore) {
      loadOrders(page + 1);
    }
  }, [hasMore, loadingMore, page, loadOrders]);

  // Handle status filter
  const handleStatusFilter = useCallback((status: OrderStatus | 'all') => {
    setSelectedStatus(status);
    // Load orders will be triggered by useEffect
  }, []);

  // Navigate to order details
  const navigateToOrderDetails = useCallback((orderId: string) => {
    navigation.navigate('OrderDetails', { orderId });
  }, [navigation]);

  // Get status color
  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.PENDING:
        return '#ffc107';
      case OrderStatus.CONFIRMED:
        return '#17a2b8';
      case OrderStatus.PROCESSING:
        return '#007bff';
      case OrderStatus.SHIPPED:
        return '#28a745';
      case OrderStatus.DELIVERED:
        return '#20c997';
      case OrderStatus.CANCELLED:
        return '#dc3545';
      case OrderStatus.REFUNDED:
        return '#6c757d';
      default:
        return '#6c757d';
    }
  };

  // Render status filter chips
  const renderStatusFilter = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.filterContainer}
      contentContainerStyle={styles.filterContent}
    >
      {[
        { key: 'all', label: 'All Orders' },
        { key: OrderStatus.PENDING, label: 'Pending' },
        { key: OrderStatus.CONFIRMED, label: 'Confirmed' },
        { key: OrderStatus.PROCESSING, label: 'Processing' },
        { key: OrderStatus.SHIPPED, label: 'Shipped' },
        { key: OrderStatus.DELIVERED, label: 'Delivered' },
        { key: OrderStatus.CANCELLED, label: 'Cancelled' },
      ].map(({ key, label }) => (
        <TouchableOpacity
          key={key}
          style={[
            styles.filterChip,
            selectedStatus === key && { backgroundColor: colors.primary }
          ]}
          onPress={() => handleStatusFilter(key as OrderStatus | 'all')}
        >
          <Text style={[
            styles.filterChipText,
            { color: selectedStatus === key ? 'white' : colors.text }
          ]}>
            {label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  // Render order item
  const renderOrderItem = ({ item }: { item: Order }) => (
    <Card style={styles.orderCard}>
      <TouchableOpacity
        style={styles.orderContent}
        onPress={() => navigateToOrderDetails(item.id)}
      >
        <View style={styles.orderHeader}>
          <Text style={[styles.orderNumber, { color: colors.text }]}>
            #{item.order_number}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.statusText}>
              {item.status.replace('_', ' ').toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.orderInfo}>
          <View style={styles.customerInfo}>
            <Text style={[styles.customerName, { color: colors.text }]}>
              {item.customer.first_name} {item.customer.last_name}
            </Text>
            <Text style={[styles.orderDate, { color: colors.textSecondary }]}>
              {new Date(item.created_at).toLocaleDateString()}
            </Text>
          </View>

          <View style={styles.orderSummary}>
            <Text style={[styles.orderAmount, { color: colors.primary }]}>
              ₵{item.total_amount.toFixed(2)}
            </Text>
            <Text style={[styles.itemCount, { color: colors.textSecondary }]}>
              {item.items.length} item{item.items.length !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>

        <View style={styles.orderFooter}>
          <Text style={[styles.paymentStatus, {
            color: item.payment_status === 'paid' ? '#28a745' : '#dc3545'
          }]}>
            {item.payment_status.replace('_', ' ').toUpperCase()}
          </Text>
          {item.shipping_address && (
            <Text style={[styles.shippingInfo, { color: colors.textSecondary }]}>
              {item.shipping_address.city}, {item.shipping_address.country}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    </Card>
  );

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
            {selectedStatus === 'all' ? 'All Orders' : `${selectedStatus.replace('_', ' ').toUpperCase()} Orders`}
          </Text>
          <TouchableOpacity onPress={() => navigation.navigate('OrderDashboard')}>
            <Ionicons name="grid" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search */}
      <View style={[styles.searchContainer, { backgroundColor: colors.surface }]}>
        <Ionicons name="search" size={20} color={colors.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search orders by number, customer name..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => {
            setSearchQuery('');
            loadOrders(1);
          }}>
            <Ionicons name="close" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Status Filters */}
      {renderStatusFilter()}

      {/* Order List */}
      <FlatList
        data={orders}
        renderItem={renderOrderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.1}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={64} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {selectedStatus === 'all' ? 'No orders found' : `No ${selectedStatus.replace('_', ' ')} orders`}
            </Text>
            <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
              Orders will appear here once customers place them
            </Text>
          </View>
        }
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.loadingMore}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : null
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
  },
  filterContainer: {
    marginHorizontal: 16,
    marginBottom: 8,
  },
  filterContent: {
    paddingVertical: 8,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  orderCard: {
    marginBottom: 12,
  },
  orderContent: {
    padding: 16,
  },
  orderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  orderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  orderDate: {
    fontSize: 12,
  },
  orderSummary: {
    alignItems: 'flex-end',
  },
  orderAmount: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  itemCount: {
    fontSize: 12,
  },
  orderFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  paymentStatus: {
    fontSize: 12,
    fontWeight: '500',
  },
  shippingInfo: {
    fontSize: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '500',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
  loadingMore: {
    paddingVertical: 16,
    alignItems: 'center',
  },
});

export default OrderListScreen;
