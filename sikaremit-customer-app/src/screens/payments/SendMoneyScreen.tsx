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
import { Button, Input, Card, KYCRequiredModal } from '../../components/ui';
import { useTheme } from '../../context/ThemeContext';
import { useAuthStore } from '../../store/authStore';
import { useWalletStore } from '../../store/walletStore';
import { paymentService } from '../../services/paymentService';
import sikaremitWalletService from '../../services/sikaremitWalletService';
import { 
  BorderRadius, 
  FontSize, 
  FontWeight, 
  Spacing, 
  Shadow, 
  AnimationConfig, 
  ComponentSize 
} from '../../constants/theme';
import { DEV_CONFIG } from '../../constants/api';

const { width } = Dimensions.get('window');

const SendMoneyScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const { user } = useAuthStore();
  const { selectedWallet, wallets } = useWalletStore();

  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'wallet' | 'mobile_money' | 'bank_transfer'>('wallet');
  const [recipientType, setRecipientType] = useState<'sikaremit' | 'phone' | 'email'>('sikaremit');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [lookupResult, setLookupResult] = useState<{
    found: boolean;
    name?: string;
    message?: string;
  } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showKYCModal, setShowKYCModal] = useState(false);

  // Check KYC status on mount (bypassed in development mode)
  useEffect(() => {
    if (!DEV_CONFIG.BYPASS_KYC && user && user.kyc_status !== 'approved') {
      setShowKYCModal(true);
    }
  }, [user]);

  // SikaRemit user lookup with debounce
  useEffect(() => {
    if (recipientType !== 'sikaremit' || !recipient || recipient.length < 5) {
      setLookupResult(null);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsLookingUp(true);
      try {
        const result = await sikaremitWalletService.lookupUser(recipient);
        if (result.success && result.data) {
          setLookupResult({
            found: result.data.found,
            name: result.data.recipient?.name,
            message: result.data.message
          });
        } else {
          setLookupResult({ found: false, message: 'Failed to look up user' });
        }
      } catch (error) {
        setLookupResult({ found: false, message: 'Failed to look up user' });
      } finally {
        setIsLookingUp(false);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [recipient, recipientType]);

  const quickAmounts = [50, 100, 200, 500, 1000];

  const handleSendMoney = async () => {
    // Clear previous errors
    setErrors({});

    // Validate form
    const newErrors: Record<string, string> = {};
    
    if (!recipient.trim()) {
      newErrors.recipient = 'Please enter recipient details';
    } else if (recipientType === 'sikaremit') {
      // SikaRemit user validation
      if (!lookupResult?.found) {
        newErrors.recipient = 'Please enter a valid SikaRemit user';
      }
    } else if (recipientType === 'phone') {
      // Phone validation
      if (!/^0[0-9]{9}$/.test(recipient)) {
        newErrors.recipient = 'Please enter a valid phone number (10 digits starting with 0)';
      }
    } else if (recipientType === 'email') {
      // Email validation
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
        newErrors.recipient = 'Please enter a valid email address';
      }
    }
    
    if (!amount.trim()) {
      newErrors.amount = 'Please enter amount';
    } else if (parseFloat(amount) <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    } else if (parseFloat(amount) > 10000) {
      newErrors.amount = 'Maximum amount is GHS 10,000';
    }

    // Check wallet balance for wallet payment
    if (selectedPaymentMethod === 'wallet' && selectedWallet) {
      if (parseFloat(amount) > selectedWallet.balance) {
        newErrors.amount = 'Insufficient wallet balance';
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);
    try {
      let result;
      
      if (selectedPaymentMethod === 'wallet') {
        // Use SikaRemit wallet service
        const paymentData: any = {
          amount: parseFloat(amount),
          currency: selectedWallet?.currency || 'GHS',
          description: description || 'Money transfer',
        };

        // Add recipient details based on type
        if (recipientType === 'sikaremit') {
          paymentData.recipient_phone = recipient;
        } else if (recipientType === 'phone') {
          paymentData.recipient_phone = recipient;
        } else if (recipientType === 'email') {
          paymentData.recipient_email = recipient;
        }

        result = await sikaremitWalletService.payWithWallet(paymentData);
        
        if (result.success) {
          const recipientName = lookupResult?.name || recipient;
          Alert.alert(
            'Transfer Successful',
            result.message || `GHS ${amount} sent to ${recipientName} successfully.`,
            [{ text: 'OK', onPress: () => navigation.goBack() }]
          );
        } else {
          Alert.alert('Transfer Failed', result.message || 'Failed to send money');
        }
      } else {
        // Use existing payment service
        const paymentData: any = {
          amount: parseFloat(amount),
          currency: selectedWallet?.currency || 'GHS',
          description,
        };

        // Add recipient details based on type
        if (recipientType === 'sikaremit' || recipientType === 'phone') {
          paymentData.recipient_phone = recipient;
        } else if (recipientType === 'email') {
          paymentData.recipient_email = recipient;
        }

        await paymentService.sendMoney(paymentData);

        const recipientName = lookupResult?.name || recipient;
        Alert.alert(
          'Transfer Successful',
          `GHS ${amount} sent to ${recipientName} successfully.`,
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send money');
    } finally {
      setIsLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!recipient) newErrors.recipient = 'Recipient is required';
    if (!amount) newErrors.amount = 'Amount is required';
    else if (parseFloat(amount) <= 0) newErrors.amount = 'Amount must be greater than 0';
    else if (selectedWallet && parseFloat(amount) > selectedWallet.balance) {
      newErrors.amount = 'Insufficient balance';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSend = async (isRetry = false) => {
    // Check KYC before allowing send (bypassed in development mode)
    if (!DEV_CONFIG.BYPASS_KYC && user?.kyc_status !== 'approved') {
      setShowKYCModal(true);
      return;
    }

    if (!validateForm()) return;

    if (isRetry) {
      setRetryCount(prev => prev + 1);
    }

    setIsLoading(true);
    setError(null);

    try {
      await paymentService.sendMoney({
        recipient_phone: recipient,
        amount: parseFloat(amount),
        currency: selectedWallet?.currency || 'GHS',
        description,
      });

      Alert.alert('Success', 'Money sent successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
      setRetryCount(0); // Reset retry count on success

    } catch (error: any) {
      console.error('Error sending money:', error);

      let errorMessage = 'Failed to send money. Please try again.';

      // Handle specific error types
      if (error.code === 'NETWORK_ERROR' || !navigator.onLine) {
        errorMessage = 'Network connection error. Please check your internet connection.';
      } else if (error.response?.status === 401) {
        errorMessage = 'Authentication error. Please log in again.';
      } else if (error.response?.status === 403) {
        errorMessage = 'Insufficient permissions to perform this transaction.';
      } else if (error.response?.status === 400) {
        errorMessage = error.response?.data?.message || 'Invalid transaction details.';
      } else if (error.response?.status === 422) {
        errorMessage = error.response?.data?.message || 'Transaction validation failed.';
      } else if (error.response?.status >= 500) {
        errorMessage = 'Server error. Please try again later.';
      }

      setError(errorMessage);

      // Show retry option for recoverable errors
      if (retryCount < 3) {
        Alert.alert(
          'Transfer Failed',
          errorMessage,
          [
            { text: 'Retry', onPress: () => handleSend(true) },
            { text: 'Cancel', style: 'cancel' }
          ]
        );
      } else {
        Alert.alert('Transfer Failed', `${errorMessage}\n\nMaximum retry attempts reached.`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAmount = (value: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setAmount(value.toString());
  };

  const handleContactSelect = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // TODO: Navigate to contacts screen
    Alert.alert('Coming Soon', 'Contact selection will be available soon');
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
            <Text style={[styles.title, { color: colors.text }]}>Send Money</Text>
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
                  GHS {selectedWallet?.balance.toLocaleString() || '0.00'}
                </Text>
              </View>
              <View style={styles.balanceFooter}>
                <Text style={[styles.walletName, { color: colors.textMuted }]}>
                  {selectedWallet?.currency || 'GHS'}
                </Text>
              </View>
            </Card>
          </Animated.View>

          {/* Recipient Section */}
          <Animated.View entering={FadeInUp.duration(800).delay(400)} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Recipient Type</Text>
            
            {/* Recipient Type Selection */}
            <View style={styles.recipientTypeContainer}>
              <TouchableOpacity
                style={[
                  styles.recipientTypeButton,
                  recipientType === 'sikaremit' && { backgroundColor: colors.primary }
                ]}
                onPress={() => setRecipientType('sikaremit')}
              >
                <Ionicons 
                  name="wallet" 
                  size={20} 
                  color={recipientType === 'sikaremit' ? '#fff' : colors.textMuted} 
                />
                <Text style={[
                  styles.recipientTypeButtonText,
                  { color: recipientType === 'sikaremit' ? '#fff' : colors.text }
                ]}>
                  SikaRemit User
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.recipientTypeButton,
                  recipientType === 'phone' && { backgroundColor: colors.primary }
                ]}
                onPress={() => setRecipientType('phone')}
              >
                <Ionicons 
                  name="call" 
                  size={20} 
                  color={recipientType === 'phone' ? '#fff' : colors.textMuted} 
                />
                <Text style={[
                  styles.recipientTypeButtonText,
                  { color: recipientType === 'phone' ? '#fff' : colors.text }
                ]}>
                  Phone Number
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.recipientTypeButton,
                  recipientType === 'email' && { backgroundColor: colors.primary }
                ]}
                onPress={() => setRecipientType('email')}
              >
                <Ionicons 
                  name="mail" 
                  size={20} 
                  color={recipientType === 'email' ? '#fff' : colors.textMuted} 
                />
                <Text style={[
                  styles.recipientTypeButtonText,
                  { color: recipientType === 'email' ? '#fff' : colors.text }
                ]}>
                  Email
                </Text>
              </TouchableOpacity>
            </View>

            {/* Recipient Input */}
            <Input
              placeholder={
                recipientType === 'sikaremit' ? 'Enter phone number or email' :
                recipientType === 'phone' ? 'Enter phone number' :
                'Enter email address'
              }
              value={recipient}
              onChangeText={setRecipient}
              keyboardType={recipientType === 'email' ? 'email-address' : 'phone-pad'}
              leftIcon={
                <Ionicons 
                  name={
                    recipientType === 'sikaremit' ? 'wallet' :
                    recipientType === 'phone' ? 'call' :
                    'mail'
                  } 
                  size={20} 
                  color={colors.textMuted} 
                />
              }
              error={errors.recipient}
              variant="glass"
              rightIcon={
                isLookingUp && (
                  <Ionicons name="search" size={20} color={colors.textMuted} />
                )
              }
            />

            {/* Lookup Result */}
            {lookupResult && (
              <View style={[
                styles.lookupResultContainer,
                {
                  backgroundColor: lookupResult.found 
                    ? colors.success + '20' 
                    : colors.error + '20',
                  borderColor: lookupResult.found 
                    ? colors.success 
                    : colors.error
                }
              ]}>
                <Ionicons 
                  name={lookupResult.found ? 'checkmark-circle' : 'close-circle'} 
                  size={20} 
                  color={lookupResult.found ? colors.success : colors.error} 
                />
                <View style={styles.lookupResultContent}>
                  {lookupResult.found ? (
                    <>
                      <Text style={[styles.lookupResultName, { color: colors.success }]}>
                        {lookupResult.name}
                      </Text>
                      <Text style={[styles.lookupResultMessage, { color: colors.success }]}>
                        SikaRemit user found - Instant transfer
                      </Text>
                    </>
                  ) : (
                    <>
                      <Text style={[styles.lookupResultName, { color: colors.error }]}>
                        User not found
                      </Text>
                      <Text style={[styles.lookupResultMessage, { color: colors.error }]}>
                        {lookupResult.message || 'No SikaRemit account with this phone/email'}
                      </Text>
                    </>
                  )}
                </View>
              </View>
            )}

            {/* Benefits for SikaRemit users */}
            {lookupResult?.found && (
              <View style={[styles.benefitsContainer, { backgroundColor: colors.primary + '20' }]}>
                <Ionicons name="information-circle" size={16} color={colors.primary} />
                <Text style={[styles.benefitsText, { color: colors.primary }]}>
                  <Text style={{ fontWeight: '600' }}>Benefits:</Text> Zero fees • Instant transfer • No external processing
                </Text>
              </View>
            )}
          </Animated.View>

          {/* Amount Section */}
          <Animated.View entering={FadeInUp.duration(800).delay(600)} style={styles.section}>
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
              <View style={styles.quickAmountsRow}>
                {quickAmounts.map((value, index) => (
                  <Animated.View
                    key={value}
                    entering={FadeInUp.duration(400).delay(800 + index * 50)}
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

          {/* Description */}
          <Animated.View entering={FadeInUp.duration(800).delay(800)} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Description (Optional)
            </Text>
            <Input
              placeholder="Add a note..."
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
              leftIcon={<Ionicons name="document-text-outline" size={20} color={colors.textMuted} />}
              variant="default"
            />
          </Animated.View>

          {/* Send Button */}
          <Animated.View entering={FadeInUp.duration(800).delay(1000)} style={styles.section}>
            <Button
              title={`Send GHS ${amount || '0.00'}`}
              onPress={() => handleSend()}
              loading={isLoading}
              disabled={!recipient || !amount || parseFloat(amount) <= 0}
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
  balanceHeader: {
    marginBottom: Spacing.sm,
  },
  balanceLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium as any,
  },
  balanceAmount: {
    fontSize: FontSize.xxxl,
    fontWeight: FontWeight.bold as any,
  },
  balanceFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  walletName: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium as any,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: Spacing.md,
  },
  contactButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold as any,
    flex: 1,
    textAlign: 'center',
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
  quickAmountsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  quickAmountButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  quickAmountText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold as any,
  },
  recipientTypeContainer: {
    flexDirection: 'row',
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  recipientTypeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: Spacing.xs,
  },
  recipientTypeButtonText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold as any,
  },
  lookupResultContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  lookupResultContent: {
    flex: 1,
  },
  lookupResultName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold as any,
    marginBottom: Spacing.xs,
  },
  lookupResultMessage: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium as any,
  },
  benefitsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  benefitsText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium as any,
    flex: 1,
  },
});

export default SendMoneyScreen;
