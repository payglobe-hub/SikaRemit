// Conflict resolution utilities for offline sync
export interface SyncConflict {
  id: string;
  entityType: string;
  entityId: string;
  localVersion: any;
  serverVersion: any;
  conflictType: 'update' | 'delete' | 'create';
  timestamp: string;
}

export const detectConflicts = (
  localData: any,
  serverData: any,
  entityId: string,
  entityType: string
): SyncConflict | null => {
  // Simple conflict detection based on timestamps
  const localTimestamp = new Date(localData.updatedAt || localData.createdAt);
  const serverTimestamp = new Date(serverData.updatedAt || serverData.createdAt);

  if (localTimestamp > serverTimestamp) {
    // Local version is newer
    return {
      id: generateConflictId(),
      entityType,
      entityId,
      localVersion: localData,
      serverVersion: serverData,
      conflictType: 'update',
      timestamp: new Date().toISOString(),
    };
  }

  return null;
};

export const resolveConflictWithLocal = async (conflict: SyncConflict): Promise<void> => {
  try {
    // Overwrite server data with local data
    

    // In a real app, this would make an API call to update server data
    // For now, just log the resolution
    await saveToOfflineStorage(`conflict_resolved_${conflict.id}`, {
      ...conflict,
      resolution: 'local',
      resolvedAt: new Date().toISOString(),
    });

    
  } catch (error) {
    console.error('Failed to resolve conflict with local version:', error);
    throw error;
  }
};

export const resolveConflictWithServer = async (conflict: SyncConflict): Promise<void> => {
  try {
    // Overwrite local data with server data
    

    // Update local storage with server version
    await saveToOfflineStorage(`${conflict.entityType}_${conflict.entityId}`, conflict.serverVersion);

    await saveToOfflineStorage(`conflict_resolved_${conflict.id}`, {
      ...conflict,
      resolution: 'server',
      resolvedAt: new Date().toISOString(),
    });

    
  } catch (error) {
    console.error('Failed to resolve conflict with server version:', error);
    throw error;
  }
};

export const resolveConflictManually = async (
  conflict: SyncConflict,
  mergedData: any
): Promise<void> => {
  try {
    

    // Save merged data to both local storage and server
    await saveToOfflineStorage(`${conflict.entityType}_${conflict.entityId}`, mergedData);

    // In a real app, this would also sync to server
    // await syncDataWithServer(`/api/${conflict.entityType}/${conflict.entityId}`, mergedData);

    await saveToOfflineStorage(`conflict_resolved_${conflict.id}`, {
      ...conflict,
      resolution: 'manual',
      mergedData,
      resolvedAt: new Date().toISOString(),
    });

    
  } catch (error) {
    console.error('Failed to resolve conflict manually:', error);
    throw error;
  }
};

export const getPendingConflicts = async (): Promise<SyncConflict[]> => {
  try {
    // In a real app, this would query for unresolved conflicts
    // For now, return empty array
    return [];
  } catch (error) {
    console.error('Failed to get pending conflicts:', error);
    return [];
  }
};

const generateConflictId = (): string => {
  return `conflict_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
};

// Import required functions
import { saveToOfflineStorage } from './storage';

