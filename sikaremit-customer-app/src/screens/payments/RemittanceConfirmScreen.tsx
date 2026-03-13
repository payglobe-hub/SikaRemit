import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
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
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { Button, Card } from '../../components/ui';
import { useTheme } from '../../context/ThemeContext';
import { 
  BorderRadius, 
  FontSize, 
  FontWeight, 
  Spacing, 
  Shadow, 
  AnimationConfig, 
  ComponentSize 
} from '../../constants/theme';
import { paymentService } from '../../services/paymentService';
import exchangeRateService from '../../services/exchangeRateService';

const { width } = Dimensions.get('window');

interface RemittanceConfirmParams {
  sendAmount: number;
  receiveAmount: number;
  fee: number;
  exchangeRate: number;
  sourceCurrency: string;
  targetCurrency: string;
  recipientName: string;
  recipientPhone: string;
  recipientCountry: string;
  countryFlag: string;
  paymentMethod: string;
}

type RemittanceConfirmRouteProp = RouteProp<{ RemittanceConfirm: RemittanceConfirmParams }, 'RemittanceConfirm'>;

const RemittanceConfirmScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<RemittanceConfirmRouteProp>();
  const { colors } = useTheme();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [transactionId, setTransactionId] = useState<string | null>(null);

  const {
    sendAmount,
    receiveAmount,
    fee,
    exchangeRate,
    sourceCurrency,
    targetCurrency,
    recipientName,
    recipientPhone,
    recipientCountry,
    countryFlag,
    paymentMethod,
  } = route.params;

  const totalAmount = sendAmount + fee;

  const handleConfirm = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsSubmitting(true);
    try {
      const response = await paymentService.sendRemittance({
        recipient_name: recipientName,
        recipient_phone: recipientPhone,
        recipient_country: recipientCountry,
        amount: sendAmount,
        source_currency: sourceCurrency,
        target_currency: targetCurrency,
        exchange_rate: exchangeRate,
        fee: fee,
        payment_method_id: paymentMethod,
      });

      setTransactionId(response.id);
      setShowSuccess(true);
    } catch (error: any) {
      Alert.alert(
        'Transfer Failed',
        error.response?.data?.message || 'Failed to process your transfer. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDone = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate('Home', { screen: 'Dashboard' });
  };

  const handleViewReceipt = () => {
    if (transactionId) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      navigation.navigate('TransactionReceipt', { transactionId });
    }
  };

  const handleCancel = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.goBack();
  };

  if (showSuccess) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <LinearGradient
          colors={colors.gradient.success}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          <View style={[styles.content, { paddingTop: insets.top + Spacing.xxxl }]}>
            <Animated.View entering={FadeInUp.duration(1000)} style={styles.successContainer}>
              <View style={[
                styles.successIconContainer,
                { backgroundColor: 'rgba(255, 255, 255, 0.2)' }
              ]}>
                <Ionicons name="checkmark-circle" size={64} color="#FFFFFF" />
              </View>
              <Text style={styles.successTitle}>Transfer Successful!</Text>
              <Text style={styles.successText}>
                Your money has been sent to {recipientName}
              </Text>
              
              <View style={styles.transactionDetails}>
                <Text style={styles.transactionId}>Transaction ID: {transactionId}</Text>
                <Text style={styles.transactionTime}>Sent at {new Date().toLocaleTimeString()}</Text>
              </View>

              <View style={styles.successActions}>
                <Button
                  title="View Receipt"
                  onPress={handleViewReceipt}
                  variant="outline"
                  fullWidth={true}
                  size="lg"
                  style={styles.receiptButton}
                />
                <Button
                  title="Done"
                  onPress={handleDone}
                  gradient={true}
                  fullWidth={true}
                  size="lg"
                  style={styles.doneButton}
                />
              </View>
            </Animated.View>
          </View>
        </LinearGradient>
      </View>
    );
  }

  const renderRecipientInfo = () => (
    <Animated.View entering={FadeInUp.duration(800).delay(200)} style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Recipient Information</Text>
      <Card variant="default" padding="lg" style={styles.recipientCard}>
        <View style={styles.recipientHeader}>
          <View style={styles.countryFlag}>
            <Text style={styles.flagText}>{countryFlag}</Text>
          </View>
          <View style={styles.recipientDetails}>
            <Text style={[styles.recipientName, { color: colors.text }]}>
              {recipientName}
            </Text>
            <Text style={[styles.recipientPhone, { color: colors.textSecondary }]}>
              {recipientPhone}
            </Text>
            <Text style={[styles.recipientCountry, { color: colors.textMuted }]}>
              {recipientCountry}
            </Text>
          </View>
        </View>
      </Card>
    </Animated.View>
  );

  const renderTransactionDetails = () => (
    <Animated.View entering={FadeInUp.duration(800).delay(400)} style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Transaction Details</Text>
      <Card variant="default" padding="lg" style={styles.transactionCard}>
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>You Send</Text>
          <Text style={[styles.detailValue, { color: colors.text }]}>
            {sourceCurrency} {sendAmount.toFixed(2)}
          </Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Exchange Rate</Text>
          <Text style={[styles.detailValue, { color: colors.text }]}>
            1 {sourceCurrency} = {exchangeRate} {targetCurrency}
          </Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>They Receive</Text>
          <Text style={[styles.detailValue, { color: colors.success }]}>
            {targetCurrency} {receiveAmount.toFixed(2)}
          </Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Transfer Fee</Text>
          <Text style={[styles.detailValue, { color: colors.warning }]}>
            {sourceCurrency} {fee.toFixed(2)}
          </Text>
        </View>
        
        <View style={[styles.divider, { borderBottomColor: colors.borderLight }]} />
        
        <View style={styles.detailRow}>
          <Text style={[styles.totalLabel, { color: colors.text }]}>Total Amount</Text>
          <Text style={[styles.totalValue, { color: colors.primary }]}>
            {sourceCurrency} {totalAmount.toFixed(2)}
          </Text>
        </View>
      </Card>
    </Animated.View>
  );

  const renderPaymentMethod = () => (
    <Animated.View entering={FadeInUp.duration(800).delay(600)} style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Payment Method</Text>
      <Card variant="default" padding="lg" style={styles.paymentCard}>
        <View style={styles.paymentMethodRow}>
          <View style={[
            styles.paymentIcon,
            { backgroundColor: colors.primary + '20' }
          ]}>
            <Ionicons name="card" size={24} color={colors.primary} />
          </View>
          <View style={styles.paymentContent}>
            <Text style={[styles.paymentTitle, { color: colors.text }]}>
              {paymentMethod}
            </Text>
            <Text style={[styles.paymentDescription, { color: colors.textSecondary }]}>
              Funds will be deducted from this payment method
            </Text>
          </View>
        </View>
      </Card>
    </Animated.View>
  );

  const renderSecurityNotice = () => (
    <Animated.View entering={FadeInUp.duration(800).delay(800)} style={styles.section}>
      <Card variant="gradient" padding="lg" style={styles.securityCard}>
        <View style={styles.securityHeader}>
          <View style={[
            styles.securityIcon,
            { backgroundColor: 'rgba(255, 255, 255, 0.2)' }
          ]}>
            <Ionicons name="shield-checkmark" size={24} color="#FFFFFF" />
          </View>
          <View style={styles.securityContent}>
            <Text style={styles.securityTitle}>Secure Transfer</Text>
            <Text style={styles.securityText}>
              Your transfer is protected with bank-level security
            </Text>
          </View>
        </View>
      </Card>
    </Animated.View>
  );

  const renderActions = () => (
    <Animated.View entering={FadeInUp.duration(800).delay(1000)} style={styles.actionsSection}>
      <View style={styles.actionsContainer}>
        <Button
          title="Cancel"
          onPress={handleCancel}
          variant="outline"
          fullWidth={true}
          size="lg"
          style={styles.cancelButton}
        />
        <Button
          title="Confirm Transfer"
          onPress={handleConfirm}
          loading={isSubmitting}
          gradient={true}
          fullWidth={true}
          size="lg"
          style={styles.confirmButton}
        />
      </View>
    </Animated.View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <Animated.View entering={FadeInDown.duration(600)} style={styles.header}>
        <View style={[styles.headerContent, { paddingTop: insets.top + Spacing.lg }]}>
          <TouchableOpacity style={styles.backButton} onPress={handleCancel}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>Confirm Transfer</Text>
          <View style={styles.placeholder} />
        </View>
      </Animated.View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Recipient Information */}
        {renderRecipientInfo()}

        {/* Transaction Details */}
        {renderTransactionDetails()}

        {/* Payment Method */}
        {renderPaymentMethod()}

        {/* Security Notice */}
        {renderSecurityNotice()}

        {/* Actions */}
        {renderActions()}

        <View style={{ height: Spacing.xxxl }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  header: {
    marginBottom: Spacing.lg,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
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
  content: {
    paddingBottom: Spacing.xxl,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold as any,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  recipientCard: {
    ...Shadow.card,
    marginHorizontal: Spacing.lg,
  },
  recipientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  countryFlag: {
    width: ComponentSize.avatar.xl,
    height: ComponentSize.avatar.xl,
    borderRadius: BorderRadius.full,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  flagText: {
    fontSize: FontSize.xxl,
  },
  recipientDetails: {
    flex: 1,
  },
  recipientName: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold as any,
    marginBottom: Spacing.xs,
  },
  recipientPhone: {
    fontSize: FontSize.md,
    marginBottom: Spacing.xs,
  },
  recipientCountry: {
    fontSize: FontSize.sm,
  },
  transactionCard: {
    ...Shadow.card,
    marginHorizontal: Spacing.lg,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  detailLabel: {
    fontSize: FontSize.md,
  },
  detailValue: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold as any,
  },
  divider: {
    borderBottomWidth: 1,
    marginVertical: Spacing.md,
  },
  totalLabel: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold as any,
  },
  totalValue: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold as any,
  },
  paymentCard: {
    ...Shadow.card,
    marginHorizontal: Spacing.lg,
  },
  paymentMethodRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentIcon: {
    width: ComponentSize.avatar.lg,
    height: ComponentSize.avatar.lg,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  paymentContent: {
    flex: 1,
  },
  paymentTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold as any,
    marginBottom: Spacing.xs,
  },
  paymentDescription: {
    fontSize: FontSize.sm,
  },
  securityCard: {
    ...Shadow.card,
    marginHorizontal: Spacing.lg,
  },
  securityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  securityIcon: {
    width: ComponentSize.avatar.lg,
    height: ComponentSize.avatar.lg,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  securityContent: {
    flex: 1,
  },
  securityTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold as any,
    color: '#FFFFFF',
    marginBottom: Spacing.xs,
  },
  securityText: {
    fontSize: FontSize.sm,
    color: 'rgba(255,255,255,0.9)',
  },
  actionsSection: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  actionsContainer: {
    gap: Spacing.md,
  },
  cancelButton: {
    marginBottom: Spacing.sm,
  },
  confirmButton: {
    marginBottom: Spacing.sm,
  },
  successContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  successIconContainer: {
    width: ComponentSize.avatar.xxl,
    height: ComponentSize.avatar.xxl,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  successTitle: {
    fontSize: FontSize.display,
    fontWeight: FontWeight.black as any,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  successText: {
    fontSize: FontSize.lg,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  transactionDetails: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.xl,
    alignItems: 'center',
  },
  transactionId: {
    fontSize: FontSize.sm,
    color: '#FFFFFF',
    marginBottom: Spacing.xs,
  },
  transactionTime: {
    fontSize: FontSize.xs,
    color: 'rgba(255,255,255,0.8)',
  },
  successActions: {
    gap: Spacing.md,
    width: '100%',
  },
  receiptButton: {
    marginBottom: Spacing.sm,
  },
  doneButton: {
    marginBottom: Spacing.sm,
  },
});

export default RemittanceConfirmScreen;
