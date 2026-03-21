import React from 'react';
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
} from 'react-native-reanimated';
import { Card, Button } from '../../components/ui';
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

const { width } = Dimensions.get('window');

const ProfileHomeScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const { user, logout } = useAuthStore();

  const menuItems = [
    { icon: 'person-outline', label: 'Edit Profile', screen: 'EditProfile' },
    { icon: 'shield-checkmark-outline', label: 'KYC Verification', screen: 'KYCVerification', badge: user?.kyc_status !== 'approved' },
    { icon: 'card-outline', label: 'Payment Methods', screen: 'PaymentMethods' },
    { icon: 'lock-closed-outline', label: 'Security', screen: 'Security' },
    { icon: 'settings-outline', label: 'Settings', screen: 'Settings' },
    { icon: 'help-circle-outline', label: 'Help & Support', screen: 'Support' },
  ];

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: () => logout() },
      ]
    );
  };

  const getKYCStatusColor = () => {
    switch (user?.kyc_status) {
      case 'approved': return colors.success;
      case 'pending': return colors.warning;
      case 'rejected': return colors.error;
      default: return colors.textMuted;
    }
  };

  const handleMenuPress = (item: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate(item.screen);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.lg }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header */}
        <Animated.View entering={FadeInDown.duration(800)} style={styles.profileHeader}>
          <View style={styles.headerContent}>
            <LinearGradient
              colors={colors.gradient.primary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.avatarContainer, Shadow.floating]}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {user?.first_name?.charAt(0) || 'U'}{user?.last_name?.charAt(0) || ''}
                </Text>
              </View>
            </LinearGradient>
            
            <View style={styles.userInfo}>
              <Text style={[styles.userName, { color: colors.text }]}>
                {user?.first_name} {user?.last_name}
              </Text>
              <Text style={[styles.userEmail, { color: colors.textSecondary }]}>
                {user?.email}
              </Text>
              
              <View style={styles.badges}>
                <View style={[styles.badge, { backgroundColor: user?.is_verified ? colors.success + '20' : colors.warning + '20' }]}>
                  <Ionicons
                    name={user?.is_verified ? 'checkmark-circle' : 'alert-circle'}
                    size={14}
                    color={user?.is_verified ? colors.success : colors.warning}
                  />
                  <Text style={[styles.badgeText, { color: user?.is_verified ? colors.success : colors.warning }]}>
                    {user?.is_verified ? 'Verified' : 'Unverified'}
                  </Text>
                </View>
                <View style={[styles.badge, { backgroundColor: getKYCStatusColor() + '20' }]}>
                  <Text style={[styles.badgeText, { color: getKYCStatusColor() }]}>
                    KYC: {user?.kyc_status || 'Not Submitted'}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Menu Items */}
        <Animated.View entering={FadeInUp.duration(800).delay(200)} style={styles.menuSection}>
          <Card variant="default" padding="none" style={styles.menuCard}>
            {menuItems.map((item, index) => (
              <Animated.View
                key={item.label}
                entering={FadeInRight.duration(400).delay(400 + index * 100)}
              >
                <TouchableOpacity
                  style={[
                    styles.menuItem,
                    index < menuItems.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.borderLight },
                  ]}
                  onPress={() => handleMenuPress(item)}
                >
                  <View style={[styles.menuIcon, { backgroundColor: colors.primary + '15' }]}>
                    <Ionicons name={item.icon as any} size={24} color={colors.primary} />
                  </View>
                  <Text style={[styles.menuLabel, { color: colors.text }]}>
                    {item.label}
                  </Text>
                  <View style={styles.menuRight}>
                    {item.badge && (
                      <View style={[styles.menuBadge, { backgroundColor: colors.error }]}>
                        <Text style={styles.menuBadgeText}>!</Text>
                      </View>
                    )}
                    <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                  </View>
                </TouchableOpacity>
              </Animated.View>
            ))}
          </Card>
        </Animated.View>

        {/* Logout Button */}
        <Animated.View entering={FadeInUp.duration(800).delay(600)} style={styles.logoutSection}>
          <Button
            title="Logout"
            onPress={handleLogout}
            variant="outline"
            fullWidth={true}
            size="lg"
          />
        </Animated.View>

        {/* App Version */}
        <Animated.View entering={FadeInUp.duration(800).delay(800)} style={styles.versionSection}>
          <Text style={[styles.versionText, { color: colors.textMuted }]}>
            SikaRemit v1.0.0
          </Text>
          <Text style={[styles.versionSubtext, { color: colors.textMuted }]}>
            © 2024 SikaRemit. All rights reserved.
          </Text>
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
  content: {
    paddingBottom: Spacing.xxl,
  },
  profileHeader: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xxl,
  },
  headerContent: {
    alignItems: 'center',
  },
  avatarContainer: {
    width: 120,
    height: 120,
    borderRadius: BorderRadius.xxxl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  avatar: {
    width: 110,
    height: 110,
    borderRadius: BorderRadius.xxxl,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: FontSize.display,
    fontWeight: FontWeight.black as any,
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  userInfo: {
    alignItems: 'center',
  },
  userName: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold as any,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  userEmail: {
    fontSize: FontSize.md,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  badges: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  badgeText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium as any,
    marginLeft: Spacing.xs,
  },
  menuSection: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  menuCard: {
    borderRadius: BorderRadius.lg,
    ...Shadow.card,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  menuIcon: {
    width: ComponentSize.avatar.md,
    height: ComponentSize.avatar.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  menuLabel: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold as any,
    flex: 1,
  },
  menuRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  menuBadge: {
    width: 20,
    height: 20,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuBadgeText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold as any,
    color: '#FFFFFF',
  },
  logoutSection: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  versionSection: {
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  versionText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium as any,
    marginBottom: Spacing.xs,
  },
  versionSubtext: {
    fontSize: FontSize.xs,
    textAlign: 'center',
  },
});

export default ProfileHomeScreen;
