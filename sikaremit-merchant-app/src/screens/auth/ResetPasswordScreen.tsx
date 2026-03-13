import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
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
import { Button, Input, Card } from '../../components/ui';
import { useTheme } from '../../context/ThemeContext';
import { authService } from '../../services/authService';
import { RootStackParamList } from '../../navigation/RootNavigator';
import {
  BorderRadius,
  FontSize,
  FontWeight,
  Spacing,
  Shadow,
} from '../../constants/theme';

type ResetPasswordScreenProps = NativeStackScreenProps<RootStackParamList, 'ResetPassword'>;

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
          colors={[colors.primary, colors.secondary]}
          style={styles.headerGradient}
        >
          <View style={[styles.successHeader, { paddingTop: insets.top + Spacing.xl }]}>
            <Animated.View entering={FadeInUp.duration(1000)} style={styles.successContent}>
              <Ionicons name="checkmark-circle" size={64} color="white" />
              <Text style={styles.successTitle}>Password Reset!</Text>
              <Text style={styles.successSubtitle}>
                Your password has been successfully updated.
              </Text>
            </Animated.View>
          </View>
        </LinearGradient>

        <View style={styles.successBody}>
          <Card style={styles.successCard}>
            <Text style={[styles.successMessage, { color: colors.textSecondary }]}>
              You can now sign in with your new password.
            </Text>
            <Button
              title="Sign In"
              onPress={handleBackToLogin}
              style={styles.signInButton}
            />
          </Card>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={[colors.primary, colors.secondary]}
          style={styles.headerGradient}
        >
          <View style={[styles.header, { paddingTop: insets.top + Spacing.lg }]}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleBackToLogin}
            >
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <Animated.Text entering={FadeInDown.delay(200)} style={styles.headerTitle}>
              Set New Password
            </Animated.Text>
            <Animated.Text entering={FadeInDown.delay(300)} style={styles.headerSubtitle}>
              Create a strong password for your account
            </Animated.Text>
          </View>
        </LinearGradient>

        <Animated.View entering={FadeInUp.delay(400)} style={styles.formContainer}>
          <Card style={styles.formCard}>
            <Input
              label="New Password"
              value={password}
              onChangeText={(value: string) => { setPassword(value); if (error) setError(''); }}
              placeholder="Enter new password"
              secureTextEntry={!showPassword}
              error={error && !confirmPassword ? error : undefined}
            />

            <Input
              label="Confirm Password"
              value={confirmPassword}
              onChangeText={(value: string) => { setConfirmPassword(value); if (error) setError(''); }}
              placeholder="Confirm new password"
              secureTextEntry={!showConfirm}
              error={error && confirmPassword ? error : undefined}
            />

            {error ? (
              <Animated.View entering={FadeInRight.duration(300)}>
                <Text style={[styles.errorText, { color: colors.error }]}>
                  {error}
                </Text>
              </Animated.View>
            ) : null}

            <View style={styles.requirementsBox}>
              <Text style={[styles.requirementsTitle, { color: colors.text }]}>
                Password requirements:
              </Text>
              <Text style={[styles.requirementItem, { color: password.length >= 8 ? colors.primary : colors.textSecondary }]}>
                • At least 8 characters
              </Text>
              <Text style={[styles.requirementItem, { color: /[A-Z]/.test(password) ? colors.primary : colors.textSecondary }]}>
                • One uppercase letter
              </Text>
              <Text style={[styles.requirementItem, { color: /[a-z]/.test(password) ? colors.primary : colors.textSecondary }]}>
                • One lowercase letter
              </Text>
              <Text style={[styles.requirementItem, { color: /\d/.test(password) ? colors.primary : colors.textSecondary }]}>
                • One number
              </Text>
            </View>

            <Button
              title="Reset Password"
              onPress={handleSubmit}
              loading={isLoading}
              style={styles.submitButton}
              disabled={!password || !confirmPassword}
            />
          </Card>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerGradient: {
    paddingBottom: Spacing.xxl,
  },
  header: {
    paddingHorizontal: Spacing.lg,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  headerTitle: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold as any,
    color: 'white',
    marginBottom: Spacing.xs,
  },
  headerSubtitle: {
    fontSize: FontSize.md,
    color: 'rgba(255,255,255,0.8)',
  },
  formContainer: {
    marginTop: -Spacing.lg,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  formCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    ...Shadow.medium,
  },
  errorText: {
    fontSize: FontSize.sm,
    marginBottom: Spacing.md,
  },
  requirementsBox: {
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(124, 58, 237, 0.05)',
  },
  requirementsTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold as any,
    marginBottom: Spacing.xs,
  },
  requirementItem: {
    fontSize: FontSize.sm,
    marginTop: 2,
  },
  submitButton: {
    marginTop: Spacing.md,
  },
  successHeader: {
    alignItems: 'center',
    paddingBottom: Spacing.xxl,
  },
  successContent: {
    alignItems: 'center',
  },
  successTitle: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold as any,
    color: 'white',
    marginTop: Spacing.md,
  },
  successSubtitle: {
    fontSize: FontSize.md,
    color: 'rgba(255,255,255,0.8)',
    marginTop: Spacing.xs,
  },
  successBody: {
    marginTop: -Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  successCard: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    ...Shadow.medium,
  },
  successMessage: {
    fontSize: FontSize.md,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  signInButton: {
    minWidth: 200,
  },
});

export default ResetPasswordScreen;
