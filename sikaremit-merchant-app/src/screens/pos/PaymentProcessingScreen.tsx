import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Vibration,
  Animated,
  Dimensions,
  StatusBar,
  ActivityIndicator,
  BackHandler,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import NfcManager, { NfcTech, Ndef } from 'react-native-nfc-manager';
import Sound from 'react-native-sound';
import { apiClient } from '../services/api';
import { logger } from '../utils/logger';
import { encryptData } from '../utils/crypto';

const { width, height } = Dimensions.get('window');

type RootStackParamList = {
  SoftPOSHome: undefined;
  PaymentProcessing: { amount: number; method: string };
};

type PaymentProcessingScreenNavigationProp = StackNavigationProp<RootStackParamList, 'PaymentProcessing'>;

interface PaymentProcessingProps {
  route: {
    params: {
      amount: number;
      method: string;
    };
  };
  navigation: PaymentProcessingScreenNavigationProp;
}

const PaymentProcessing: React.FC<PaymentProcessingProps> = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const { amount, method } = route.params;
  
  // Animation values
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  
  // State
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [nfcReading, setNfcReading] = useState(false);
  const [mobileNumber, setMobileNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [reference, setReference] = useState('');
  const [cardData, setCardData] = useState<any>(null);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'confirmed' | 'failed' | 'expired'>('pending');
  
  // Sound effects
  const [beepSound, setBeepSound] = useState<Sound | null>(null);
  const [successSound, setSuccessSound] = useState<Sound | null>(null);
  const [errorSound, setErrorSound] = useState<Sound | null>(null);
  
  // Polling for mobile money status
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    initializePayment();
    loadSounds();
    
    // Handle back button
    const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
    
    return () => {
      backHandler.remove();
      cleanup();
    };
  }, []);

  const initializePayment = () => {
    // Start animations
    startAnimations();
    
    // Initialize based on payment method
    if (method.includes('nfc') || method === 'mobile_wallet') {
      initializeNFC();
    }
  };

  const loadSounds = () => {
    // Load sound effects
    const beep = new Sound('beep.mp3', Sound.MAIN_BUNDLE, (error) => {
      if (error) {
        logger.error('Failed to load beep sound:', error);
      } else {
        setBeepSound(beep);
      }
    });

    const success = new Sound('success.mp3', Sound.MAIN_BUNDLE, (error) => {
      if (error) {
        logger.error('Failed to load success sound:', error);
      } else {
        setSuccessSound(success);
      }
    });

    const error = new Sound('error.mp3', Sound.MAIN_BUNDLE, (error) => {
      if (error) {
        logger.error('Failed to load error sound:', error);
      } else {
        setErrorSound(error);
      }
    });
  };

  const startAnimations = () => {
    // Pulse animation for NFC reading
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Slide in animation
    Animated.timing(slideAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  };

  const initializeNFC = async () => {
    try {
      await NfcManager.start();
      logger.info('NFC initialized for payment processing');
    } catch (error) {
      logger.error('NFC initialization failed:', error);
      Alert.alert('Error', 'NFC is not available on this device');
    }
  };

  const handleBackPress = () => {
    if (processing) {
      Alert.alert(
        'Payment in Progress',
        'Are you sure you want to cancel this payment?',
        [
          { text: 'No', style: 'cancel' },
          { text: 'Yes', onPress: () => cancelPayment() },
        ]
      );
      return true;
    }
    return false;
  };

  const cancelPayment = () => {
    cleanup();
    navigation.goBack();
  };

  const cleanup = () => {
    // Stop NFC reading
    if (nfcReading) {
      NfcManager.cancelTechnologyRequest();
      setNfcReading(false);
    }
    
    // Clear polling
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }
    
    // Release sounds
    beepSound?.release();
    successSound?.release();
    errorSound?.release();
  };

  const playSound = (sound: Sound | null) => {
    if (sound) {
      sound.play();
    }
  };

  const startNFCReading = async () => {
    try {
      setNfcReading(true);
      setProcessing(true);
      
      await NfcManager.requestTechnology(NfcTech.Ndef);
      
      const tag = await NfcManager.getTag();
      
      if (tag) {
        playSound(beepSound);
        Vibration.vibrate(100);
        
        // Process NFC tag data
        const nfcData = processNFCTag(tag);
        setCardData(nfcData);
        
        // Process payment
        await processNFCPayment(nfcData);
      }
      
    } catch (error) {
      logger.error('NFC reading failed:', error);
      setNfcReading(false);
      setProcessing(false);
      playSound(errorSound);
      Alert.alert('Error', 'Failed to read NFC card. Please try again.');
    } finally {
      NfcManager.cancelTechnologyRequest();
      setNfcReading(false);
    }
  };

  const processNFCTag = (tag: any): any => {
    // Extract relevant NFC data
    const nfcData = {
      nfc_id: tag.id || `nfc_${Date.now()}`,
      reader_id: 'soft_pos_mobile',
      reader_type: 'mobile_nfc',
      signal_strength: 85,
      emv_tags: {
        '9F02': Math.floor(amount * 100).toString().padStart(6, '0'), // Amount
        '5A': tag.id ? tag.id.slice(-8) : '', // PAN from NFC tag (required)
        '9F06': 'A0000000031010', // Visa AID
        '9F37': Math.random().toString(36).substring(2, 8).toUpperCase(), // Unpredictable Number
      },
      cryptogram: Math.random().toString(36).substring(2, 18),
      timestamp: new Date().toISOString(),
    };
    
    return nfcData;
  };

  const processNFCPayment = async (nfcData: any) => {
    try {
      const response = await apiClient.post('/payments/soft-pos/process-nfc-payment/', {
        nfc_data: nfcData,
        amount,
        currency: 'GHS',
      });

      if (response.data.success) {
        setResult(response.data);
        playSound(successSound);
        Vibration.vibrate([100, 100, 100]);
        
        // Auto-navigate back after delay
        setTimeout(() => {
          navigation.goBack();
        }, 3000);
      } else {
        setResult({ success: false, error: response.data.error });
        playSound(errorSound);
      }
    } catch (error) {
      logger.error('NFC payment processing failed:', error);
      setResult({ success: false, error: 'Payment processing failed' });
      playSound(errorSound);
    } finally {
      setProcessing(false);
    }
  };

  const processMobileMoneyPayment = async () => {
    if (!mobileNumber) {
      Alert.alert('Error', 'Please enter mobile number');
      return;
    }

    // Validate mobile number format
    if (!validateMobileNumber(mobileNumber)) {
      Alert.alert('Error', 'Invalid mobile number format');
      return;
    }

    try {
      setProcessing(true);
      setPaymentStatus('pending');

      const response = await apiClient.post('/payments/mobile-money/initiate-payment/', {
        network: method.replace('_money', ''),
        mobile_number,
        amount,
        customer_name: customerName,
        reference: reference || `SikaRemit-${Date.now()}`,
      });

      if (response.data.success) {
        setResult(response.data);
        playSound(beepSound);
        
        // Start polling for payment status
        startPaymentStatusPolling(response.data.mobile_money_transaction_id);
      } else {
        setResult({ success: false, error: response.data.error });
        playSound(errorSound);
        setProcessing(false);
      }
    } catch (error) {
      logger.error('Mobile money payment failed:', error);
      setResult({ success: false, error: 'Payment processing failed' });
      playSound(errorSound);
      setProcessing(false);
    }
  };

  const validateMobileNumber = (number: string): boolean => {
    const cleanNumber = number.replace(/\s/g, '');
    if (cleanNumber.length !== 10) return false;

    const prefixes = {
      mtn: ['024', '054', '055', '059'],
      telecel: ['020', '050'],
      airteltigo: ['026', '027', '056', '057'],
      glo: ['023']
    };

    const network = method.replace('_money', '');
    const prefix = cleanNumber.substring(0, 3);
    return prefixes[network as keyof typeof prefixes]?.includes(prefix) || false;
  };

  const startPaymentStatusPolling = (transactionId: string) => {
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes of polling

    pollingRef.current = setInterval(async () => {
      attempts++;

      try {
        const response = await apiClient.post('/payments/mobile-money/check-status/', {
          mobile_money_transaction_id: transactionId,
        });

        const data = response.data;

        if (data.success && data.status === 'confirmed') {
          setPaymentStatus('confirmed');
          setResult({
            ...result,
            success: true,
            status: 'confirmed',
            confirmation_code: data.confirmation_code,
            confirmed_at: data.confirmed_at,
          });

          playSound(successSound);
          Vibration.vibrate([100, 100, 100]);

          if (pollingRef.current) {
            clearInterval(pollingRef.current);
          }

          // Auto-navigate back after delay
          setTimeout(() => {
            navigation.goBack();
          }, 3000);
        } else if (data.status === 'failed') {
          setPaymentStatus('failed');
          setResult({
            ...result,
            success: false,
            error: data.reason || 'Payment failed',
          });

          playSound(errorSound);

          if (pollingRef.current) {
            clearInterval(pollingRef.current);
          }
        } else if (data.status === 'expired') {
          setPaymentStatus('expired');
          setResult({
            ...result,
            success: false,
            error: 'Payment expired - customer did not confirm',
          });

          playSound(errorSound);

          if (pollingRef.current) {
            clearInterval(pollingRef.current);
          }
        }

        // Stop polling after max attempts
        if (attempts >= maxAttempts) {
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
          }
          setPaymentStatus('expired');
          setResult({
            ...result,
            success: false,
            error: 'Payment timed out',
          });
        }
      } catch (error) {
        logger.error('Payment status check failed:', error);
      }
    }, 5000); // Check every 5 seconds
  };

  const getPaymentMethodTitle = () => {
    const titles = {
      'nfc_credit': 'NFC Credit Card',
      'nfc_debit': 'NFC Debit Card',
      'mobile_wallet': 'Mobile Wallet',
      'mtn_money': 'MTN Mobile Money',
      'telecel_cash': 'Telecel Cash',
      'airteltigo_money': 'AirtelTigo Money',
      'g_money': 'G-Money',
    };
    return titles[method as keyof typeof titles] || 'Payment';
  };

  const getPaymentMethodIcon = () => {
    const icons = {
      'nfc_credit': '📱',
      'nfc_debit': '📱',
      'mobile_wallet': '👛',
      'mtn_money': '📞',
      'telecel_cash': '📞',
      'airteltigo_money': '📞',
      'g_money': '📞',
    };
    return icons[method as keyof typeof icons] || '💳';
  };

  const renderNFCPayment = () => (
    <View style={styles.paymentContent}>
      <Animated.View style={[styles.nfcContainer, { transform: [{ scale: pulseAnim }] }]}>
        <View style={styles.nfcCircle}>
          <Text style={styles.nfcIcon}>📱</Text>
        </View>
        <Text style={styles.nfcTitle}>
          {nfcReading ? 'Reading Card...' : 'Ready for NFC Payment'}
        </Text>
        <Text style={styles.nfcSubtitle}>
          {nfcReading 
            ? 'Please hold the contactless card near your device'
            : 'Tap a contactless card or mobile wallet to begin payment'
          }
        </Text>
      </Animated.View>

      {!nfcReading && (
        <TouchableOpacity
          style={styles.actionButton}
          onPress={startNFCReading}
          disabled={processing}
        >
          <Text style={styles.actionButtonText}>
            Start NFC Payment
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderMobileMoneyPayment = () => (
    <View style={styles.paymentContent}>
      <View style={styles.mobileMoneyContainer}>
        <Text style={styles.mobileMoneyTitle}>Mobile Money Payment</Text>
        <Text style={styles.mobileMoneySubtitle}>Enter customer details</Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Mobile Number</Text>
          <TextInput
            style={styles.input}
            value={mobileNumber}
            onChangeText={setMobileNumber}
            placeholder="0240000000"
            keyboardType="phone-pad"
            maxLength={10}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Customer Name (Optional)</Text>
          <TextInput
            style={styles.input}
            value={customerName}
            onChangeText={setCustomerName}
            placeholder="Customer Name"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Reference (Optional)</Text>
          <TextInput
            style={styles.input}
            value={reference}
            onChangeText={setReference}
            placeholder="Payment reference"
          />
        </View>
      </View>

      <TouchableOpacity
        style={styles.actionButton}
        onPress={processMobileMoneyPayment}
        disabled={processing || !mobileNumber}
      >
        <Text style={styles.actionButtonText}>
          {processing ? 'Sending Prompt...' : 'Send Payment Prompt'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderResult = () => {
    if (!result) return null;

    return (
      <View style={[
        styles.resultContainer,
        result.success ? styles.successResult : styles.errorResult
      ]}>
        <Text style={styles.resultTitle}>
          {result.success ? 'Payment Successful' : 'Payment Failed'}
        </Text>
        
        <Text style={styles.resultAmount}>₵{amount.toFixed(2)}</Text>
        
        {result.success ? (
          <View style={styles.successDetails}>
            <Text style={styles.resultText}>Transaction ID: {result.transaction_id}</Text>
            {result.card_last4 && (
              <Text style={styles.resultText}>Card: ****{result.card_last4}</Text>
            )}
            {result.mobile_money_transaction_id && (
              <Text style={styles.resultText}>Mobile Money ID: {result.mobile_money_transaction_id}</Text>
            )}
            {paymentStatus === 'confirmed' && result.confirmation_code && (
              <Text style={styles.confirmationCode}>Confirmation: {result.confirmation_code}</Text>
            )}
            {paymentStatus === 'pending' && (
              <Text style={styles.pendingText}>Waiting for customer confirmation...</Text>
            )}
          </View>
        ) : (
          <Text style={styles.errorText}>{result.error}</Text>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor="#1E88E5" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBackPress}
          disabled={processing}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>{getPaymentMethodTitle()}</Text>
          <Text style={styles.headerAmount}>₵{amount.toFixed(2)}</Text>
        </View>
        
        <View style={styles.headerIcon}>
          <Text style={styles.headerIconText}>{getPaymentMethodIcon()}</Text>
        </View>
      </View>

      {/* Main Content */}
      <Animated.View style={[styles.content, { opacity: slideAnim }]}>
        {!result && !processing && (
          <>
            {method.includes('nfc') || method === 'mobile_wallet' ? renderNFCPayment() : renderMobileMoneyPayment()}
          </>
        )}
        
        {processing && !result && (
          <View style={styles.processingContainer}>
            <ActivityIndicator size="large" color="#1E88E5" />
            <Text style={styles.processingText}>
              {nfcReading ? 'Reading NFC Card...' : 'Processing Payment...'}
            </Text>
          </View>
        )}
        
        {renderResult()}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#1E88E5',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 24,
    color: 'white',
    fontWeight: 'bold',
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
  },
  headerAmount: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  headerIcon: {
    padding: 8,
  },
  headerIconText: {
    fontSize: 24,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  paymentContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  nfcContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nfcCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  nfcIcon: {
    fontSize: 48,
  },
  nfcTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  nfcSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  mobileMoneyContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  mobileMoneyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  mobileMoneySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  actionButton: {
    backgroundColor: '#1E88E5',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  processingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
    textAlign: 'center',
  },
  resultContainer: {
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  successResult: {
    backgroundColor: '#E8F5E8',
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  errorResult: {
    backgroundColor: '#FFEBEE',
    borderWidth: 2,
    borderColor: '#F44336',
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  resultAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  successDetails: {
    alignItems: 'center',
  },
  resultText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
    textAlign: 'center',
  },
  confirmationCode: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4CAF50',
    marginTop: 8,
  },
  pendingText: {
    fontSize: 16,
    color: '#FF9800',
    fontWeight: '500',
    marginTop: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#F44336',
    textAlign: 'center',
  },
});

export default PaymentProcessing;
