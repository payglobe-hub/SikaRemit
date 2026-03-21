import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withSpring,
  interpolate,
} from 'react-native-reanimated';
import { useTheme } from '../../context/ThemeContext';
import { BorderRadius, Shadow, Spacing } from '../../constants/theme';

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  intensity?: number;
  tint?: 'light' | 'dark' | 'default';
  variant?: 'glass' | 'gradient' | 'elevated' | 'outlined';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  animated?: boolean;
  onPress?: () => void;
}

const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  style,
  intensity = 80,
  tint = 'default',
  variant = 'glass',
  padding = 'md',
  animated = false,
}) => {
  const { colors, isDark } = useTheme();
  const scale = useSharedValue(1);

  const paddingValue = {
    none: 0,
    sm: Spacing.sm,
    md: Spacing.md,
    lg: Spacing.lg,
  }[padding];

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  const handlePressIn = () => {
    if (animated) {
      scale.value = withSpring(0.98, { damping: 15, stiffness: 400 });
    }
  };

  const handlePressOut = () => {
    if (animated) {
      scale.value = withSpring(1, { damping: 15, stiffness: 400 });
    }
  };

  if (variant === 'glass') {
    return (
      <Animated.View 
        style={[
          styles.container, 
          animatedStyle,
          style,
        ]}
      >
        <BlurView
          intensity={intensity}
          tint={tint === 'default' ? (isDark ? 'dark' : 'light') : tint}
          style={[
            styles.blurView,
            { padding: paddingValue },
          ]}
        >
          <View style={[styles.glassOverlay, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.7)' }]}>
            {children}
          </View>
        </BlurView>
        <View style={[styles.border, { borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.5)' }]} />
      </Animated.View>
    );
  }

  if (variant === 'gradient') {
    return (
      <Animated.View style={[styles.container, animatedStyle, style]}>
        <LinearGradient
          colors={isDark 
            ? ['rgba(139, 92, 246, 0.3)', 'rgba(236, 72, 153, 0.3)']
            : ['rgba(139, 92, 246, 0.15)', 'rgba(236, 72, 153, 0.15)']
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.gradientCard, { padding: paddingValue }]}
        >
          {children}
        </LinearGradient>
      </Animated.View>
    );
  }

  if (variant === 'elevated') {
    return (
      <Animated.View
        style={[
          styles.elevatedCard,
          {
            backgroundColor: colors.surface,
            padding: paddingValue,
            ...Shadow.lg,
          },
          animatedStyle,
          style,
        ]}
      >
        {children}
      </Animated.View>
    );
  }

  // Outlined variant
  return (
    <Animated.View
      style={[
        styles.outlinedCard,
        {
          backgroundColor: colors.surface,
          borderColor: '#E5E7EB',
          padding: paddingValue,
        },
        animatedStyle,
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.xxl,
    overflow: 'hidden',
  },
  blurView: {
    borderRadius: BorderRadius.xxl,
    overflow: 'hidden',
  },
  glassOverlay: {
    borderRadius: BorderRadius.xxl,
  },
  border: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: BorderRadius.xxl,
    borderWidth: 1,
    pointerEvents: 'none',
  },
  gradientCard: {
    borderRadius: BorderRadius.xxl,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.2)',
  },
  elevatedCard: {
    borderRadius: BorderRadius.xxl,
  },
  outlinedCard: {
    borderRadius: BorderRadius.xxl,
    borderWidth: 1,
  },
});

export default GlassCard;
