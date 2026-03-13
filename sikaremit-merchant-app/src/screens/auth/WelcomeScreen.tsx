import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Dimensions, 
  Image,
  ScrollView,
  TouchableOpacity 
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { 
  FadeInDown, 
  FadeInUp,
  FadeInRight,
  useSharedValue, 
  useAnimatedStyle, 
  withSpring,
  withTiming,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { Button } from '../../components/ui';
import { useTheme } from '../../context/ThemeContext';
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

const { width, height } = Dimensions.get('window');

type WelcomeScreenProps = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Welcome'>;
};

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const scrollY = useSharedValue(0);
  
  const onScroll = (event: any) => {
    scrollY.value = event.nativeEvent.contentOffset.y;
  };

  const headerOpacity = interpolate(scrollY.value, [0, 100], [1, 0], Extrapolation.CLAMP);
  const headerTranslateY = interpolate(scrollY.value, [0, 100], [0, -20], Extrapolation.CLAMP);

  const featuresOpacity = interpolate(scrollY.value, [0, 200], [0, 1], Extrapolation.CLAMP);
  const featuresTranslateY = interpolate(scrollY.value, [0, 200], [50, 0], Extrapolation.CLAMP);

  const ctaOpacity = interpolate(scrollY.value, [0, 300], [0, 1], Extrapolation.CLAMP);
  const ctaTranslateY = interpolate(scrollY.value, [0, 300], [100, 0], Extrapolation.CLAMP);

  const handleGetStarted = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate('Register');
  };

  const handleSignIn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('Login');
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={colors.gradient.primary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
        >
          <View style={[styles.content, { paddingTop: insets.top + Spacing.xl }]}>
            {/* Header */}
            <Animated.View
              style={[
                styles.header,
                {
                  opacity: headerOpacity,
                  transform: [{ translateY: headerTranslateY }]
                }
              ]}
            >
              <Text style={styles.appTitle}>SikaRemit</Text>
              <Text style={styles.appTagline}>Financial Technology</Text>
            </Animated.View>

            {/* Hero Section */}
            <Animated.View 
              entering={FadeInUp.duration(1000).delay(200)}
              style={styles.heroSection}
            >
              <Text style={styles.heroTitle}>
                Secure Payments{'\n'}for the Digital Age
              </Text>
              <Text style={styles.heroSubtitle}>
                Send money, pay bills, and manage your finances with ease. Fast, secure, and reliable.
              </Text>
            </Animated.View>

            {/* Features */}
            <Animated.View
              entering={FadeInUp.duration(1200).delay(400)}
              style={[
                styles.features,
                {
                  opacity: featuresOpacity,
                  transform: [{ translateY: featuresTranslateY }]
                }
              ]}
            >
              <View style={styles.featureItem}>
                <View style={[styles.featureIcon, { backgroundColor: colors.primary + '20' }]}>
                  <Ionicons name="shield-checkmark" size={24} color={colors.primary} />
                </View>
                <Text style={styles.featureTitle}>Secure</Text>
                <Text style={styles.featureDescription}>
                  Bank-level security for your transactions
                </Text>
              </View>
              <View style={styles.featureItem}>
                <View style={[styles.featureIcon, { backgroundColor: colors.accent + '20' }]}>
                  <Ionicons name="flash" size={24} color={colors.accent} />
                </View>
                <Text style={styles.featureTitle}>Fast</Text>
                <Text style={styles.featureDescription}>
                  Instant transfers and payments
                </Text>
              </View>
              <View style={styles.featureItem}>
                <View style={[styles.featureIcon, { backgroundColor: colors.success + '20' }]}>
                  <Ionicons name="globe" size={24} color={colors.success} />
                </View>
                <Text style={styles.featureTitle}>Global</Text>
                <Text style={styles.featureDescription}>
                  Send money worldwide
                </Text>
              </View>
            </Animated.View>

            {/* Stats Section */}
            <Animated.View
              entering={FadeInUp.duration(1200).delay(600)}
              style={[
                styles.statsSection,
                {
                  opacity: ctaOpacity,
                  transform: [{ translateY: ctaTranslateY }]
                }
              ]}
            >
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>1M+</Text>
                <Text style={styles.statLabel}>Users</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>99.9%</Text>
                <Text style={styles.statLabel}>Uptime</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>50+</Text>
                <Text style={styles.statLabel}>Countries</Text>
              </View>
            </Animated.View>

            {/* CTA Section */}
            <Animated.View
              entering={FadeInUp.duration(1200).delay(800)}
              style={[
                styles.ctaSection,
                {
                  opacity: ctaOpacity,
                  transform: [{ translateY: ctaTranslateY }]
                }
              ]}
            >
              <Text style={styles.ctaTitle}>
                Ready to get started?
              </Text>
              <Text style={styles.ctaSubtitle}>
                Join thousands of users who trust SikaRemit for their financial needs
              </Text>
              <View style={styles.buttonRow}>
                <Button
                  title="Sign Up"
                  onPress={handleGetStarted}
                  variant="outline"
                  size="lg"
                  style={styles.ctaButton}
                />
                <Button
                  title="Sign In"
                  onPress={handleSignIn}
                  gradient={true}
                  size="lg"
                  style={styles.ctaButton}
                />
              </View>
            </Animated.View>

            {/* Footer */}
            <Animated.View
              entering={FadeInUp.duration(1200).delay(1000)}
              style={styles.footer}
            >
              <Text style={styles.footerText}>
                © 2024 SikaRemit. All rights reserved.
              </Text>
              <View style={styles.footerLinks}>
                <TouchableOpacity>
                  <Text style={styles.footerLink}>Privacy Policy</Text>
                </TouchableOpacity>
                <TouchableOpacity>
                  <Text style={styles.footerLink}>Terms of Service</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>

            <View style={{ height: Spacing.xxxl }} />
          </View>
        </ScrollView>
      </LinearGradient>
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
  scrollView: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  appTitle: {
    fontSize: FontSize.display,
    fontWeight: FontWeight.black as any,
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 3,
    marginBottom: Spacing.xs,
  },
  appTagline: {
    fontSize: FontSize.md,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: FontWeight.medium as any,
  },
  heroSection: {
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xxxl,
  },
  heroTitle: {
    fontSize: FontSize.display,
    fontWeight: FontWeight.black as any,
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 50,
    marginBottom: Spacing.md,
  },
  heroSubtitle: {
    fontSize: FontSize.lg,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: Spacing.lg,
  },
  features: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xxxl,
  },
  featureItem: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  featureIcon: {
    width: ComponentSize.avatar.lg,
    height: ComponentSize.avatar.lg,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  featureTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold as any,
    color: '#FFFFFF',
    marginBottom: Spacing.xs,
  },
  featureDescription: {
    fontSize: FontSize.sm,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: 18,
  },
  statsSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xxxl,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: FontSize.xxxl,
    fontWeight: FontWeight.black as any,
    color: '#FFFFFF',
    marginBottom: Spacing.xs,
  },
  statLabel: {
    fontSize: FontSize.sm,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: FontWeight.medium as any,
  },
  ctaSection: {
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xxxl,
  },
  ctaTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold as any,
    color: '#FFFFFF',
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  ctaSubtitle: {
    fontSize: FontSize.md,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    width: '100%',
    maxWidth: 300,
  },
  ctaButton: {
    flex: 1,
  },
  footer: {
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  footerText: {
    fontSize: FontSize.sm,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: Spacing.sm,
  },
  footerLinks: {
    flexDirection: 'row',
    gap: Spacing.lg,
  },
  footerLink: {
    fontSize: FontSize.sm,
    color: 'rgba(255,255,255,0.8)',
    textDecorationLine: 'underline',
  },
});

export default WelcomeScreen;
