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

type DevicesScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Devices'>;

interface Device {
  device_id: string;
  device_name: string;
  device_type: string;
  status: 'active' | 'inactive' | 'offline' | 'maintenance';
  last_seen: string;
  battery_level?: number;
  signal_strength?: number;
  location?: {
    latitude: number;
    longitude: number;
  };
  security_level: 'basic' | 'standard' | 'enhanced' | 'pci_compliant';
  nfc_capable: boolean;
  bluetooth_capable: boolean;
  biometric_available: boolean;
  total_transactions: number;
  total_revenue: number;
}

const DevicesScreen: React.FC<{ navigation: DevicesScreenNavigationProp }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [devices, setDevices] = useState<Device[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);

  useEffect(() => {
    loadDevices();
  }, []);

  const loadDevices = async () => {
    try {
      setLoading(true);
      
      // Consume from existing SikaRemit backend API
      const response = await apiClient.get('/payments/soft-pos/devices/');
      
      if (response.data.success) {
        setDevices(response.data.devices || []);
      } else {
        throw new Error(response.data.error || 'Failed to load devices');
      }
    } catch (error) {
      logger.error('Devices loading failed:', error);
      Alert.alert('Error', 'Failed to load devices. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadDevices();
  };

  const handleDevicePress = (device: Device) => {
    setSelectedDevice(device);
    // Navigate to device details or show modal
    navigation.navigate('DeviceDetails', { deviceId: device.device_id });
  };

  const handleRegisterDevice = () => {
    navigation.navigate('RegisterDevice');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#4CAF50';
      case 'inactive': return '#FF9800';
      case 'offline': return '#F44336';
      case 'maintenance': return '#9E9E9E';
      default: return '#666';
    }
  };

  const getStatusText = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const renderDeviceCard = (device: Device) => (
    <TouchableOpacity
      key={device.device_id}
      style={styles.deviceCard}
      onPress={() => handleDevicePress(device)}
    >
      <View style={styles.deviceHeader}>
        <View style={styles.deviceInfo}>
          <Text style={styles.deviceName}>{device.device_name}</Text>
          <Text style={styles.deviceType}>{device.device_type}</Text>
        </View>
        <View style={[styles.statusIndicator, { backgroundColor: getStatusColor(device.status) }]}>
          <Text style={styles.statusText}>{getStatusText(device.status)}</Text>
        </View>
      </View>

      <View style={styles.deviceMetrics}>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Transactions</Text>
          <Text style={styles.metricValue}>{device.total_transactions.toLocaleString()}</Text>
        </View>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Revenue</Text>
          <Text style={styles.metricValue}>₵{device.total_revenue.toLocaleString()}</Text>
        </View>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Last Seen</Text>
          <Text style={styles.metricValue}>
            {new Date(device.last_seen).toLocaleDateString()}
          </Text>
        </View>
      </View>

      <View style={styles.deviceFeatures}>
        {device.nfc_capable && (
          <View style={styles.featureTag}>
            <Text style={styles.featureText}>NFC</Text>
          </View>
        )}
        {device.bluetooth_capable && (
          <View style={styles.featureTag}>
            <Text style={styles.featureText}>BT</Text>
          </View>
        )}
        {device.biometric_available && (
          <View style={styles.featureTag}>
            <Text style={styles.featureText}>Bio</Text>
          </View>
        )}
        <View style={[styles.securityTag, { backgroundColor: getSecurityColor(device.security_level) }]}>
          <Text style={styles.securityText}>{device.security_level}</Text>
        </View>
      </View>

      {device.battery_level && (
        <View style={styles.batteryContainer}>
          <Text style={styles.batteryLabel}>Battery: {device.battery_level}%</Text>
          <View style={styles.batteryBar}>
            <View 
              style={[
                styles.batteryLevel, 
                { 
                  width: `${device.battery_level}%`,
                  backgroundColor: device.battery_level > 20 ? '#4CAF50' : '#F44336'
                }
              ]} 
            />
          </View>
        </View>
      )}
    </TouchableOpacity>
  );

  const getSecurityColor = (level: string) => {
    switch (level) {
      case 'pci_compliant': return '#4CAF50';
      case 'enhanced': return '#2196F3';
      case 'standard': return '#FF9800';
      case 'basic': return '#F44336';
      default: return '#666';
    }
  };

  const renderOverviewStats = () => {
    const activeDevices = devices.filter(d => d.status === 'active').length;
    const totalRevenue = devices.reduce((sum, d) => sum + d.total_revenue, 0);
    const totalTransactions = devices.reduce((sum, d) => sum + d.total_transactions, 0);

    return (
      <View style={styles.overviewContainer}>
        <View style={styles.overviewCard}>
          <Text style={styles.overviewLabel}>Total Devices</Text>
          <Text style={styles.overviewValue}>{devices.length}</Text>
        </View>
        <View style={styles.overviewCard}>
          <Text style={styles.overviewLabel}>Active</Text>
          <Text style={styles.overviewValue}>{activeDevices}</Text>
        </View>
        <View style={styles.overviewCard}>
          <Text style={styles.overviewLabel}>Revenue</Text>
          <Text style={styles.overviewValue}>₵{totalRevenue.toLocaleString()}</Text>
        </View>
        <View style={styles.overviewCard}>
          <Text style={styles.overviewLabel}>Transactions</Text>
          <Text style={styles.overviewValue}>{totalTransactions.toLocaleString()}</Text>
        </View>
      </View>
    );
  };

  if (loading && devices.length === 0) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Loading devices...</Text>
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
        <Text style={styles.headerTitle}>Devices</Text>
        <TouchableOpacity style={styles.addButton} onPress={handleRegisterDevice}>
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Overview Stats */}
        {renderOverviewStats()}

        {/* Devices List */}
        <View style={styles.devicesContainer}>
          <Text style={styles.sectionTitle}>Registered Devices</Text>
          {devices.length > 0 ? (
            devices.map(renderDeviceCard)
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateTitle}>No devices registered</Text>
              <Text style={styles.emptyStateText}>
                Register your first device to start accepting payments
              </Text>
              <TouchableOpacity style={styles.registerButton} onPress={handleRegisterDevice}>
                <Text style={styles.registerButtonText}>Register Device</Text>
              </TouchableOpacity>
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
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: 20,
    color: 'white',
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  overviewContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  overviewCard: {
    width: (width - 50) / 2,
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10,
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
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  devicesContainer: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  deviceCard: {
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
  deviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  deviceType: {
    fontSize: 14,
    color: '#666',
  },
  statusIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    color: 'white',
    fontWeight: '500',
  },
  deviceMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  metricItem: {
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  deviceFeatures: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  featureTag: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginRight: 6,
    marginBottom: 4,
  },
  featureText: {
    fontSize: 10,
    color: '#1E88E5',
    fontWeight: '500',
  },
  securityTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginRight: 6,
    marginBottom: 4,
  },
  securityText: {
    fontSize: 10,
    color: 'white',
    fontWeight: '500',
  },
  batteryContainer: {
    marginTop: 8,
  },
  batteryLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  batteryBar: {
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
  },
  batteryLevel: {
    height: '100%',
    borderRadius: 2,
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
    marginBottom: 20,
  },
  registerButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  registerButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default DevicesScreen;
