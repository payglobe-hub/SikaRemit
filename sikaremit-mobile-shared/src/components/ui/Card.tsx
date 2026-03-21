import React from 'react';
import {
  View,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, BorderRadius, Shadow, ComponentSize } from '../../constants/theme';

interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'outlined' | 'glass' | 'gradient';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  style?: ViewStyle;
}

const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  size = 'md',
  fullWidth = false,
  style,
}) => {
  const getSizeStyles = (): ViewStyle => {
    switch (size) {
      case 'sm':
        return {
          padding: ComponentSize.cardPadding.sm,
        };
      case 'lg':
        return {
          padding: ComponentSize.cardPadding.lg,
        };
      default:
        return {
          padding: ComponentSize.cardPadding.md,
        };
    }
  };

  const getVariantStyles = (): ViewStyle => {
    switch (variant) {
      case 'elevated':
        return {
          backgroundColor: Colors.background,
          ...Shadow.lg,
        };
      case 'outlined':
        return {
          backgroundColor: Colors.background,
          borderWidth: 1,
          borderColor: Colors.border,
          ...Shadow.sm,
        };
      case 'glass':
        return {
          backgroundColor: Colors.glass.background,
          borderWidth: 1,
          borderColor: Colors.glass.border,
          ...Shadow.glass,
        };
      case 'gradient':
        return {
          backgroundColor: Colors.primary,
        };
      default:
        return {
          backgroundColor: Colors.background,
          ...Shadow.card,
        };
    }
  };

  const sizeStyles = getSizeStyles();
  const variantStyles = getVariantStyles();

  const containerStyle: ViewStyle = {
    ...styles.container,
    ...sizeStyles,
    ...variantStyles,
    ...(fullWidth && { width: '100%' }),
  };

  if (variant === 'gradient') {
    return (
      <LinearGradient
        colors={['#00B388', '#4DC19C', '#80D4B7']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[containerStyle, { backgroundColor: undefined }, style]}
      >
        {children}
      </LinearGradient>
    );
  }

  return (
    <View style={[containerStyle, style]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.card,
  },
});

export default Card;
