import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  TouchableOpacityProps,
  Animated,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius, Shadow, ComponentSize, AnimationConfig } from '../../constants/theme';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'glass';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  gradient?: boolean;
  animated?: boolean;
}

const Button: React.FC<ButtonProps> = ({
  title,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  gradient = false,
  animated = true,
  disabled,
  onPress,
  style,
  ...props
}) => {
  const animatedValue = React.useRef(new Animated.Value(1)).current;

  const handlePress = async (e: any) => {
    if (animated) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Scale animation
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 0.95,
          duration: AnimationConfig.timing.fast,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: AnimationConfig.timing.fast,
          useNativeDriver: true,
        }),
      ]).start();
    }

    onPress?.(e);
  };

  const getSizeStyles = (): { container: ViewStyle; text: TextStyle } => {
    switch (size) {
      case 'xs':
        return {
          container: {
            height: ComponentSize.buttonHeight.xs,
            paddingHorizontal: Spacing.md,
          },
          text: { fontSize: FontSize.xs },
        };
      case 'sm':
        return {
          container: {
            height: ComponentSize.buttonHeight.sm,
            paddingHorizontal: Spacing.md,
          },
          text: { fontSize: FontSize.sm },
        };
      case 'lg':
        return {
          container: {
            height: ComponentSize.buttonHeight.lg,
            paddingHorizontal: Spacing.xl,
          },
          text: { fontSize: FontSize.lg },
        };
      case 'xl':
        return {
          container: {
            height: ComponentSize.buttonHeight.xl,
            paddingHorizontal: Spacing.xxl,
          },
          text: { fontSize: FontSize.xl },
        };
      default:
        return {
          container: {
            height: ComponentSize.buttonHeight.md,
            paddingHorizontal: Spacing.lg,
          },
          text: { fontSize: FontSize.md },
        };
    }
  };

  const getVariantStyles = (): { container: ViewStyle; text: TextStyle } => {
    switch (variant) {
      case 'secondary':
        return {
          container: {
            backgroundColor: Colors.secondary,
            borderWidth: 1,
            borderColor: Colors.borderLight,
            ...Shadow.card,
          },
          text: { color: Colors.text },
        };
      case 'outline':
        return {
          container: {
            backgroundColor: 'transparent',
            borderWidth: 2,
            borderColor: Colors.primary,
            ...Shadow.sm,
          },
          text: { color: Colors.primary },
        };
      case 'ghost':
        return {
          container: { backgroundColor: 'transparent' },
          text: { color: Colors.primary },
        };
      case 'destructive':
        return {
          container: {
            backgroundColor: Colors.error,
            ...Shadow.button,
          },
          text: { color: '#FFFFFF' },
        };
      case 'glass':
        return {
          container: {
            backgroundColor: Colors.glass.background,
            borderWidth: 1,
            borderColor: Colors.glass.border,
            ...Shadow.glass,
          },
          text: { color: Colors.text },
        };
      default:
        return {
          container: {
            backgroundColor: Colors.primary,
            ...Shadow.button,
          },
          text: { color: '#FFFFFF' },
        };
    }
  };

  const sizeStyles = getSizeStyles();
  const variantStyles = getVariantStyles();

  const containerStyle: ViewStyle = {
    ...styles.container,
    ...sizeStyles.container,
    ...variantStyles.container,
    ...(fullWidth && { width: '100%' }),
    ...(disabled && { opacity: 0.5 }),
  };

  const textStyle: TextStyle = {
    ...styles.text,
    ...sizeStyles.text,
    ...variantStyles.text,
  };

  const content = (
    <>
      {loading ? (
        <ActivityIndicator color={variantStyles.text.color} size="small" />
      ) : (
        <>
          {icon && iconPosition === 'left' && (
            <View style={{ marginRight: Spacing.sm }}>
              {icon}
            </View>
          )}
          <Text style={[textStyle, icon && iconPosition === 'right' ? { marginLeft: Spacing.sm } : undefined]}>
            {title}
          </Text>
          {icon && iconPosition === 'right' && (
            <View style={{ marginLeft: Spacing.sm }}>
              {icon}
            </View>
          )}
        </>
      )}
    </>
  );

  const animatedStyle = animated ? {
    transform: [{ scale: animatedValue }]
  } : {};

  if (variant === 'primary' && gradient && !disabled) {
    return (
      <TouchableOpacity
        onPress={handlePress}
        disabled={disabled || loading}
        activeOpacity={0.9}
        style={[fullWidth && { width: '100%' }, animatedStyle, style]}
        {...props}
      >
        <LinearGradient
          colors={['#00B388', '#4DC19C', '#80D4B7']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[containerStyle, { backgroundColor: undefined }]}
        >
          {content}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      style={[containerStyle, animatedStyle, style]}
      {...props}
    >
      {content}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.button,
    position: 'relative',
    overflow: 'hidden',
  },
  text: {
    fontWeight: FontWeight.semibold,
    textAlign: 'center',
    letterSpacing: 0.5,
    textTransform: 'none',
  },
});

export default Button;
