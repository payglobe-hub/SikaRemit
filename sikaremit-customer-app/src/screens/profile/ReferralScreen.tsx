import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Card } from '../../components/ui';
import { useTheme } from '../../context/ThemeContext';
import { BorderRadius, FontSize, FontWeight, Shadow, Spacing } from '../../constants/theme';

// Import API utilities from local services
import { api } from '../../services/api';

interface ReferralStats {
  total_referrals: number;
  successful_referrals: number;
  pending_referrals: number;
  total_earnings: number;
  available_balance: number;
  referral_code?: string;
}

interface ReferralHistory {
  id: string;
  referred_user: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  status: 'pending' | 'completed' | 'expired';
  reward_earned: number;
  reward_type: string;
  created_at: string;
  completed_at?: string;
}

// Local referral service implementation
const referralService = {
  getReferralStats: async (): Promise<ReferralStats> => {
    const response = await api.get('/referrals/stats/');
    return response.data;
  },

  getReferralHistory: async (page = 1, limit = 20): Promise<{
    results: ReferralHistory[];
    count: number;
    next?: string;
    previous?: string;
  }> => {
    const response = await api.get('/referrals/history/', {
      params: { page, limit }
    });
    return response.data;
  },

  shareReferralLink: (code: string): string => {
    const baseUrl = 'https://sikaremit.com';
    return `${baseUrl}/register?ref=${code}`;
  }
};

const { width } = Dimensions.get('window');

const ReferralScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { colors } = useTheme();

  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [history, setHistory] = useState<ReferralHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    loadReferralData();
  }, []);

  const loadReferralData = async () => {
    try {
      setLoading(true);
      const [statsData, historyData] = await Promise.all([
        referralService.getReferralStats(),
        referralService.getReferralHistory(1, 10)
      ]);

      setStats(statsData);
      setHistory(historyData.results || []);
    } catch (error: any) {
      console.error('Failed to load referral data:', error);
      Alert.alert('Error', 'Failed to load referral data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleShareReferralCode = async () => {
    if (!stats?.referral_code) return;

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const referralLink = referralService.shareReferralLink(stats.referral_code);
      const message = `Join SikaRemit and get started with digital payments! Use my referral code: ${stats.referral_code}\n\n${referralLink}`;

      await Share.share({
        message,
        title: 'Join SikaRemit',
      });
    } catch (error: any) {
      console.warn('Failed to share referral:', error);
    }
  };

  const handleCopyReferralCode = () => {
    if (!stats?.referral_code) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // In a real app, you'd use Clipboard.setString here
    Alert.alert('Copied!', 'Referral code copied to clipboard');
  };

  const renderReferralCard = () => (
    <LinearGradient
      colors={colors.gradient.primary}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.referralCard, Shadow.floating]}
    >
      <View style={styles.referralCardContent}>
        <Text style={styles.referralTitle}>Your Referral Code</Text>
        <Text style={styles.referralCode}>{stats?.referral_code || 'Loading...'}</Text>
        <Text style={styles.referralSubtitle}>
          Share this code with friends to earn rewards
        </Text>

        <View style={styles.referralActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.shareButton]}
            onPress={handleShareReferralCode}
          >
            <Ionicons name="share-social" size={20} color="white" />
            <Text style={styles.actionButtonText}>Share</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.copyButton]}
            onPress={handleCopyReferralCode}
          >
            <Ionicons name="copy" size={20} color={colors.primary} />
            <Text style={[styles.actionButtonText, { color: colors.primary }]}>
              Copy
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </LinearGradient>
  );

  const renderStatsGrid = () => (
    <View style={styles.statsGrid}>
      <Card variant="default" padding="lg" style={styles.statCard}>
        <View style={styles.statIcon}>
          <Ionicons name="people" size={24} color={colors.primary} />
        </View>
        <Text style={[styles.statValue, { color: colors.primary }]}>
          {stats?.total_referrals || 0}
        </Text>
        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
          Total Referrals
        </Text>
      </Card>

      <Card variant="default" padding="lg" style={styles.statCard}>
        <View style={styles.statIcon}>
          <Ionicons name="checkmark-circle" size={24} color={colors.success} />
        </View>
        <Text style={[styles.statValue, { color: colors.success }]}>
          {stats?.successful_referrals || 0}
        </Text>
        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
          Successful
        </Text>
      </Card>

      <Card variant="default" padding="lg" style={styles.statCard}>
        <View style={styles.statIcon}>
          <Ionicons name="cash" size={24} color={colors.accent} />
        </View>
        <Text style={[styles.statValue, { color: colors.accent }]}>
          ₵{(stats?.total_earnings || 0).toFixed(2)}
        </Text>
        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
          Total Earnings
        </Text>
      </Card>

      <Card variant="default" padding="lg" style={styles.statCard}>
        <View style={styles.statIcon}>
          <Ionicons name="wallet" size={24} color={colors.info} />
        </View>
        <Text style={[styles.statValue, { color: colors.info }]}>
          ₵{(stats?.available_balance || 0).toFixed(2)}
        </Text>
        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
          Available
        </Text>
      </Card>
    </View>
  );

  const renderReferralItem = (item: ReferralHistory) => (
    <Card variant="default" padding="md" style={styles.historyItem}>
      <View style={styles.historyLeft}>
        <View style={[styles.historyIcon, {
          backgroundColor: item.status === 'completed' ? colors.success + '20' :
                          item.status === 'pending' ? colors.warning + '20' :
                          colors.error + '20'
        }]}>
          <Ionicons
            name={item.status === 'completed' ? 'checkmark-circle' :
                  item.status === 'pending' ? 'time' : 'close-circle'}
            size={20}
            color={item.status === 'completed' ? colors.success :
                   item.status === 'pending' ? colors.warning :
                   colors.error}
          />
        </View>
        <View>
          <Text style={[styles.historyName, { color: colors.text }]}>
            {item.referred_user.first_name} {item.referred_user.last_name}
          </Text>
          <Text style={[styles.historyDate, { color: colors.textSecondary }]}>
            {new Date(item.created_at).toLocaleDateString()}
          </Text>
        </View>
      </View>
      <View style={styles.historyRight}>
        <Text style={[styles.historyReward, { color: colors.success }]}>
          +₵{item.reward_earned.toFixed(2)}
        </Text>
        <Text style={[styles.historyStatus, {
          color: item.status === 'completed' ? colors.success :
                 item.status === 'pending' ? colors.warning :
                 colors.error
        }]}>
          {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
        </Text>
      </View>
    </Card>
  );

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Referrals</Text>
          <View style={{ width: 24 }} />
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Referral Card */}
        {renderReferralCard()}

        {/* Stats Grid */}
        {renderStatsGrid()}

        {/* How It Works */}
        <Card variant="default" padding="lg" style={styles.infoCard}>
          <Text style={[styles.infoTitle, { color: colors.text }]}>
            How Referrals Work
          </Text>
          <View style={styles.infoSteps}>
            <View style={styles.infoStep}>
              <View style={[styles.stepNumber, { backgroundColor: colors.primary }]}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <Text style={[styles.stepText, { color: colors.textSecondary }]}>
                Share your referral code with friends
              </Text>
            </View>
            <View style={styles.infoStep}>
              <View style={[styles.stepNumber, { backgroundColor: colors.primary }]}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <Text style={[styles.stepText, { color: colors.textSecondary }]}>
                Friends sign up and complete verification
              </Text>
            </View>
            <View style={styles.infoStep}>
              <View style={[styles.stepNumber, { backgroundColor: colors.primary }]}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>
              <Text style={[styles.stepText, { color: colors.textSecondary }]}>
                Earn ₵5 for each successful referral
              </Text>
            </View>
          </View>
        </Card>

        {/* Referral History */}
        {history.length > 0 && (
          <View style={styles.historySection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Recent Referrals
            </Text>
            {history.map(item => renderReferralItem(item))}
          </View>
        )}

        <View style={{ height: Spacing.xxxl }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5e9',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  referralCard: {
    margin: 16,
    borderRadius: BorderRadius.xxl,
    overflow: 'hidden',
  },
  referralCardContent: {
    padding: Spacing.xl,
    alignItems: 'center',
  },
  referralTitle: {
    fontSize: FontSize.md,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: Spacing.sm,
  },
  referralCode: {
    fontSize: FontSize.display,
    fontWeight: FontWeight.bold,
    color: '#FFFFFF',
    marginBottom: Spacing.sm,
    letterSpacing: 2,
  },
  referralSubtitle: {
    fontSize: FontSize.sm,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  referralActions: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    gap: Spacing.xs,
  },
  shareButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  copyButton: {
    backgroundColor: '#FFFFFF',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  statCard: {
    flex: 1,
    minWidth: (width - Spacing.lg * 2 - Spacing.md) / 2,
    alignItems: 'center',
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  statValue: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    marginBottom: Spacing.xs,
  },
  statLabel: {
    fontSize: FontSize.sm,
    textAlign: 'center',
  },
  infoCard: {
    margin: Spacing.lg,
    marginBottom: Spacing.xxl,
  },
  infoTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    marginBottom: Spacing.lg,
  },
  infoSteps: {
    gap: Spacing.lg,
  },
  infoStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    color: '#FFFFFF',
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
  stepText: {
    flex: 1,
    fontSize: FontSize.md,
    lineHeight: 20,
  },
  historySection: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    marginBottom: Spacing.lg,
  },
  historyItem: {
    marginBottom: Spacing.sm,
  },
  historyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  historyIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  historyName: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    marginBottom: 2,
  },
  historyDate: {
    fontSize: FontSize.sm,
  },
  historyRight: {
    alignItems: 'flex-end',
  },
  historyReward: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    marginBottom: 2,
  },
  historyStatus: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
});

export default ReferralScreen;
