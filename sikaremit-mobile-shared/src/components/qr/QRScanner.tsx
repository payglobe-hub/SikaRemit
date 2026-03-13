import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  Dimensions,
  Text,
} from 'react-native';
import { Camera } from 'expo-camera';
import { BarCodeScanner } from 'expo-barcode-scanner';
import { Colors, Spacing, BorderRadius, FontSize } from '../../constants/theme';
import Button from '../ui/Button';

interface QRScannerProps {
  onScan: (data: string) => void;
  onClose: () => void;
  title?: string;
  description?: string;
}

const QRScanner: React.FC<QRScannerProps> = ({
  onScan,
  onClose,
  title = 'Scan QR Code',
  description = 'Position the QR code within the frame to scan',
}: QRScannerProps) => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [flashMode, setFlashMode] = useState(0); // 0 = off, 1 = torch

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    setScanned(true);
    onScan(data);
  };

  const handleScanAgain = () => {
    setScanned(false);
  };

  const toggleFlash = () => {
    setFlashMode(flashMode === 0 ? 1 : 0);
  };

  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Camera access denied</Text>
        <Button title="Close" onPress={onClose} style={{ marginTop: Spacing.lg }} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>

      <View style={styles.scannerContainer}>
        <Camera
          style={styles.camera}
          type={1} // 1 = back camera
          flashMode={flashMode}
          barCodeScannerSettings={{
            barCodeTypes: ['qr'],
          }}
          onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
        >
          <View style={styles.overlay}>
            <View style={styles.scanFrame} />
          </View>
        </Camera>
      </View>

      <View style={styles.controls}>
        <Button
          title={flashMode === 0 ? 'Turn On Flash' : 'Turn Off Flash'}
          variant="secondary"
          onPress={toggleFlash}
          style={{ marginRight: Spacing.md }}
        />
        <Button
          title="Close"
          variant="outline"
          onPress={onClose}
        />
      </View>

      {scanned && (
        <View style={styles.scanResult}>
          <Text style={styles.scanText}>QR Code scanned successfully!</Text>
          <Button title="Scan Again" onPress={handleScanAgain} />
        </View>
      )}
    </View>
  );
};

const { width, height } = Dimensions.get('window');
const frameSize = Math.min(width * 0.7, height * 0.4);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    padding: Spacing.lg,
    alignItems: 'center',
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  description: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  scannerContainer: {
    flex: 1,
    position: 'relative',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: frameSize,
    height: frameSize,
    borderWidth: 2,
    borderColor: Colors.primary,
    borderRadius: BorderRadius.md,
    backgroundColor: 'transparent',
  },
  controls: {
    flexDirection: 'row',
    padding: Spacing.lg,
    justifyContent: 'center',
  },
  scanResult: {
    position: 'absolute',
    bottom: 100,
    left: Spacing.lg,
    right: Spacing.lg,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  scanText: {
    fontSize: FontSize.md,
    color: Colors.success,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  text: {
    fontSize: FontSize.md,
    color: Colors.text,
    textAlign: 'center',
  },
});

export default QRScanner;
