import React from 'react';
import { ViewStyle, StyleProp } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

interface AnimatedPressableProps {
  children: React.ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  style?: StyleProp<ViewStyle>;
  scaleValue?: number;
  hapticFeedback?: 'light' | 'medium' | 'heavy' | 'none';
  disabled?: boolean;
}

export const AnimatedPressable: React.FC<AnimatedPressableProps> = ({
  children,
  onPress,
  onLongPress,
  style,
  scaleValue = 0.97,
  hapticFeedback = 'light',
  disabled = false,
}) => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const triggerHaptic = () => {
    if (hapticFeedback === 'none') return;
    
    const feedbackStyle = {
      light: Haptics.ImpactFeedbackStyle.Light,
      medium: Haptics.ImpactFeedbackStyle.Medium,
      heavy: Haptics.ImpactFeedbackStyle.Heavy,
    }[hapticFeedback];
    
    Haptics.impactAsync(feedbackStyle);
  };

  const handlePress = () => {
    if (!disabled && onPress) {
      triggerHaptic();
      onPress();
    }
  };

  const handleLongPress = () => {
    if (!disabled && onLongPress) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      onLongPress();
    }
  };

  const gesture = Gesture.Tap()
    .enabled(!disabled)
    .onBegin(() => {
      scale.value = withSpring(scaleValue, { damping: 15, stiffness: 400 });
      opacity.value = withTiming(0.9, { duration: 100 });
    })
    .onFinalize(() => {
      scale.value = withSpring(1, { damping: 15, stiffness: 400 });
      opacity.value = withTiming(1, { duration: 100 });
    })
    .onEnd(() => {
      runOnJS(handlePress)();
    });

  const longPressGesture = Gesture.LongPress()
    .enabled(!disabled && !!onLongPress)
    .minDuration(500)
    .onStart(() => {
      runOnJS(handleLongPress)();
    });

  const composedGesture = Gesture.Race(gesture, longPressGesture);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View style={[style, animatedStyle, disabled && { opacity: 0.5 }]}>
        {children}
      </Animated.View>
    </GestureDetector>
  );
};

export default AnimatedPressable;
