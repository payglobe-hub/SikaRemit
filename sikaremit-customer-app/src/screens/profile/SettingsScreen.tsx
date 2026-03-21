import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
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
import { Card, Button } from '../../components/ui';
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

const SettingsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { colors, themeMode, setThemeMode, isDark } = useTheme();

  const [notifications, setNotifications] = React.useState(true);
  const [biometrics, setBiometrics] = React.useState(true);
  const [autoBackup, setAutoBackup] = React.useState(true);
  const [faceId, setFaceId] = React.useState(false);
  const [locationServices, setLocationServices] = React.useState(true);

  const handleToggle = (value: boolean, setter: React.Dispatch<React.SetStateAction<boolean>>) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setter(value);
  };

  const handleThemeToggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setThemeMode(themeMode === 'dark' ? 'light' : 'dark');
  };

  const handleSettingPress = (setting: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Handle navigation to specific setting screen
    // navigation.navigate(setting);
  };

  const createToggleHandler = (setter: React.Dispatch<React.SetStateAction<boolean>>) => {
    return (value: boolean) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setter(value);
    };
  };

  const settingsSections = [
    {
      title: 'Appearance',
      icon: 'color-palette',
      items: [
        {
          label: 'Dark Mode',
          description: themeMode === 'system' ? 'System' : isDark ? 'On' : 'Off',
          icon: isDark ? 'moon' : 'sunny',
          color: colors.primary,
          action: 'toggle',
          value: isDark,
          onToggle: handleThemeToggle,
        },
      ],
    },
    {
      title: 'Notifications',
      icon: 'notifications',
      items: [
        {
          label: 'Push Notifications',
          description: 'Receive transaction alerts',
          icon: 'notifications',
          color: colors.warning,
          action: 'toggle',
          value: notifications,
          onToggle: createToggleHandler(setNotifications),
        },
        {
          label: 'Email Notifications',
          description: 'Receive email updates',
          icon: 'mail',
          color: colors.success,
          action: 'toggle',
          value: true,
          onToggle: createToggleHandler(setNotifications),
        },
        {
          label: 'SMS Notifications',
          description: 'Receive SMS alerts',
          icon: 'chatbubble',
          color: colors.accent,
          action: 'toggle',
          value: true,
          onToggle: createToggleHandler(setNotifications),
        },
      ],
    },
    {
      title: 'Security',
      icon: 'shield-checkmark',
      items: [
        {
          label: 'Biometric Authentication',
          description: 'Use fingerprint or face ID',
          icon: 'finger-print',
          color: colors.primary,
          action: 'toggle',
          value: biometrics,
          onToggle: createToggleHandler(setBiometrics),
        },
        {
          label: 'Face ID',
          description: 'Use Face ID for authentication',
          icon: 'person',
          color: colors.secondary,
          action: 'toggle',
          value: faceId,
          onToggle: createToggleHandler(setFaceId),
        },
        {
          label: 'Auto-Lock',
          description: 'Lock app when idle',
          icon: 'lock-closed',
          color: colors.textMuted,
          action: 'toggle',
          value: true,
          onToggle: createToggleHandler(setAutoBackup),
        },
      ],
    },
    {
      title: 'Privacy',
      icon: 'lock-closed',
      items: [
        {
          label: 'Location Services',
          description: 'Allow app to access location',
          icon: 'location',
          color: colors.warning,
          action: 'toggle',
          value: locationServices,
          onToggle: createToggleHandler(setLocationServices),
        },
        {
          label: 'Auto-Backup',
          description: 'Backup data automatically',
          icon: 'cloud-upload',
          color: colors.success,
          action: 'toggle',
          value: autoBackup,
          onToggle: createToggleHandler(setAutoBackup),
        },
        {
          label: 'Clear Cache',
          description: 'Clear app cache data',
          icon: 'trash',
          color: colors.error,
          action: 'button',
          onPress: () => handleSettingPress('ClearCache'),
        },
      ],
    },
    {
      title: 'About',
      icon: 'information-circle',
      items: [
        {
          label: 'Version',
          description: 'SikaRemit v1.0.0',
          icon: 'code-working',
          color: colors.textMuted,
          action: 'info',
          onPress: () => handleSettingPress('Version'),
        },
        {
          label: 'Privacy Policy',
          description: 'Read our privacy policy',
          icon: 'document-text',
          color: colors.textMuted,
          action: 'button',
          onPress: () => handleSettingPress('PrivacyPolicy'),
        },
        {
          label: 'Terms of Service',
          description: 'Read our terms of service',
          icon: 'document',
          color: colors.textMuted,
          action: 'button',
          onPress: () => handleSettingPress('Terms'),
        },
      ],
    },
  ];

  const renderSettingItem = (item: any, index: number) => (
    <Animated.View
      key={item.label}
      entering={FadeInRight.duration(400).delay(index * 100)}
      style={styles.settingItem}
    >
      <TouchableOpacity
        style={styles.settingTouchable}
        onPress={() => {
          if (item.action === 'toggle' && item.onToggle) {
            item.onToggle(!item.value);
          } else if (item.action === 'button' && item.onPress) {
            item.onPress();
          } else if (item.action === 'info') {
            // Show info modal
          }
        }}
      >
        <View style={[
          styles.settingIcon,
          { backgroundColor: item.color + '20' }
        ]}>
          <Ionicons name={item.icon as any} size={22} color={item.color} />
        </View>
        <View style={styles.settingContent}>
          <Text style={[styles.settingLabel, { color: colors.text }]}>
            {item.label}
          </Text>
          <Text style={[styles.settingDescription, { color: colors.textMuted }]}>
            {item.description}
          </Text>
        </View>
        <View style={styles.settingAction}>
          {item.action === 'toggle' && (
            <Switch
              value={item.value}
              onValueChange={(value) => {
                if (item.onToggle) {
                  item.onToggle(value);
                }
              }}
              trackColor={{ false: colors.borderLight, true: item.color }}
              thumbColor="#FFFFFF"
            />
          )}
          {item.action === 'button' && (
            <TouchableOpacity
              style={[
                styles.actionButton,
                { backgroundColor: item.color + '15' }
              ]}
              onPress={item.onPress}
            >
              <Ionicons name="chevron-forward" size={16} color={item.color} />
            </TouchableOpacity>
          )}
          {item.action === 'info' && (
            <View style={styles.infoIcon}>
              <Ionicons name="information-circle-outline" size={16} color={colors.textMuted} />
            </View>
          )}
        </View>
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
          <Text style={[styles.title, { color: colors.text }]}>Settings</Text>
          <View style={styles.placeholder} />
        </View>
      </Animated.View>

      {/* Settings List */}
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {settingsSections.map((section, sectionIndex) => (
          <Animated.View
            key={section.title}
            entering={FadeInUp.duration(800).delay(sectionIndex * 200)}
            style={styles.section}
          >
            <View style={styles.sectionHeader}>
              <View style={[
                styles.sectionIcon,
                { backgroundColor: colors.primary + '20' }
              ]}>
                <Ionicons name={section.icon as any} size={24} color={colors.primary} />
              </View>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {section.title}
              </Text>
            </View>
            <Card variant="default" padding="none" style={styles.sectionCard}>
              {section.items.map((item, index) => renderSettingItem(item, index))}
            </Card>
          </Animated.View>
        ))}

        {/* Logout Button */}
        <Animated.View entering={FadeInUp.duration(800).delay(settingsSections.length * 200)} style={styles.logoutSection}>
          <Button
            title="Logout"
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              // Handle logout
            }}
            variant="outline"
            fullWidth={true}
            size="lg"
          />
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  sectionIcon: {
    width: ComponentSize.avatar.lg,
    height: ComponentSize.avatar.lg,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold as any,
  },
  sectionCard: {
    ...Shadow.card,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  settingTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    width: ComponentSize.avatar.md,
    height: ComponentSize.avatar.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  settingContent: {
    flex: 1,
  },
  settingLabel: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold as any,
    marginBottom: Spacing.xs,
  },
  settingDescription: {
    fontSize: FontSize.sm,
    lineHeight: 18,
  },
  settingAction: {
    alignItems: 'center',
  },
  actionButton: {
    width: ComponentSize.buttonHeight.md,
    height: ComponentSize.buttonHeight.md,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoIcon: {
    width: ComponentSize.buttonHeight.md,
    height: ComponentSize.buttonHeight.md,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutSection: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
});

export default SettingsScreen;
