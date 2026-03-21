import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Vibration,
  Platform,
  PermissionsAndroid,
  StatusBar,
  ActivityIndicator,
  ScrollView,
  Dimensions,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BleManager } from 'react-native-ble-plx';
import NfcManager, { NfcTech, Ndef } from 'react-native-nfc-manager';
import { launchImageLibrary } from 'react-native-image-picker';
import { Keychain, biometricOptions } from 'react-native-keychain';
import { DeviceInfo, getUniqueId, getModel, getSystemVersion } from 'react-native-device-info';
import Share from 'react-native-share';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import { encryptData, decryptData } from '../utils/crypto';
import { apiClient } from '../services/api';
import { logger } from '../utils/logger';

const { width, height } = Dimensions.get('window');

type RootStackParamList = {
  SoftPOSHome: undefined;
  PaymentProcessing: { amount: number; method: string };
  DeviceManagement: undefined;
  Analytics: undefined;
  Settings: undefined;
};

type SoftPOSHomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'SoftPOSHome'>;

interface DeviceStatus {
  isOnline: boolean;
  batteryLevel: number;
  signalStrength: number;
  lastHeartbeat: string;
  location?: { latitude: number; longitude: number };
}

interface PaymentMethod {
  id: string;
  name: string;
  icon: string;
  enabled: boolean;
  requiresHardware?: boolean;
}

interface MobileNetwork {
  id: string;
  name: string;
  color: string;
  status: 'online' | 'degraded' | 'offline';
}

interface SoftPOSHomeProps {
  navigation: SoftPOSHomeScreenNavigationProp;
}

