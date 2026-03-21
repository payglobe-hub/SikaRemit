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
} from 'react-native-reanimated';
import { Button, Input, Card } from '../../components/ui';
import { useTheme } from '../../context/ThemeContext';
import { useAuthStore } from '../../store/authStore';
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
import biometricService from '../../services/biometricService';

const { width } = Dimensions.get('window');

type LoginScreenProps = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Login'>;
};

const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { login, isLoading, error, clearError, biometricEnabled } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [storedEmail, setStoredEmail] = useState<string | null>(null);

  // Check biometric availability on mount
  useEffect(() => {
    const checkBiometrics = async () => {
      const capabilities = await biometricService.checkAvailability();
      const hasCredentials = await biometricService.hasStoredCredentials();
      setBiometricAvailable(capabilities.isAvailable && capabilities.isEnrolled && hasCredentials && biometricEnabled);
      
      if (hasCredentials) {
        const email = await biometricService.getStoredEmail();
        setStoredEmail(email);
      }
    };
    checkBiometrics();
  }, [biometricEnabled]);

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {};
    
    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Please enter a valid email';
    }
    
    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validateForm()) return;
    
    try {
      await login(email, password);
    } catch (err) {
      // Error is handled by the store
    }
  };

  const handleBiometricLogin = async () => {
    try {
      const biometricType = await biometricService.getBiometricTypeName();
      const result = await biometricService.authenticateAndGetCredentials(
        `Log in to SikaRemit with ${biometricType}`
      );

      if (result.success && result.credentials) {
        // Use retrieved credentials to login
        await login(result.credentials.email, result.credentials.password);
      } else if (result.error === 'User chose to use password') {
        // User wants to use password instead, do nothing
      } else if (result.error) {
        Alert.alert('Authentication Failed', result.error);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Biometric authentication failed');
    }
  };

  const handleForgotPassword = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('ForgotPassword');
  };

  const handleRegister = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('Register');
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.contentContainer, { paddingTop: insets.top + Spacing.xl }]}
        >
          {/* Header */}
          <Animated.View entering={FadeInDown.duration(800)} style={styles.header}>
            <View style={styles.headerContent}>
              <Text style={[styles.title, { color: colors.text }]}>
                Welcome Back
              </Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Sign in to your SikaRemit account
              </Text>
            </View>
          </Animated.View>

          {/* Logo/Brand Section */}
          <Animated.View entering={FadeInUp.duration(800).delay(200)} style={styles.brandSection}>
            <LinearGradient
              colors={colors.gradient.primary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.logoContainer, Shadow.floating]}
            >
              <View style={styles.logoContent}>
                <Text style={styles.logoText}>Sika</Text>
                <Text style={styles.logoSubtext}>Remit</Text>
              </View>
            </LinearGradient>
          </Animated.View>

          {/* Biometric Login */}
          {biometricAvailable && (
            <Animated.View entering={FadeInUp.duration(600).delay(400)} style={styles.section}>
              <TouchableOpacity
                style={[styles.biometricButton, { backgroundColor: colors.surface }]}
                onPress={handleBiometricLogin}
                activeOpacity={0.8}
              >
                <View style={[styles.biometricIcon, { backgroundColor: colors.primary + '20' }]}>
                  <Ionicons name="finger-print" size={24} color={colors.primary} />
                </View>
                <View style={styles.biometricContent}>
                  <Text style={[styles.biometricTitle, { color: colors.text }]}>
                    Quick Login
                  </Text>
                  <Text style={[styles.biometricSubtitle, { color: colors.textMuted }]}>
                    {storedEmail}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </Animated.View>
          )}

          {/* Login Form */}
          <Animated.View entering={FadeInUp.duration(800).delay(600)} style={styles.section}>
            <View style={styles.form}>
              <Input
                label="Email Address"
                placeholder="Enter your email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                leftIcon={<Ionicons name="mail" size={20} color={colors.textMuted} />}
                error={errors.email}
                variant="glass"
                style={styles.input}
              />

              <Input
                label="Password"
                placeholder="Enter your password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                leftIcon={<Ionicons name="lock-closed" size={20} color={colors.textMuted} />}
                rightIcon={
                  <TouchableOpacity onPress={() => {}}>
                    <Ionicons name="eye-off" size={20} color={colors.textMuted} />
                  </TouchableOpacity>
                }
                error={errors.password}
                variant="glass"
                style={styles.input}
              />

              {error && (
                <Animated.View entering={FadeInRight.duration(400)}>
                  <Card variant="default" padding="md" style={styles.errorCard}>
                    <Text style={[styles.errorText, { color: colors.error }]}>
                      {error}
                    </Text>
                  </Card>
                </Animated.View>
              )}

              <Button
                title="Sign In"
                onPress={handleLogin}
                loading={isLoading}
                gradient={true}
                fullWidth={true}
                size="lg"
                style={styles.loginButton}
              />
            </View>
          </Animated.View>

          {/* Footer Actions */}
          <Animated.View entering={FadeInUp.duration(800).delay(800)} style={styles.footer}>
            <TouchableOpacity
              style={styles.forgotPasswordButton}
              onPress={handleForgotPassword}
            >
              <Text style={[styles.forgotPasswordText, { color: colors.primary }]}>
                Forgot Password?
              </Text>
            </TouchableOpacity>
            
            <View style={styles.registerContainer}>
              <Text style={[styles.registerText, { color: colors.textSecondary }]}>
                Don't have an account?
              </Text>
              <TouchableOpacity onPress={handleRegister}>
                <Text style={[styles.registerLink, { color: colors.primary }]}>
                  Sign Up
                </Text>
              </TouchableOpacity>
            </View>
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
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  headerContent: {
    alignItems: 'center',
  },
  title: {
    fontSize: FontSize.display,
    fontWeight: FontWeight.bold as any,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: FontSize.md,
    textAlign: 'center',
    fontWeight: FontWeight.medium as any,
  },
  brandSection: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xxl,
    alignItems: 'center',
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: BorderRadius.xxxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContent: {
    alignItems: 'center',
  },
  logoText: {
    fontSize: FontSize.xxxl,
    fontWeight: FontWeight.black as any,
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  logoSubtext: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.light as any,
    color: 'rgba(255,255,255,0.9)',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  section: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  biometricButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    ...Shadow.card,
  },
  biometricIcon: {
    width: ComponentSize.avatar.md,
    height: ComponentSize.avatar.md,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  biometricContent: {
    flex: 1,
  },
  biometricTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold as any,
  },
  biometricSubtitle: {
    fontSize: FontSize.sm,
    marginTop: 2,
  },
  form: {
    gap: Spacing.md,
  },
  input: {
    marginBottom: Spacing.sm,
  },
  errorCard: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  errorText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium as any,
  },
  loginButton: {
    marginTop: Spacing.lg,
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
  },
  forgotPasswordButton: {
    marginBottom: Spacing.lg,
  },
  forgotPasswordText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold as any,
  },
  registerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  registerText: {
    fontSize: FontSize.sm,
    marginRight: Spacing.xs,
  },
  registerLink: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold as any,
  },
});

export default LoginScreen;
