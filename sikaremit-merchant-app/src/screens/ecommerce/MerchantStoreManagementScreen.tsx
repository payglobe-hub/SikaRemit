// Merchant Store Management Screen - Real store operations
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { Card, Button } from '../../components/ui';
import { merchantDashboardService, MerchantStore } from '../../services/merchantDashboardService';
import { BorderRadius, FontSize, Spacing, Shadow } from '../../constants/theme';

const MerchantStoreManagementScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();

  const [stores, setStores] = useState<MerchantStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchStores();
  }, []);

  const fetchStores = async () => {
    try {
      setLoading(true);
      const storesData = await merchantDashboardService.getStores();
      setStores(storesData);
    } catch (error: any) {
      console.error('Error fetching stores:', error);
      Alert.alert('Error', 'Failed to load stores. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchStores();
    setRefreshing(false);
  };

  const handleCreateStore = () => {
    navigation.navigate('MerchantStoreForm', { mode: 'create' });
  };

  const handleEditStore = (store: MerchantStore) => {
    navigation.navigate('MerchantStoreForm', { mode: 'edit', store });
  };

  const handleDeleteStore = (store: MerchantStore) => {
    Alert.alert(
      'Delete Store',
      `Are you sure you want to delete "${store.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await merchantDashboardService.deleteStore(store.id);
              setStores(prev => prev.filter(s => s.id !== store.id));
              Alert.alert('Success', 'Store deleted successfully');
            } catch (error: any) {
              console.error('Error deleting store:', error);
              Alert.alert('Error', 'Failed to delete store. Please try again.');
            }
          }
        }
      ]
    );
  };

  const handleViewStore = (store: MerchantStore) => {
    navigation.navigate('MerchantStoreDetail', { store });
  };

  const renderStoreCard = ({ item }: { item: MerchantStore }) => (
    <Card style={styles.storeCard}>
      <View style={styles.storeHeader}>
        <View style={styles.storeInfo}>
          <Text style={[styles.storeName, { color: colors.text }]}>{item.name}</Text>
          <Text style={[styles.storeType, { color: colors.textSecondary }]}>
            {item.store_type} • {item.product_count} products
          </Text>
        </View>
        <View style={[
          styles.statusBadge,
          { backgroundColor: item.is_active ? colors.success + '20' : colors.error + '20' }
        ]}>
          <Text style={[
            styles.statusText,
            { color: item.is_active ? colors.success : colors.error }
          ]}>
            {item.is_active ? 'Active' : 'Inactive'}
          </Text>
        </View>
      </View>

      {item.description && (
        <Text style={[styles.storeDescription, { color: colors.textSecondary }]}>
          {item.description}
        </Text>
      )}

      <View style={styles.storeStats}>
        <View style={styles.statItem}>
          <Ionicons name="cart-outline" size={16} color={colors.primary} />
          <Text style={[styles.statText, { color: colors.text }]}>
            {item.total_orders} orders
          </Text>
        </View>
        <View style={styles.statItem}>
          <Ionicons name="star-outline" size={16} color={colors.warning} />
          <Text style={[styles.statText, { color: colors.text }]}>
            {item.average_rating.toFixed(1)} rating
          </Text>
        </View>
      </View>

      <View style={styles.storeActions}>
        <TouchableOpacity
          style={[styles.actionButton, { borderColor: colors.primary }]}
          onPress={() => handleViewStore(item)}
        >
          <Ionicons name="eye-outline" size={16} color={colors.primary} />
          <Text style={[styles.actionText, { color: colors.primary }]}>View</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { borderColor: colors.accent }]}
          onPress={() => handleEditStore(item)}
        >
          <Ionicons name="pencil-outline" size={16} color={colors.accent} />
          <Text style={[styles.actionText, { color: colors.accent }]}>Edit</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { borderColor: colors.error }]}
          onPress={() => handleDeleteStore(item)}
        >
          <Ionicons name="trash-outline" size={16} color={colors.error} />
          <Text style={[styles.actionText, { color: colors.error }]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </Card>
  );

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Store Management</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Loading stores...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Store Management</Text>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.primary }]}
          onPress={handleCreateStore}
        >
          <Ionicons name="add" size={20} color="white" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {stores.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="storefront-outline" size={64} color={colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Stores Yet</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Create your first store to start selling products
            </Text>
            <Button
              title="Create Store"
              onPress={handleCreateStore}
              style={styles.createButton}
            />
          </View>
        ) : (
          <View style={styles.storesList}>
            {stores.map((store) => (
              <View key={store.id}>
                {renderStoreCard({ item: store })}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: FontSize.xl,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    padding: Spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: FontSize.md,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xxxl,
  },
  emptyTitle: {
    fontSize: FontSize.xl,
    fontWeight: 'bold',
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    fontSize: FontSize.md,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.xl,
  },
  createButton: {
    minWidth: 120,
  },
  storesList: {
    gap: Spacing.md,
  },
  storeCard: {
    padding: Spacing.lg,
  },
  storeHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  storeInfo: {
    flex: 1,
  },
  storeName: {
    fontSize: FontSize.lg,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  storeType: {
    fontSize: FontSize.sm,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.lg,
  },
  statusText: {
    fontSize: FontSize.xs,
    fontWeight: '600',
  },
  storeDescription: {
    fontSize: FontSize.sm,
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  storeStats: {
    flexDirection: 'row',
    gap: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  statText: {
    fontSize: FontSize.sm,
    fontWeight: '500',
  },
  storeActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
  },
  actionText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
});

export default MerchantStoreManagementScreen;