const SoftPOSHome: React.FC<SoftPOSHomeProps> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState('');
  const [selectedMethod, setSelectedMethod] = useState('');
  const [deviceStatus, setDeviceStatus] = useState<DeviceStatus | null>(null);
  const [supportedMethods, setSupportedMethods] = useState<PaymentMethod[]>([]);
  const [networkStatus, setNetworkStatus] = useState<MobileNetwork[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [merchantInfo, setMerchantInfo] = useState<any>(null);
  
  // NFC Manager
  const [nfcSupported, setNfcSupported] = useState(false);
  const [nfcEnabled, setNfcEnabled] = useState(false);
  
  // BLE Manager for external readers
  const bleManager = useRef(new BleManager()).current;
  const [bluetoothEnabled, setBluetoothEnabled] = useState(false);
  
  // Device registration
  const [deviceRegistered, setDeviceRegistered] = useState(false);
  const [deviceId, setDeviceId] = useState<string>('');
  
  useEffect(() => {
    initializeSoftPOS();
    return () => {
      // Cleanup
      if (nfcEnabled) {
        NfcManager.stop();
      }
      bleManager.destroy();
    };
  }, []);

  const initializeSoftPOS = async () => {
    try {
      setLoading(true);
      
      // Check and request permissions
      await requestPermissions();
      
      // Initialize NFC
      await initializeNFC();
      
      // Initialize Bluetooth
      await initializeBluetooth();
      
      // Get device info and register if needed
      await setupDevice();
      
      // Authenticate user
      await authenticateUser();
      
      // Load merchant data
      await loadMerchantData();
      
      // Load supported payment methods
      await loadSupportedMethods();
      
      // Load network status
      await loadNetworkStatus();
      
      // Start heartbeat
      startHeartbeat();
      
    } catch (error) {
      logger.error('Soft POS initialization failed:', error);
      Alert.alert('Error', 'Failed to initialize Soft POS. Please restart the app.');
    } finally {
      setLoading(false);
    }
  };

  const requestPermissions = async () => {
    const permissions = [
      Platform.OS === 'android' ? PERMISSIONS.ANDROID.NFC : PERMISSIONS.IOS.NFC,
      Platform.OS === 'android' ? PERMISSIONS.ANDROID.BLUETOOTH_SCAN : PERMISSIONS.IOS.BLUETOOTH_PERIPHERAL,
      Platform.OS === 'android' ? PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION : PERMISSIONS.IOS.LOCATION_WHEN_IN_USE,
      Platform.OS === 'android' ? PERMISSIONS.ANDROID.CAMERA : PERMISSIONS.IOS.CAMERA,
    ];

    for (const permission of permissions) {
      const result = await check(permission);
      if (result !== RESULTS.GRANTED) {
        const requestResult = await request(permission);
        if (requestResult !== RESULTS.GRANTED) {
          throw new Error(`Permission ${permission} denied`);
        }
      }
    }
  };

  const initializeNFC = async () => {
    try {
      await NfcManager.start();
      setNfcSupported(true);
      setNfcEnabled(true);
      logger.info('NFC initialized successfully');
    } catch (error) {
      logger.warn('NFC not available:', error);
      setNfcSupported(false);
    }
  };

  const initializeBluetooth = async () => {
    try {
      // Check if Bluetooth is enabled
      if (Platform.OS === 'android') {
        const enabled = await bleManager.enableBluetooth();
        setBluetoothEnabled(enabled);
      } else {
        setBluetoothEnabled(true); // iOS handles this differently
      }
      logger.info('Bluetooth initialized');
    } catch (error) {
      logger.warn('Bluetooth initialization failed:', error);
      setBluetoothEnabled(false);
    }
  };

  const setupDevice = async () => {
    try {
      // Get unique device identifier
      const uniqueId = await getUniqueId();
      const deviceModel = await getModel();
      const systemVersion = await getSystemVersion();
      
      // Generate device hash for security
      const deviceHash = await generateDeviceHash(uniqueId);
      
      // Check if device is already registered
      const registeredDeviceId = await Keychain.getGenericPassword({
        service: 'sikaremit_softpos',
        key: 'device_id',
      });

      if (registeredDeviceId) {
        setDeviceId(registeredDeviceId.password);
        setDeviceRegistered(true);
      } else {
        // Register new device
        await registerDevice({
          deviceModel,
          osType: Platform.OS,
          osVersion: systemVersion,
          appVersion: '1.0.0', // Get from app config
          nfcCapable: nfcSupported,
          bluetoothCapable: true,
          cameraAvailable: true,
          biometricAvailable: await checkBiometricAvailable(),
        }, deviceHash);
      }
    } catch (error) {
      logger.error('Device setup failed:', error);
      throw error;
    }
  };

  const generateDeviceHash = async (uniqueId: string): Promise<string> => {
    // Create secure hash of device identifier
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(uniqueId + 'sikaremit_salt').digest('hex');
  };

  const registerDevice = async (deviceInfo: any, deviceHash: string) => {
    try {
      const response = await apiClient.post('/payments/soft-pos/register-smartphone/', {
        device_info: deviceInfo,
        security_credentials: {
          device_id_hash: deviceHash,
        },
      });

      if (response.data.success) {
        const newDeviceId = response.data.device_id;
        
        // Store device ID securely
        await Keychain.setGenericPassword(
          newDeviceId,
          'device_id',
          { service: 'sikaremit_softpos' }
        );
        
        // Store encryption key
        await Keychain.setGenericPassword(
          response.data.encryption_key,
          'encryption_key',
          { service: 'sikaremit_softpos' }
        );
        
        setDeviceId(newDeviceId);
        setDeviceRegistered(true);
        
        logger.info('Device registered successfully:', newDeviceId);
      } else {
        throw new Error(response.data.error || 'Device registration failed');
      }
    } catch (error) {
      logger.error('Device registration failed:', error);
      throw error;
    }
  };

  const authenticateUser = async () => {
    try {
      // Check if user is already authenticated
      const sessionToken = await Keychain.getGenericPassword({
        service: 'sikaremit_softpos',
        key: 'session_token',
      });

      if (sessionToken) {
        // Validate session
        const response = await apiClient.get('/auth/validate-session/', {
          headers: { Authorization: `Bearer ${sessionToken.password}` }
        });

        if (response.data.valid) {
          setIsAuthenticated(true);
          return;
        }
      }

      // Authenticate with biometrics or PIN
      await performBiometricAuth();
      
    } catch (error) {
      logger.error('Authentication failed:', error);
      throw error;
    }
  };

  const performBiometricAuth = async () => {
    try {
      const biometryType = await Keychain.getSupportedBiometryType();
      
      if (biometryType) {
        // Use biometric authentication
        const credentials = await Keychain.getGenericPassword({
          service: 'sikaremit_softpos',
          key: 'user_credentials',
        });

        if (credentials) {
          const result = await Keychain.authenticate(
            'Authenticate to access Soft POS',
            biometricOptions
          );

          if (result) {
            setIsAuthenticated(true);
            return;
          }
        }
      }

      // Fallback to PIN authentication
      await authenticateWithPIN();
      
    } catch (error) {
      logger.error('Biometric authentication failed:', error);
      throw error;
    }
  };

  const authenticateWithPIN = async () => {
    return new Promise((resolve, reject) => {
      Alert.prompt(
        'Enter PIN',
        'Please enter your 4-digit PIN to access Soft POS',
        [
          { text: 'Cancel', style: 'cancel', onPress: () => reject(new Error('PIN cancelled')) },
          {
            text: 'OK',
            onPress: async (pin) => {
              if (pin && pin.length === 4 && /^\d+$/.test(pin)) {
                try {
                  // Verify PIN with backend
                  const response = await apiClient.post('/auth/verify-pin/', {
                    pin: encryptData(pin),
                    device_hash: await generateDeviceHash(await getUniqueId()),
                  });

                  if (response.data.valid) {
                    setIsAuthenticated(true);
                    resolve(pin);
                  } else {
                    reject(new Error('Invalid PIN'));
                  }
                } catch (error) {
                  reject(error);
                }
              } else {
                reject(new Error('Invalid PIN format'));
              }
            },
          },
        ],
        'secure-text'
      );
    });
  };

  const checkBiometricAvailable = async (): Promise<boolean> => {
    try {
      const biometryType = await Keychain.getSupportedBiometryType();
      return biometryType !== null;
    } catch (error) {
      return false;
    }
  };

  const loadMerchantData = async () => {
    try {
      const response = await apiClient.get('/merchant/profile/');
      setMerchantInfo(response.data);
    } catch (error) {
      logger.error('Failed to load merchant data:', error);
    }
  };

  const loadSupportedMethods = async () => {
    try {
      const response = await apiClient.get('/payments/soft-pos/supported-payment-methods/');
      
      const methods: PaymentMethod[] = [
        {
          id: 'credit_card',
          name: 'Credit/Debit Card',
          icon: '💳',
          enabled: response.data.credit_card || false,
        },
        {
          id: 'nfc_credit',
          name: 'NFC Credit Card',
          icon: '📱',
          enabled: response.data.nfc_supported || false,
          requiresHardware: true,
        },
        {
          id: 'nfc_debit',
          name: 'NFC Debit Card',
          icon: '📱',
          enabled: response.data.nfc_supported || false,
          requiresHardware: true,
        },
        {
          id: 'mobile_wallet',
          name: 'Mobile Wallet',
          icon: '👛',
          enabled: response.data.nfc_supported || false,
          requiresHardware: true,
        },
        {
          id: 'mtn_money',
          name: 'MTN Mobile Money',
          icon: '📞',
          enabled: response.data.mobile_money_supported || false,
        },
        {
          id: 'telecel_cash',
          name: 'Telecel Cash',
          icon: '📞',
          enabled: response.data.mobile_money_supported || false,
        },
        {
          id: 'g_money',
          name: 'G-Money',
          icon: '📞',
          enabled: response.data.mobile_money_supported || false,
        },
        {
          id: 'airteltigo_money',
          name: 'AirtelTigo Money',
          icon: '📞',
          enabled: response.data.mobile_money_supported || false,
        },
      ];

      setSupportedMethods(methods.filter(method => method.enabled));
    } catch (error) {
      logger.error('Failed to load supported methods:', error);
    }
  };

  const loadNetworkStatus = async () => {
    try {
      const response = await apiClient.get('/payments/mobile-money/network-status/');
      
      const networks: MobileNetwork[] = [
        { id: 'mtn', name: 'MTN Mobile Money', color: '#FF6B35', status: 'online' },
        { id: 'telecel', name: 'Telecel Cash', color: '#E40046', status: 'online' },
        { id: 'g_money', name: 'G-Money', color: '#00B388', status: 'online' },
        { id: 'airteltigo', name: 'AirtelTigo Money', color: '#0033A0', status: 'online' },
      ];

      setNetworkStatus(networks);
    } catch (error) {
      logger.error('Failed to load network status:', error);
    }
  };

  const startHeartbeat = () => {
    // Send heartbeat every 30 seconds
    const heartbeatInterval = setInterval(async () => {
      try {
        const deviceHash = await generateDeviceHash(await getUniqueId());
        
        await apiClient.post('/payments/soft-pos/heartbeat/', {
          device_id_hash: deviceHash,
          device_data: {
            battery_level: await getBatteryLevel(),
            location: await getCurrentLocation(),
            timestamp: new Date().toISOString(),
          },
        });

        // Update local device status
        setDeviceStatus(prev => ({
          ...prev!,
          lastHeartbeat: new Date().toISOString(),
          batteryLevel: await getBatteryLevel(),
        }));
        
      } catch (error) {
        logger.error('Heartbeat failed:', error);
      }
    }, 30000);

    return () => clearInterval(heartbeatInterval);
  };

  const getBatteryLevel = async (): Promise<number> => {
    // In a real app, use a battery level library
    return Math.floor(Math.random() * 100);
  };

  const getCurrentLocation = async () => {
    // In a real app, use react-native-location
    return {
      latitude: 5.6037,
      longitude: -0.1870,
    };
  };

  const handlePaymentMethodSelect = (method: PaymentMethod) => {
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    if (method.requiresHardware) {
      // Check hardware availability
      if (method.id.includes('nfc') && !nfcSupported) {
        Alert.alert('Error', 'NFC is not available on this device');
        return;
      }
    }

    setSelectedMethod(method.id);
    navigation.navigate('PaymentProcessing', {
      amount: parseFloat(amount),
      method: method.id,
    });
  };

  const handleDeviceManagement = () => {
    navigation.navigate('DeviceManagement');
  };

  const handleAnalytics = () => {
    navigation.navigate('Analytics');
  };

  const handleSettings = () => {
    navigation.navigate('Settings');
  };

  const handleLogout = async () => {
    try {
      // Clear session
      await Keychain.resetGenericPassword({
        service: 'sikaremit_softpos',
        key: 'session_token',
      });
      
      setIsAuthenticated(false);
      
      // Navigate to login or restart authentication
      Alert.alert('Logged Out', 'You have been logged out successfully');
      
    } catch (error) {
      logger.error('Logout failed:', error);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#1E88E5" />
        <Text style={styles.loadingText}>Initializing Soft POS...</Text>
      </View>
    );
  }

  if (!isAuthenticated) {
    return (
      <View style={[styles.container, styles.authContainer]}>
        <Text style={styles.authTitle}>SikaRemit Soft POS</Text>
        <Text style={styles.authSubtitle}>Authentication Required</Text>
        <TouchableOpacity
          style={styles.authButton}
          onPress={() => authenticateUser()}
        >
          <Text style={styles.authButtonText}>Authenticate</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor="#1E88E5" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Soft POS Terminal</Text>
          <Text style={styles.merchantName}>{merchantInfo?.business_name || 'Merchant'}</Text>
        </View>
        
        <View style={styles.statusIndicator}>
          <View style={[styles.statusDot, { backgroundColor: deviceStatus?.isOnline ? '#4CAF50' : '#F44336' }]} />
          <Text style={styles.statusText}>
            {deviceStatus?.isOnline ? 'Online' : 'Offline'}
          </Text>
        </View>
      </View>

      {/* Device Status */}
      {deviceStatus && (
        <View style={styles.deviceStatusCard}>
          <View style={styles.deviceStatusHeader}>
            <Text style={styles.deviceStatusTitle}>Device Status</Text>
            <Text style={styles.deviceId}>ID: {deviceId.slice(-8)}</Text>
          </View>
          
          <View style={styles.deviceStatusGrid}>
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>Battery</Text>
              <Text style={styles.statusValue}>{deviceStatus.batteryLevel}%</Text>
            </View>
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>Signal</Text>
              <Text style={styles.statusValue}>{deviceStatus.signalStrength}%</Text>
            </View>
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>Last Seen</Text>
              <Text style={styles.statusValue}>
                {new Date(deviceStatus.lastHeartbeat).toLocaleTimeString()}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Amount Input */}
      <View style={styles.amountCard}>
        <Text style={styles.amountLabel}>Enter Amount</Text>
        <View style={styles.amountInputContainer}>
          <Text style={styles.currencySymbol}>₵</Text>
          <TextInput
            style={styles.amountInput}
            value={amount}
            onChangeText={setAmount}
            placeholder="0.00"
            keyboardType="numeric"
            textAlign="center"
          />
        </View>
      </View>

      {/* Payment Methods */}
      <View style={styles.paymentMethodsCard}>
        <Text style={styles.paymentMethodsTitle}>Select Payment Method</Text>
        
        <ScrollView style={styles.paymentMethodsList}>
          {supportedMethods.map((method) => (
            <TouchableOpacity
              key={method.id}
              style={styles.paymentMethodItem}
              onPress={() => handlePaymentMethodSelect(method)}
            >
              <View style={styles.paymentMethodIcon}>
                <Text style={styles.paymentMethodIconText}>{method.icon}</Text>
              </View>
              <View style={styles.paymentMethodInfo}>
                <Text style={styles.paymentMethodName}>{method.name}</Text>
                {method.requiresHardware && (
                  <Text style={styles.paymentMethodNote}>Requires hardware</Text>
                )}
              </View>
              <View style={styles.paymentMethodArrow}>
                <Text style={styles.arrowText}>›</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Network Status */}
      {networkStatus.length > 0 && (
        <View style={styles.networkStatusCard}>
          <Text style={styles.networkStatusTitle}>Mobile Money Networks</Text>
          <View style={styles.networkStatusList}>
            {networkStatus.map((network) => (
              <View key={network.id} style={styles.networkStatusItem}>
                <View style={[styles.networkDot, { backgroundColor: network.color }]} />
                <Text style={styles.networkName}>{network.name}</Text>
                <Text style={[styles.networkStatus, { color: network.color }]}>
                  {network.status}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Bottom Navigation */}
      <View style={styles.bottomNavigation}>
        <TouchableOpacity style={styles.navItem} onPress={handleDeviceManagement}>
          <Text style={styles.navIcon}>📱</Text>
          <Text style={styles.navLabel}>Devices</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navItem} onPress={handleAnalytics}>
          <Text style={styles.navIcon}>📊</Text>
          <Text style={styles.navLabel}>Analytics</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navItem} onPress={handleSettings}>
          <Text style={styles.navIcon}>⚙️</Text>
          <Text style={styles.navLabel}>Settings</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navItem} onPress={handleLogout}>
          <Text style={styles.navIcon}>🚪</Text>
          <Text style={styles.navLabel}>Logout</Text>
        </TouchableOpacity>
      </View>
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
  authContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  authTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1E88E5',
    marginBottom: 8,
  },
  authSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 32,
  },
  authButton: {
    backgroundColor: '#1E88E5',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  authButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    backgroundColor: '#1E88E5',
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  merchantName: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    color: 'white',
  },
  deviceStatusCard: {
    backgroundColor: 'white',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  deviceStatusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  deviceStatusTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  deviceId: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace',
  },
  deviceStatusGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statusItem: {
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  amountCard: {
    backgroundColor: 'white',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  amountLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  currencySymbol: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1E88E5',
    marginRight: 8,
  },
  amountInput: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    paddingVertical: 8,
  },
  paymentMethodsCard: {
    backgroundColor: 'white',
    margin: 16,
    marginTop: 0,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    maxHeight: 300,
  },
  paymentMethodsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    padding: 16,
    paddingBottom: 8,
  },
  paymentMethodsList: {
    paddingHorizontal: 16,
  },
  paymentMethodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  paymentMethodIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  paymentMethodIconText: {
    fontSize: 20,
  },
  paymentMethodInfo: {
    flex: 1,
  },
  paymentMethodName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  paymentMethodNote: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  paymentMethodArrow: {
    padding: 8,
  },
  arrowText: {
    fontSize: 20,
    color: '#CCC',
  },
  networkStatusCard: {
    backgroundColor: 'white',
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  networkStatusTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  networkStatusList: {
    spaceY: 8,
  },
  networkStatusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  networkDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 8,
  },
  networkName: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  networkStatus: {
    fontSize: 12,
    fontWeight: '500',
  },
  bottomNavigation: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingBottom: 8,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  navIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  navLabel: {
    fontSize: 12,
    color: '#666',
  },
});

export default SoftPOSHome;
