// Offline storage utilities
export const saveToOfflineStorage = async (key: string, data: any): Promise<void> => {
  try {
    const serializedData = JSON.stringify(data);
    // In a real app, this would use a proper offline storage solution
    // For now, using AsyncStorage as placeholder
    await import('@react-native-async-storage/async-storage').then(
      ({ default: AsyncStorage }) => AsyncStorage.setItem(key, serializedData)
    );
    
  } catch (error) {
    console.error(`Failed to save to offline storage: ${key}`, error);
    throw error;
  }
};

export const loadFromOfflineStorage = async (key: string): Promise<any> => {
  try {
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    const data = await AsyncStorage.getItem(key);
    if (data) {
      return JSON.parse(data);
    }
    return null;
  } catch (error) {
    console.error(`Failed to load from offline storage: ${key}`, error);
    return null;
  }
};

export const removeFromOfflineStorage = async (key: string): Promise<void> => {
  try {
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    await AsyncStorage.removeItem(key);
    
  } catch (error) {
    console.error(`Failed to remove from offline storage: ${key}`, error);
    throw error;
  }
};

export const clearOfflineStorage = async (): Promise<void> => {
  try {
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    await AsyncStorage.clear();
    
  } catch (error) {
    console.error('Failed to clear offline storage:', error);
    throw error;
  }
};

export const getOfflineStorageSize = async (): Promise<number> => {
  try {
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    const keys = await AsyncStorage.getAllKeys();
    let totalSize = 0;

    for (const key of keys) {
      const value = await AsyncStorage.getItem(key);
      if (value) {
        totalSize += value.length;
      }
    }

    return totalSize;
  } catch (error) {
    console.error('Failed to get offline storage size:', error);
    return 0;
  }
};

