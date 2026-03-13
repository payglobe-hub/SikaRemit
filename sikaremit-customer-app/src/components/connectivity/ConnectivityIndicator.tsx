import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useConnectivity } from '../../services/connectivity/ConnectivityContext';

interface ConnectivityIndicatorProps {
  style?: any;
  showDetails?: boolean;
  onPress?: () => void;
}

export const ConnectivityIndicator: React.FC<ConnectivityIndicatorProps> = ({ 
  style, 
  showDetails = false,
  onPress 
}) => {
  const { isConnected, connectionDisplayText, status } = useConnectivity();

  const getStatusColor = () => {
    if (!isConnected) return '#FF3B30'; // Red
    switch (status.strength) {
      case 'strong': return '#34C759'; // Green
      case 'moderate': return '#FF9500'; // Orange
      case 'weak': return '#FF3B30'; // Red
      default: return '#8E8E93'; // Gray
    }
  };

  const getStatusIcon = () => {
    if (!isConnected) return '🚫';
    switch (status.strength) {
      case 'strong': return '🟢';
      case 'moderate': return '🟡';
      case 'weak': return '🔴';
      default: return '⚪';
    }
  };

  return (
    <TouchableOpacity 
      style={[styles.container, style]} 
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={[styles.indicator, { backgroundColor: getStatusColor() }]}>
        <Text style={styles.icon}>{getStatusIcon()}</Text>
      </View>
      {showDetails && (
        <Text style={styles.statusText}>{connectionDisplayText}</Text>
      )}
    </TouchableOpacity>
  );
};

interface OfflineBannerProps {
  onRetry?: () => void;
  onSettings?: () => void;
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({ onRetry, onSettings }) => {
  const { isConnected, connectionDisplayText } = useConnectivity();

  if (isConnected) {
    return null;
  }

  return (
    <View style={styles.banner}>
      <View style={styles.bannerContent}>
        <Text style={styles.bannerTitle}>You're offline</Text>
        <Text style={styles.bannerText}>
          Some features may not be available. {connectionDisplayText}
        </Text>
      </View>
      <View style={styles.bannerActions}>
        {onRetry && (
          <TouchableOpacity style={styles.bannerButton} onPress={onRetry}>
            <Text style={styles.bannerButtonText}>Retry</Text>
          </TouchableOpacity>
        )}
        {onSettings && (
          <TouchableOpacity style={[styles.bannerButton, styles.bannerButtonSecondary]} onPress={onSettings}>
            <Text style={[styles.bannerButtonText, styles.bannerButtonTextSecondary]}>Settings</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

interface ConnectionQualityIndicatorProps {
  showLatency?: boolean;
}

export const ConnectionQualityIndicator: React.FC<ConnectionQualityIndicatorProps> = ({ 
  showLatency = false 
}) => {
  const { isConnected, isGoodConnection, status } = useConnectivity();

  if (!isConnected) {
    return (
      <View style={styles.qualityContainer}>
        <Text style={styles.qualityText}>No Connection</Text>
      </View>
    );
  }

  const getQualityText = () => {
    if (!isGoodConnection) return 'Poor Connection';
    return 'Good Connection';
  };

  const getQualityColor = () => {
    if (!isGoodConnection) return '#FF9500';
    return '#34C759';
  };

  return (
    <View style={styles.qualityContainer}>
      <Text style={[styles.qualityText, { color: getQualityColor() }]}>
        {getQualityText()}
      </Text>
      {showLatency && (
        <Text style={styles.latencyText}>
          {/* Will be updated with actual latency when implemented */}
          Checking...
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 4,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    fontSize: 6,
    color: 'white',
  },
  statusText: {
    fontSize: 12,
    color: '#666',
  },
  banner: {
    backgroundColor: '#FF3B30',
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bannerContent: {
    flex: 1,
  },
  bannerTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  bannerText: {
    color: 'white',
    fontSize: 14,
    opacity: 0.9,
  },
  bannerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  bannerButton: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  bannerButtonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'white',
  },
  bannerButtonText: {
    color: '#FF3B30',
    fontSize: 14,
    fontWeight: '600',
  },
  bannerButtonTextSecondary: {
    color: 'white',
  },
  qualityContainer: {
    alignItems: 'center',
  },
  qualityText: {
    fontSize: 12,
    fontWeight: '600',
  },
  latencyText: {
    fontSize: 10,
    color: '#666',
    marginTop: 2,
  },
});
