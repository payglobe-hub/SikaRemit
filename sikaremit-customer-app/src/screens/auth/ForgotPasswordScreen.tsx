import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
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
import { Button, Input } from '../../components/ui';
import { useTheme } from '../../context/ThemeContext';
import { authService } from '../../services/authService';
import { AuthStackParamList } from '../../types';
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

type ForgotPasswordScreenProps = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'ForgotPassword'>;
};

const ForgotPasswordScreen: React.FC<ForgotPasswordScreenProps> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const handleSubmit = async () => {
    if (!email) {
      setError('Email is required');
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Please enter a valid email');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await authService.requestPasswordReset(email);
      setIsSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send reset email');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailChange = (text: string) => {
    setEmail(text);
    if (error) setError('');
  };

  const handleFocus = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsFocused(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
  };

  const handleBackToLogin = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate('Login');
  };

  if (isSuccess) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <LinearGradient
          colors={colors.gradient.primary}
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
                <Ionicons name="mail-open" size={64} color="#FFFFFF" />
              </View>
              <Text style={styles.successTitle}>Check Your Email</Text>
              <Text style={styles.successText}>
                We've sent a password reset link to
              </Text>
              <View style={styles.emailDisplay}>
                <Text style={styles.emailText}>{email}</Text>
              </View>
              <Text style={styles.instructionText}>
                Click the link in the email to reset your password
              </Text>
              <Button
                title="Back to Login"
                onPress={handleBackToLogin}
                gradient={true}
                fullWidth={true}
                size="lg"
                style={styles.successButton}
              />
            </Animated.View>
          </View>
        </LinearGradient>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <LinearGradient
          colors={colors.gradient.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          <View style={[styles.content, { paddingTop: insets.top + Spacing.xxxl }]}>
            {/* Header */}
            <Animated.View entering={FadeInDown.duration(600)} style={styles.header}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={handleBackToLogin}
              >
                <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={styles.title}>Forgot Password?</Text>
            </Animated.View>

            {/* Hero Section */}
            <Animated.View entering={FadeInUp.duration(800).delay(200)} style={styles.heroSection}>
              <Text style={styles.subtitle}>
                Enter your email address and we'll send you a link to reset your password.
              </Text>
            </Animated.View>

            {/* Security Note */}
            <Animated.View entering={FadeInUp.duration(800).delay(400)} style={styles.securitySection}>
              <View style={[
                styles.securityCard,
                { backgroundColor: 'rgba(255, 255, 255, 0.1)' }
              ]}>
                <View style={styles.securityHeader}>
                  <View style={[
                    styles.securityIcon,
                    { backgroundColor: 'rgba(255, 255, 255, 0.2)' }
                  ]}>
                    <Ionicons name="shield-checkmark" size={24} color="#FFFFFF" />
                  </View>
                  <View style={styles.securityContent}>
                    <Text style={styles.securityTitle}>Secure Recovery</Text>
                    <Text style={styles.securityText}>
                      Your account security is our priority
                    </Text>
                  </View>
                </View>
              </View>
            </Animated.View>

            {/* Form */}
            <Animated.View entering={FadeInUp.duration(800).delay(600)} style={styles.formSection}>
              <View style={styles.formCard}>
                <Input
                  label="Email Address"
                  placeholder="Enter your email"
                  value={email}
                  onChangeText={handleEmailChange}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                  leftIcon={<Ionicons name="mail" size={20} color={colors.textMuted} />}
                  rightIcon={email && (
                    <TouchableOpacity onPress={() => setEmail('')}>
                      <Ionicons name="close-circle" size={20} color={colors.textMuted} />
                    </TouchableOpacity>
                  )}
                  variant="glass"
                  style={styles.emailInput}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />

                {error && (
                  <Animated.View entering={FadeInRight.duration(300)} style={styles.errorContainer}>
                    <View style={styles.errorIcon}>
                      <Ionicons name="alert-circle" size={16} color={colors.error} />
                    </View>
                    <Text style={styles.errorText}>{error}</Text>
                  </Animated.View>
                )}

                <Button
                  title="Send Reset Link"
                  onPress={handleSubmit}
                  loading={isLoading}
                  gradient={true}
                  fullWidth={true}
                  size="lg"
                  style={styles.submitButton}
                />
              </View>
            </Animated.View>

            {/* Alternative Options */}
            <Animated.View entering={FadeInUp.duration(800).delay(800)} style={styles.alternativeSection}>
              <Text style={styles.alternativeTitle}>Need help?</Text>
              <View style={styles.alternativeOptions}>
                <TouchableOpacity
                  style={styles.alternativeOption}
                  onPress={() => navigation.navigate('Login')}
                >
                  <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
                  <Text style={styles.alternativeText}>Back to Login</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.alternativeOption}
                  onPress={() => Alert.alert('Contact Support', 'Email: support@sikaremit.com')}
                >
                  <Ionicons name="headset" size={20} color="#FFFFFF" />
                  <Text style={styles.alternativeText}>Contact Support</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>

            <View style={{ height: Spacing.xxxl }} />
          </View>
        </LinearGradient>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
  },
  header: {
    marginBottom: Spacing.xl,
  },
  backButton: {
    width: ComponentSize.iconButton.md,
    height: ComponentSize.iconButton.md,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: FontSize.display,
    fontWeight: FontWeight.black as any,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  heroSection: {
    marginBottom: Spacing.xxl,
  },
  subtitle: {
    fontSize: FontSize.lg,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: Spacing.md,
  },
  securitySection: {
    marginBottom: Spacing.xl,
  },
  securityCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    ...Shadow.card,
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
    color: 'rgba(255,255,255,0.8)',
  },
  formSection: {
    marginBottom: Spacing.xl,
  },
  formCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    ...Shadow.card,
  },
  emailInput: {
    marginBottom: Spacing.md,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: BorderRadius.md,
  },
  errorIcon: {
    marginRight: Spacing.sm,
  },
  errorText: {
    fontSize: FontSize.sm,
    color: '#EF4444',
  },
  submitButton: {
    marginTop: Spacing.lg,
  },
  alternativeSection: {
    alignItems: 'center',
  },
  alternativeTitle: {
    fontSize: FontSize.md,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: Spacing.md,
  },
  alternativeOptions: {
    flexDirection: 'row',
    gap: Spacing.lg,
  },
  alternativeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  alternativeText: {
    fontSize: FontSize.sm,
    color: '#FFFFFF',
    marginLeft: Spacing.sm,
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
    marginBottom: Spacing.md,
  },
  emailDisplay: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  emailText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold as any,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  instructionText: {
    fontSize: FontSize.sm,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  successButton: {
    maxWidth: 200,
  },
});

export default ForgotPasswordScreen;
