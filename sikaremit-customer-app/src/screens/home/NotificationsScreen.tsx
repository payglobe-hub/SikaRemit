import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Animated, { 
  FadeInDown, 
  FadeInUp,
  FadeInRight,
  useSharedValue, 
  useAnimatedStyle, 
  withSpring,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { Card, Button } from '../../components/ui';
import { useTheme } from '../../context/ThemeContext';
import { Notification } from '../../types';
import { 
  BorderRadius, 
  FontSize, 
  FontWeight, 
  Spacing, 
  Shadow, 
  AnimationConfig, 
  ComponentSize 
} from '../../constants/theme';
import { api } from '../../services/api';
import { ENDPOINTS } from '../../constants/api';

const { width } = Dimensions.get('window');

const NotificationsScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { colors } = useTheme();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'transaction' | 'security'>('all');

  const fetchNotifications = async () => {
    try {
      const response = await api.get(ENDPOINTS.NOTIFICATIONS.LIST);
      setNotifications(response.data.results || response.data || []);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    fetchNotifications();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  };

  const markAsRead = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
  };

  const markAllAsRead = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, is_read: true }))
    );
  };

  const clearAllNotifications = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setNotifications([]);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'transaction':
        return 'cash-outline';
      case 'security':
        return 'shield-checkmark-outline';
      case 'promotion':
        return 'gift-outline';
      case 'system':
        return 'settings-outline';
      case 'reminder':
        return 'alarm-outline';
      default:
        return 'notifications-outline';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'transaction':
        return colors.success;
      case 'security':
        return colors.warning;
      case 'promotion':
        return colors.secondary;
      case 'system':
        return colors.primary;
      case 'reminder':
        return colors.accent;
      default:
        return colors.textMuted;
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const filters = [
    { key: 'all', label: 'All', icon: 'list' },
    { key: 'unread', label: 'Unread', icon: 'mail-unread' },
    { key: 'transaction', label: 'Transactions', icon: 'cash' },
    { key: 'security', label: 'Security', icon: 'shield-checkmark' },
  ];

  const filteredNotifications = notifications.filter((notification) => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !notification.is_read;
    return notification.type === filter;
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const renderNotification = ({ item, index }: { item: Notification; index: number }) => (
    <Animated.View
      entering={FadeInRight.duration(400).delay(index * 50)}
      style={styles.notificationItem}
    >
      <TouchableOpacity
        style={[
          styles.notificationTouchable,
          { backgroundColor: item.is_read ? colors.background : colors.primary + '08' }
        ]}
        onPress={() => markAsRead(item.id)}
        activeOpacity={0.7}
      >
        <Card variant="default" padding="md" style={styles.notificationCard}>
          <View style={styles.notificationHeader}>
            <View style={[
              styles.notificationIcon,
              { backgroundColor: getNotificationColor(item.type) + '20' }
            ]}>
              <Ionicons 
                name={getNotificationIcon(item.type) as any} 
                size={20} 
                color={getNotificationColor(item.type)} 
              />
            </View>
            <View style={styles.notificationContent}>
              <Text style={[styles.notificationTitle, { color: colors.text }]}>
                {item.title}
              </Text>
              <Text style={[styles.notificationMessage, { color: colors.textSecondary }]}>
                {item.message}
              </Text>
            </View>
            <View style={styles.notificationMeta}>
              <Text style={[styles.notificationTime, { color: colors.textMuted }]}>
                {formatTime(item.created_at)}
              </Text>
              {!item.is_read && (
                <View style={[
                  styles.unreadDot,
                  { backgroundColor: colors.primary }
                ]} />
              )}
            </View>
          </View>
        </Card>
      </TouchableOpacity>
    </Animated.View>
  );

  const renderFilterTab = (filterItem: any, index: number) => (
    <Animated.View
      key={filterItem.key}
      entering={FadeInUp.duration(400).delay(index * 100)}
    >
      <TouchableOpacity
        style={[
          styles.filterTab,
          {
            backgroundColor: filter === filterItem.key 
              ? colors.primary + '15'
              : colors.surface,
            borderColor: filter === filterItem.key 
              ? colors.primary
              : colors.borderLight,
          }
        ]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setFilter(filterItem.key as any);
        }}
      >
        <Ionicons 
          name={filterItem.icon as any} 
          size={16} 
          color={filter === filterItem.key ? colors.primary : colors.textMuted} 
        />
        <Text style={[
          styles.filterText,
          { color: filter === filterItem.key ? colors.primary : colors.text }
        ]}>
          {filterItem.label}
        </Text>
        {filterItem.key === 'unread' && unreadCount > 0 && (
          <View style={[
            styles.filterBadge,
            { backgroundColor: colors.primary }
          ]}>
            <Text style={styles.filterBadgeText}>
              {unreadCount}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={[
        styles.emptyIcon,
        { backgroundColor: colors.primary + '15' }
      ]}>
        <Ionicons name="notifications-off-outline" size={48} color={colors.primary} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>
        No Notifications
      </Text>
      <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
        You're all caught up! Check back later for new updates.
      </Text>
      <Button
        title="Refresh"
        onPress={onRefresh}
        variant="outline"
        size="lg"
        style={styles.emptyButton}
      />
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <Animated.View entering={FadeInDown.duration(600)} style={styles.header}>
        <View style={[styles.headerContent, { paddingTop: insets.top + Spacing.lg }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>Notifications</Text>
          <View style={styles.headerActions}>
            {unreadCount > 0 && (
              <View style={[
                styles.unreadBadge,
                { backgroundColor: colors.primary }
              ]}>
                <Text style={styles.unreadBadgeText}>
                  {unreadCount}
                </Text>
              </View>
            )}
          </View>
        </View>
      </Animated.View>

      {/* Filter Tabs */}
      <Animated.View entering={FadeInUp.duration(800).delay(200)} style={styles.filterSection}>
        <View style={styles.filterContainer}>
          {filters.map((filterItem, index) => renderFilterTab(filterItem, index))}
        </View>
      </Animated.View>

      {/* Action Buttons */}
      {notifications.length > 0 && (
        <Animated.View entering={FadeInUp.duration(800).delay(400)} style={styles.actionSection}>
          <View style={styles.actionContainer}>
            <TouchableOpacity
              style={[
                styles.actionButton,
                { backgroundColor: colors.primary + '15' }
              ]}
              onPress={markAllAsRead}
            >
              <Ionicons name="checkmark-done" size={16} color={colors.primary} />
              <Text style={[styles.actionText, { color: colors.primary }]}>
                Mark All Read
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.actionButton,
                { backgroundColor: colors.error + '15' }
              ]}
              onPress={clearAllNotifications}
            >
              <Ionicons name="trash" size={16} color={colors.error} />
              <Text style={[styles.actionText, { color: colors.error }]}>
                Clear All
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}

      {/* Notifications List */}
      <Animated.View entering={FadeInUp.duration(800).delay(600)} style={styles.listSection}>
        <FlatList
          data={filteredNotifications}
          renderItem={renderNotification}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmptyState}
        />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    marginBottom: Spacing.lg,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
  },
  backButton: {
    width: ComponentSize.iconButton.md,
    height: ComponentSize.iconButton.md,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold as any,
  },
  headerActions: {
    width: ComponentSize.iconButton.md,
    alignItems: 'flex-end',
  },
  unreadBadge: {
    width: ComponentSize.avatar.sm,
    height: ComponentSize.avatar.sm,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadBadgeText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold as any,
    color: '#FFFFFF',
  },
  filterSection: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  filterContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 2,
    gap: Spacing.xs,
  },
  filterText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold as any,
  },
  filterBadge: {
    width: ComponentSize.avatar.xs,
    height: ComponentSize.avatar.xs,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.xs,
  },
  filterBadgeText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold as any,
    color: '#FFFFFF',
  },
  actionSection: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  actionContainer: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  actionText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold as any,
  },
  listSection: {
    flex: 1,
  },
  listContent: {
    paddingBottom: Spacing.xxl,
  },
  notificationItem: {
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  notificationTouchable: {
    borderRadius: BorderRadius.lg,
  },
  notificationCard: {
    ...Shadow.card,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  notificationIcon: {
    width: ComponentSize.avatar.md,
    height: ComponentSize.avatar.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold as any,
    marginBottom: Spacing.xs,
  },
  notificationMessage: {
    fontSize: FontSize.sm,
    lineHeight: 18,
  },
  notificationMeta: {
    alignItems: 'flex-end',
    gap: Spacing.xs,
  },
  notificationTime: {
    fontSize: FontSize.xs,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: BorderRadius.full,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xxxl,
  },
  emptyIcon: {
    width: ComponentSize.avatar.xl,
    height: ComponentSize.avatar.xl,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold as any,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: FontSize.md,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  emptyButton: {
    maxWidth: 200,
  },
});

export default NotificationsScreen;
