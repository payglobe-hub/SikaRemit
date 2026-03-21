import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { useNavigation } from '@react-navigation/native';

// Custom hook for network connectivity
export const useNetworkStatus = () => {
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [connectionType, setConnectionType] = useState<string>('unknown');

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: any) => {
      setIsConnected(state.isConnected ?? true);
      setConnectionType(state.type);
    });

    return () => unsubscribe();
  }, []);

  return { isConnected, connectionType };
};

// Custom hook for async storage with error handling
export const useAsyncStorage = (key: string, defaultValue: any = null) => {
  const [storedValue, setStoredValue] = useState(defaultValue);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadValue = async () => {
      try {
        const item = await AsyncStorage.getItem(key);
        setStoredValue(item ? JSON.parse(item) : defaultValue);
      } catch (error) {
        console.error(`Error loading ${key} from AsyncStorage:`, error);
      } finally {
        setLoading(false);
      }
    };

    loadValue();
  }, [key, defaultValue]);

  const setValue = useCallback(async (value: any) => {
    try {
      const valueToStore = JSON.stringify(value);
      await AsyncStorage.setItem(key, valueToStore);
      setStoredValue(value);
    } catch (error) {
      console.error(`Error saving ${key} to AsyncStorage:`, error);
    }
  }, [key]);

  const removeValue = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(key);
      setStoredValue(defaultValue);
    } catch (error) {
      console.error(`Error removing ${key} from AsyncStorage:`, error);
    }
  }, [key, defaultValue]);

  return { storedValue, setValue, removeValue, loading };
};

// Custom hook for navigation with type safety
export const useTypedNavigation = () => {
  const navigation = useNavigation();
  return navigation;
};

// Custom hook for app state management
export const useAppState = () => {
  const [appState, setAppState] = useState('active');

  useEffect(() => {
    // This would integrate with AppState from react-native
    // For now, just return a basic state
    return () => {
      // cleanup
    };
  }, []);

  return { appState, setAppState };
};

export { useState, useEffect, useCallback };
