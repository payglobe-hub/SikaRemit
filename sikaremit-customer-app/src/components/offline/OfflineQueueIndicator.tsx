import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { useConnectivity } from '../../services/connectivity/ConnectivityContext';
import { ActionQueueService } from '../../services/offline/ActionQueueService';
import { OfflineStorageService } from '../../services/offline/OfflineStorageService';

const { width } = Dimensions.get('window');

interface QueueStats {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
}

interface OfflineQueueIndicatorProps {
  onPress?: () => void;
  style?: any;
}

export const OfflineQueueIndicator: React.FC<OfflineQueueIndicatorProps> = ({
  onPress,
  style,
}) => {
  const { isConnected, isGoodConnection } = useConnectivity();
  const [queueStats, setQueueStats] = useState<QueueStats>({
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0,
  });
  const [slideAnim] = useState(new Animated.Value(-100));
  const [isVisible, setIsVisible] = useState(false);

  const queueService = ActionQueueService.getInstance();
  const storageService = OfflineStorageService.getInstance();

  useEffect(() => {
    initializeServices();
    setupQueueListener();
    updateQueueStats();
    
    const interval = setInterval(updateQueueStats, 5000); // Update every 5 seconds
    
    return () => {
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    // Show/hide indicator based on connection status and queue
    const shouldShow = !isConnected || queueStats.pending > 0;
    
    if (shouldShow && !isVisible) {
      setIsVisible(true);
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else if (!shouldShow && isVisible) {
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setIsVisible(false);
      });
    }
  }, [isConnected, queueStats.pending, isVisible]);

  const initializeServices = async () => {
    try {
      await queueService.initialize();
      await storageService.initialize();
    } catch (error) {
      console.error('Failed to initialize offline services:', error);
    }
  };

  const setupQueueListener = () => {
    queueService.addListener({
      onActionQueued: () => updateQueueStats(),
      onActionProcessing: () => updateQueueStats(),
      onActionCompleted: () => updateQueueStats(),
      onActionFailed: () => updateQueueStats(),
      onQueueEmpty: () => updateQueueStats(),
    });
  };

  const updateQueueStats = async () => {
    try {
      const pendingCount = await queueService.getPendingActionsCount();
      setQueueStats(prev => ({
        ...prev,
        pending: pendingCount,
      }));
    } catch (error) {
      console.error('Failed to update queue stats:', error);
    }
  };

  const getStatusColor = () => {
    if (!isConnected) return '#FF6B6B'; // Red for offline
    if (queueStats.pending > 0) return '#FFA500'; // Orange for pending
    if (!isGoodConnection) return '#FFD93D'; // Yellow for poor connection
    return '#51CF66'; // Green for good connection
  };

  const getStatusText = () => {
    if (!isConnected) return 'Offline';
    if (queueStats.pending > 0) return `${queueStats.pending} Pending`;
    if (!isGoodConnection) return 'Poor Connection';
    return 'Connected';
  };

  const getStatusIcon = () => {
    if (!isConnected) return '📴';
    if (queueStats.pending > 0) return '⏳';
    if (!isGoodConnection) return '📶';
    return '🟢';
  };

  if (!isVisible) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: getStatusColor(),
          transform: [{ translateY: slideAnim }],
        },
        style,
      ]}
    >
      <TouchableOpacity
        style={styles.touchable}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <View style={styles.content}>
          <Text style={styles.icon}>{getStatusIcon()}</Text>
          <View style={styles.textContainer}>
            <Text style={styles.statusText}>{getStatusText()}</Text>
            {!isConnected && (
              <Text style={styles.subText}>
                Payments will queue automatically
              </Text>
            )}
            {queueStats.pending > 0 && isConnected && (
              <Text style={styles.subText}>
                Processing when connection is stable
              </Text>
            )}
          </View>
          <TouchableOpacity
            style={styles.dismissButton}
            onPress={() => {
              Animated.timing(slideAnim, {
                toValue: -100,
                duration: 300,
                useNativeDriver: true,
              }).start(() => {
                setIsVisible(false);
              });
            }}
          >
            <Text style={styles.dismissText}>✕</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  touchable: {
    width: '100%',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 60,
  },
  icon: {
    fontSize: 20,
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  subText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    lineHeight: 16,
  },
  dismissButton: {
    padding: 8,
    marginLeft: 8,
  },
  dismissText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default OfflineQueueIndicator;
