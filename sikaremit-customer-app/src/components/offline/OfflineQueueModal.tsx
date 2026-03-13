import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { useConnectivity } from '../../services/connectivity/ConnectivityContext';
import { ActionQueueService, QueuedAction } from '../../services/offline/ActionQueueService';
import { OfflineStorageService, OfflineTransaction } from '../../services/offline/OfflineStorageService';

const { width, height } = Dimensions.get('window');

interface OfflineQueueModalProps {
  visible: boolean;
  onClose: () => void;
}

interface QueueItem extends QueuedAction {
  transaction?: OfflineTransaction;
}

export const OfflineQueueModal: React.FC<OfflineQueueModalProps> = ({
  visible,
  onClose,
}) => {
  const { isConnected, isGoodConnection } = useConnectivity();
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [processingAction, setProcessingAction] = useState<string | null>(null);

  const queueService = ActionQueueService.getInstance();
  const storageService = OfflineStorageService.getInstance();

  useEffect(() => {
    if (visible) {
      loadQueueItems();
    }
  }, [visible]);

  const loadQueueItems = async () => {
    try {
      setRefreshing(true);
      
      // Get pending actions
      const pendingActions = await queueService.getPendingActions();
      
      // Get transaction details for each action
      const itemsWithTransactions: QueueItem[] = await Promise.all(
        pendingActions.map(async (action: any) => {
          let transaction: OfflineTransaction | undefined;
          
          // Try to find related transaction
          if (action.action_type === 'payment' || action.action_type === 'transfer' || 
              action.action_type === 'bill_payment' || action.action_type === 'qr_payment') {
            const transactions = await storageService.getAllTransactions();
            const actionData = action.action_data as any;
            
            transaction = transactions.find(tx => 
              tx.recipient_account === actionData.recipient_account && 
              tx.status === 'pending'
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
      console.error('Failed to load queue items:', error);
      Alert.alert('Error', 'Failed to load queue items');
    } finally {
      setRefreshing(false);
    }
  };

  const handleRetryAction = async (actionId: string) => {
    try {
      setProcessingAction(actionId);
      await queueService.retryAction(actionId);
      await loadQueueItems(); // Refresh the list
      Alert.alert('Success', 'Action queued for retry');
    } catch (error) {
      console.error('Failed to retry action:', error);
      Alert.alert('Error', 'Failed to retry action');
    } finally {
      setProcessingAction(null);
    }
  };

  const handleCancelAction = async (actionId: string) => {
    Alert.alert(
      'Cancel Action',
      'Are you sure you want to cancel this action? This cannot be undone.',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          style: 'destructive',
          onPress: async () => {
            try {
              setProcessingAction(actionId);
              await queueService.cancelAction(actionId);
              await loadQueueItems(); // Refresh the list
              Alert.alert('Success', 'Action cancelled');
            } catch (error) {
              console.error('Failed to cancel action:', error);
              Alert.alert('Error', 'Failed to cancel action');
            } finally {
              setProcessingAction(null);
            }
          },
        },
      ]
    );
  };

  const handleClearCompleted = async () => {
    Alert.alert(
      'Clear Completed',
      'Remove all completed actions from the queue?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          onPress: async () => {
            try {
              const clearedCount = await queueService.clearCompletedActions();
              Alert.alert('Success', `Cleared ${clearedCount} completed actions`);
              await loadQueueItems();
            } catch (error) {
              console.error('Failed to clear completed actions:', error);
              Alert.alert('Error', 'Failed to clear completed actions');
            }
          },
        },
      ]
    );
  };

  const getActionTypeText = (actionType: string) => {
    switch (actionType) {
      case 'payment':
        return 'Payment';
      case 'transfer':
        return 'Transfer';
      case 'bill_payment':
        return 'Bill Payment';
      case 'qr_payment':
        return 'QR Payment';
      default:
        return actionType;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return '#FFA500';
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

  const renderQueueItem = ({ item }: { item: QueueItem }) => {
    const actionData = item.action_data as any;
    const isProcessing = processingAction === item.id;

    return (
      <View style={styles.queueItem}>
        <View style={styles.itemHeader}>
          <Text style={styles.actionType}>{getActionTypeText(item.action_type)}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
        </View>

        {item.transaction && (
          <View style={styles.transactionDetails}>
            <Text style={styles.recipient}>
              To: {item.transaction.recipient}
            </Text>
            <Text style={styles.amount}>
              {item.transaction.currency} {item.transaction.amount.toFixed(2)}
            </Text>
          </View>
        )}

        <View style={styles.itemDetails}>
          <Text style={styles.detailText}>
            Created: {new Date(item.created_at).toLocaleString()}
          </Text>
          {item.retry_count > 0 && (
            <Text style={styles.retryText}>
              Retry {item.retry_count}/{item.max_retries}
            </Text>
          )}
          {item.error_message && (
            <Text style={styles.errorText}>
              {item.error_message}
            </Text>
          )}
        </View>

        <View style={styles.itemActions}>
          {item.status === 'failed' && item.retry_count < item.max_retries && (
            <TouchableOpacity
              style={[styles.actionButton, styles.retryButton]}
              onPress={() => handleRetryAction(item.id)}
              disabled={isProcessing || !isConnected}
            >
              <Text style={styles.buttonText}>
                {isProcessing ? 'Retrying...' : 'Retry'}
              </Text>
            </TouchableOpacity>
          )}
          
          {(item.status === 'pending' || item.status === 'failed') && (
            <TouchableOpacity
              style={[styles.actionButton, styles.cancelButton]}
              onPress={() => handleCancelAction(item.id)}
              disabled={isProcessing}
            >
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeText}>Close</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Offline Queue</Text>
          <TouchableOpacity onPress={handleClearCompleted} style={styles.clearButton}>
            <Text style={styles.clearText}>Clear Completed</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.connectionStatus}>
          <Text style={[
            styles.connectionText,
            { color: isConnected ? '#34C759' : '#FF3B30' }
          ]}>
            {isConnected ? '🟢 Connected' : '🔴 Offline'}
          </Text>
          {isConnected && !isGoodConnection && (
            <Text style={styles.connectionWarning}>
              Poor connection quality
            </Text>
          )}
        </View>

        <FlatList
          data={queueItems}
          renderItem={renderQueueItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={loadQueueItems} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {isConnected ? 'No pending actions' : 'Actions will queue when offline'}
              </Text>
            </View>
          }
        />
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
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  closeText: {
    fontSize: 16,
    color: '#007AFF',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  clearButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  clearText: {
    fontSize: 16,
    color: '#FF3B30',
  },
  connectionStatus: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  connectionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  connectionWarning: {
    fontSize: 12,
    color: '#FFA500',
    marginTop: 4,
  },
  listContainer: {
    padding: 16,
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
    shadowOpacity: 0.05,
    shadowRadius: 2.22,
    elevation: 3,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  transactionDetails: {
    marginBottom: 8,
  },
  recipient: {
    fontSize: 14,
    color: '#3C3C43',
    marginBottom: 2,
  },
  amount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  itemDetails: {
    marginBottom: 12,
  },
  detailText: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 2,
  },
  retryText: {
    fontSize: 12,
    color: '#FFA500',
    marginBottom: 2,
  },
  errorText: {
    fontSize: 12,
    color: '#FF3B30',
    marginBottom: 2,
  },
  itemActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  retryButton: {
    backgroundColor: '#007AFF',
  },
  cancelButton: {
    backgroundColor: '#FF3B30',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
  },
});

export default OfflineQueueModal;
