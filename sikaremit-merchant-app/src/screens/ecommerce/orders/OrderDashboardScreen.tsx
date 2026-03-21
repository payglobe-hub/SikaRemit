/**
 * Order Dashboard Screen
 *
 * Shows merchant order overview, statistics, and recent orders
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { Card, Button } from '@/components/ui';
import { OrderService } from '@/services/ecommerce/OrderService';
import { Order, OrderStatus } from '@sikaremit/mobile-shared';
import { connectWebSocket, onWebSocketMessage, disconnectWebSocket, WebSocketMessage } from '@/services/WebSocketService';

interface OrderStats {
  total_orders: number;
  pending_orders: number;
  processing_orders: number;
  shipped_orders: number;
  delivered_orders: number;
  cancelled_orders: number;
  total_revenue: number;
  average_order_value: number;
}

const OrderDashboardScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { colors } = useTheme();

  const [stats, setStats] = useState<OrderStats>({
    total_orders: 0,
    pending_orders: 0,
    processing_orders: 0,
    shipped_orders: 0,
    delivered_orders: 0,
    cancelled_orders: 0,
    total_revenue: 0,
    average_order_value: 0,
  });
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Load dashboard data
  const loadDashboardData = useCallback(async (refresh = false) => {
    try {
      if (refresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      // Load stats and recent orders in parallel
      const [statsData, ordersResponse] = await Promise.all([
        OrderService.getOrderStats(),
        OrderService.getOrders({
          page: 1,
          page_size: 10,
          sort_by: 'created_at',
          sort_order: 'desc'
        })
      ]);

      setStats(statsData);
      setRecentOrders(ordersResponse.orders);
    } catch (error: any) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Connect to WebSocket for real-time updates
  useEffect(() => {
    connectWebSocket();

    // Subscribe to order updates
    const unsubscribeOrderUpdate = onWebSocketMessage('order_update', (message: WebSocketMessage) => {
      
      // Refresh dashboard data when order updates are received
      loadDashboardData(true);
    });

    // Subscribe to notifications
    const unsubscribeNotification = onWebSocketMessage('notification', (message: WebSocketMessage) => {
      
      // Handle notification display (could show local notification or toast)
    });

    return () => {
      unsubscribeOrderUpdate();
      unsubscribeNotification();
      disconnectWebSocket();
    };
  }, [loadDashboardData]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    loadDashboardData(true);
  }, [loadDashboardData]);

  // Navigate to orders by status
  const navigateToOrders = useCallback((status?: OrderStatus) => {
    navigation.navigate('OrderList', { status });
  }, [navigation]);

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

  // Render stat card
  const renderStatCard = (
    title: string,
    value: number | string,
    icon: string,
    color: string,
    onPress?: () => void
  ) => (
    <TouchableOpacity
      style={[styles.statCard, { borderLeftColor: color }]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.statContent}>
        <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
          <Ionicons name={icon as any} size={24} color={color} />
        </View>
        <View style={styles.statInfo}>
          <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
          <Text style={[styles.statTitle, { color: colors.textSecondary }]}>{title}</Text>
        </View>
        {onPress && (
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        )}
      </View>
    </TouchableOpacity>
  );

  // Render order item
  const renderOrderItem = (order: Order) => (
    <TouchableOpacity
      key={order.id}
      style={[styles.orderCard, { backgroundColor: colors.surface }]}
      onPress={() => navigateToOrderDetails(order.id)}
    >
      <View style={styles.orderHeader}>
        <Text style={[styles.orderNumber, { color: colors.text }]}>
          #{order.order_number}
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) }]}>
          <Text style={styles.statusText}>
            {order.status.replace('_', ' ').toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={styles.orderInfo}>
        <Text style={[styles.customerName, { color: colors.text }]}>
          {order.customer.first_name} {order.customer.last_name}
        </Text>
        <Text style={[styles.orderAmount, { color: colors.primary }]}>
          â‚µ{order.total_amount.toFixed(2)}
        </Text>
      </View>

      <View style={styles.orderFooter}>
        <Text style={[styles.orderDate, { color: colors.textSecondary }]}>
          {new Date(order.created_at).toLocaleDateString()}
        </Text>
        <Text style={[styles.itemCount, { color: colors.textSecondary }]}>
          {order.items.length} item{order.items.length !== 1 ? 's' : ''}
        </Text>
      </View>
    </TouchableOpacity>
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
          <Text style={[styles.headerTitle, { color: colors.text }]}>Orders</Text>
          <TouchableOpacity onPress={() => navigation.navigate('OrderList')}>
            <Ionicons name="list" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Stats Overview */}
        <View style={styles.statsContainer}>
          {renderStatCard(
            'Total Orders',
            stats.total_orders,
            'receipt-outline',
            colors.primary,
            () => navigateToOrders()
          )}
          {renderStatCard(
            'Pending',
            stats.pending_orders,
            'time-outline',
            '#ffc107',
            () => navigateToOrders(OrderStatus.PENDING)
          )}
          {renderStatCard(
            'Processing',
            stats.processing_orders,
            'construct-outline',
            '#007bff',
            () => navigateToOrders(OrderStatus.PROCESSING)
          )}
          {renderStatCard(
            'Shipped',
            stats.shipped_orders,
            'airplane-outline',
            '#28a745',
            () => navigateToOrders(OrderStatus.SHIPPED)
          )}
          {renderStatCard(
            'Total Revenue',
            `â‚µ${stats.total_revenue.toFixed(2)}`,
            'cash-outline',
            '#20c997'
          )}
          {renderStatCard(
            'Avg Order Value',
            `â‚µ${stats.average_order_value.toFixed(2)}`,
            'analytics-outline',
            '#17a2b8'
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: colors.surface }]}
              onPress={() => navigateToOrders(OrderStatus.PENDING)}
            >
              <Ionicons name="time" size={24} color="#ffc107" />
              <Text style={[styles.actionText, { color: colors.text }]}>Process Pending</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: colors.surface }]}
              onPress={() => navigateToOrders(OrderStatus.PROCESSING)}
            >
              <Ionicons name="construct" size={24} color="#007bff" />
              <Text style={[styles.actionText, { color: colors.text }]}>Fulfill Orders</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: colors.surface }]}
              onPress={() => navigateToOrders(OrderStatus.SHIPPED)}
            >
              <Ionicons name="airplane" size={24} color="#28a745" />
              <Text style={[styles.actionText, { color: colors.text }]}>Track Shipments</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: colors.surface }]}
              onPress={() => {
                // TODO: Implement export functionality
              }}
            >
              <Ionicons name="download" size={24} color={colors.primary} />
              <Text style={[styles.actionText, { color: colors.text }]}>Export Orders</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Orders */}
        {recentOrders.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Orders</Text>
              <TouchableOpacity onPress={() => navigation.navigate('OrderList')}>
                <Text style={[styles.viewAllText, { color: colors.primary }]}>View All</Text>
              </TouchableOpacity>
            </View>

            {recentOrders.slice(0, 5).map(order => renderOrderItem(order))}
          </View>
        )}
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
  statsContainer: {
    padding: 16,
  },
  statCard: {
    marginBottom: 12,
    borderLeftWidth: 4,
  },
  statContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  statInfo: {
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  section: {
    margin: 16,
    marginBottom: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '500',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 8,
    textAlign: 'center',
  },
  orderCard: {
    padding: 16,
    marginBottom: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  orderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
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
  customerName: {
    fontSize: 14,
    fontWeight: '500',
  },
  orderAmount: {
    fontSize: 16,
    fontWeight: '600',
  },
  orderFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  orderDate: {
    fontSize: 12,
  },
  itemCount: {
    fontSize: 12,
  },
});

export default OrderDashboardScreen;

