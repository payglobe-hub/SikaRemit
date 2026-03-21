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
import { Button, Card, Input } from '../../components/ui';
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
import { authService } from '../../services/authService';

const { width } = Dimensions.get('window');

const SecurityScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { user, biometricEnabled, setBiometricEnabled } = useAuthStore();

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(user?.mfa_enabled || false);
  const [sessionTimeout, setSessionTimeout] = useState(true);
  const [loginAlerts, setLoginAlerts] = useState(true);

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters');
      return;
    }

    setIsChangingPassword(true);
    try {
      await authService.changePassword(currentPassword, newPassword);
      Alert.alert('Success', 'Password changed successfully');
      setShowPasswordForm(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      const message = error.response?.data?.message || 
                      error.response?.data?.detail ||
                      'Failed to change password. Please check your current password.';
      Alert.alert('Error', message);
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleToggleBiometric = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setBiometricEnabled(!biometricEnabled);
  };

  const handleToggleTwoFactor = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setTwoFactorEnabled(!twoFactorEnabled);
  };

  const handleToggleSessionTimeout = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSessionTimeout(!sessionTimeout);
  };

  const handleToggleLoginAlerts = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLoginAlerts(!loginAlerts);
  };

  const handleSecurityAction = (action: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    switch (action) {
      case 'view_sessions':
        Alert.alert('Active Sessions', 'You have 2 active sessions on this device.');
        break;
      case 'clear_sessions':
        Alert.alert('Clear Sessions', 'All other sessions will be logged out.');
        break;
      case 'security_log':
        Alert.alert('Security Log', 'No recent security activity detected.');
        break;
      case 'privacy_settings':
        Alert.alert('Privacy Settings', 'Manage your privacy preferences.');
        break;
    }
  };

  const getPasswordStrength = (password: string) => {
    if (password.length < 6) return { strength: 'weak', color: colors.error };
    if (password.length < 8) return { strength: 'fair', color: colors.warning };
    if (password.length < 12) return { strength: 'good', color: colors.primary };
    return { strength: 'strong', color: colors.success };
  };

  const securityFeatures = [
    {
      title: 'Account Security',
      description: 'Your account is protected with email verification and advanced security features',
      icon: 'shield-checkmark',
      color: colors.success,
      status: 'Protected',
    },
    {
      title: 'Biometric Authentication',
      description: 'Use fingerprint or face ID for quick and secure access',
      icon: 'finger-print',
      color: colors.primary,
      toggle: biometricEnabled,
      onToggle: handleToggleBiometric,
    },
    {
      title: 'Two-Factor Authentication',
      description: 'Add an extra layer of security to your account',
      icon: 'phone-portrait',
      color: colors.accent,
      toggle: twoFactorEnabled,
      onToggle: handleToggleTwoFactor,
    },
  ];

  const securityActions = [
    {
      title: 'Active Sessions',
      description: 'Manage and monitor your active login sessions',
      icon: 'devices',
      color: colors.textMuted,
      action: 'view_sessions',
    },
    {
      title: 'Clear All Sessions',
      description: 'Log out from all devices except this one',
      icon: 'log-out',
      color: colors.warning,
      action: 'clear_sessions',
    },
    {
      title: 'Security Log',
      description: 'View recent security activity and alerts',
      icon: 'list',
      color: colors.textMuted,
      action: 'security_log',
    },
    {
      title: 'Privacy Settings',
      description: 'Manage your privacy and data preferences',
      icon: 'lock-closed',
      color: colors.textMuted,
      action: 'privacy_settings',
    },
  ];

  const renderSecurityFeature = (feature: any, index: number) => (
    <Animated.View
      key={feature.title}
      entering={FadeInRight.duration(400).delay(index * 100)}
      style={styles.featureItem}
    >
      <Card variant="default" padding="lg" style={styles.featureCard}>
        <View style={styles.featureHeader}>
          <View style={[
            styles.featureIcon,
            { backgroundColor: feature.color + '20' }
          ]}>
            <Ionicons name={feature.icon as any} size={24} color={feature.color} />
          </View>
          <View style={styles.featureContent}>
            <Text style={[styles.featureTitle, { color: colors.text }]}>
              {feature.title}
            </Text>
            <Text style={[styles.featureDescription, { color: colors.textSecondary }]}>
              {feature.description}
            </Text>
          </View>
          {feature.toggle !== undefined && (
            <TouchableOpacity
              style={[
                styles.toggleButton,
                { backgroundColor: feature.toggle ? feature.color : colors.surface }
              ]}
              onPress={feature.onToggle}
            >
              <View style={[
                styles.toggleThumb,
                { backgroundColor: feature.toggle ? '#FFFFFF' : colors.textMuted }
              ]} />
            </TouchableOpacity>
          )}
        </View>
        {feature.status && (
          <View style={[
            styles.statusBadge,
            { backgroundColor: feature.color + '15' }
          ]}>
            <Text style={[styles.statusText, { color: feature.color }]}>
              {feature.status}
            </Text>
          </View>
        )}
      </Card>
    </Animated.View>
  );

  const renderSecurityAction = (action: any, index: number) => (
    <Animated.View
      key={action.title}
      entering={FadeInRight.duration(400).delay(index * 100)}
      style={styles.actionItem}
    >
      <TouchableOpacity
        style={styles.actionTouchable}
        onPress={() => handleSecurityAction(action.action)}
      >
        <View style={[
          styles.actionIcon,
          { backgroundColor: action.color + '20' }
        ]}>
          <Ionicons name={action.icon as any} size={20} color={action.color} />
        </View>
        <View style={styles.actionContent}>
          <Text style={[styles.actionTitle, { color: colors.text }]}>
            {action.title}
          </Text>
          <Text style={[styles.actionDescription, { color: colors.textSecondary }]}>
            {action.description}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
      </TouchableOpacity>
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
          <Text style={[styles.title, { color: colors.text }]}>Security</Text>
          <View style={styles.placeholder} />
        </View>
      </Animated.View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Security Features */}
        <Animated.View entering={FadeInUp.duration(800).delay(200)} style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Security Features</Text>
          {securityFeatures.map((feature, index) => renderSecurityFeature(feature, index))}
        </Animated.View>

        {/* Password Change */}
        <Animated.View entering={FadeInUp.duration(800).delay(400)} style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Change Password</Text>
          <Card variant="default" padding="lg" style={styles.passwordCard}>
            <TouchableOpacity
              style={styles.passwordToggle}
              onPress={() => setShowPasswordForm(!showPasswordForm)}
            >
              <View style={styles.passwordHeader}>
                <View style={[
                  styles.passwordIcon,
                  { backgroundColor: colors.primary + '20' }
                ]}>
                  <Ionicons name="key" size={24} color={colors.primary} />
                </View>
                <View style={styles.passwordContent}>
                  <Text style={[styles.passwordTitle, { color: colors.text }]}>
                    Change Password
                  </Text>
                  <Text style={[styles.passwordDescription, { color: colors.textSecondary }]}>
                    Update your account password for enhanced security
                  </Text>
                </View>
                <Ionicons 
                  name={showPasswordForm ? 'chevron-up' : 'chevron-down'} 
                  size={20} 
                  color={colors.textMuted} 
                />
              </View>
            </TouchableOpacity>

            {showPasswordForm && (
              <Animated.View entering={FadeInUp.duration(400)}>
                <View style={styles.passwordForm}>
                  <Input
                    label="Current Password"
                    placeholder="Enter current password"
                    value={currentPassword}
                    onChangeText={setCurrentPassword}
                    secureTextEntry
                    leftIcon={<Ionicons name="lock-closed" size={20} color={colors.textMuted} />}
                    variant="glass"
                    style={styles.passwordInput}
                  />
                  <Input
                    label="New Password"
                    placeholder="Enter new password"
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry
                    leftIcon={<Ionicons name="lock-closed" size={20} color={colors.textMuted} />}
                    variant="glass"
                    style={styles.passwordInput}
                  />
                  <Input
                    label="Confirm Password"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                    leftIcon={<Ionicons name="lock-closed" size={20} color={colors.textMuted} />}
                    variant="glass"
                    style={styles.passwordInput}
                  />
                  {newPassword && (
                    <View style={styles.passwordStrength}>
                      <Text style={[styles.strengthLabel, { color: colors.textSecondary }]}>
                        Password Strength: 
                      </Text>
                      <Text style={[
                        styles.strengthValue,
                        { color: getPasswordStrength(newPassword).color }
                      ]}>
                        {getPasswordStrength(newPassword).strength.toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <Button
                    title="Change Password"
                    onPress={handleChangePassword}
                    loading={isChangingPassword}
                    gradient={true}
                    fullWidth={true}
                    size="lg"
                  />
                </View>
              </Animated.View>
            )}
          </Card>
        </Animated.View>

        {/* Security Actions */}
        <Animated.View entering={FadeInUp.duration(800).delay(600)} style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Security Actions</Text>
          <Card variant="default" padding="none" style={styles.actionsCard}>
            {securityActions.map((action, index) => renderSecurityAction(action, index))}
          </Card>
        </Animated.View>

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
  featureItem: {
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  featureCard: {
    ...Shadow.card,
  },
  featureHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  featureIcon: {
    width: ComponentSize.avatar.lg,
    height: ComponentSize.avatar.lg,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold as any,
    marginBottom: Spacing.xs,
  },
  featureDescription: {
    fontSize: FontSize.sm,
    lineHeight: 18,
  },
  toggleButton: {
    width: ComponentSize.buttonHeight.md,
    height: ComponentSize.buttonHeight.sm,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.button,
  },
  toggleThumb: {
    width: 16,
    height: 16,
    borderRadius: BorderRadius.full,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    backgroundColor: '#F3F4F6',
    color: '#4B5563',
  },
  statusText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold as any,
  },
  actionItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  actionTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  actionIcon: {
    width: ComponentSize.avatar.md,
    height: ComponentSize.avatar.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold as any,
    marginBottom: Spacing.xs,
  },
  actionDescription: {
    fontSize: FontSize.sm,
    lineHeight: 18,
  },
  passwordCard: {
    ...Shadow.card,
    marginHorizontal: Spacing.lg,
  },
  passwordToggle: {
    padding: Spacing.lg,
  },
  passwordHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  passwordIcon: {
    width: ComponentSize.avatar.lg,
    height: ComponentSize.avatar.lg,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  passwordContent: {
    flex: 1,
  },
  passwordTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold as any,
    marginBottom: Spacing.xs,
  },
  passwordDescription: {
    fontSize: FontSize.sm,
    lineHeight: 18,
  },
  passwordForm: {
    marginTop: Spacing.lg,
    gap: Spacing.md,
  },
  passwordInput: {
    marginBottom: Spacing.md,
  },
  passwordStrength: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  strengthLabel: {
    fontSize: FontSize.sm,
  },
  strengthValue: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold as any,
    marginLeft: Spacing.sm,
  },
  actionsCard: {
    ...Shadow.card,
    marginHorizontal: Spacing.lg,
  },
});

export default SecurityScreen;
