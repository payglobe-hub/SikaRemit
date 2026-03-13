/**
 * Checkout Flow Screen
 * 
 * Multi-step checkout process for customer purchases
 */

import React, { useState, useEffect } from 'react';
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
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { Card, Button } from '../../components/ui';
import { cartService, Cart } from '../../services/cartService';
import { paymentService } from '../../services/paymentService';

interface CheckoutStep {
  id: number;
  title: string;
  description: string;
  completed: boolean;
}

interface ShippingAddress {
  name: string;
  address_line_1: string;
  address_line_2: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  phone: string;
}

interface PaymentMethod {
  code: string;
  name: string;
  enabled: boolean;
  icon: string;
}

const CheckoutFlowScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [cart, setCart] = useState<Cart | null>(null);
  const [shippingAddress, setShippingAddress] = useState<ShippingAddress>({
    name: '',
    address_line_1: '',
    address_line_2: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'Ghana',
    phone: '',
  });
  const [paymentMethod, setPaymentMethod] = useState('');
  const [orderData, setOrderData] = useState<any>(null);
  const [paymentData, setPaymentData] = useState<any>(null);
  const [availablePaymentMethods, setAvailablePaymentMethods] = useState<any[]>([]);

  const checkoutSteps: CheckoutStep[] = [
    { id: 1, title: 'Shipping', description: 'Delivery information', completed: false },
    { id: 2, title: 'Payment', description: 'Payment method', completed: false },
    { id: 3, title: 'Review', description: 'Review order', completed: false },
    { id: 4, title: 'Confirmation', description: 'Order complete', completed: false },
  ];

  const paymentMethods: PaymentMethod[] = [
    { code: 'mobile_money', name: 'Mobile Money', enabled: true, icon: 'phone-portrait' },
    { code: 'card', name: 'Credit/Debit Card', enabled: true, icon: 'card' },
    { code: 'bank_transfer', name: 'Bank Transfer', enabled: true, icon: 'business' },
  ];

  useEffect(() => {
    loadCart();
    loadPaymentMethods();
  }, []);

  const loadPaymentMethods = async () => {
    try {
      const response = await paymentService.getShoppingPaymentMethods();
      if (response.success && response.data) {
        setAvailablePaymentMethods(response.data);
      }
    } catch (error) {
      console.error('Error loading payment methods:', error);
    }
  };

  const loadCart = async () => {
    try {
      setLoading(true);
      const cartData = await cartService.getCart();
      setCart(cartData);
    } catch (error) {
      console.error('Error loading cart:', error);
      Alert.alert('Error', 'Failed to load cart. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const validateShippingAddress = (): boolean => {
    return !!(
      shippingAddress.name &&
      shippingAddress.address_line_1 &&
      shippingAddress.city &&
      shippingAddress.phone &&
      shippingAddress.postal_code
    );
  };

  const handleShippingSubmit = async () => {
    if (!validateShippingAddress()) {
      Alert.alert('Error', 'Please fill all required shipping fields');
      return;
    }

    try {
      setLoading(true);
      // Create order from cart using payment service
      const response = await paymentService.createOrderFromCart(shippingAddress);
      
      if (response.success) {
        setOrderData(response.data);
        setCurrentStep(2);
      } else {
        Alert.alert('Error', response.error || 'Failed to create order');
      }
    } catch (error) {
      console.error('Error creating order:', error);
      Alert.alert('Error', 'Failed to create order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSubmit = async () => {
    if (!paymentMethod) {
      Alert.alert('Error', 'Please select a payment method');
      return;
    }

    try {
      setLoading(true);
      
      // Validate wallet balance if using wallet
      if (paymentMethod === 'wallet' && cart) {
        const validation = await paymentService.validateWalletBalance(cart.total_with_tax);
        if (!validation.sufficient) {
          Alert.alert(
            'Insufficient Balance',
            `Your wallet balance is ${validation.balance.toFixed(2)}. You need ${validation.deficit?.toFixed(2)} more to complete this purchase.`
          );
          return;
        }
      }
      
      // Process payment using payment service
      const response = await paymentService.processShoppingPayment(
        orderData.id,
        paymentMethod,
        paymentMethod === 'wallet' ? { wallet_payment: true } : {}
      );
      
      if (response.success) {
        setPaymentData(response.data);
        setCurrentStep(4);
      } else {
        Alert.alert('Error', response.error || 'Payment failed');
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      Alert.alert('Error', 'Payment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return <ShippingStep data={shippingAddress} onChange={setShippingAddress} onSubmit={handleShippingSubmit} />;
      case 2:
        return <PaymentStep methods={availablePaymentMethods} selectedMethod={paymentMethod} onSelect={setPaymentMethod} onSubmit={handlePaymentSubmit} />;
      case 3:
        return <ReviewStep order={orderData} cart={cart!} shipping={shippingAddress} onEdit={() => setCurrentStep(1)} />;
      case 4:
        return <ConfirmationStep order={orderData} payment={paymentData} />;
      default:
        return null;
    }
  };

  const getAuthToken = async (): Promise<string> => {
    // This should get the auth token from your auth store
    // For now, return a placeholder
    return 'placeholder-token';
  };

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text }]}>Processing...</Text>
        </View>
      </View>
    );
  }

  if (!cart || cart.is_empty) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
        <View style={styles.emptyContainer}>
          <Ionicons name="cart-outline" size={80} color={colors.textSecondary} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Your cart is empty</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary}]}>
            Add some products to proceed with checkout
          </Text>
          <Button
            title="Browse Products"
            onPress={() => navigation.navigate('Shopping')}
            style={styles.browseButton}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      {/* Progress Steps */}
      <View style={styles.progressContainer}>
        {checkoutSteps.map((step, index) => (
          <View key={step.id} style={styles.progressStep}>
            <View style={[
              styles.stepCircle,
              currentStep >= step.id && { backgroundColor: colors.primary },
              step.completed && { backgroundColor: colors.success }
            ]}>
              {step.completed ? (
                <Ionicons name="checkmark" size={16} color="white" />
              ) : (
                <Text style={[
                  styles.stepNumber,
                  currentStep >= step.id && { color: 'white' }
                ]}>
                  {step.id}
                </Text>
              )}
            </View>
            <View style={styles.stepInfo}>
              <Text style={[
                styles.stepTitle,
                currentStep >= step.id && { color: colors.primary }
              ]}>
                {step.title}
              </Text>
              <Text style={styles.stepDescription}>{step.description}</Text>
            </View>
            {index < checkoutSteps.length - 1 && (
              <View style={[
                styles.stepLine,
                currentStep > step.id && { backgroundColor: colors.primary }
              ]} />
            )}
          </View>
        ))}
      </View>

      {/* Step Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {renderStepContent()}
      </ScrollView>
    </View>
  );
};

const ShippingStep: React.FC<{
  data: ShippingAddress;
  onChange: (data: ShippingAddress) => void;
  onSubmit: () => void;
}> = ({ data, onChange, onSubmit }) => {
  const { colors } = useTheme();

  return (
    <Card style={styles.stepCard}>
      <Text style={[styles.stepTitle, { color: colors.text }]}>Shipping Information</Text>
      
      <View style={styles.formGroup}>
        <Text style={[styles.label, { color: colors.text }]}>Full Name *</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, color: colors.text }]}
          value={data.name}
          onChangeText={(text: string) => onChange({ ...data, name: text })}
          placeholder="Enter your full name"
          placeholderTextColor={colors.textSecondary}
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={[styles.label, { color: colors.text }]}>Address *</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, color: colors.text }]}
          value={data.address_line_1}
          onChangeText={(text: string) => onChange({ ...data, address_line_1: text })}
          placeholder="Street address"
          placeholderTextColor={colors.textSecondary}
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={[styles.label, { color: colors.text }]}>City *</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, color: colors.text }]}
          value={data.city}
          onChangeText={(text: string) => onChange({ ...data, city: text })}
          placeholder="City"
          placeholderTextColor={colors.textSecondary}
        />
      </View>

      <View style={styles.formRow}>
        <View style={styles.formGroupHalf}>
          <Text style={[styles.label, { color: colors.text }]}>State</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, color: colors.text }]}
            value={data.state}
            onChangeText={(text: string) => onChange({ ...data, state: text })}
            placeholder="State"
            placeholderTextColor={colors.textSecondary}
          />
        </View>
        <View style={styles.formGroupHalf}>
          <Text style={[styles.label, { color: colors.text }]}>Postal Code</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, color: colors.text }]}
            value={data.postal_code}
            onChangeText={(text: string) => onChange({ ...data, postal_code: text })}
            placeholder="Postal code"
            placeholderTextColor={colors.textSecondary}
          />
        </View>
      </View>

      <View style={styles.formGroup}>
        <Text style={[styles.label, { color: colors.text }]}>Phone Number *</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, color: colors.text }]}
          value={data.phone}
          onChangeText={(text: string) => onChange({ ...data, phone: text })}
          placeholder="Phone number"
          keyboardType="phone-pad"
          placeholderTextColor={colors.textSecondary}
        />
      </View>

      <Button title="Continue to Payment" onPress={onSubmit} style={styles.submitButton} />
    </Card>
  );
};

const PaymentStep: React.FC<{
  methods: any[];
  selectedMethod: string;
  onSelect: (method: string) => void;
  onSubmit: () => void;
}> = ({ methods, selectedMethod, onSelect, onSubmit }) => {
  const { colors } = useTheme();

  return (
    <Card style={styles.stepCard}>
      <Text style={[styles.stepTitle, { color: colors.text }]}>Payment Method</Text>
      
      <View style={styles.paymentMethods}>
        {methods.map((method) => (
          <TouchableOpacity
            key={method.code}
            style={[
              styles.paymentMethod,
              selectedMethod === method.code && { borderColor: colors.primary, backgroundColor: colors.primary + '20' }
            ]}
            onPress={() => onSelect(method.code)}
          >
            <Ionicons name={method.icon} size={24} color={selectedMethod === method.code ? colors.primary : colors.text} />
            <View style={styles.paymentMethodInfo}>
              <Text style={[styles.paymentMethodName, { color: colors.text }]}>{method.name}</Text>
              <Text style={[styles.paymentMethodDesc, { color: colors.textSecondary }]}>
                {method.description}
              </Text>
              {method.is_wallet && method.wallet_balance !== undefined && (
                <Text style={[styles.walletBalance, { color: colors.success }]}>
                  Balance: ${method.wallet_balance.toFixed(2)}
                </Text>
              )}
            </View>
            {selectedMethod === method.code && (
              <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
            )}
          </TouchableOpacity>
        ))}
      </View>

      <Button title="Complete Order" onPress={onSubmit} style={styles.submitButton} />
    </Card>
  );
};

const ReviewStep: React.FC<{
  order: any;
  cart: Cart;
  shipping: ShippingAddress;
  onEdit: () => void;
}> = ({ order, cart, shipping, onEdit }) => {
  const { colors } = useTheme();

  return (
    <Card style={styles.stepCard}>
      <Text style={[styles.stepTitle, { color: colors.text }]}>Order Review</Text>
      
      <View style={styles.reviewSection}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Order Items</Text>
        {cart.items.map((item, index) => (
          <View key={item.id} style={styles.reviewItem}>
            <Text style={[styles.itemName, { color: colors.text }]}>{item.quantity}x {item.product.name}</Text>
            <Text style={[styles.itemPrice, { color: colors.primary }]}>${item.subtotal.toFixed(2)}</Text>
          </View>
        ))}
      </View>

      <View style={styles.reviewSection}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Shipping Address</Text>
        <Text style={[styles.addressText, { color: colors.text }]}>
          {shipping.name}
          {shipping.address_line_1}
          {shipping.address_line_2 && `\n${shipping.address_line_2}`}
          {`${shipping.city}, ${shipping.state} ${shipping.postal_code}`}
          {shipping.country}
          {shipping.phone}
        </Text>
        <TouchableOpacity onPress={onEdit}>
          <Text style={[styles.editLink, { color: colors.primary }]}>Edit Address</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.reviewSection}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Order Summary</Text>
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { color: colors.text }]}>Subtotal</Text>
          <Text style={[styles.summaryValue, { color: colors.text }]}>${cart.subtotal.toFixed(2)}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { color: colors.text }]}>Tax (5%)</Text>
          <Text style={[styles.summaryValue, { color: colors.text }]}>${(cart.total_with_tax - cart.subtotal).toFixed(2)}</Text>
        </View>
        <View style={[styles.summaryRow, styles.totalRow]}>
          <Text style={[styles.totalLabel, { color: colors.text }]}>Total</Text>
          <Text style={[styles.totalValue, { color: colors.primary }]}>${cart.total_with_tax.toFixed(2)}</Text>
        </View>
      </View>

      <View style={styles.buttonRow}>
        <Button title="Edit Shipping" onPress={onEdit} style={styles.secondaryButton} />
        <Button title="Place Order" onPress={() => {}} style={styles.primaryButton} />
      </View>
    </Card>
  );
};

const ConfirmationStep: React.FC<{ order: any; payment: any }> = ({ order, payment }) => {
  const { colors } = useTheme();

  return (
    <Card style={styles.stepCard}>
      <View style={styles.confirmationContainer}>
        <Ionicons name="checkmark-circle" size={80} color={colors.success} />
        <Text style={[styles.confirmationTitle, { color: colors.text }]}>Order Confirmed!</Text>
        <Text style={[styles.confirmationMessage, { color: colors.textSecondary }]}>
          Your order {order?.order_number} has been successfully placed.
        </Text>
        <Text style={[styles.confirmationSubtext, { color: colors.textSecondary }]}>
          You will receive a confirmation email shortly with tracking details.
        </Text>
        
        <View style={styles.orderDetails}>
          <Text style={[styles.detailTitle, { color: colors.text }]}>Order Details:</Text>
          <Text style={[styles.detailText, { color: colors.text }]}>Order Number: {order?.order_number}</Text>
          <Text style={[styles.detailText, { color: colors.text }]}>Payment Method: {payment?.payment_method}</Text>
          <Text style={[styles.detailText, { color: colors.text }]}>Status: {order?.status}</Text>
        </View>

        <Button
          title="View Orders"
          onPress={() => {/* Navigate to orders screen */}}
          style={styles.confirmationButton}
        />
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  browseButton: {
    paddingHorizontal: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginLeft: 16,
  },
  stepsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  step: {
    alignItems: 'center',
    flex: 1,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    zIndex: 2,
  },
  stepNumberActive: {
    backgroundColor: '#007AFF',
  },
  stepNumberCompleted: {
    backgroundColor: '#34C759',
  },
  stepNumberText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
  },
  stepNumberTextActive: {
    color: '#fff',
  },
  stepNumberTextCompleted: {
    color: '#fff',
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  stepDescription: {
    fontSize: 12,
    color: '#999',
  },
  stepLine: {
    position: 'absolute',
    top: 16,
    left: '50%',
    width: '100%',
    height: 2,
    backgroundColor: '#e0e0e0',
    zIndex: 1,
    marginBottom: 16,
  },
  stepCard: {
    padding: 20,
    marginBottom: 20,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  progressStep: {
    alignItems: 'center',
    flex: 1,
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    zIndex: 2,
  },
  stepInfo: {
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  formGroup: {
    marginBottom: 16,
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
  },
  formGroupHalf: {
    flex: 1,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    height: 48,
    borderRadius: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  submitButton: {
    marginTop: 20,
  },
  paymentMethods: {
    gap: 12,
  },
  paymentMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  paymentMethodInfo: {
    flex: 1,
    marginLeft: 16,
  },
  paymentMethodName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  paymentMethodDesc: {
    fontSize: 14,
  },
  walletBalance: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  reviewSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  reviewItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemName: {
    fontSize: 16,
    flex: 1,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: '600',
  },
  addressText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  editLink: {
    fontSize: 14,
    color: '#007AFF',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 16,
  },
  summaryValue: {
    fontSize: 16,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 8,
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  primaryButton: {
    flex: 1,
  },
  secondaryButton: {
    flex: 1,
  },
  confirmationContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  confirmationTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 8,
  },
  confirmationMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 8,
  },
  confirmationSubtext: {
    fontSize: 14,
    textAlign: 'center',
    color: '#666',
    marginBottom: 24,
  },
  orderDetails: {
    width: '100%',
    padding: 20,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    marginBottom: 24,
  },
  detailTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  detailText: {
    fontSize: 14,
    marginBottom: 8,
  },
  confirmationButton: {
    paddingHorizontal: 32,
  },
});

export default CheckoutFlowScreen;
