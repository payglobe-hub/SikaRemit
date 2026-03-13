import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../context/ThemeContext';
import { BorderRadius, Spacing, Shadow, AnimationConfig } from '../../constants/theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'default' | 'glass' | 'gradient' | 'elevated';
  padding?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  onPress?: () => void;
  animated?: boolean;
}

const Card: React.FC<CardProps> = ({
  children,
  style,
  variant = 'default',
  padding = 'md',
  onPress,
  animated = true,
}) => {
  const { colors } = useTheme();
  const animatedValue = React.useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (animated && onPress) {
      Animated.timing(animatedValue, {
        toValue: 0.95,
        duration: AnimationConfig.timing.fast,
        useNativeDriver: true,
      }).start();
    }
  };

  const handlePressOut = () => {
    if (animated && onPress) {
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: AnimationConfig.timing.fast,
        useNativeDriver: true,
      }).start();
    }
  };

  const getPadding = () => {
    switch (padding) {
      case 'xs': return Spacing.xs;
      case 'sm': return Spacing.sm;
      case 'lg': return Spacing.lg;
      case 'xl': return Spacing.xl;
      default: return Spacing.md;
    }
  };

  const getVariantStyles = (): ViewStyle => {
    switch (variant) {
      case 'glass':
        return {
          backgroundColor: colors.glass.background,
          borderWidth: 1,
          borderColor: colors.glass.border,
          ...Shadow.glass,
        };
      case 'gradient':
        return {
          ...Shadow.card,
        };
      case 'elevated':
        return {
          backgroundColor: colors.surface,
          ...Shadow.floating,
        };
      default:
        return {
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.borderLight,
          ...Shadow.card,
        };
    }
  };

  const animatedStyle = animated ? {
    transform: [{ scale: animatedValue }]
  } : {};

  const containerStyle: ViewStyle = {
    ...styles.container,
    ...getVariantStyles(),
    padding: getPadding(),
    ...animatedStyle,
    ...style,
  };

  const content = (
    <>
      {variant === 'gradient' ? (
        <LinearGradient
          colors={colors.gradient.primary as [string, string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.gradientBorder, { padding: 1 }]}
        >
          <View style={[styles.gradientContent, { padding: getPadding() }]}>
            {children}
          </View>
        </LinearGradient>
      ) : (
        <View style={containerStyle}>
          {children}
        </View>
      )}
    </>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}
        style={style}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.card,
    position: 'relative',
    overflow: 'hidden',
  },
  gradientBorder: {
    borderRadius: BorderRadius.card,
  },
  gradientContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.card - 1,
    flex: 1,
  },
});

export default Card;
