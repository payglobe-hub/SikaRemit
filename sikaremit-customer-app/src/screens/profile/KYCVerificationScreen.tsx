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
import { Button, Card } from '../../components/ui';
import { useTheme } from '../../context/ThemeContext';
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
import kycService from '../../services/kycService';

const { width } = Dimensions.get('window');

const KYCVerificationScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const { user, refreshUser } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const handleStartVerification = async () => {
    setIsLoading(true);
    try {
      // Start the KYC verification flow
      const result = await kycService.startVerification() as any;
      
      if (result.id || result.success) {
        // Navigate to document upload screen or show next step
        Alert.alert(
          'Verification Started',
          'Please have your ID document ready. You will need to take a photo of your ID and a selfie.',
          [
            {
              text: 'Continue',
              onPress: () => {
                // Navigate to document capture screen
                navigation.navigate('KYCDocumentCapture', { 
                  verificationId: result.id || result.verificationId 
                });
              },
            },
            { text: 'Later', style: 'cancel' },
          ]
        );
      } else {
        Alert.alert('Error', result.message || 'Failed to start verification');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to start KYC verification');
    } finally {
      setIsLoading(false);
    }
  };

  const kycSteps = [
    {
      id: 'personal',
      title: 'Personal Information',
      description: 'Name, date of birth, address',
      icon: 'person',
      status: 'completed',
    },
    {
      id: 'identity',
      title: 'Identity Document',
      description: 'Passport, National ID, or Driver\'s License',
      icon: 'card',
      status: user?.kyc_status === 'approved' ? 'completed' : 'pending',
    },
    {
      id: 'selfie',
      title: 'Selfie Verification',
      description: 'Take a photo holding your ID',
      icon: 'camera',
      status: user?.kyc_status === 'approved' ? 'completed' : 'not_started',
    },
    {
      id: 'address',
      title: 'Proof of Address',
      description: 'Utility bill or bank statement',
      icon: 'home',
      status: user?.kyc_status === 'approved' ? 'completed' : 'not_started',
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return colors.success;
      case 'pending': return colors.warning;
      case 'rejected': return colors.error;
      default: return colors.textMuted;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return 'checkmark-circle';
      case 'pending': return 'time';
      case 'rejected': return 'close-circle';
      default: return 'radio-button-off';
    }
  };

  const getKYCStatus = () => {
    switch (user?.kyc_status) {
      case 'approved':
        return {
          status: 'Verified',
          color: colors.success,
          description: 'Your identity has been verified',
          icon: 'shield-checkmark',
        };
      case 'pending':
        return {
          status: 'Under Review',
          color: colors.warning,
          description: 'Your verification is being processed',
          icon: 'time',
        };
      case 'rejected':
        return {
          status: 'Verification Failed',
          color: colors.error,
          description: 'Please resubmit your documents',
          icon: 'alert-circle',
        };
      default:
        return {
          status: 'Not Verified',
          color: colors.textMuted,
          description: 'Complete verification to unlock all features',
          icon: 'shield-outline',
        };
    }
  };

  const kycStatus = getKYCStatus();

  const renderKYCStatus = () => (
    <Animated.View entering={FadeInUp.duration(800)} style={styles.statusSection}>
      <Card variant="gradient" padding="lg" style={styles.statusCard}>
        <View style={styles.statusHeader}>
          <View style={[
            styles.statusIconContainer,
            { backgroundColor: kycStatus.color + '20' }
          ]}>
            <Ionicons name={kycStatus.icon as any} size={32} color={kycStatus.color} />
          </View>
          <View style={styles.statusContent}>
            <Text style={[styles.statusTitle, { color: colors.text }]}>
              {kycStatus.status}
            </Text>
            <Text style={[styles.statusDescription, { color: colors.textSecondary }]}>
              {kycStatus.description}
            </Text>
          </View>
        </View>
        
        {user?.kyc_status !== 'approved' && (
          <Button
            title={user?.kyc_status === 'pending' ? 'Check Status' : 'Start Verification'}
            onPress={handleStartVerification}
            loading={isLoading}
            gradient={true}
            fullWidth={true}
            size="lg"
            style={styles.statusButton}
          />
        )}
      </Card>
    </Animated.View>
  );

  const renderKYCStep = (step: any, index: number) => (
    <Animated.View
      key={step.id}
      entering={FadeInRight.duration(400).delay(index * 100)}
      style={styles.stepItem}
    >
      <Card variant="default" padding="lg" style={styles.stepCard}>
        <View style={styles.stepHeader}>
          <View style={[
            styles.stepIconContainer,
            { backgroundColor: getStatusColor(step.status) + '20' }
          ]}>
            <Ionicons name={step.icon as any} size={24} color={getStatusColor(step.status)} />
          </View>
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: colors.text }]}>
              {step.title}
            </Text>
            <Text style={[styles.stepDescription, { color: colors.textSecondary }]}>
              {step.description}
            </Text>
          </View>
          <View style={styles.stepStatus}>
            <Ionicons 
              name={getStatusIcon(step.status) as any} 
              size={24} 
              color={getStatusColor(step.status)} 
            />
          </View>
        </View>
        
        {step.status === 'completed' && (
          <View style={styles.completedBadge}>
            <Text style={[styles.completedText, { color: colors.success }]}>
              Completed
            </Text>
          </View>
        )}
        
        {step.status === 'pending' && (
          <View style={styles.pendingBadge}>
            <Text style={[styles.pendingText, { color: colors.warning }]}>
              In Progress
            </Text>
          </View>
        )}
      </Card>
    </Animated.View>
  );

  const renderBenefits = () => (
    <Animated.View entering={FadeInUp.duration(800).delay(600)} style={styles.benefitsSection}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Verification Benefits</Text>
      <Card variant="default" padding="lg" style={styles.benefitsCard}>
        {[
          { icon: 'shield-checkmark', title: 'Enhanced Security', description: 'Protect your account with verified identity' },
          { icon: 'trending-up', title: 'Higher Limits', description: 'Access increased transaction limits' },
          { icon: 'globe', title: 'Global Access', description: 'Send money internationally with ease' },
          { icon: 'star', title: 'Premium Features', description: 'Unlock exclusive app features' },
        ].map((benefit, index) => (
          <View key={benefit.title} style={styles.benefitItem}>
            <View style={[
              styles.benefitIcon,
              { backgroundColor: colors.primary + '20' }
            ]}>
              <Ionicons name={benefit.icon as any} size={20} color={colors.primary} />
            </View>
            <View style={styles.benefitContent}>
              <Text style={[styles.benefitTitle, { color: colors.text }]}>
                {benefit.title}
              </Text>
              <Text style={[styles.benefitDescription, { color: colors.textSecondary }]}>
                {benefit.description}
              </Text>
            </View>
          </View>
        ))}
      </Card>
    </Animated.View>
  );

  const renderRequirements = () => (
    <Animated.View entering={FadeInUp.duration(800).delay(800)} style={styles.requirementsSection}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Required Documents</Text>
      <Card variant="default" padding="lg" style={styles.requirementsCard}>
        {[
          { icon: 'card', title: 'Valid ID Document', description: 'Passport, National ID, or Driver\'s License' },
          { icon: 'camera', title: 'Clear Selfie', description: 'Recent photo holding your ID document' },
          { icon: 'home', title: 'Proof of Address', description: 'Utility bill or bank statement (less than 3 months old)' },
        ].map((requirement, index) => (
          <View key={requirement.title} style={styles.requirementItem}>
            <View style={[
              styles.requirementIcon,
              { backgroundColor: colors.accent + '20' }
            ]}>
              <Ionicons name={requirement.icon as any} size={20} color={colors.accent} />
            </View>
            <View style={styles.requirementContent}>
              <Text style={[styles.requirementTitle, { color: colors.text }]}>
                {requirement.title}
              </Text>
              <Text style={[styles.requirementDescription, { color: colors.textSecondary }]}>
                {requirement.description}
              </Text>
            </View>
          </View>
        ))}
      </Card>
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
          <Text style={[styles.title, { color: colors.text }]}>KYC Verification</Text>
          <View style={styles.placeholder} />
        </View>
      </Animated.View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* KYC Status */}
        {renderKYCStatus()}

        {/* KYC Steps */}
        <Animated.View entering={FadeInUp.duration(800).delay(400)} style={styles.stepsSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Verification Steps</Text>
          {kycSteps.map((step, index) => renderKYCStep(step, index))}
        </Animated.View>

        {/* Benefits */}
        {renderBenefits()}

        {/* Requirements */}
        {renderRequirements()}

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
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold as any,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  statusSection: {
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.lg,
  },
  statusCard: {
    ...Shadow.card,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  statusIconContainer: {
    width: ComponentSize.avatar.xl,
    height: ComponentSize.avatar.xl,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  statusContent: {
    flex: 1,
  },
  statusTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold as any,
    marginBottom: Spacing.xs,
  },
  statusDescription: {
    fontSize: FontSize.md,
    lineHeight: 20,
  },
  statusButton: {
    marginTop: Spacing.md,
  },
  stepsSection: {
    marginBottom: Spacing.xl,
  },
  stepItem: {
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  stepCard: {
    ...Shadow.card,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  stepIconContainer: {
    width: ComponentSize.avatar.lg,
    height: ComponentSize.avatar.lg,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold as any,
    marginBottom: Spacing.xs,
  },
  stepDescription: {
    fontSize: FontSize.sm,
    lineHeight: 18,
  },
  stepStatus: {
    alignItems: 'center',
  },
  completedBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    backgroundColor: '#10B98120',
  },
  completedText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold as any,
  },
  pendingBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    backgroundColor: '#F59E0B20',
  },
  pendingText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold as any,
  },
  benefitsSection: {
    marginBottom: Spacing.xl,
  },
  benefitsCard: {
    ...Shadow.card,
    marginHorizontal: Spacing.lg,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  benefitIcon: {
    width: ComponentSize.avatar.md,
    height: ComponentSize.avatar.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  benefitContent: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold as any,
    marginBottom: Spacing.xs,
  },
  benefitDescription: {
    fontSize: FontSize.sm,
    lineHeight: 18,
  },
  requirementsSection: {
    marginBottom: Spacing.xl,
  },
  requirementsCard: {
    ...Shadow.card,
    marginHorizontal: Spacing.lg,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  requirementIcon: {
    width: ComponentSize.avatar.md,
    height: ComponentSize.avatar.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  requirementContent: {
    flex: 1,
  },
  requirementTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold as any,
    marginBottom: Spacing.xs,
  },
  requirementDescription: {
    fontSize: FontSize.sm,
    lineHeight: 18,
  },
});

export default KYCVerificationScreen;
