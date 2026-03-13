import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
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
import { Card, Button, Input } from '../../components/ui';
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
import billPaymentService, { BillCategory, BillProvider } from '../../services/billPaymentService';
import sikaremitWalletService from '../../services/sikaremitWalletService';

const { width } = Dimensions.get('window');

const BillPaymentScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const { selectedWallet, wallets } = useWalletStore();

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<any | null>(null);
  const [accountNumber, setAccountNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'wallet' | 'mobile_money' | 'bank_transfer'>('wallet');
  const [isValidating, setIsValidating] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [validatedAccount, setValidatedAccount] = useState<any | null>(null);

  // Get categories and providers from service
  const billCategories = billPaymentService.getCategories();
  
  // Get providers for selected category from service
  const currentProviders = selectedCategory 
    ? billPaymentService.getProvidersByCategory(selectedCategory as BillCategory)
    : [];

  const handleSelectCategory = (categoryId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedCategory(categoryId);
    setSelectedProvider(null);
    setValidatedAccount(null);
    setAccountNumber('');
    setAmount('');
  };

  const handleSelectProvider = (provider: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedProvider(provider);
    setValidatedAccount(null);
    setAccountNumber('');
    setAmount('');
  };

  const handleValidateAccount = async () => {
    if (!accountNumber || !selectedProvider) {
      Alert.alert('Error', 'Please enter an account number');
      return;
    }

    setIsValidating(true);
    try {
      const result = await billPaymentService.validateAccount(
        selectedCategory as BillCategory,
        selectedProvider.id,
        accountNumber
      );

      if (result.valid) {
        setValidatedAccount(result);
        if ((result as any).amount) {
          setAmount((result as any).amount.toString());
        }
      } else {
        Alert.alert('Invalid Account', result.message || 'Could not validate account');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to validate account');
    } finally {
      setIsValidating(false);
    }
  };

  const handlePayBill = async () => {
    if (!validatedAccount || !amount || parseFloat(amount) <= 0) {
      Alert.alert('Error', 'Please validate account and enter amount');
      return;
    }

    // Check if wallet has sufficient balance for wallet payment
    if (selectedPaymentMethod === 'wallet' && selectedWallet) {
      if (parseFloat(amount) > selectedWallet.balance) {
        Alert.alert('Insufficient Balance', 'Your wallet balance is insufficient for this payment');
        return;
      }
    }

    setIsProcessing(true);
    try {
      let result;
      
      if (selectedPaymentMethod === 'wallet') {
        // Use SikaRemit wallet service
        result = await sikaremitWalletService.payBillWithWallet({
          bill_id: selectedProvider.id,
          amount: parseFloat(amount),
          wallet_id: selectedWallet?.id || '',
        });
      } else {
        // Use existing bill payment service
        result = await billPaymentService.payBill({
          providerId: selectedProvider.id,
          accountNumber,
          amount: parseFloat(amount),
          paymentMethod: selectedPaymentMethod as 'mobile_money' | 'bank_transfer',
        });
      }

      if (result.success) {
        Alert.alert(
          'Payment Successful',
          result.message || `Bill payment of GHS ${amount} completed successfully.`,
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert('Payment Failed', result.message || 'Failed to process payment');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to process payment');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleQuickAmount = (value: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setAmount(value.toString());
  };

  const getCategoryIcon = (categoryId: string) => {
    switch (categoryId) {
      case 'electricity': return 'flashlight';
      case 'water': return 'water';
      case 'internet': return 'wifi';
      case 'tv': return 'tv';
      case 'insurance': return 'shield-checkmark';
      default: return 'receipt';
    }
  };

  const getCategoryColor = (categoryId: string) => {
    switch (categoryId) {
      case 'electricity': return '#F59E0B';
      case 'water': return '#3B82F6';
      case 'internet': return '#8B5CF6';
      case 'tv': return '#EF4444';
      case 'insurance': return '#10B981';
      default: return '#6B7280';
    }
  };

  return (
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
          <Text style={[styles.title, { color: colors.text }]}>Pay Bills</Text>
          <View style={styles.placeholder} />
        </Animated.View>

        {/* Bill Categories */}
        <Animated.View entering={FadeInUp.duration(800).delay(200)} style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Select Category</Text>
          <View style={styles.categoriesGrid}>
            {billCategories.map((category, index) => (
              <Animated.View
                key={category.id}
                entering={FadeInUp.duration(600).delay(400 + index * 100)}
              >
                <TouchableOpacity
                  style={[
                    styles.categoryCard,
                    {
                      backgroundColor: selectedCategory === category.id 
                        ? getCategoryColor(category.id) + '15'
                        : colors.surface,
                      borderColor: selectedCategory === category.id 
                        ? getCategoryColor(category.id)
                        : colors.borderLight,
                    }
                  ]}
                  onPress={() => handleSelectCategory(category.id)}
                >
                  <View style={[
                    styles.categoryIcon,
                    { backgroundColor: getCategoryColor(category.id) + '20' }
                  ]}>
                    <Ionicons 
                      name={getCategoryIcon(category.id) as any} 
                      size={24} 
                      color={getCategoryColor(category.id)} 
                    />
                  </View>
                  <Text style={[styles.categoryName, { color: colors.text }]}>
                    {category.label}
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            ))}
          </View>
        </Animated.View>

        {/* Providers */}
        {selectedCategory && (
          <Animated.View entering={FadeInUp.duration(800).delay(400)} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Select Provider
            </Text>
            <View style={styles.providersGrid}>
              {currentProviders.map((provider, index) => (
                <Animated.View
                  key={provider.id}
                  entering={FadeInUp.duration(600).delay(600 + index * 100)}
                >
                  <TouchableOpacity
                    style={[
                      styles.providerCard,
                      {
                        backgroundColor: selectedProvider?.id === provider.id 
                          ? colors.primary + '15'
                          : colors.surface,
                        borderColor: selectedProvider?.id === provider.id 
                          ? colors.primary
                          : colors.borderLight,
                      }
                    ]}
                    onPress={() => handleSelectProvider(provider)}
                  >
                    <View style={styles.providerInfo}>
                      <Text style={[styles.providerName, { color: colors.text }]}>
                        {provider.name || provider.id}
                      </Text>
                      <Text style={[styles.providerDescription, { color: colors.textMuted }]}>
                        {provider.name || 'Service Provider'}
                      </Text>
                    </View>
                    <Ionicons 
                      name="chevron-forward" 
                      size={20} 
                      color={colors.textMuted} 
                    />
                  </TouchableOpacity>
                </Animated.View>
              ))}
            </View>
          </Animated.View>
        )}

        {/* Account Validation */}
        {selectedProvider && (
          <Animated.View entering={FadeInUp.duration(800).delay(600)} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Account Details
            </Text>
            <Input
              placeholder="Enter account number"
              value={accountNumber}
              onChangeText={setAccountNumber}
              keyboardType="numeric"
              leftIcon={<Ionicons name="card" size={20} color={colors.textMuted} />}
              variant="glass"
              style={styles.input}
            />
            <TouchableOpacity
              style={[styles.validateButton, { backgroundColor: colors.primary }]}
              onPress={handleValidateAccount}
              disabled={isValidating}
            >
              {isValidating ? (
                <Text style={styles.validateButtonText}>Validating...</Text>
              ) : (
                <Text style={styles.validateButtonText}>Validate Account</Text>
              )}
            </TouchableOpacity>

            {validatedAccount && (
              <Animated.View entering={FadeInRight.duration(400)} style={styles.validationResult}>
                <Card variant="default" padding="md" style={styles.validationCard}>
                  <View style={styles.validationHeader}>
                    <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                    <Text style={[styles.validationTitle, { color: colors.success }]}>
                      Account Validated
                    </Text>
                  </View>
                  <View style={styles.validationDetails}>
                    <Text style={[styles.validationText, { color: colors.text }]}>
                      Account: {validatedAccount.accountNumber}
                    </Text>
                    {validatedAccount.customerName && (
                      <Text style={[styles.validationText, { color: colors.textSecondary }]}>
                        Name: {validatedAccount.customerName}
                      </Text>
                    )}
                    {validatedAccount.address && (
                      <Text style={[styles.validationText, { color: colors.textSecondary }]}>
                        Address: {validatedAccount.address}
                      </Text>
                    )}
                  </View>
                </Card>
              </Animated.View>
            )}
          </Animated.View>
        )}

        {/* Amount Section */}
        {validatedAccount && (
          <Animated.View entering={FadeInUp.duration(800).delay(800)} style={styles.section}>
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
                {[20, 50, 100, 200, 500, 1000].map((value, index) => (
                  <Animated.View
                    key={value}
                    entering={FadeInUp.duration(400).delay(1000 + index * 50)}
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
        )}

        {/* Pay Button */}
        {validatedAccount && (
          <Animated.View entering={FadeInUp.duration(800).delay(1000)} style={styles.section}>
            <Button
              title={`Pay GHS ${amount || '0.00'}`}
              onPress={handlePayBill}
              loading={isProcessing}
              disabled={!amount || parseFloat(amount) <= 0}
              gradient={true}
              fullWidth={true}
              size="lg"
            />
          </Animated.View>
        )}

        <View style={{ height: Spacing.xxxl }} />
      </ScrollView>
    </View>
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
  categoriesGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  categoryCard: {
    flex: 1,
    alignItems: 'center',
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    ...Shadow.card,
  },
  categoryIcon: {
    width: ComponentSize.avatar.md,
    height: ComponentSize.avatar.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  categoryName: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold as any,
    textAlign: 'center',
  },
  providersGrid: {
    gap: Spacing.md,
  },
  providerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    ...Shadow.card,
  },
  providerInfo: {
    flex: 1,
  },
  providerName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold as any,
  },
  providerDescription: {
    fontSize: FontSize.sm,
    marginTop: 2,
  },
  input: {
    marginBottom: Spacing.md,
  },
  validateButton: {
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    ...Shadow.button,
  },
  validateButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold as any,
    color: '#FFFFFF',
  },
  validationResult: {
    marginTop: Spacing.md,
  },
  validationCard: {
    backgroundColor: '#10B98120',
    borderWidth: 1,
    borderColor: '#34D39930',
  },
  validationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  validationTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold as any,
  },
  validationDetails: {
    gap: Spacing.xs,
  },
  validationText: {
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
});

export default BillPaymentScreen;
