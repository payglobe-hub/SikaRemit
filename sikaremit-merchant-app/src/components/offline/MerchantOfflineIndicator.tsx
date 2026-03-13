import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Alert,
} from 'react-native';
import { useMerchantOffline } from '../../contexts/MerchantOfflineContext';
import offlineService from '../../services/offlineService';

const { width } = Dimensions.get('window');

interface MerchantOfflineIndicatorProps {
  style?: any;
  showDetails?: boolean;
  onPress?: () => void;
  dismissible?: boolean;
}

export const MerchantOfflineIndicator: React.FC<MerchantOfflineIndicatorProps> = ({
  style,
  showDetails = false,
  onPress,
  dismissible = true,
}) => {
  const { isConnected, pendingActionsCount, merchantStats } = useMerchantOffline();
  const [visible, setVisible] = useState(false);
  const [slideAnim] = useState(new Animated.Value(-100));
  const [dismissed, setDismissed] = useState(false);

  // Show/hide indicator based on connection status
  useEffect(() => {
    if (!isConnected || pendingActionsCount > 0) {
      if (!dismissed) {
        setVisible(true);
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start();
      }
    } else {
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setVisible(false);
        setDismissed(false);
      });
    }
  }, [isConnected, pendingActionsCount, dismissed]);

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      // Default behavior: show details
      const buttons: any[] = [
        { text: 'OK', style: 'default' },
      ];
      
      if (dismissible) {
        buttons.push({ text: 'Dismiss', onPress: () => handleDismiss(), style: 'cancel' });
      }

      Alert.alert(
        'Merchant Offline Status',
        isConnected 
          ? `Connected\n${pendingActionsCount} pending actions`
          : `Offline\n${pendingActionsCount} pending actions`,
        buttons
      );
    }
  };

  const handleDismiss = () => {
    Animated.timing(slideAnim, {
      toValue: -100,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setVisible(false);
      setDismissed(true);
    });
  };

  if (!visible) {
    return null;
  }

  const getStatusColor = () => {
    if (!isConnected) return '#FF3B30'; // Red
    if (pendingActionsCount > 0) return '#FF9500'; // Orange
    return '#34C759'; // Green
  };

  const getStatusText = () => {
    if (!isConnected) return '📴 Offline Mode';
    if (pendingActionsCount > 0) return `⏳ ${pendingActionsCount} Pending`;
    return '🟢 Online';
  };

  const getStatusDescription = () => {
    if (!isConnected) {
      return 'Payments will be queued and processed when connection is restored';
    }
    if (pendingActionsCount > 0) {
      return `${pendingActionsCount} action${pendingActionsCount > 1 ? 's' : ''} waiting to be processed`;
    }
    return 'All systems operational';
  };

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
        style={styles.content}
        onPress={handlePress}
        activeOpacity={0.8}
      >
        <View style={styles.mainContent}>
          <View style={styles.statusRow}>
            <Text style={styles.statusText}>{getStatusText()}</Text>
            {pendingActionsCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{pendingActionsCount}</Text>
              </View>
            )}
          </View>
          
          {showDetails && (
            <Text style={styles.descriptionText} numberOfLines={2}>
              {getStatusDescription()}
            </Text>
          )}

          {merchantStats && showDetails && (
            <View style={styles.statsRow}>
              <Text style={styles.statsText}>
                Transactions: {merchantStats.pendingTransactions} | 
                QR Codes: {merchantStats.activeQRCodes}
              </Text>
            </View>
          )}
        </View>

        {dismissible && (
          <TouchableOpacity
            style={styles.dismissButton}
            onPress={handleDismiss}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.dismissText}>✕</Text>
          </TouchableOpacity>
        )}
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
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 60,
  },
  mainContent: {
    flex: 1,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
  },
  badge: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 24,
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  descriptionText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 4,
    lineHeight: 16,
  },
  statsRow: {
    marginTop: 4,
  },
  statsText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  dismissButton: {
    marginLeft: 12,
    padding: 4,
  },
  dismissText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '600',
  },
});

export default MerchantOfflineIndicator;
