import React, { useEffect } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../context/ThemeContext';
import { BorderRadius } from '../../constants/theme';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 20,
  borderRadius = BorderRadius.md,
  style,
}) => {
  const { colors } = useTheme();
  const shimmerValue = useSharedValue(0);

  useEffect(() => {
    shimmerValue.value = withRepeat(
      withTiming(1, { duration: 1500 }),
      -1,
      false
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    const translateX = interpolate(
      shimmerValue.value,
      [0, 1],
      [-200, 200]
    );
    return {
      transform: [{ translateX }],
    };
  });

  return (
    <View
      style={[
        styles.skeleton,
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: colors.surface,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <Animated.View style={[styles.shimmer, animatedStyle]}>
        <LinearGradient
          colors={[
            'transparent',
            colors.surfaceVariant + '60',
            'transparent',
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradient}
        />
      </Animated.View>
    </View>
  );
};

// Pre-built skeleton components for common use cases
export const SkeletonText: React.FC<{ lines?: number; lastLineWidth?: string }> = ({
  lines = 1,
  lastLineWidth = '60%',
}) => {
  return (
    <View style={styles.textContainer}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          width={index === lines - 1 ? lastLineWidth : '100%'}
          height={14}
          style={index < lines - 1 ? { marginBottom: 8 } : undefined}
        />
      ))}
    </View>
  );
};

export const SkeletonAvatar: React.FC<{ size?: number }> = ({ size = 48 }) => {
  return <Skeleton width={size} height={size} borderRadius={size / 2} />;
};

export const SkeletonCard: React.FC = () => {
  const { colors } = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: '#E5E7EB' }]}>
      <View style={styles.cardHeader}>
        <SkeletonAvatar size={44} />
        <View style={styles.cardHeaderText}>
          <Skeleton width="70%" height={16} style={{ marginBottom: 8 }} />
          <Skeleton width="40%" height={12} />
        </View>
      </View>
      <Skeleton width="100%" height={1} style={{ marginVertical: 12 }} />
      <SkeletonText lines={2} />
    </View>
  );
};

export const SkeletonTransaction: React.FC = () => {
  const { colors } = useTheme();
  return (
    <View style={[styles.transaction, { borderBottomColor: colors.divider }]}>
      <Skeleton width={44} height={44} borderRadius={12} />
      <View style={styles.transactionContent}>
        <Skeleton width="60%" height={16} style={{ marginBottom: 6 }} />
        <Skeleton width="30%" height={12} />
      </View>
      <Skeleton width={70} height={18} />
    </View>
  );
};

export const SkeletonWalletCard: React.FC = () => {
  return (
    <View style={styles.walletSkeleton}>
      <Skeleton width={160} height={100} borderRadius={BorderRadius.lg} />
    </View>
  );
};

export const SkeletonBalanceCard: React.FC = () => {
  return (
    <Skeleton 
      width="100%" 
      height={180} 
      borderRadius={BorderRadius.xl} 
      style={{ marginBottom: 16 }}
    />
  );
};

export const SkeletonQuickActions: React.FC = () => {
  return (
    <View style={styles.quickActionsContainer}>
      {Array.from({ length: 8 }).map((_, index) => (
        <View key={index} style={styles.quickActionSkeleton}>
          <Skeleton width={56} height={56} borderRadius={16} />
          <Skeleton width={50} height={12} style={{ marginTop: 8 }} />
        </View>
      ))}
    </View>
  );
};

export const SkeletonInsights: React.FC = () => {
  return (
    <View style={styles.insightsContainer}>
      {Array.from({ length: 3 }).map((_, index) => (
        <Skeleton 
          key={index} 
          width="31%" 
          height={90} 
          borderRadius={BorderRadius.lg} 
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  skeleton: {
    position: 'relative',
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: 200,
  },
  gradient: {
    flex: 1,
    width: 200,
  },
  textContainer: {
    width: '100%',
  },
  card: {
    padding: 16,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardHeaderText: {
    flex: 1,
    marginLeft: 12,
  },
  transaction: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  transactionContent: {
    flex: 1,
    marginLeft: 12,
  },
  walletSkeleton: {
    marginRight: 12,
  },
  quickActionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickActionSkeleton: {
    alignItems: 'center',
    width: '25%',
    marginBottom: 16,
  },
  insightsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});

export default Skeleton;
