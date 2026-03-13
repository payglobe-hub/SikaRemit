import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Image,
  Alert,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../context/ThemeContext';
import Animated, { 
  FadeInDown, 
  FadeInUp,
  FadeInRight,
  useSharedValue, 
  useAnimatedStyle, 
  withSpring,
} from 'react-native-reanimated';
import { Button, Input, Card, KYCRequiredModal } from '../../components/ui';
import { useAuthStore } from '../../store/authStore';
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
import { TelecomLogos } from '../../assets/logos';
import { DEV_CONFIG } from '../../constants/api';
import exchangeRateService, { ExchangeRate } from '../../services/exchangeRateService';
import { paymentService } from '../../services/paymentService';

const { width } = Dimensions.get('window');

const RemittanceScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const { user } = useAuthStore();
  const { wallets } = useWalletStore();

  const [sendAmount, setSendAmount] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [selectedCountry, setSelectedCountry] = useState({ code: 'US', name: 'United States', flag: '🇺🇸', currency: 'USD' });
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('wallet');
  const [showKYCModal, setShowKYCModal] = useState(false);
  const [exchangeRate, setExchangeRate] = useState<ExchangeRate | null>(null);
  const [isLoadingRate, setIsLoadingRate] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check KYC status on mount - international transfers require KYC (bypassed in development mode)
  useEffect(() => {
    if (!DEV_CONFIG.BYPASS_KYC && user && user.kyc_status !== 'approved') {
      setShowKYCModal(true);
    }
  }, [user]);

  // Fetch exchange rate when country changes
  useEffect(() => {
    const fetchRate = async () => {
      setIsLoadingRate(true);
      try {
        const rate = await exchangeRateService.getExchangeRate('GHS', selectedCountry.currency);
        setExchangeRate(rate);
      } catch (error) {
        console.error('Failed to fetch exchange rate:', error);
      } finally {
        setIsLoadingRate(false);
      }
    };
    fetchRate();
  }, [selectedCountry.currency]);

  const countries = [
    { code: 'US', name: 'United States', flag: '🇺🇸', currency: 'USD' },
    { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', currency: 'GBP' },
    { code: 'EU', name: 'European Union', flag: '🇪🇺', currency: 'EUR' },
    { code: 'NG', name: 'Nigeria', flag: '🇳🇬', currency: 'NGN' },
    { code: 'KE', name: 'Kenya', flag: '🇰🇪', currency: 'KES' },
  ];

  const paymentMethods = [
    { id: 'wallet', name: 'SikaRemit Balance', icon: 'wallet' },
    { id: 'mtn_momo', name: 'MTN Mobile Money', icon: 'phone-portrait', color: '#FFCC00', logo: TelecomLogos.mtn },
    { id: 'telecel_cash', name: 'Telecel Cash', icon: 'phone-portrait', color: '#E60000', logo: TelecomLogos.telecel },
    { id: 'airteltigo_money', name: 'AirtelTigo Money', icon: 'phone-portrait', color: '#FF0000', logo: TelecomLogos.airteltigo },
  ];

  const quickAmounts = [50, 100, 200, 500, 1000, 2000];

  const handleContinue = async () => {
    // Check KYC before allowing remittance (bypassed in development mode)
    if (!DEV_CONFIG.BYPASS_KYC && user?.kyc_status !== 'approved') {
      setShowKYCModal(true);
      return;
    }

    // Validate inputs
    if (!sendAmount || parseFloat(sendAmount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }
    if (!recipientName.trim()) {
      Alert.alert('Error', 'Please enter recipient name');
      return;
    }
    if (!recipientPhone.trim()) {
      Alert.alert('Error', 'Please enter recipient phone number');
      return;
    }

    setIsSubmitting(true);
    try {
      // Calculate fee
      const amount = parseFloat(sendAmount);
      const fee = exchangeRateService.calculateRemittanceFee(amount, 'GHS', selectedCountry.currency);
      const rate = exchangeRate?.sellRate || exchangeRate?.rate || 1;

      // Call remittance API
      const response = await paymentService.sendRemittance({
        recipient_name: recipientName,
        recipient_phone: recipientPhone,
        recipient_country: selectedCountry.code,
        amount: amount,
        source_currency: 'GHS',
        target_currency: selectedCountry.currency,
        payment_method_id: selectedPaymentMethod,
      });

      // Navigate to confirmation screen
      navigation.navigate('RemittanceConfirm', {
        recipient: {
          name: recipientName,
          phone: recipientPhone,
          country: selectedCountry,
        },
        amount: {
          sendAmount: amount,
          sendCurrency: 'GHS',
          receiveAmount: (amount - fee) * rate,
          receiveCurrency: selectedCountry.currency,
          fee: fee,
          rate: rate,
        },
        transactionId: response.id,
      });
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to process remittance');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCountrySelect = (country: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedCountry(country);
  };

  const handleQuickAmount = (value: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSendAmount(value.toString());
  };

  const handlePaymentMethodSelect = (methodId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedPaymentMethod(methodId);
  };

  const calculateReceiveAmount = () => {
    if (!exchangeRate || !sendAmount) return 0;
    const amount = parseFloat(sendAmount);
    const fee = exchangeRateService.calculateRemittanceFee(amount, 'GHS', selectedCountry.currency);
    const rate = exchangeRate.sellRate || exchangeRate.rate || 1;
    return (amount - fee) * rate;
  };

  const calculateFee = () => {
    if (!sendAmount) return 0;
    const amount = parseFloat(sendAmount);
    return exchangeRateService.calculateRemittanceFee(amount, 'GHS', selectedCountry.currency);
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
            <Text style={[styles.title, { color: colors.text }]}>Send Remittance</Text>
            <View style={styles.placeholder} />
          </Animated.View>

          {/* Exchange Rate Card */}
          <Animated.View entering={FadeInUp.duration(800).delay(200)} style={styles.section}>
            <Card variant="default" padding="lg">
              <View style={styles.exchangeHeader}>
                <Text style={[styles.exchangeLabel, { color: colors.textSecondary }]}>
                  Exchange Rate
                </Text>
                <Text style={[styles.exchangeRate, { color: colors.primary }]}>
                  1 GHS = {exchangeRate?.sellRate || exchangeRate?.rate || 0} {selectedCountry.currency}
                </Text>
              </View>
              <View style={styles.exchangeDetails}>
                <Text style={[styles.exchangeNote, { color: colors.textMuted }]}>
                  {isLoadingRate ? 'Loading...' : 'Real-time rate'}
                </Text>
              </View>
            </Card>
          </Animated.View>

          {/* Amount Section */}
          <Animated.View entering={FadeInUp.duration(800).delay(400)} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Amount to Send</Text>
            <Card variant="default" padding="lg" style={styles.amountCard}>
              <View style={styles.amountInputContainer}>
                <Text style={[styles.currencySymbol, { color: colors.primary }]}>GHS</Text>
                <Input
                  placeholder="0.00"
                  value={sendAmount}
                  onChangeText={setSendAmount}
                  keyboardType="numeric"
                  variant="minimal"
                  size="lg"
                  style={styles.amountInput}
                  textAlign="right"
                />
              </View>
            </Card>

            {/* Quick Amounts */}
            <View style={styles.quickAmountsContainer}>
              <Text style={[styles.quickAmountsLabel, { color: colors.textSecondary }]}>
                Quick amounts
              </Text>
              <View style={styles.quickAmountsGrid}>
                {quickAmounts.map((value, index) => (
                  <Animated.View
                    key={value}
                    entering={FadeInUp.duration(400).delay(600 + index * 50)}
                  >
                    <TouchableOpacity
                      style={[
                        styles.quickAmountButton,
                        { 
                          backgroundColor: sendAmount === value.toString() 
                            ? colors.primary 
                            : colors.surface 
                        }
                      ]}
                      onPress={() => handleQuickAmount(value)}
                    >
                      <Text style={[
                        styles.quickAmountText,
                        { 
                          color: sendAmount === value.toString() 
                            ? '#FFFFFF' 
                            : colors.text 
                        }
                      ]}>
                        {value}
                      </Text>
                    </TouchableOpacity>
                  </Animated.View>
                ))}
              </View>
            </View>

            {/* Amount Summary */}
            {sendAmount && (
              <Animated.View entering={FadeInUp.duration(600)} style={styles.summaryCard}>
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                    Fee
                  </Text>
                  <Text style={[styles.summaryValue, { color: colors.text }]}>
                    GHS {calculateFee().toFixed(2)}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
                    Recipient receives
                  </Text>
                  <Text style={[styles.summaryValue, { color: colors.success }]}>
                    {selectedCountry.currency} {calculateReceiveAmount().toFixed(2)}
                  </Text>
                </View>
              </Animated.View>
            )}
          </Animated.View>

          {/* Country Selection */}
          <Animated.View entering={FadeInUp.duration(800).delay(600)} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Recipient Country</Text>
            <TouchableOpacity
              style={[styles.countrySelector, { backgroundColor: colors.surface }]}
            >
              <Text style={styles.countryFlag}>{selectedCountry.flag}</Text>
              <Text style={[styles.countryName, { color: colors.text }]}>
                {selectedCountry.name}
              </Text>
              <Ionicons name="chevron-down" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </Animated.View>

          {/* Recipient Details */}
          <Animated.View entering={FadeInUp.duration(800).delay(800)} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Recipient Details</Text>
            <Input
              placeholder="Recipient name"
              value={recipientName}
              onChangeText={setRecipientName}
              leftIcon={<Ionicons name="person" size={20} color={colors.textMuted} />}
              variant="glass"
              style={styles.input}
            />
            <Input
              placeholder="Phone number"
              value={recipientPhone}
              onChangeText={setRecipientPhone}
              keyboardType="phone-pad"
              leftIcon={<Ionicons name="phone-portrait" size={20} color={colors.textMuted} />}
              variant="glass"
              style={styles.input}
            />
          </Animated.View>

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
                    <Text style={[styles.paymentMethodName, { color: colors.text }]}>
                      {method.name}
                    </Text>
                  </TouchableOpacity>
                </Animated.View>
              ))}
            </View>
          </Animated.View>

          {/* Continue Button */}
          <Animated.View entering={FadeInUp.duration(800).delay(1200)} style={styles.section}>
            <Button
              title="Continue"
              onPress={handleContinue}
              loading={isSubmitting}
              disabled={!sendAmount || !recipientName || !recipientPhone || parseFloat(sendAmount) <= 0}
              gradient={true}
              fullWidth={true}
              size="lg"
            />
          </Animated.View>

          <View style={{ height: Spacing.xxxl }} />
        </ScrollView>

        {/* KYC Modal */}
        <KYCRequiredModal
          visible={showKYCModal}
          onClose={() => setShowKYCModal(false)}
          onVerifyNow={() => navigation.navigate('KYCVerification')}
        />
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
  exchangeHeader: {
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  exchangeLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium as any,
    marginBottom: Spacing.xs,
  },
  exchangeRate: {
    fontSize: FontSize.xxxl,
    fontWeight: FontWeight.bold as any,
  },
  exchangeDetails: {
    alignItems: 'center',
  },
  exchangeNote: {
    fontSize: FontSize.sm,
  },
  amountCard: {
    marginBottom: Spacing.lg,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currencySymbol: {
    fontSize: FontSize.xxxl,
    fontWeight: FontWeight.bold as any,
    marginRight: Spacing.sm,
  },
  amountInput: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  quickAmountsContainer: {
    marginTop: Spacing.lg,
  },
  quickAmountsLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium as any,
    marginBottom: Spacing.md,
  },
  quickAmountsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickAmountButton: {
    width: (width - Spacing.lg * 2 - Spacing.md * 5) / 6,
    height: ComponentSize.buttonHeight.sm,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  quickAmountText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold as any,
  },
  summaryCard: {
    marginTop: Spacing.lg,
    padding: Spacing.md,
    backgroundColor: '#10B98120',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: '#34D39930',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  summaryLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium as any,
  },
  summaryValue: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold as any,
  },
  countrySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...Shadow.card,
  },
  countryFlag: {
    fontSize: FontSize.xxxl,
    marginRight: Spacing.md,
  },
  countryName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold as any,
    flex: 1,
  },
  input: {
    marginBottom: Spacing.md,
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
  paymentMethodName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold as any,
    flex: 1,
  },
});

export default RemittanceScreen;
