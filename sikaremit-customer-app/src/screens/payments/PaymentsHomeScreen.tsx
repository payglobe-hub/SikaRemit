import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
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
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { Card } from '../../components/ui';
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

const { width } = Dimensions.get('window');

const PaymentsHomeScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { colors } = useTheme();

  const paymentOptions = [
    {
      id: 'deposit',
      title: 'Deposit',
      description: 'Top up your wallet',
      icon: 'add-circle',
      color: colors.success,
      screen: 'Deposit',
      gradient: colors.gradient.success,
    },
    {
      id: 'send',
      title: 'Send Locally',
      description: 'Domestic transfer to friends and family',
      icon: 'send',
      color: colors.primary,
      screen: 'SendMoney',
      gradient: colors.gradient.primary,
    },
    {
      id: 'request',
      title: 'Request Money',
      description: 'Request payment from others',
      icon: 'download',
      color: colors.accent,
      screen: 'RequestMoney',
      gradient: colors.gradient.primary,
    },
    {
      id: 'bills',
      title: 'Pay Bills',
      description: 'Utilities, subscriptions, and more',
      icon: 'receipt',
      color: colors.warning,
      screen: 'BillPayment',
      gradient: colors.gradient.warning,
    },
    // Temporarily hidden - no permission for international transfers
    // {
    //   id: 'remittance',
    //   title: 'International Transfer',
    //   description: 'Send money across borders',
    //   icon: 'globe',
    //   color: colors.secondary,
    //   screen: 'Remittance',
    //   gradient: colors.gradient.secondary,
    // },
    {
      id: 'airtime',
      title: 'Buy Airtime',
      description: 'Recharge mobile airtime',
      icon: 'phone-portrait',
      color: '#F59E0B',
      screen: 'Airtime',
      gradient: ['#F59E0B', '#F97316'],
    },
    {
      id: 'data',
      title: 'Data Bundle',
      description: 'Buy internet data packages',
      icon: 'cellular',
      color: '#06B6D4',
      screen: 'DataBundle',
      gradient: ['#06B6D4', '#3B82F6'],
    },
    {
      id: 'qr',
      title: 'QR Payment',
      description: 'Scan to pay merchants',
      icon: 'qr-code',
      color: '#8B5CF6',
      screen: 'QRScanner',
      gradient: ['#8B5CF6', '#6366F1'],
    },
  ];

  const mobileMoneyProviders = [
    { id: 'mtn', name: 'MTN MoMo', color: '#FFCC00' },
    { id: 'telecel', name: 'Telecel Cash', color: '#E60000' },
    { id: 'airteltigo', name: 'AirtelTigo', color: '#FF0000' },
  ];

  const recentTransactions = [
    {
      id: '1',
      type: 'deposit',
      amount: 500,
      recipient: 'John Doe',
      date: '2 hours ago',
      icon: 'arrow-down-circle',
      color: colors.success,
    },
    {
      id: '2',
      type: 'send',
      amount: 200,
      recipient: 'Jane Smith',
      date: '5 hours ago',
      icon: 'arrow-up-circle',
      color: colors.primary,
    },
    {
      id: '3',
      type: 'bill',
      amount: 150,
      recipient: 'Electricity Company',
      date: '1 day ago',
      icon: 'receipt',
      color: colors.warning,
    },
  ];

  const handlePaymentPress = (option: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate(option.screen as any);
  };

  const renderPaymentOption = (option: any, index: number) => (
    <Animated.View
      key={option.id}
      entering={FadeInUp.duration(400).delay(index * 100)}
      style={styles.paymentOption}
    >
      <TouchableOpacity
        style={styles.paymentTouchable}
        onPress={() => handlePaymentPress(option)}
        activeOpacity={0.8}
      >
        <Card variant="gradient" padding="lg" style={styles.paymentCard}>
          <LinearGradient
            colors={option.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.paymentGradient}
          >
            <View style={styles.paymentHeader}>
              <View style={[
                styles.paymentIcon,
                { backgroundColor: 'rgba(255, 255, 255, 0.2)' }
              ]}>
                <Ionicons name={option.icon as any} size={28} color="#FFFFFF" />
              </View>
              <View style={styles.paymentContent}>
                <Text style={styles.paymentTitle}>{option.title}</Text>
                <Text style={styles.paymentDescription}>{option.description}</Text>
              </View>
              <View style={styles.paymentArrow}>
                <Ionicons name="chevron-forward" size={20} color="rgba(255, 255, 255, 0.8)" />
              </View>
            </View>
          </LinearGradient>
        </Card>
      </TouchableOpacity>
    </Animated.View>
  );

  const renderMobileMoneySection = () => (
    <Animated.View entering={FadeInUp.duration(800).delay(600)} style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Mobile Money</Text>
      <View style={styles.mobileMoneyContainer}>
        {mobileMoneyProviders.map((provider, index) => (
          <Animated.View
            key={provider.id}
            entering={FadeInRight.duration(400).delay(index * 100)}
            style={styles.providerItem}
          >
            <TouchableOpacity
              style={[
                styles.providerTouchable,
                { backgroundColor: provider.color + '20' }
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                // Navigate to mobile money provider selection
              }}
              activeOpacity={0.8}
            >
              <View style={[
                styles.providerIcon,
                { backgroundColor: provider.color }
              ]}>
                <Text style={styles.providerInitial}>
                  {provider.name.charAt(0)}
                </Text>
              </View>
              <Text style={[styles.providerName, { color: colors.text }]}>
                {provider.name}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        ))}
      </View>
    </Animated.View>
  );

  const renderRecentTransactions = () => (
    <Animated.View entering={FadeInUp.duration(800).delay(800)} style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Activity</Text>
      <Card variant="default" padding="lg" style={styles.recentCard}>
        {recentTransactions.map((transaction, index) => (
          <View key={transaction.id} style={styles.transactionItem}>
            <View style={[
              styles.transactionIcon,
              { backgroundColor: transaction.color + '20' }
            ]}>
              <Ionicons name={transaction.icon as any} size={20} color={transaction.color} />
            </View>
            <View style={styles.transactionContent}>
              <Text style={[styles.transactionTitle, { color: colors.text }]}>
                {transaction.type === 'deposit' ? 'Received' : 'Sent'} GHS {transaction.amount}
              </Text>
              <Text style={[styles.transactionRecipient, { color: colors.textSecondary }]}>
                {transaction.recipient}
              </Text>
              <Text style={[styles.transactionDate, { color: colors.textMuted }]}>
                {transaction.date}
              </Text>
            </View>
          </View>
        ))}
      </Card>
    </Animated.View>
  );

  const renderQuickActions = () => (
    <Animated.View entering={FadeInUp.duration(800).delay(1000)} style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Actions</Text>
      <View style={styles.quickActionsContainer}>
        <TouchableOpacity
          style={[
            styles.quickAction,
            { backgroundColor: colors.primary + '15' }
          ]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            navigation.navigate('SendMoney');
          }}
        >
          <Ionicons name="send" size={24} color={colors.primary} />
          <Text style={[styles.quickActionText, { color: colors.primary }]}>
            Quick Send
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.quickAction,
            { backgroundColor: colors.success + '15' }
          ]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            navigation.navigate('Deposit');
          }}
        >
          <Ionicons name="add-circle" size={24} color={colors.success} />
          <Text style={[styles.quickActionText, { color: colors.success }]}>
            Quick Deposit
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.quickAction,
            { backgroundColor: colors.accent + '15' }
          ]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            navigation.navigate('Airtime');
          }}
        >
          <Ionicons name="phone-portrait" size={24} color={colors.accent} />
          <Text style={[styles.quickActionText, { color: colors.accent }]}>
            Buy Airtime
          </Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <Animated.View entering={FadeInDown.duration(600)} style={styles.header}>
        <View style={[styles.headerContent, { paddingTop: insets.top + Spacing.lg }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>Payments</Text>
          <View style={styles.placeholder} />
        </View>
      </Animated.View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Payment Options */}
        <Animated.View entering={FadeInUp.duration(800).delay(200)} style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Payment Options</Text>
          <View style={styles.paymentGrid}>
            {paymentOptions.map((option, index) => renderPaymentOption(option, index))}
          </View>
        </Animated.View>

        {/* Mobile Money Section */}
        {renderMobileMoneySection()}

        {/* Recent Transactions */}
        {renderRecentTransactions()}

        {/* Quick Actions */}
        {renderQuickActions()}

        <View style={{ height: Spacing.xxxl }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
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
  paymentGrid: {
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  paymentOption: {
    marginBottom: Spacing.md,
  },
  paymentTouchable: {
    borderRadius: BorderRadius.lg,
  },
  paymentCard: {
    ...Shadow.card,
  },
  paymentGradient: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  paymentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
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
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold as any,
    color: '#FFFFFF',
    marginBottom: Spacing.xs,
  },
  paymentDescription: {
    fontSize: FontSize.sm,
    color: 'rgba(255,255,255,0.9)',
  },
  paymentArrow: {
    alignItems: 'center',
  },
  mobileMoneyContainer: {
    flexDirection: 'row',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  providerItem: {
    flex: 1,
  },
  providerTouchable: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  providerIcon: {
    width: ComponentSize.avatar.lg,
    height: ComponentSize.avatar.lg,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  providerInitial: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold as any,
    color: '#FFFFFF',
  },
  providerName: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold as any,
  },
  recentCard: {
    ...Shadow.card,
    marginHorizontal: Spacing.lg,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  transactionIcon: {
    width: ComponentSize.avatar.md,
    height: ComponentSize.avatar.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  transactionContent: {
    flex: 1,
  },
  transactionTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold as any,
    marginBottom: Spacing.xs,
  },
  transactionRecipient: {
    fontSize: FontSize.sm,
    marginBottom: Spacing.xs,
  },
  transactionDate: {
    fontSize: FontSize.xs,
  },
  quickActionsContainer: {
    flexDirection: 'row',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  quickAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
  },
  quickActionText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold as any,
    marginLeft: Spacing.sm,
  },
});

export default PaymentsHomeScreen;
