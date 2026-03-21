import React from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  TextInputProps,
} from 'react-native';
import { Colors, FontSize, Spacing, BorderRadius, Shadow, ComponentSize } from '../../constants/theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  variant?: 'outlined' | 'filled' | 'underlined';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  style?: ViewStyle; // Override the inherited style prop to be ViewStyle instead of TextInput style
}

const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  variant = 'outlined',
  size = 'md',
  fullWidth = false,
  style,
  ...props
}: InputProps) => {
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
    const hasError = !!error;
    const borderColor = hasError ? Colors.error : Colors.border;

    switch (variant) {
      case 'filled':
        return {
          container: {
            backgroundColor: Colors.secondary,
            borderWidth: 0,
            ...Shadow.sm,
          },
          input: { color: Colors.text },
        };
      case 'underlined':
        return {
          container: {
            backgroundColor: 'transparent',
            borderBottomWidth: 1,
            borderBottomColor: borderColor,
            borderRadius: 0,
          },
          input: { color: Colors.text },
        };
      default:
        return {
          container: {
            backgroundColor: 'transparent',
            borderWidth: 1,
            borderColor,
            ...Shadow.sm,
          },
          input: { color: Colors.text },
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
  };

  const inputStyle: TextStyle = {
    ...styles.input,
    ...sizeStyles.input,
    ...variantStyles.input,
  };

  return (
    <View style={[fullWidth && { width: '100%' }, style]}>
      {label && (
        <Text style={styles.label}>{label}</Text>
      )}
      <View style={containerStyle}>
        {leftIcon && (
          <View style={styles.leftIcon}>
            {leftIcon}
          </View>
        )}
        <TextInput
          style={[inputStyle, { flex: 1 }]}
          placeholderTextColor={Colors.textLight}
          {...props}
        />
        {rightIcon && (
          <View style={styles.rightIcon}>
            {rightIcon}
          </View>
        )}
      </View>
      {(error || helperText) && (
        <Text style={[styles.helperText, error ? { color: Colors.error } : {}]}>
          {error || helperText}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
  },
  input: {
    fontWeight: '400',
    paddingVertical: 0,
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  helperText: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  leftIcon: {
    marginRight: Spacing.sm,
  },
  rightIcon: {
    marginLeft: Spacing.sm,
  },
});

export default Input;
