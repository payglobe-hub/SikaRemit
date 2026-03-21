import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Animated, {
  FadeInDown,
  FadeInUp,
  FadeInRight,
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
  ComponentSize,
} from '../../constants/theme';

const { width } = Dimensions.get('window');

type ResetPasswordScreenProps = NativeStackScreenProps<AuthStackParamList, 'ResetPassword'>;

const ResetPasswordScreen: React.FC<ResetPasswordScreenProps> = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { token } = route.params;

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const validateForm = (): boolean => {
    if (!password) {
      setError('Password is required');
      return false;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return false;
    }
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      setError('Password must contain uppercase, lowercase, and a number');
      return false;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    setError('');

    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await authService.confirmPasswordReset(token, password);
      setIsSuccess(true);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to reset password. The link may have expired.');
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToLogin = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
                <Ionicons name="checkmark-circle" size={64} color="#FFFFFF" />
              </View>
              <Text style={styles.successTitle}>Password Reset!</Text>
              <Text style={styles.successText}>
                Your password has been successfully updated.
              </Text>
              <Text style={styles.instructionText}>
                You can now sign in with your new password.
              </Text>
              <Button
                title="Sign In"
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
              <Text style={styles.title}>New Password</Text>
            </Animated.View>

            {/* Hero Section */}
            <Animated.View entering={FadeInUp.duration(800).delay(200)} style={styles.heroSection}>
              <Text style={styles.subtitle}>
                Create a strong password for your account.
              </Text>
            </Animated.View>

            {/* Password Requirements */}
            <Animated.View entering={FadeInUp.duration(800).delay(400)} style={styles.requirementsSection}>
              <View style={[
                styles.requirementsCard,
                { backgroundColor: 'rgba(255, 255, 255, 0.1)' }
              ]}>
                <View style={styles.requirementsHeader}>
                  <View style={[
                    styles.requirementsIcon,
                    { backgroundColor: 'rgba(255, 255, 255, 0.2)' }
                  ]}>
                    <Ionicons name="shield-checkmark" size={24} color="#FFFFFF" />
                  </View>
                  <View style={styles.requirementsContent}>
                    <Text style={styles.requirementsTitle}>Password Requirements</Text>
                    <Text style={styles.requirementsText}>
                      Min 8 characters, uppercase, lowercase & number
                    </Text>
                  </View>
                </View>
              </View>
            </Animated.View>

            {/* Form */}
            <Animated.View entering={FadeInUp.duration(800).delay(600)} style={styles.formSection}>
              <View style={styles.formCard}>
                <Input
                  label="New Password"
                  placeholder="Enter new password"
                  value={password}
                  onChangeText={(text: string) => { setPassword(text); if (error) setError(''); }}
                  secureTextEntry={!showPassword}
                  leftIcon={<Ionicons name="lock-closed" size={20} color={colors.textMuted} />}
                  rightIcon={
                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                      <Ionicons name={showPassword ? 'eye' : 'eye-off'} size={20} color={colors.textMuted} />
                    </TouchableOpacity>
                  }
                  variant="glass"
                  style={styles.input}
                />

                <Input
                  label="Confirm Password"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChangeText={(text: string) => { setConfirmPassword(text); if (error) setError(''); }}
                  secureTextEntry={!showConfirm}
                  leftIcon={<Ionicons name="lock-closed" size={20} color={colors.textMuted} />}
                  rightIcon={
                    <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)}>
                      <Ionicons name={showConfirm ? 'eye' : 'eye-off'} size={20} color={colors.textMuted} />
                    </TouchableOpacity>
                  }
                  variant="glass"
                  style={styles.input}
                />

                {error ? (
                  <Animated.View entering={FadeInRight.duration(300)} style={styles.errorContainer}>
                    <View style={styles.errorIcon}>
                      <Ionicons name="alert-circle" size={16} color="#EF4444" />
                    </View>
                    <Text style={styles.errorText}>{error}</Text>
                  </Animated.View>
                ) : null}

                <Button
                  title="Reset Password"
                  onPress={handleSubmit}
                  loading={isLoading}
                  gradient={true}
                  fullWidth={true}
                  size="lg"
                  style={styles.submitButton}
                />
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
  requirementsSection: {
    marginBottom: Spacing.xl,
  },
  requirementsCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    ...Shadow.card,
  },
  requirementsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  requirementsIcon: {
    width: ComponentSize.avatar.lg,
    height: ComponentSize.avatar.lg,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  requirementsContent: {
    flex: 1,
  },
  requirementsTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold as any,
    color: '#FFFFFF',
    marginBottom: Spacing.xs,
  },
  requirementsText: {
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
  input: {
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

export default ResetPasswordScreen;
