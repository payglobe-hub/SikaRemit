/**
 * Order Details Screen
 *
 * Shows comprehensive order information with management capabilities
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { Card, Button } from '@/components/ui';
import { OrderService } from '@/services/ecommerce/OrderService';
import {
  Order,
  OrderStatus,
  PaymentStatus,
  FulfillmentStatus,
  UpdateOrderRequest
} from '@sikaremit/mobile-shared';
import { isOnline, enqueueOperation } from '@/services/OfflineQueueService';

interface RouteParams {
  orderId: string;
}

const OrderDetailsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { colors } = useTheme();
  const { orderId } = route.params as RouteParams;

  const [shippingCarriers, setShippingCarriers] = useState<Array<{
    id: string;
    name: string;
    code: string;
    services: string[];
    estimated_delivery_days: number;
    cost_per_kg: number;
  }>>([]);
  const [selectedCarrier, setSelectedCarrier] = useState<string>('');

  // Load shipping carriers on mount
  useEffect(() => {
    const loadShippingCarriers = async () => {
      try {
        const carriers = await OrderService.getShippingCarriers();
        setShippingCarriers(carriers);
      } catch (error: any) {
        console.error('Failed to load shipping carriers:', error);
      }
    };

    loadShippingCarriers();
  }, []);

  // Order state
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');

  // Load order details
  const loadOrderDetails = useCallback(async () => {
    try {
      setLoading(true);
      const orderData = await OrderService.getOrder(orderId);
      setOrder(orderData);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to load order details');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  }, [orderId, navigation]);

  useEffect(() => {
    loadOrderDetails();
  }, [loadOrderDetails]);

  // Refresh when screen focuses
  useFocusEffect(
    useCallback(() => {
      loadOrderDetails();
    }, [loadOrderDetails])
  );

  // Update order status
  const handleUpdateOrderStatus = useCallback(async (status: OrderStatus) => {
    if (!order) return;

    try {
      setUpdating(true);
      const updatedOrder = await OrderService.updateOrder(order.id, { status });
      setOrder(updatedOrder);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to update order status');
    } finally {
      setUpdating(false);
    }
  }, [order]);

  // Update fulfillment status for order items
  const handleUpdateFulfillment = useCallback(async (
    itemId: string,
    status: FulfillmentStatus,
    trackingNumber?: string,
    carrier?: string
  ) => {
    if (!order) return;

    try {
      setUpdating(true);
      const updatedOrder = await OrderService.updateFulfillment(
        order.id,
        itemId,
        status,
        trackingNumber,
        carrier
      );
      setOrder(updatedOrder);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to update fulfillment status');
    } finally {
      setUpdating(false);
    }
  }, [order]);

  // Send notification to customer
  const handleSendNotification = useCallback(async () => {
    if (!order || !notificationMessage.trim()) return;

    try {
      await OrderService.notifyCustomer(order.id, notificationMessage.trim());
      setNotificationMessage('');
      Alert.alert('Success', 'Notification sent to customer');
    } catch (error: any) {
      Alert.alert('Error', 'Failed to send notification');
    }
  }, [order, notificationMessage]);

  // Generate shipping label
  const handleGenerateShippingLabel = useCallback(async (itemId: string) => {
    if (!order || !selectedCarrier) {
      if (!order) Alert.alert('Error', 'Order not loaded');
      else Alert.alert('Error', 'Please select a shipping carrier first');
      return;
    }

    try {
      setUpdating(true);
      const result = await OrderService.generateShippingLabel(order.id, itemId, selectedCarrier);
      
      // Update the order with the new tracking information
      const updatedOrder = await OrderService.getOrder(order.id);
      setOrder(updatedOrder);
      
      Alert.alert('Success', `Shipping label generated!\nTracking: ${result.tracking_number}`);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to generate shipping label');
    } finally {
      setUpdating(false);
    }
  }, [order, selectedCarrier]);

  // Update delivery status
  const handleUpdateDeliveryStatus = useCallback(async (itemId: string, status: string) => {
    if (!order) {
      Alert.alert('Error', 'Order not loaded');
      return;
    }

    try {
      setUpdating(true);
      const updatedOrder = await OrderService.updateDeliveryStatus(order.id, itemId, status);
      setOrder(updatedOrder);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to update delivery status');
    } finally {
      setUpdating(false);
    }
  }, [order]);

  // Process return request
  const handleProcessReturn = useCallback(async (itemId: string) => {
    if (!order) {
      Alert.alert('Error', 'Order not loaded');
      return;
    }

    Alert.prompt(
      'Process Return',
      'Enter return reason:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Process',
          onPress: async (reason) => {
            if (reason) {
              try {
                setUpdating(true);
                await OrderService.processReturnRequest(order.id, itemId, reason, 'Return requested by merchant');
                const updatedOrder = await OrderService.getOrder(order.id);
                setOrder(updatedOrder);
                Alert.alert('Success', 'Return request processed');
              } catch (error: any) {
                Alert.alert('Error', 'Failed to process return');
              } finally {
                setUpdating(false);
              }
            }
          }
        }
      ]
    );
  }, [order]);

  // Cancel order
  const handleCancelOrder = useCallback(async (reason?: string) => {
    if (!order) return;

    Alert.alert(
      'Cancel Order',
      'Are you sure you want to cancel this order? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          style: 'destructive',
          onPress: async () => {
            try {
              setUpdating(true);
              await OrderService.cancelOrder(order.id, reason);
              const updatedOrder = await OrderService.getOrder(order.id);
              setOrder(updatedOrder);
            } catch (error: any) {
              Alert.alert('Error', 'Failed to cancel order');
            } finally {
              setUpdating(false);
            }
          }
        }
      ]
    );
  }, [order]);

  // Get status color
  const getStatusColor = (status: OrderStatus | PaymentStatus | FulfillmentStatus) => {
    switch (status) {
      case OrderStatus.PENDING:
      case 'pending':
        return '#ffc107';
      case OrderStatus.CONFIRMED:
        return '#17a2b8';
      case OrderStatus.PROCESSING:
      case 'processing':
        return '#007bff';
      case OrderStatus.SHIPPED:
      case 'shipped':
        return '#28a745';
      case OrderStatus.DELIVERED:
      case 'delivered':
        return '#20c997';
      case OrderStatus.CANCELLED:
      case 'cancelled':
        return '#dc3545';
      case OrderStatus.REFUNDED:
      case 'refunded':
        return '#6c757d';
      case 'paid':
        return '#28a745';
      case 'failed':
        return '#dc3545';
      default:
        return '#6c757d';
    }
  };

  // Render order status actions
  const renderOrderStatusActions = () => {
    if (!order) return null;

    const actions = [];

    switch (order.status) {
      case OrderStatus.PENDING:
        actions.push(
          <Button
            key="confirm"
            title="Confirm Order"
            onPress={() => handleUpdateOrderStatus(OrderStatus.CONFIRMED)}
            loading={updating}
            style={styles.actionButtonMargin}
          />
        );
        break;
      case OrderStatus.CONFIRMED:
        actions.push(
          <Button
            key="process"
            title="Start Processing"
            onPress={() => handleUpdateOrderStatus(OrderStatus.PROCESSING)}
            loading={updating}
            style={styles.actionButtonMargin}
          />
        );
        break;
      case OrderStatus.PROCESSING:
        actions.push(
          <Button
            key="ship"
            title="Mark as Shipped"
            onPress={() => handleUpdateOrderStatus(OrderStatus.SHIPPED)}
            loading={updating}
            style={styles.actionButtonMargin}
          />
        );
        break;
      case OrderStatus.SHIPPED:
        actions.push(
          <Button
            key="deliver"
            title="Mark as Delivered"
            onPress={() => handleUpdateOrderStatus(OrderStatus.DELIVERED)}
            loading={updating}
            style={styles.actionButtonMargin}
          />
        );
        break;
    }

    // Always show cancel option for non-delivered orders
    if (order.status !== OrderStatus.DELIVERED && order.status !== OrderStatus.CANCELLED) {
      actions.push(
        <Button
          key="cancel"
          title="Cancel Order"
          variant="outline"
          onPress={() => handleCancelOrder()}
          loading={updating}
          style={styles.cancelButton}
        />
      );
    }

    return actions.length > 0 ? (
      <View style={styles.actionsSection}>
        {actions}
      </View>
    ) : null;
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text>Order not found</Text>
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
            Order #{order.order_number}
          </Text>
          <View style={{ width: 24 }} />
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Order Status */}
        <Card style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <Text style={[styles.statusLabel, { color: colors.text }]}>Order Status</Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) }]}>
              <Text style={styles.statusText}>
                {order.status.replace('_', ' ').toUpperCase()}
              </Text>
            </View>
          </View>
          <View style={styles.statusRow}>
            <Text style={[styles.statusLabel, { color: colors.text }]}>Payment Status</Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.payment_status) }]}>
              <Text style={styles.statusText}>
                {order.payment_status.replace('_', ' ').toUpperCase()}
              </Text>
            </View>
          </View>
        </Card>

        {/* Order Actions */}
        {renderOrderStatusActions()}

        {/* Customer Information */}
        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Customer Information</Text>
          <View style={styles.customerInfo}>
            <Text style={[styles.customerName, { color: colors.text }]}>
              {order.customer.first_name} {order.customer.last_name}
            </Text>
            <Text style={[styles.customerEmail, { color: colors.textSecondary }]}>
              {order.customer.email}
            </Text>
            {order.customer.phone_number && (
              <Text style={[styles.customerPhone, { color: colors.textSecondary }]}>
                {order.customer.phone_number}
              </Text>
            )}
          </View>
        </Card>

        {/* Shipping Carrier Selection */}
        {order!.status === OrderStatus.PROCESSING && (
          <Card style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Shipping Carrier</Text>
            <Text style={[styles.label, { color: colors.text }]}>Select Shipping Carrier</Text>
            <View style={[styles.pickerContainer, { borderColor: colors.border }]}>
              <TextInput
                style={[styles.pickerInput, { color: colors.text }]}
                placeholder="Select carrier"
                placeholderTextColor={colors.textSecondary}
                value={shippingCarriers.find(c => c.code === selectedCarrier)?.name || ''}
                editable={false}
              />
              <TouchableOpacity style={styles.pickerButton}>
                <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.helperText, { color: colors.textSecondary }]}>
              Select a carrier before generating shipping labels
            </Text>
          </Card>
        )}

        {/* Order Items */}
        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Order Items</Text>
          {order.items.map((item) => (
            <View key={item.id} style={styles.orderItem}>
              <View style={styles.itemInfo}>
                <Text style={[styles.itemName, { color: colors.text }]}>
                  {item.product.name}
                </Text>
                <Text style={[styles.itemQuantity, { color: colors.textSecondary }]}>
                  Quantity: {item.quantity}
                </Text>
                <Text style={[styles.itemPrice, { color: colors.primary }]}>
                  ₵{item.total_price.toFixed(2)}
                </Text>
              </View>

              <View style={styles.fulfillmentInfo}>
                <View style={[styles.fulfillmentBadge, {
                  backgroundColor: getStatusColor(item.status)
                }]}>
                  <Text style={styles.fulfillmentText}>
                    {item.status.replace('_', ' ').toUpperCase()}
                  </Text>
                </View>

                {item.tracking_number && (
                  <Text style={[styles.trackingInfo, { color: colors.textSecondary }]}>
                    {item.shipping_carrier}: {item.tracking_number}
                  </Text>
                )}

                {/* Fulfillment Actions */}
                <View style={styles.fulfillmentActions}>
                  {order.status === OrderStatus.PROCESSING && item.status === 'pending' && (
                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: colors.primary }]}
                      onPress={() => handleGenerateShippingLabel(item.id)}
                      disabled={updating}
                    >
                      <Ionicons name="document-text" size={14} color="white" />
                      <Text style={styles.actionButtonText}>Generate Label</Text>
                    </TouchableOpacity>
                  )}

                  {item.status === 'shipped' && (
                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: '#28a745' }]}
                      onPress={() => handleUpdateDeliveryStatus(item.id, 'delivered')}
                      disabled={updating}
                    >
                      <Ionicons name="checkmark-circle" size={14} color="white" />
                      <Text style={styles.actionButtonText}>Mark Delivered</Text>
                    </TouchableOpacity>
                  )}

                  {item.status === 'delivered' && (
                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: '#ffc107' }]}
                      onPress={() => handleProcessReturn(item.id)}
                      disabled={updating}
                    >
                      <Ionicons name="return-up-back" size={14} color="white" />
                      <Text style={styles.actionButtonText}>Process Return</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
          ))}
        </Card>

        {/* Shipping Information */}
        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Shipping Address</Text>
          <View style={styles.addressInfo}>
            <Text style={[styles.addressText, { color: colors.text }]}>
              {order.shipping_address.first_name} {order.shipping_address.last_name}
            </Text>
            <Text style={[styles.addressText, { color: colors.text }]}>
              {order.shipping_address.address_line_1}
            </Text>
            {order.shipping_address.address_line_2 && (
              <Text style={[styles.addressText, { color: colors.text }]}>
                {order.shipping_address.address_line_2}
              </Text>
            )}
            <Text style={[styles.addressText, { color: colors.text }]}>
              {order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.postal_code}
            </Text>
            <Text style={[styles.addressText, { color: colors.text }]}>
              {order.shipping_address.country}
            </Text>
            {order.shipping_address.phone && (
              <Text style={[styles.addressText, { color: colors.textSecondary }]}>
                Phone: {order.shipping_address.phone}
              </Text>
            )}
          </View>
        </Card>

        {/* Order Summary */}
        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Order Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Subtotal</Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>₵{order.subtotal.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Shipping</Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>₵{order.shipping_cost.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Tax</Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>₵{order.tax_amount.toFixed(2)}</Text>
          </View>
          {order.discount_amount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Discount</Text>
              <Text style={[styles.summaryValue, { color: '#28a745' }]}>-₵{order.discount_amount.toFixed(2)}</Text>
            </View>
          )}
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={[styles.totalLabel, { color: colors.text }]}>Total</Text>
            <Text style={[styles.totalValue, { color: colors.primary }]}>₵{order.total_amount.toFixed(2)}</Text>
          </View>
        </Card>

        {/* Customer Communication */}
        <Card style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Customer Communication</Text>
          <TextInput
            style={[styles.messageInput, { color: colors.text, borderColor: colors.border }]}
            placeholder="Send a message to the customer..."
            placeholderTextColor={colors.textSecondary}
            value={notificationMessage}
            onChangeText={setNotificationMessage}
            multiline
            numberOfLines={3}
          />
          <Button
            title="Send Notification"
            onPress={handleSendNotification}
            disabled={!notificationMessage.trim()}
            style={styles.sendButton}
          />
        </Card>

        {/* Additional Actions */}
        {order.status === OrderStatus.DELIVERED && (
          <Card style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Additional Actions</Text>
            <Button
              title="Process Refund"
              variant="outline"
              onPress={() => {
                // TODO: Show refund dialog
                Alert.alert('Coming Soon', 'Refund processing will be implemented');
              }}
              style={styles.refundButton}
            />
          </Card>
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
  statusCard: {
    margin: 16,
    marginBottom: 0,
    padding: 16,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionsSection: {
    margin: 16,
    marginBottom: 0,
    gap: 8,
  },
  actionButtonMargin: {
    marginBottom: 8,
  },
  cancelButton: {
    marginBottom: 16,
  },
  section: {
    margin: 16,
    marginBottom: 0,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  customerInfo: {
    marginBottom: 8,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  customerEmail: {
    fontSize: 14,
    marginBottom: 2,
  },
  customerPhone: {
    fontSize: 14,
  },
  orderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  itemQuantity: {
    fontSize: 14,
    marginBottom: 2,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: '600',
  },
  fulfillmentInfo: {
    alignItems: 'flex-end',
  },
  fulfillmentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 4,
  },
  fulfillmentText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  trackingInfo: {
    fontSize: 12,
  },
  addressInfo: {
    marginBottom: 8,
  },
  addressText: {
    fontSize: 14,
    lineHeight: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  summaryLabel: {
    fontSize: 14,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    paddingTop: 12,
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  messageInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    marginBottom: 12,
    textAlignVertical: 'top',
  },
  sendButton: {
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  pickerContainer: {
    borderWidth: 1,
    borderRadius: 8,
    backgroundColor: 'white',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  pickerInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  pickerButton: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  helperText: {
    fontSize: 12,
  },
  fulfillmentActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  refundButton: {
    marginBottom: 16,
  },
});

export default OrderDetailsScreen;
