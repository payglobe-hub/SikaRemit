import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Animated, { 
  FadeInDown, 
  FadeInUp,
  FadeInRight,
  useSharedValue, 
  useAnimatedStyle, 
  withSpring,
} from 'react-native-reanimated';
import { Button, Input, Card } from '../../components/ui';
import { useTheme } from '../../context/ThemeContext';
import { useWalletStore } from '../../store/walletStore';
import { 
  BorderRadius, 
  FontSize, 
  FontWeight, 
  Spacing, 
  Shadow, 
  AnimationConfig, 
  ComponentSize 
} from '../../constants/theme';
import { TelecomLogos, detectTelecom } from '../../assets/logos';
import mobileMoneyService, { MobileMoneyNetwork } from '../../services/mobileMoneyService';

interface DataPackage {
  id: string;
  name: string;
  data: string;
  validity: string;
  price: number;
}

const { width } = Dimensions.get('window');

const DataBundleScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { wallets } = useWalletStore();

  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedNetwork, setSelectedNetwork] = useState<string | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<DataPackage | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('wallet');
  const [isLoading, setIsLoading] = useState(false);

  const walletBalance = wallets.reduce((sum, w) => sum + w.balance, 0);

  const paymentMethods = [
    { id: 'wallet', name: 'SikaRemit Balance', icon: 'wallet', balance: walletBalance },
    { id: 'mtn_momo', name: 'MTN Mobile Money', icon: 'phone-portrait', color: '#FFCC00', logo: TelecomLogos.mtn },
    { id: 'telecel_cash', name: 'Telecel Cash', icon: 'phone-portrait', color: '#E60000', logo: TelecomLogos.telecel },
    { id: 'airteltigo_money', name: 'AirtelTigo Money', icon: 'phone-portrait', color: '#FF0000', logo: TelecomLogos.airteltigo },
  ];

  const networks = [
    { id: 'mtn', name: 'MTN', color: '#FFCC00', logo: TelecomLogos.mtn },
    { id: 'telecel', name: 'Telecel', color: '#E60000', logo: TelecomLogos.telecel },
    { id: 'airteltigo', name: 'AirtelTigo', color: '#FF0000', logo: TelecomLogos.airteltigo },
  ];

  const dataPackages: Record<string, DataPackage[]> = {
    mtn: [
      { id: 'mtn_1', name: 'Daily', data: '100MB', validity: '1 Day', price: 1 },
      { id: 'mtn_2', name: 'Weekly', data: '1GB', validity: '7 Days', price: 5 },
      { id: 'mtn_3', name: 'Monthly', data: '5GB', validity: '30 Days', price: 20 },
      { id: 'mtn_4', name: 'Monthly Plus', data: '10GB', validity: '30 Days', price: 35 },
    ],
    telecel: [
      { id: 'telecel_1', name: 'Daily', data: '100MB', validity: '1 Day', price: 1 },
      { id: 'telecel_2', name: 'Weekly', data: '1GB', validity: '7 Days', price: 5 },
      { id: 'telecel_3', name: 'Monthly', data: '5GB', validity: '30 Days', price: 20 },
      { id: 'telecel_4', name: 'Monthly Plus', data: '10GB', validity: '30 Days', price: 35 },
    ],
    airteltigo: [
      { id: 'at_1', name: 'Daily', data: '100MB', validity: '1 Day', price: 1 },
      { id: 'at_2', name: 'Weekly', data: '1GB', validity: '7 Days', price: 5 },
      { id: 'at_3', name: 'Monthly', data: '5GB', validity: '30 Days', price: 20 },
      { id: 'at_4', name: 'Monthly Plus', data: '10GB', validity: '30 Days', price: 35 },
    ],
  };

  const currentPackages = selectedNetwork ? dataPackages[selectedNetwork] || [] : [];

  // Auto-detect network from phone number
  useEffect(() => {
    if (phoneNumber.length >= 3) {
      const detected = detectTelecom(phoneNumber);
      if (detected && !selectedNetwork) {
        setSelectedNetwork(detected);
      }
    }
  }, [phoneNumber]);

  const handlePurchase = async () => {
    if (!selectedNetwork) {
      Alert.alert('Error', 'Please select a network');
      return;
    }
    if (!phoneNumber || phoneNumber.length < 10) {
      Alert.alert('Error', 'Please enter a valid phone number');
      return;
    }
    if (!selectedPackage) {
      Alert.alert('Error', 'Please select a data package');
      return;
    }

    // Validate phone number
    const validation = mobileMoneyService.validatePhone(phoneNumber);
    if (!validation.valid) {
      Alert.alert('Error', validation.message || 'Invalid phone number');
      return;
    }

    setIsLoading(true);
    try {
      // Map network ID to MobileMoneyNetwork type
      const networkMap: Record<string, MobileMoneyNetwork> = {
        'mtn': 'mtn',
        'telecel': 'telecel',
        'airteltigo': 'airteltigo',
      };
      const network = networkMap[selectedNetwork] || 'mtn';

      // Determine payment method
      const paymentMethod = selectedPaymentMethod === 'wallet' ? 'wallet' : 'mobile_money';
      const paymentPhone = selectedPaymentMethod !== 'wallet' 
        ? phoneNumber // Use recipient phone for mobile money payment
        : undefined;

      // Call real API
      await mobileMoneyService.buyDataBundle({
        phone: phoneNumber,
        bundleId: selectedPackage.id,
        network,
        paymentMethod: paymentMethod,
      });

      Alert.alert('Success', `Data bundle purchased successfully!`, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to purchase data bundle');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNetworkSelect = (networkId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedNetwork(networkId);
    setSelectedPackage(null); // Reset package when network changes
  };

  const handlePackageSelect = (pkg: DataPackage) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedPackage(pkg);
  };

  const handlePaymentMethodSelect = (methodId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedPaymentMethod(methodId);
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.contentContainer, { paddingTop: insets.top + Spacing.lg }]}
        >
          {/* Header */}
          <Animated.View entering={FadeInDown.duration(600)} style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.title, { color: colors.text }]}>Buy Data Bundle</Text>
            <View style={styles.placeholder} />
          </Animated.View>

          {/* Balance Card */}
          <Animated.View entering={FadeInUp.duration(800).delay(200)} style={styles.section}>
            <Card variant="default" padding="lg">
              <View style={styles.balanceHeader}>
                <Text style={[styles.balanceLabel, { color: colors.textSecondary }]}>
                  Available Balance
                </Text>
                <Text style={[styles.balanceAmount, { color: colors.text }]}>
                  GHS {walletBalance.toLocaleString() || '0.00'}
                </Text>
              </View>
            </Card>
          </Animated.View>

          {/* Network Selection */}
          <Animated.View entering={FadeInUp.duration(800).delay(400)} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Select Network</Text>
            <View style={styles.networksGrid}>
              {networks.map((network, index) => (
                <Animated.View
                  key={network.id}
                  entering={FadeInUp.duration(600).delay(600 + index * 100)}
                >
                  <TouchableOpacity
                    style={[
                      styles.networkCard,
                      {
                        backgroundColor: selectedNetwork === network.id 
                          ? colors.primary + '15'
                          : colors.surface,
                        borderColor: selectedNetwork === network.id 
                          ? colors.primary
                          : colors.borderLight,
                      }
                    ]}
                    onPress={() => handleNetworkSelect(network.id)}
                  >
                    <View style={[
                      styles.networkLogo,
                      { backgroundColor: network.color + '20' }
                    ]}>
                      <Image source={network.logo} style={styles.networkImage} />
                    </View>
                    <Text style={[styles.networkName, { color: colors.text }]}>
                      {network.name}
                    </Text>
                  </TouchableOpacity>
                </Animated.View>
              ))}
            </View>
          </Animated.View>

          {/* Phone Number Input */}
          <Animated.View entering={FadeInUp.duration(800).delay(600)} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Phone Number</Text>
            <Input
              placeholder="Enter phone number"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
              leftIcon={<Ionicons name="phone-portrait" size={20} color={colors.textMuted} />}
              variant="glass"
            />
          </Animated.View>

          {/* Data Packages */}
          {selectedNetwork && (
            <Animated.View entering={FadeInUp.duration(800).delay(800)} style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Select Package</Text>
              <View style={styles.packagesGrid}>
                {currentPackages.map((pkg, index) => (
                  <Animated.View
                    key={pkg.id}
                    entering={FadeInUp.duration(600).delay(1000 + index * 100)}
                  >
                    <TouchableOpacity
                      style={[
                        styles.packageCard,
                        {
                          backgroundColor: selectedPackage?.id === pkg.id 
                            ? colors.primary + '15'
                            : colors.surface,
                          borderColor: selectedPackage?.id === pkg.id 
                            ? colors.primary
                            : colors.borderLight,
                        }
                      ]}
                      onPress={() => handlePackageSelect(pkg)}
                    >
                      <View style={styles.packageHeader}>
                        <Text style={[styles.packageName, { color: colors.text }]}>
                          {pkg.name}
                        </Text>
                        <Text style={[styles.packagePrice, { color: colors.primary }]}>
                          GHS {pkg.price}
                        </Text>
                      </View>
                      <View style={styles.packageDetails}>
                        <Text style={[styles.packageData, { color: colors.textSecondary }]}>
                          {pkg.data}
                        </Text>
                        <Text style={[styles.packageValidity, { color: colors.textMuted }]}>
                          {pkg.validity}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  </Animated.View>
                ))}
              </View>
            </Animated.View>
          )}

          {/* Payment Method */}
          <Animated.View entering={FadeInUp.duration(800).delay(1000)} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Pay With</Text>
            <View style={styles.paymentMethodsGrid}>
              {paymentMethods.map((method, index) => (
                <Animated.View
                  key={method.id}
                  entering={FadeInUp.duration(600).delay(1200 + index * 100)}
                >
                  <TouchableOpacity
                    style={[
                      styles.paymentMethodCard,
                      {
                        backgroundColor: selectedPaymentMethod === method.id 
                          ? colors.primary + '15'
                          : colors.surface,
                        borderColor: selectedPaymentMethod === method.id 
                          ? colors.primary
                          : colors.borderLight,
                      }
                    ]}
                    onPress={() => handlePaymentMethodSelect(method.id)}
                  >
                    <View style={[
                      styles.paymentMethodIcon,
                      { backgroundColor: method.color ? method.color + '20' : colors.primary + '20' }
                    ]}>
                      {method.logo ? (
                        <Image source={method.logo} style={styles.paymentMethodLogo} />
                      ) : (
                        <Ionicons name={method.icon as any} size={20} color={method.color || colors.primary} />
                      )}
                    </View>
                    <View style={styles.paymentMethodInfo}>
                      <Text style={[styles.paymentMethodName, { color: colors.text }]}>
                        {method.name}
                      </Text>
                      {method.balance !== undefined && (
                        <Text style={[styles.paymentMethodBalance, { color: colors.textMuted }]}>
                          GHS {method.balance.toLocaleString()}
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                </Animated.View>
              ))}
            </View>
          </Animated.View>

          {/* Purchase Button */}
          <Animated.View entering={FadeInUp.duration(800).delay(1200)} style={styles.section}>
            <Button
              title={`Buy Bundle - GHS ${selectedPackage?.price || '0.00'}`}
              onPress={handlePurchase}
              loading={isLoading}
              disabled={!selectedNetwork || !phoneNumber || !selectedPackage}
              gradient={true}
              fullWidth={true}
              size="lg"
            />
          </Animated.View>

          <View style={{ height: Spacing.xxxl }} />
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: Spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  backButton: {
    width: ComponentSize.iconButton.md,
    height: ComponentSize.iconButton.md,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold as any,
  },
  placeholder: {
    width: ComponentSize.iconButton.md,
  },
  section: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold as any,
    marginBottom: Spacing.md,
  },
  balanceHeader: {
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium as any,
    marginBottom: Spacing.xs,
  },
  balanceAmount: {
    fontSize: FontSize.xxxl,
    fontWeight: FontWeight.bold as any,
  },
  networksGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  networkCard: {
    flex: 1,
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    ...Shadow.card,
  },
  networkLogo: {
    width: ComponentSize.avatar.md,
    height: ComponentSize.avatar.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  networkImage: {
    width: 32,
    height: 32,
    resizeMode: 'contain',
  },
  networkName: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold as any,
  },
  packagesGrid: {
    gap: Spacing.md,
  },
  packageCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    ...Shadow.card,
  },
  packageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  packageName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold as any,
  },
  packagePrice: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold as any,
  },
  packageDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  packageData: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium as any,
  },
  packageValidity: {
    fontSize: FontSize.sm,
    color: '#94A3B8',
  },
  paymentMethodsGrid: {
    gap: Spacing.md,
  },
  paymentMethodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    ...Shadow.card,
  },
  paymentMethodIcon: {
    width: ComponentSize.avatar.md,
    height: ComponentSize.avatar.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  paymentMethodLogo: {
    width: 32,
    height: 32,
    resizeMode: 'contain',
  },
  paymentMethodInfo: {
    flex: 1,
  },
  paymentMethodName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold as any,
  },
  paymentMethodBalance: {
    fontSize: FontSize.sm,
    marginTop: 2,
  },
});

export default DataBundleScreen;
