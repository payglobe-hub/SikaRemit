import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { useMerchantOffline } from '../../contexts/MerchantOfflineContext';
import { MerchantOfflineStorageService } from '../../services/offline/MerchantOfflineStorageService';
import { MerchantQueuedAction } from '../../services/offline/MerchantActionQueueService';
import MerchantActionQueueService from '../../services/offline/MerchantActionQueueService';

const { width, height } = Dimensions.get('window');

interface MerchantOfflineModalProps {
  visible: boolean;
  onClose: () => void;
}

interface QueueItem {
  id: string;
  action_type: string;
  action_data: any;
  status: string;
  created_at: string;
  retry_count: number;
  max_retries: number;
  error_message?: string;
  transaction?: any;
}

export const MerchantOfflineModal: React.FC<MerchantOfflineModalProps> = ({
  visible,
  onClose,
}) => {
  const { isConnected, merchantStats, refreshStats } = useMerchantOffline();
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);

  const storageService = MerchantOfflineStorageService.getInstance();
  const queueService = MerchantActionQueueService.getInstance();

  useEffect(() => {
    if (visible) {
      loadQueueItems();
    }
  }, [visible]);

  const loadQueueItems = async () => {
    try {
      setLoading(true);
      
      // Get pending actions
      const pendingActions = await storageService.getPendingActions();
      
      // Get transaction details for each action
      const itemsWithTransactions: QueueItem[] = await Promise.all(
        pendingActions.map(async (action: any) => {
          let transaction: any;
          
          // Try to find related transaction
          if (action.action_type === 'receive_payment') {
            const actionData = action.action_data as any;
            const transactions = await storageService.getTransactions(actionData.merchant_id);
            transaction = transactions.find(tx => 
              tx.customer_account === actionData.customer_account && 
              tx.amount === actionData.amount
            );
          }
          
          return {
            ...action,
            transaction,
          };
        })
      );
      
      setQueueItems(itemsWithTransactions);
    } catch (error) {
      console.error('Failed to load merchant queue items:', error);
      Alert.alert('Error', 'Failed to load queue items');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadQueueItems();
    await refreshStats();
    setRefreshing(false);
  };

  const handleRetryAction = async (actionId: string) => {
    try {
      Alert.alert(
        'Retry Action',
        'Are you sure you want to retry this action?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Retry',
            onPress: async () => {
              await queueService.retryAction(actionId);
              await loadQueueItems();
              await refreshStats();
            },
          },
        ]
      );
    } catch (error) {
      console.error('Failed to retry action:', error);
      Alert.alert('Error', 'Failed to retry action');
    }
  };

  const handleCancelAction = async (actionId: string) => {
    try {
      Alert.alert(
        'Cancel Action',
        'Are you sure you want to cancel this action?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Cancel Action',
            style: 'destructive',
            onPress: async () => {
              await queueService.cancelAction(actionId);
              await loadQueueItems();
              await refreshStats();
            },
          },
        ]
      );
    } catch (error) {
      console.error('Failed to cancel action:', error);
      Alert.alert('Error', 'Failed to cancel action');
    }
  };

  const handleClearCompleted = async () => {
    try {
      Alert.alert(
        'Clear Completed',
        'Are you sure you want to clear all completed actions?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Clear',
            style: 'destructive',
            onPress: async () => {
              await queueService.clearCompletedActions();
              await loadQueueItems();
              await refreshStats();
            },
          },
        ]
      );
    } catch (error) {
      console.error('Failed to clear completed actions:', error);
      Alert.alert('Error', 'Failed to clear completed actions');
    }
  };

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'receive_payment':
        return '💰';
      case 'generate_qr':
        return '📱';
      case 'process_refund':
        return '↩️';
      case 'sync_data':
        return '🔄';
      default:
        return '📋';
    }
  };

  const getActionTitle = (actionType: string, actionData: any) => {
    switch (actionType) {
      case 'receive_payment':
        return `Payment from ${actionData.customer_name || 'Customer'}`;
      case 'generate_qr':
        return `QR Code ${actionData.amount ? `for GHS ${actionData.amount}` : 'Generation'}`;
      case 'process_refund':
        return `Refund - ${actionData.reason}`;
      case 'sync_data':
        return `Sync ${actionData.table_name}`;
      default:
        return 'Unknown Action';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return '#FF9500';
      case 'processing':
        return '#007AFF';
      case 'completed':
        return '#34C759';
      case 'failed':
        return '#FF3B30';
      default:
        return '#8E8E93';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'processing':
        return 'Processing';
      case 'completed':
        return 'Completed';
      case 'failed':
        return 'Failed';
      default:
        return 'Unknown';
    }
  };

  const renderQueueItem = ({ item }: { item: QueueItem }) => (
    <View style={styles.queueItem}>
      <View style={styles.itemHeader}>
        <View style={styles.itemLeft}>
          <Text style={styles.actionIcon}>{getActionIcon(item.action_type)}</Text>
          <View style={styles.itemInfo}>
            <Text style={styles.actionTitle}>{getActionTitle(item.action_type, item.action_data)}</Text>
            <Text style={styles.actionTime}>
              {new Date(item.created_at).toLocaleString()}
            </Text>
          </View>
        </View>
        <View style={styles.itemRight}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {getStatusText(item.status)}
          </Text>
        </View>
      </View>

      {item.transaction && (
        <View style={styles.transactionInfo}>
          <Text style={styles.transactionText}>
            Amount: GHS {item.transaction.amount} | 
            Method: {item.transaction.payment_method}
          </Text>
        </View>
      )}

      {item.error_message && (
        <View style={styles.errorInfo}>
          <Text style={styles.errorText}>{item.error_message}</Text>
        </View>
      )}

      <View style={styles.itemFooter}>
        <Text style={styles.retryText}>
          Retry: {item.retry_count}/{item.max_retries}
        </Text>
        <View style={styles.actionButtons}>
          {item.status === 'failed' && (
            <TouchableOpacity
              style={[styles.actionButton, styles.retryButton]}
              onPress={() => handleRetryAction(item.id)}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          )}
          {(item.status === 'failed' || item.status === 'pending') && (
            <TouchableOpacity
              style={[styles.actionButton, styles.cancelButton]}
              onPress={() => handleCancelAction(item.id)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Merchant Offline Queue</Text>
          <TouchableOpacity
            style={styles.clearButton}
            onPress={handleClearCompleted}
            disabled={queueItems.length === 0}
          >
            <Text style={styles.clearText}>Clear</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statusSection}>
          <View style={styles.statusRow}>
            <View style={[styles.statusIndicator, { backgroundColor: isConnected ? '#34C759' : '#FF3B30' }]} />
            <Text style={styles.statusText}>
              {isConnected ? 'Connected' : 'Offline'}
            </Text>
          </View>
          
          {merchantStats && (
            <View style={styles.statsRow}>
              <Text style={styles.statsText}>
                Pending: {merchantStats.pendingActions} | 
                Transactions: {merchantStats.pendingTransactions} | 
                QR Codes: {merchantStats.activeQRCodes}
              </Text>
            </View>
          )}
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Loading queue...</Text>
          </View>
        ) : (
          <FlatList
            data={queueItems}
            renderItem={renderQueueItem}
            keyExtractor={(item) => item.id}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
            }
            contentContainerStyle={styles.listContainer}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No pending actions</Text>
                <Text style={styles.emptySubtext}>
                  {isConnected ? 'All actions are up to date' : 'Actions will appear here when offline'}
                </Text>
              </View>
            }
          />
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  closeButton: {
    padding: 8,
  },
  closeText: {
    fontSize: 18,
    color: '#007AFF',
    fontWeight: '600',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
  },
  clearButton: {
    padding: 8,
  },
  clearText: {
    fontSize: 16,
    color: '#FF3B30',
    fontWeight: '600',
  },
  statusSection: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  statsRow: {
    marginTop: 4,
  },
  statsText: {
    fontSize: 14,
    color: '#8E8E93',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#8E8E93',
  },
  listContainer: {
    padding: 20,
  },
  queueItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  itemLeft: {
    flexDirection: 'row',
    flex: 1,
  },
  actionIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  itemInfo: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 4,
  },
  actionTime: {
    fontSize: 12,
    color: '#8E8E93',
  },
  itemRight: {
    alignItems: 'flex-end',
  },
  transactionInfo: {
    backgroundColor: '#F0F8FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  transactionText: {
    fontSize: 12,
    color: '#007AFF',
  },
  errorInfo: {
    backgroundColor: '#FFE5E5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 12,
    color: '#FF3B30',
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  retryText: {
    fontSize: 12,
    color: '#8E8E93',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    minWidth: 60,
    alignItems: 'center',
  },
  retryButton: {
    backgroundColor: '#007AFF',
  },
  retryButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  cancelButton: {
    backgroundColor: '#FF3B30',
  },
  cancelButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#C7C7CC',
    textAlign: 'center',
  },
});

export default MerchantOfflineModal;
