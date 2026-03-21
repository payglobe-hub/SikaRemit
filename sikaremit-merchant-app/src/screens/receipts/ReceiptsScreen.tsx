import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Share,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiClient } from '../../services/api';
import { logger } from '../../utils/logger';

const { width } = Dimensions.get('window');

type RootStackParamList = {
  MerchantDashboard: undefined;
  Analytics: undefined;
  Devices: undefined;
  Receipts: undefined;
  POSHome: undefined;
};

type ReceiptsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Receipts'>;

interface Receipt {
  id: string;
  transaction_id: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  amount: number;
  currency: string;
  payment_method: string;
  status: 'completed' | 'pending' | 'failed' | 'refunded';
  items: Array<{
    name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
  }>;
  tax_amount: number;
  total_amount: number;
  created_at: string;
  merchant_name: string;
  merchant_address: string;
  merchant_phone: string;
  receipt_number: string;
  digital_receipt_url?: string;
  printed: boolean;
  emailed: boolean;
  sms_sent: boolean;
}

const ReceiptsScreen: React.FC<{ navigation: ReceiptsScreenNavigationProp }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month'>('week');
  const [filter, setFilter] = useState<'all' | 'completed' | 'pending' | 'refunded'>('all');

  useEffect(() => {
    loadReceipts();
  }, [selectedPeriod, filter]);

  const loadReceipts = async () => {
    try {
      setLoading(true);
      
      // Consume from existing SikaRemit backend API
      const response = await apiClient.get(
        `/merchant/receipts/?period=${selectedPeriod}&status=${filter}`
      );
      
      if (response.data.success) {
        setReceipts(response.data.receipts || []);
      } else {
        throw new Error(response.data.error || 'Failed to load receipts');
      }
    } catch (error) {
      logger.error('Receipts loading failed:', error);
      Alert.alert('Error', 'Failed to load receipts. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadReceipts();
  };

  const handleShareReceipt = async (receipt: Receipt) => {
    try {
      const receiptText = generateReceiptText(receipt);
      
      await Share.share({
        message: receiptText,
        title: `Receipt #${receipt.receipt_number}`,
      });
    } catch (error) {
      logger.error('Share failed:', error);
      Alert.alert('Error', 'Failed to share receipt');
    }
  };

  const handleEmailReceipt = async (receipt: Receipt) => {
    if (!receipt.customer_email) {
      Alert.alert('Error', 'Customer email not available');
      return;
    }

    try {
      const response = await apiClient.post(`/merchant/receipts/${receipt.id}/email/`);
      
      if (response.data.success) {
        Alert.alert('Success', 'Receipt emailed successfully');
        // Update receipt status
        setReceipts(prev => 
          prev.map(r => r.id === receipt.id ? { ...r, emailed: true } : r)
        );
      } else {
        throw new Error(response.data.error || 'Failed to email receipt');
      }
    } catch (error) {
      logger.error('Email receipt failed:', error);
      Alert.alert('Error', 'Failed to email receipt');
    }
  };

  const handlePrintReceipt = async (receipt: Receipt) => {
    try {
      const response = await apiClient.post(`/merchant/receipts/${receipt.id}/print/`);
      
      if (response.data.success) {
        Alert.alert('Success', 'Receipt sent to printer');
        // Update receipt status
        setReceipts(prev => 
          prev.map(r => r.id === receipt.id ? { ...r, printed: true } : r)
        );
      } else {
        throw new Error(response.data.error || 'Failed to print receipt');
      }
    } catch (error) {
      logger.error('Print receipt failed:', error);
      Alert.alert('Error', 'Failed to print receipt');
    }
  };

  const generateReceiptText = (receipt: Receipt): string => {
    let text = `🧾 RECEIPT #${receipt.receipt_number}\n\n`;
    text += `${receipt.merchant_name}\n`;
    text += `${receipt.merchant_address}\n`;
    text += `Tel: ${receipt.merchant_phone}\n\n`;
    text += `Date: ${new Date(receipt.created_at).toLocaleString()}\n`;
    text += `Transaction ID: ${receipt.transaction_id}\n\n`;
    
    if (receipt.customer_name) {
      text += `Customer: ${receipt.customer_name}\n`;
    }
    
    text += `Payment Method: ${receipt.payment_method}\n\n`;
    text += `ITEMS:\n`;
    
    receipt.items.forEach((item, index) => {
      text += `${item.quantity}x ${item.name} - ₵${item.unit_price.toFixed(2)} = ₵${item.total_price.toFixed(2)}\n`;
    });
    
    text += `\nSubtotal: ₵${(receipt.total_amount - receipt.tax_amount).toFixed(2)}\n`;
    text += `Tax: ₵${receipt.tax_amount.toFixed(2)}\n`;
    text += `TOTAL: ₵${receipt.total_amount.toFixed(2)}\n\n`;
    text += `Status: ${receipt.status.toUpperCase()}\n`;
    text += `Thank you for your business!`;
    
    return text;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#4CAF50';
      case 'pending': return '#FF9800';
      case 'failed': return '#F44336';
      case 'refunded': return '#9E9E9E';
      default: return '#666';
    }
  };

  const getStatusText = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const renderReceiptCard = (receipt: Receipt) => (
    <View key={receipt.id} style={styles.receiptCard}>
      <View style={styles.receiptHeader}>
        <View style={styles.receiptInfo}>
          <Text style={styles.receiptNumber}>#{receipt.receipt_number}</Text>
          <Text style={styles.receiptDate}>
            {new Date(receipt.created_at).toLocaleDateString()}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(receipt.status) }]}>
          <Text style={styles.statusText}>{getStatusText(receipt.status)}</Text>
        </View>
      </View>

      {receipt.customer_name && (
        <Text style={styles.customerName}>Customer: {receipt.customer_name}</Text>
      )}

      <View style={styles.amountContainer}>
        <Text style={styles.amountLabel}>Total Amount</Text>
        <Text style={styles.amountValue}>₵{receipt.total_amount.toFixed(2)}</Text>
      </View>

      <Text style={styles.paymentMethod}>{receipt.payment_method}</Text>

      <View style={styles.receiptActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleShareReceipt(receipt)}
        >
          <Text style={styles.actionButtonText}>Share</Text>
        </TouchableOpacity>

        {receipt.customer_email && (
          <TouchableOpacity
            style={[styles.actionButton, receipt.emailed && styles.actionButtonDisabled]}
            onPress={() => handleEmailReceipt(receipt)}
            disabled={receipt.emailed}
          >
            <Text style={styles.actionButtonText}>
              {receipt.emailed ? 'Emailed' : 'Email'}
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.actionButton, receipt.printed && styles.actionButtonDisabled]}
          onPress={() => handlePrintReceipt(receipt)}
          disabled={receipt.printed}
        >
          <Text style={styles.actionButtonText}>
            {receipt.printed ? 'Printed' : 'Print'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderPeriodSelector = () => (
    <View style={styles.periodSelector}>
      {(['today', 'week', 'month'] as const).map((period) => (
        <TouchableOpacity
          key={period}
          style={[
            styles.periodButton,
            selectedPeriod === period && styles.periodButtonActive,
          ]}
          onPress={() => setSelectedPeriod(period)}
        >
          <Text style={[
            styles.periodButtonText,
            selectedPeriod === period && styles.periodButtonTextActive,
          ]}>
            {period.charAt(0).toUpperCase() + period.slice(1)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderFilterSelector = () => (
    <View style={styles.filterSelector}>
      {(['all', 'completed', 'pending', 'refunded'] as const).map((status) => (
        <TouchableOpacity
          key={status}
          style={[
            styles.filterButton,
            filter === status && styles.filterButtonActive,
          ]}
          onPress={() => setFilter(status)}
        >
          <Text style={[
            styles.filterButtonText,
            filter === status && styles.filterButtonTextActive,
          ]}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderOverviewStats = () => {
    const totalRevenue = receipts.reduce((sum, r) => sum + r.total_amount, 0);
    const completedReceipts = receipts.filter(r => r.status === 'completed').length;
    const pendingReceipts = receipts.filter(r => r.status === 'pending').length;

    return (
      <View style={styles.overviewContainer}>
        <View style={styles.overviewCard}>
          <Text style={styles.overviewLabel}>Total Revenue</Text>
          <Text style={styles.overviewValue}>₵{totalRevenue.toLocaleString()}</Text>
        </View>
        <View style={styles.overviewCard}>
          <Text style={styles.overviewLabel}>Completed</Text>
          <Text style={styles.overviewValue}>{completedReceipts}</Text>
        </View>
        <View style={styles.overviewCard}>
          <Text style={styles.overviewLabel}>Pending</Text>
          <Text style={styles.overviewValue}>{pendingReceipts}</Text>
        </View>
      </View>
    );
  };

  if (loading && receipts.length === 0) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Loading receipts...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Receipts</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Period Selector */}
        {renderPeriodSelector()}

        {/* Filter Selector */}
        {renderFilterSelector()}

        {/* Overview Stats */}
        {renderOverviewStats()}

        {/* Receipts List */}
        <View style={styles.receiptsContainer}>
          <Text style={styles.sectionTitle}>Recent Receipts</Text>
          {receipts.length > 0 ? (
            receipts.map(renderReceiptCard)
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateTitle}>No receipts found</Text>
              <Text style={styles.emptyStateText}>
                No receipts match the selected criteria
              </Text>
            </View>
          )}
        </View>

        {/* Bottom padding */}
        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#4CAF50',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 24,
    color: 'white',
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
  },
  headerPlaceholder: {
    width: 32,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: 'white',
    marginBottom: 16,
    borderRadius: 8,
    padding: 4,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  periodButtonActive: {
    backgroundColor: '#4CAF50',
  },
  periodButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  periodButtonTextActive: {
    color: 'white',
  },
  filterSelector: {
    flexDirection: 'row',
    backgroundColor: 'white',
    marginBottom: 16,
    borderRadius: 8,
    padding: 4,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  filterButtonActive: {
    backgroundColor: '#4CAF50',
  },
  filterButtonText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: 'white',
  },
  overviewContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  overviewCard: {
    flex: 1,
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  overviewLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  overviewValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  receiptsContainer: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  receiptCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  receiptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  receiptInfo: {
    flex: 1,
  },
  receiptNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  receiptDate: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    color: 'white',
    fontWeight: '500',
  },
  customerName: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  amountContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  amountLabel: {
    fontSize: 14,
    color: '#666',
  },
  amountValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  paymentMethod: {
    fontSize: 12,
    color: '#999',
    marginBottom: 12,
  },
  receiptActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginHorizontal: 2,
  },
  actionButtonDisabled: {
    backgroundColor: '#E0E0E0',
  },
  actionButtonText: {
    fontSize: 12,
    color: 'white',
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});

export default ReceiptsScreen;
