import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TextInputProps,
  ViewStyle,
  TextStyle,
  Animated,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { BorderRadius, FontSize, FontWeight, Spacing, Shadow, ComponentSize, AnimationConfig } from '../../constants/theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  variant?: 'default' | 'glass' | 'minimal';
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
}

const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  variant = 'default',
  size = 'md',
  animated = true,
  style,
  value,
  onFocus,
  onBlur,
  ...props
}) => {
  const { colors } = useTheme();
  const [isFocused, setIsFocused] = React.useState(false);
  const animatedValue = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (animated) {
      Animated.timing(animatedValue, {
        toValue: isFocused ? 1 : 0,
        duration: AnimationConfig.timing.normal,
        useNativeDriver: false,
      }).start();
    }
  }, [isFocused, animated]);

  const handleFocus = (e: any) => {
    setIsFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
    onBlur?.(e);
  };

  const getSizeStyles = (): { container: ViewStyle; input: TextStyle } => {
    switch (size) {
      case 'sm':
        return {
          container: { height: ComponentSize.inputHeight.sm },
          input: { fontSize: FontSize.sm },
        };
      case 'lg':
        return {
          container: { height: ComponentSize.inputHeight.lg },
          input: { fontSize: FontSize.lg },
        };
      default:
        return {
          container: { height: ComponentSize.inputHeight.md },
          input: { fontSize: FontSize.md },
        };
    }
  };

  const getVariantStyles = (): { container: ViewStyle; input: TextStyle } => {
    const borderColor = error ? colors.error : isFocused ? colors.primary : colors.border;
    const backgroundColor = variant === 'glass' ? colors.glass.background : colors.surface;

    switch (variant) {
      case 'glass':
        return {
          container: {
            backgroundColor,
            borderWidth: 1,
            borderColor: colors.glass.border,
            ...Shadow.glass,
          },
          input: {
            color: colors.text,
          },
        };
      case 'minimal':
        return {
          container: {
            backgroundColor: 'transparent',
            borderBottomWidth: 2,
            borderBottomColor: borderColor,
            borderRadius: 0,
          },
          input: {
            color: colors.text,
          },
        };
      default:
        return {
          container: {
            backgroundColor,
            borderWidth: 1,
            borderColor,
            ...Shadow.card,
          },
          input: {
            color: colors.text,
          },
        };
    }
  };

  const sizeStyles = getSizeStyles();
  const variantStyles = getVariantStyles();

  const animatedBorderColor = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.border, colors.primary],
  });

  const animatedShadow = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 8],
  });

  const containerStyle = {
    ...styles.container,
    ...sizeStyles.container,
    ...variantStyles.container,
    ...(animated && {
      borderColor: variant === 'minimal' ? undefined : animatedBorderColor,
      shadowOpacity: animatedShadow,
    }),
  };

  const inputStyle: TextStyle = {
    ...styles.input,
    ...sizeStyles.input,
    ...variantStyles.input,
  };

  return (
    <View style={styles.wrapper}>
      {label && (
        <Text style={[styles.label, { color: colors.textSecondary }]}>
          {label}
        </Text>
      )}
      
      <Animated.View style={[containerStyle, style]}>
        {leftIcon && (
          <View style={styles.leftIcon}>
            {leftIcon}
          </View>
        )}
        
        <TextInput
          style={[inputStyle, leftIcon ? { paddingLeft: 0 } : undefined]}
          placeholderTextColor={colors.textMuted}
          onFocus={handleFocus}
          onBlur={handleBlur}
          value={value}
          {...props}
        />
        
        {rightIcon && (
          <View style={styles.rightIcon}>
            {rightIcon}
          </View>
        )}
      </Animated.View>
      
      {error && (
        <Text style={[styles.errorText, { color: colors.error }]}>
          {error}
        </Text>
      )}
      
      {helperText && !error && (
        <Text style={[styles.helperText, { color: colors.textMuted }]}>
          {helperText}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: Spacing.md,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    position: 'relative',
  },
  input: {
    flex: 1,
    fontWeight: FontWeight.normal as any,
    paddingVertical: Spacing.sm,
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium as any,
    marginBottom: Spacing.xs,
    letterSpacing: 0.3,
  },
  leftIcon: {
    marginRight: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightIcon: {
    marginLeft: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium as any,
    marginTop: Spacing.xs,
    letterSpacing: 0.2,
  },
  helperText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.normal as any,
    marginTop: Spacing.xs,
    letterSpacing: 0.2,
  },
});

export default Input;
