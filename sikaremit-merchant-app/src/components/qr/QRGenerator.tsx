import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Share,
  Vibration,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { qrService } from '../services/qrService';

interface QRGeneratorProps {
  amount: number;
  currency?: string;
  merchantName: string;
  merchantId: string;
  description?: string;
  expiryMinutes?: number;
  onQRGenerated?: (qrData: any) => void;
  onShare?: (qrData: any) => void;
}

const { width } = Dimensions.get('window');
const QR_SIZE = width * 0.7;

export const QRGenerator: React.FC<QRGeneratorProps> = ({
  amount,
  currency = 'GHS',
  merchantName,
  merchantId,
  description,
  expiryMinutes = 15,
  onQRGenerated,
  onShare,
}) => {
  const [qrData, setQrData] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number>(Infinity);
  const [showShareOptions, setShowShareOptions] = useState(false);

  useEffect(() => {
    generateQRCode();
  }, [amount, currency, merchantName, merchantId, description, expiryMinutes]);

  useEffect(() => {
    if (qrData && qrData.expiry) {
      const interval = setInterval(() => {
        const remaining = qrService.getQRTimeRemaining(JSON.stringify(qrData));
        setTimeRemaining(remaining);
        
        if (remaining <= 0) {
          clearInterval(interval);
          Alert.alert('QR Code Expired', 'This QR code has expired. Please generate a new one.');
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [qrData]);

  const generateQRCode = async () => {
    try {
      setIsGenerating(true);
      
      const qrPayload = {
        amount,
        currency,
        merchant_name: merchantName,
        merchant_id: merchantId,
        description: description || '',
        expiry_minutes: expiryMinutes,
      };

      const generatedQR = await qrService.generateQRCode(qrPayload);
      setQrData(generatedQR);
      
      onQRGenerated?.(generatedQR);
      
      Vibration.vibrate(100); // Success feedback
    } catch (error: any) {
      console.error('QR generation failed:', error);
      Alert.alert('Error', error.message || 'Failed to generate QR code');
    } finally {
      setIsGenerating(false);
    }
  };

  const shareQRCode = async () => {
    if (!qrData) return;

    try {
      const shareMessage = `
Pay ${qrData.currency} ${qrData.amount} to ${qrData.merchant_name}
Reference: ${qrData.reference}
Scan this QR code to complete payment
      `.trim();

      await Share.share({
        message: shareMessage,
        title: 'SikaRemit Payment QR Code',
      });

      onShare?.(qrData);
    } catch (error: any) {
      console.error('Share failed:', error);
      Alert.alert('Share Error', 'Failed to share QR code');
    }
  };

  const copyToClipboard = async () => {
    if (!qrData) return;

    try {
      // In a real implementation, you'd use @react-native-clipboard/clipboard
      Alert.alert('Copied', `Reference: ${qrData.reference}`);
    } catch (error) {
      console.error('Copy failed:', error);
    }
  };

  const refreshQRCode = () => {
    generateQRCode();
  };

  if (isGenerating) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Ionicons name="qr-code-outline" size={64} color="#4CAF50" />
          <Text style={styles.loadingText}>Generating QR Code...</Text>
        </View>
      </View>
    );
  }

  if (!qrData) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#FF6B6B" />
          <Text style={styles.errorText}>Failed to generate QR code</Text>
          <TouchableOpacity style={styles.retryButton} onPress={generateQRCode}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const isExpired = timeRemaining <= 0;
  const expiryText = qrService.formatQRExpiry(JSON.stringify(qrData));

  return (
    <View style={styles.container}>
      <View style={styles.qrContainer}>
        {/* QR Code */}
        <View style={[styles.qrWrapper, isExpired && styles.expiredWrapper]}>
          <QRCode
            value={qrData.qr_data}
            size={QR_SIZE}
            color={isExpired ? '#999' : 'black'}
            backgroundColor={isExpired ? '#f5f5f5' : 'white'}
          />
          
          {isExpired && (
            <View style={styles.expiredOverlay}>
              <Ionicons name="time-outline" size={32} color="#FF6B6B" />
              <Text style={styles.expiredText}>EXPIRED</Text>
            </View>
          )}
        </View>

        {/* Payment Details */}
        <View style={styles.detailsContainer}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Amount:</Text>
            <Text style={styles.detailValue}>
              {qrData.currency} {qrData.amount}
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Merchant:</Text>
            <Text style={styles.detailValue}>{qrData.merchant_name}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Reference:</Text>
            <Text style={styles.referenceValue}>{qrData.reference}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Status:</Text>
            <Text style={[styles.statusValue, isExpired && styles.expiredStatus]}>
              {isExpired ? 'Expired' : expiryText}
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={[styles.actionButton, styles.refreshButton]}
            onPress={refreshQRCode}
            disabled={isGenerating}
          >
            <Ionicons name="refresh-outline" size={20} color="white" />
            <Text style={styles.actionButtonText}>Refresh</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.shareButton]}
            onPress={shareQRCode}
            disabled={isExpired}
          >
            <Ionicons name="share-outline" size={20} color="white" />
            <Text style={styles.actionButtonText}>Share</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.copyButton]}
            onPress={copyToClipboard}
          >
            <Ionicons name="copy-outline" size={20} color="white" />
            <Text style={styles.actionButtonText}>Copy</Text>
          </TouchableOpacity>
        </View>

        {/* Instructions */}
        <View style={styles.instructionsContainer}>
          <Text style={styles.instructionsTitle}>How to Pay:</Text>
          <Text style={styles.instructionsText}>
            1. Open your SikaRemit app{'\n'}
            2. Tap "Scan to Pay"{'\n'}
            3. Point camera at this QR code{'\n'}
            4. Confirm payment details{'\n'}
            5. Complete payment
          </Text>
        </View>

        {/* Security Notice */}
        <View style={styles.securityContainer}>
          <Ionicons name="shield-checkmark-outline" size={20} color="#4CAF50" />
          <Text style={styles.securityText}>
            Secured by SikaRemit • Encrypted payment data
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#FF6B6B',
    fontWeight: '500',
  },
  retryButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#4CAF50',
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  qrContainer: {
    flex: 1,
    padding: 20,
  },
  qrWrapper: {
    alignSelf: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  expiredWrapper: {
    opacity: 0.6,
  },
  expiredOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
  },
  expiredText: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF6B6B',
  },
  detailsContainer: {
    marginTop: 24,
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  referenceValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
    fontFamily: 'monospace',
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
  },
  expiredStatus: {
    color: '#FF6B6B',
  },
  actionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
    paddingHorizontal: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginHorizontal: 5,
    borderRadius: 8,
    gap: 8,
  },
  refreshButton: {
    backgroundColor: '#2196F3',
  },
  shareButton: {
    backgroundColor: '#4CAF50',
  },
  copyButton: {
    backgroundColor: '#FF9800',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  instructionsContainer: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1976D2',
    marginBottom: 8,
  },
  instructionsText: {
    fontSize: 14,
    color: '#424242',
    lineHeight: 20,
  },
  securityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    paddingVertical: 8,
    gap: 8,
  },
  securityText: {
    fontSize: 12,
    color: '#666',
  },
});

export default QRGenerator;
