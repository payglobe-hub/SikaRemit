// Offline queue utilities
interface QueueItem {
  id: string;
  type: 'create' | 'update' | 'delete';
  entityType: string;
  data: any;
  timestamp: string;
  retryCount: number;
}

export const addToSyncQueue = async (item: Omit<QueueItem, 'id' | 'timestamp' | 'retryCount'>): Promise<string> => {
  try {
    const queueItem: QueueItem = {
      ...item,
      id: generateQueueId(),
      timestamp: new Date().toISOString(),
      retryCount: 0,
    };

    // Save to offline storage
    await saveToOfflineStorage(`sync_queue_${queueItem.id}`, queueItem);

    // Also add to a master queue list
    const queueList = await loadFromOfflineStorage('sync_queue_list') || [];
    queueList.push(queueItem.id);
    await saveToOfflineStorage('sync_queue_list', queueList);

    
    return queueItem.id;
  } catch (error) {
    console.error('Failed to add item to sync queue:', error);
    throw error;
  }
};

export const getSyncQueueItems = async (): Promise<QueueItem[]> => {
  try {
    const queueList = await loadFromOfflineStorage('sync_queue_list') || [];
    const items: QueueItem[] = [];

    for (const itemId of queueList) {
      const item = await loadFromOfflineStorage(`sync_queue_${itemId}`);
      if (item) {
        items.push(item);
      }
    }

    return items.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  } catch (error) {
    console.error('Failed to get sync queue items:', error);
    return [];
  }
};

export const removeFromSyncQueue = async (itemId: string): Promise<void> => {
  try {
    // Remove the item
    await removeFromOfflineStorage(`sync_queue_${itemId}`);

    // Remove from master list
    const queueList = await loadFromOfflineStorage('sync_queue_list') || [];
    const updatedList = queueList.filter((id: string) => id !== itemId);
    await saveToOfflineStorage('sync_queue_list', updatedList);

    
  } catch (error) {
    console.error('Failed to remove item from sync queue:', error);
    throw error;
  }
};

export const processSyncQueue = async (): Promise<void> => {
  try {
    const items = await getSyncQueueItems();

    for (const item of items) {
      try {
        // Attempt to sync the item
        await syncDataWithServer(`/api/${item.entityType}`, {
          ...item.data,
          _sync_operation: item.type,
        });

        // If successful, remove from queue
        await removeFromSyncQueue(item.id);
      } catch (error) {
        console.warn(`Failed to sync item ${item.id}, will retry later:`, error);

        // Increment retry count
        item.retryCount += 1;
        await saveToOfflineStorage(`sync_queue_${item.id}`, item);

        // If too many retries, mark as failed
        if (item.retryCount >= 3) {
          console.error(`Item ${item.id} failed after 3 retries, removing from queue`);
          await removeFromSyncQueue(item.id);
        }
      }
    }
  } catch (error) {
    console.error('Failed to process sync queue:', error);
  }
};

const generateQueueId = (): string => {
  return `queue_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
};

// Import required functions
import { saveToOfflineStorage, loadFromOfflineStorage, removeFromOfflineStorage } from './storage';
import { syncDataWithServer } from './sync';

