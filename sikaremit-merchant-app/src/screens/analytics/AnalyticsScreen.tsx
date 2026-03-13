import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import { apiClient } from '../../services/api';
import { logger } from '../../utils/logger';

const { width } = Dimensions.get('window');

type RootStackParamList = {
  MerchantDashboard: undefined;
  Analytics: undefined;
  Devices: undefined;
  Receipts: undefined;
  POSHome: undefined;
};

type AnalyticsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Analytics'>;

interface AnalyticsData {
  overview: {
    totalRevenue: number;
    totalTransactions: number;
    averageTransactionValue: number;
    growthRate: number;
  };
  dailySales: {
    labels: string[];
    data: number[];
  };
  paymentMethods: {
    labels: string[];
    data: number[];
  };
  topProducts: Array<{
    name: string;
    sales: number;
    revenue: number;
  }>;
  customerMetrics: {
    newCustomers: number;
    returningCustomers: number;
    totalCustomers: number;
  };
}

const AnalyticsScreen: React.FC<{ navigation: AnalyticsScreenNavigationProp }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month' | 'year'>('week');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadAnalyticsData();
  }, [selectedPeriod]);

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      
      // Consume from existing SikaRemit backend API
      const response = await apiClient.get(`/merchant/analytics/?period=${selectedPeriod}`);
      
      if (response.data.success) {
        setAnalyticsData(response.data);
      } else {
        throw new Error(response.data.error || 'Failed to load analytics');
      }
    } catch (error) {
      logger.error('Analytics loading failed:', error);
      // Show error state
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadAnalyticsData();
  };

  const renderOverviewCards = () => {
    if (!analyticsData) return null;

    const { overview } = analyticsData;

    return (
      <View style={styles.overviewContainer}>
        <View style={styles.overviewCard}>
          <Text style={styles.overviewLabel}>Total Revenue</Text>
          <Text style={styles.overviewValue}>₵{overview.totalRevenue.toLocaleString()}</Text>
          <Text style={[styles.overviewChange, { color: overview.growthRate >= 0 ? '#4CAF50' : '#F44336' }]}>
            {overview.growthRate >= 0 ? '+' : ''}{overview.growthRate}%
          </Text>
        </View>

        <View style={styles.overviewCard}>
          <Text style={styles.overviewLabel}>Transactions</Text>
          <Text style={styles.overviewValue}>{overview.totalTransactions.toLocaleString()}</Text>
          <Text style={styles.overviewSubtext}>This period</Text>
        </View>

        <View style={styles.overviewCard}>
          <Text style={styles.overviewLabel}>Avg. Transaction</Text>
          <Text style={styles.overviewValue}>₵{overview.averageTransactionValue.toFixed(2)}</Text>
          <Text style={styles.overviewSubtext}>Per sale</Text>
        </View>
      </View>
    );
  };

  const renderSalesChart = () => {
    if (!analyticsData?.dailySales) return null;

    const chartConfig = {
      backgroundColor: '#ffffff',
      backgroundGradientFrom: '#ffffff',
      backgroundGradientTo: '#ffffff',
      decimalPlaces: 0,
      color: (opacity = 1) => `rgba(30, 136, 229, ${opacity})`,
      labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
      style: {
        borderRadius: 16,
      },
      propsForDots: {
        r: '6',
        strokeWidth: '2',
        stroke: '#1E88E5',
      },
    };

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Sales Trend</Text>
        <LineChart
          data={{
            labels: analyticsData.dailySales.labels,
            datasets: [{
              data: analyticsData.dailySales.data,
            }],
          }}
          width={width - 40}
          height={220}
          chartConfig={chartConfig}
          bezier
          style={styles.chart}
        />
      </View>
    );
  };

  const renderPaymentMethodsChart = () => {
    if (!analyticsData?.paymentMethods) return null;

    const chartConfig = {
      backgroundColor: '#ffffff',
      backgroundGradientFrom: '#ffffff',
      backgroundGradientTo: '#ffffff',
      decimalPlaces: 0,
      color: (opacity = 1) => `rgba(30, 136, 229, ${opacity})`,
      labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    };

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Payment Methods</Text>
        <PieChart
          data={analyticsData.paymentMethods.labels.map((label, index) => ({
            name: label,
            population: analyticsData.paymentMethods.data[index],
            color: ['#1E88E5', '#4CAF50', '#FF9800', '#F44336'][index] || '#1E88E5',
            legendFontColor: '#333',
            legendFontSize: 12,
          }))}
          width={width - 40}
          height={200}
          chartConfig={chartConfig}
          accessor="population"
          backgroundColor="transparent"
          paddingLeft="15"
          absolute
        />
      </View>
    );
  };

  const renderTopProducts = () => {
    if (!analyticsData?.topProducts) return null;

    return (
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Top Products</Text>
        {analyticsData.topProducts.map((product, index) => (
          <View key={index} style={styles.productItem}>
            <View style={styles.productInfo}>
              <Text style={styles.productName}>{product.name}</Text>
              <Text style={styles.productSales}>{product.sales} sales</Text>
            </View>
            <Text style={styles.productRevenue}>₵{product.revenue.toLocaleString()}</Text>
          </View>
        ))}
      </View>
    );
  };

  const renderCustomerMetrics = () => {
    if (!analyticsData?.customerMetrics) return null;

    const { customerMetrics } = analyticsData;

    return (
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Customer Metrics</Text>
        <View style={styles.metricsGrid}>
          <View style={styles.metricItem}>
            <Text style={styles.metricValue}>{customerMetrics.totalCustomers.toLocaleString()}</Text>
            <Text style={styles.metricLabel}>Total Customers</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricValue}>{customerMetrics.newCustomers}</Text>
            <Text style={styles.metricLabel}>New Customers</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricValue}>{customerMetrics.returningCustomers}</Text>
            <Text style={styles.metricLabel}>Returning</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderPeriodSelector = () => (
    <View style={styles.periodSelector}>
      {(['today', 'week', 'month', 'year'] as const).map((period) => (
        <TouchableOpacity
          key={period}
          style={[
            styles.periodButton,
            selectedPeriod === period && styles.periodButtonActive,
          ]}
          onPress={() => setSelectedPeriod(period)}
        >
          <Text style={[
            styles.periodButtonText,
            selectedPeriod === period && styles.periodButtonTextActive,
          ]}>
            {period.charAt(0).toUpperCase() + period.slice(1)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  if (loading && !analyticsData) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#1E88E5" />
        <Text style={styles.loadingText}>Loading analytics...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Analytics</Text>
        <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh}>
          <Text style={styles.refreshButtonText}>↻</Text>
        </TouchableOpacity>
      </View>

      {/* Period Selector */}
      {renderPeriodSelector()}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          // Add refresh control if needed
          null
        }
      >
        {/* Overview Cards */}
        {renderOverviewCards()}

        {/* Sales Chart */}
        {renderSalesChart()}

        {/* Payment Methods Chart */}
        {renderPaymentMethodsChart()}

        {/* Top Products */}
        {renderTopProducts()}

        {/* Customer Metrics */}
        {renderCustomerMetrics()}

        {/* Bottom padding */}
        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#4CAF50',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 24,
    color: 'white',
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
  },
  refreshButton: {
    padding: 8,
  },
  refreshButtonText: {
    fontSize: 20,
    color: 'white',
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 8,
    padding: 4,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  periodButtonActive: {
    backgroundColor: '#4CAF50',
  },
  periodButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  periodButtonTextActive: {
    color: 'white',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  overviewContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  overviewCard: {
    flex: 1,
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  overviewLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  overviewValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  overviewChange: {
    fontSize: 12,
    fontWeight: '500',
  },
  overviewSubtext: {
    fontSize: 12,
    color: '#999',
  },
  chartContainer: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  sectionContainer: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  productItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  productSales: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  productRevenue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  metricLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
});

export default AnalyticsScreen;
