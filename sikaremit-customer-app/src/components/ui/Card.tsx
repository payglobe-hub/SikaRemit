import React from 'react';
import { View, StyleSheet, ViewStyle, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../context/ThemeContext';
import { BorderRadius, Shadow, Spacing } from '../../constants/theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'default' | 'elevated' | 'outline' | 'gradient' | 'glass';
  onPress?: () => void;
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
}

const Card: React.FC<CardProps> = ({
  children,
  style,
  variant = 'default',
  onPress,
  padding = 'md',
}) => {
  const { colors } = useTheme();

  const getPadding = () => {
    switch (padding) {
      case 'none':
        return 0;
      case 'sm':
        return Spacing.sm;
      case 'lg':
        return Spacing.lg;
      case 'xl':
        return Spacing.xl;
      default:
        return Spacing.md;
    }
  };

  const getVariantStyle = (): ViewStyle => {
    switch (variant) {
      case 'elevated':
        return {
          backgroundColor: colors.surface,
          borderWidth: 0,
          ...Shadow.card,
        };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: colors.border,
        };
      case 'gradient':
        return {
          borderWidth: 0,
        };
      case 'glass':
        return {
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          borderWidth: 1,
          borderColor: 'rgba(255, 255, 255, 0.2)',
        };
      default:
        return {
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.borderLight,
        };
    }
  };

  const baseStyle: ViewStyle = {
    ...styles.card,
    ...getVariantStyle(),
    padding: getPadding(),
  };

  if (variant === 'gradient') {
    const gradientColors = colors.gradient.primary;
    const content = (
      <LinearGradient
        colors={gradientColors as [string, string, ...string[]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[baseStyle, { backgroundColor: undefined }, style]}
      >
        {children}
      </LinearGradient>
    );

    if (onPress) {
      return (
        <TouchableOpacity onPress={onPress} activeOpacity={0.9}>
          {content}
        </TouchableOpacity>
      );
    }
    return content;
  }

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={[baseStyle, style]}>
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={[baseStyle, style]}>{children}</View>;
};

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
  },
});

export default Card;
