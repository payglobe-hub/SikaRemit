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
  ImageSourcePropType,
  Linking,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { 
  FadeInDown, 
  FadeInUp, 
  FadeInRight,
  useSharedValue, 
  useAnimatedStyle, 
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Button, Input, Card } from '../../components/ui';
import { useTheme } from '../../context/ThemeContext';
import { useWalletStore } from '../../store/walletStore';
import { useAuthStore } from '../../store/authStore';
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
import paymentGateway from '../../services/paymentGateway';
import mobileMoneyService, { detectNetwork } from '../../services/mobileMoneyService';

const { width } = Dimensions.get('window');

interface DepositMethod {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  type: 'mobile_money' | 'bank';
  logo?: ImageSourcePropType;
}

const DepositScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { selectedWallet } = useWalletStore();

  const [amount, setAmount] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<DepositMethod | null>(null);
  const [mobileMoneyNumber, setMobileMoneyNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const depositMethods: DepositMethod[] = [
    {
      id: 'mtn',
      name: 'MTN Mobile Money',
      description: 'Fast & reliable',
      icon: 'phone-portrait',
      color: '#FFCC00',
      type: 'mobile_money',
      logo: TelecomLogos.mtn,
    },
    {
      id: 'telecel',
      name: 'Telecel Cash',
      description: 'Quick deposits',
      icon: 'phone-portrait',
      color: '#E60000',
      type: 'mobile_money',
      logo: TelecomLogos.telecel,
    },
    {
      id: 'airteltigo',
      name: 'AirtelTigo Money',
      description: 'Instant transfer',
      icon: 'phone-portrait',
      color: '#FF0000',
      type: 'mobile_money',
      logo: TelecomLogos.airteltigo,
    },
    {
      id: 'bank',
      name: 'Bank Transfer',
      description: 'Secure transfer',
      icon: 'business',
      color: '#3B82F6',
      type: 'bank',
    },
  ];

  const quickAmounts = [50, 100, 200, 500, 1000, 2000];
  const { user } = useAuthStore();
  const [paymentReference, setPaymentReference] = useState<string | null>(null);

  // Auto-detect network from phone number
  useEffect(() => {
    if (mobileMoneyNumber.length >= 3) {
      const detected = detectNetwork(mobileMoneyNumber);
      if (detected && selectedMethod?.type === 'mobile_money') {
        const matchingMethod = depositMethods.find(m => m.id === detected);
        if (matchingMethod) {
          setSelectedMethod(matchingMethod);
        }
      }
    }
  }, [mobileMoneyNumber]);

  const handleDeposit = async () => {
    if (!selectedMethod) {
      Alert.alert('Error', 'Please select a deposit method');
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }
    if (selectedMethod.type === 'mobile_money' && (!mobileMoneyNumber || mobileMoneyNumber.length < 10)) {
      Alert.alert('Error', 'Please enter a valid mobile money number');
      return;
    }

    const depositAmount = parseFloat(amount);
    const userEmail = user?.email || '';

    setIsLoading(true);
    try {
      if (selectedMethod.type === 'mobile_money') {
        const network = selectedMethod.id as 'mtn' | 'telecel' | 'airteltigo' | 'G-Money';
        const response = await paymentGateway.initializeMobileMoneyPayment(
          userEmail,
          depositAmount,
          mobileMoneyNumber,
          network
        );

        if (response.success) {
          setPaymentReference(response.reference);
          Alert.alert(
            'Deposit Initiated',
            response.message || `A prompt has been sent to ${mobileMoneyNumber}. Please approve the transaction on your phone to complete the deposit of GHS ${amount}.`,
            [
              { text: 'Check Status', onPress: () => checkPaymentStatus(response.reference) },
              { text: 'OK', onPress: () => navigation.goBack() },
            ]
          );
        } else {
          Alert.alert('Error', response.message || 'Failed to initiate deposit');
        }
      } else if (selectedMethod.type === 'bank') {
        const response = await paymentGateway.initializeBankTransfer(
          userEmail,
          depositAmount
        );

        if (response.success && response.bankDetails) {
          Alert.alert(
            'Bank Transfer Details',
            `Transfer GHS ${amount} to:\n\nBank: ${response.bankDetails.bankName}\nAccount: ${response.bankDetails.accountNumber}\nName: ${response.bankDetails.accountName}\nReference: ${response.bankDetails.reference}\n\nYour account will be credited once we confirm the transfer.`,
            [{ text: 'OK', onPress: () => navigation.goBack() }]
          );
        } else {
          Alert.alert('Error', response.message || 'Failed to get bank transfer details. Please try again.');
        }
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to process deposit. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const checkPaymentStatus = async (reference: string) => {
    try {
      const result = await paymentGateway.verifyPayment(reference);
      if (result.success) {
        Alert.alert(
          'Payment Successful',
          `GHS ${result.amount} has been deposited to your wallet!`,
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else if (result.status === 'pending') {
        Alert.alert(
          'Payment Pending',
          'Your payment is still being processed. Please check again in a moment.',
          [
            { text: 'Check Again', onPress: () => checkPaymentStatus(reference) },
            { text: 'OK' },
          ]
        );
      } else {
        Alert.alert('Payment Failed', result.message || 'The payment was not successful.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to check payment status');
    }
  };

  const handleMethodSelect = (method: DepositMethod) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedMethod(method);
  };

  const handleQuickAmount = (value: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setAmount(value.toString());
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
            <Text style={[styles.title, { color: colors.text }]}>Deposit Funds</Text>
            <View style={styles.placeholder} />
          </Animated.View>

          {/* Amount Section */}
          <Animated.View entering={FadeInUp.duration(800).delay(200)} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Amount</Text>
            <Card variant="default" padding="lg" style={styles.amountCard}>
              <View style={styles.amountInputContainer}>
                <Text style={[styles.currencySymbol, { color: colors.primary }]}>GHS</Text>
                <Input
                  placeholder="0.00"
                  value={amount}
                  onChangeText={setAmount}
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
                    entering={FadeInUp.duration(400).delay(400 + index * 50)}
                  >
                    <TouchableOpacity
                      style={[
                        styles.quickAmountButton,
                        { 
                          backgroundColor: amount === value.toString() 
                            ? colors.primary 
                            : colors.surface 
                        }
                      ]}
                      onPress={() => handleQuickAmount(value)}
                    >
                      <Text style={[
                        styles.quickAmountText,
                        { 
                          color: amount === value.toString() 
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
          </Animated.View>

          {/* Payment Methods */}
          <Animated.View entering={FadeInUp.duration(800).delay(400)} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Payment Method</Text>
            <View style={styles.methodsGrid}>
              {depositMethods.map((method, index) => (
                <Animated.View
                  key={method.id}
                  entering={FadeInUp.duration(600).delay(600 + index * 100)}
                >
                  <TouchableOpacity
                    style={[
                      styles.methodCard,
                      {
                        backgroundColor: selectedMethod?.id === method.id 
                          ? colors.primary + '15'
                          : colors.surface,
                        borderColor: selectedMethod?.id === method.id 
                          ? colors.primary
                          : colors.borderLight,
                      }
                    ]}
                    onPress={() => handleMethodSelect(method)}
                  >
                    <View style={[
                      styles.methodIcon,
                      { backgroundColor: method.color + '20' }
                    ]}>
                      {method.logo ? (
                        <Image source={method.logo} style={styles.methodLogo} />
                      ) : (
                        <Ionicons name={method.icon as any} size={24} color={method.color} />
                      )}
                    </View>
                    <View style={styles.methodInfo}>
                      <Text style={[styles.methodName, { color: colors.text }]}>
                        {method.name}
                      </Text>
                      <Text style={[styles.methodDescription, { color: colors.textMuted }]}>
                        {method.description}
                      </Text>
                    </View>
                  </TouchableOpacity>
                </Animated.View>
              ))}
            </View>
          </Animated.View>

          {/* Mobile Money Number Input */}
          {selectedMethod?.type === 'mobile_money' && (
            <Animated.View entering={FadeInUp.duration(600).delay(800)} style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Mobile Money Number
              </Text>
              <Input
                placeholder="Enter phone number"
                value={mobileMoneyNumber}
                onChangeText={setMobileMoneyNumber}
                keyboardType="phone-pad"
                leftIcon={<Ionicons name="phone-portrait" size={20} color={colors.textMuted} />}
                variant="default"
              />
            </Animated.View>
          )}

          {/* Deposit Button */}
          <Animated.View entering={FadeInUp.duration(800).delay(1000)} style={styles.section}>
            <Button
              title={`Deposit GHS ${amount || '0.00'}`}
              onPress={handleDeposit}
              loading={isLoading}
              disabled={!selectedMethod || !amount || parseFloat(amount) <= 0}
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
  methodsGrid: {
    gap: Spacing.md,
  },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    ...Shadow.card,
  },
  methodIcon: {
    width: ComponentSize.avatar.md,
    height: ComponentSize.avatar.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  methodLogo: {
    width: 32,
    height: 32,
    resizeMode: 'contain',
  },
  methodInfo: {
    flex: 1,
  },
  methodName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold as any,
  },
  methodDescription: {
    fontSize: FontSize.sm,
    marginTop: 2,
  },
});

export default DepositScreen;
