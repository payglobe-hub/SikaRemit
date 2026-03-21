import React, { useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '../context/ThemeContext';
import { MainTabParamList, HomeStackParamList, PaymentsStackParamList, ProfileStackParamList } from '../types';

// Import lazy loading utilities
import { lazyScreens, preloadCriticalScreens } from '../utils/lazyLoading';

// Import critical screens that should load immediately
import DashboardScreen from '../screens/home/DashboardScreen';
import PaymentsHomeScreen from '../screens/payments/PaymentsHomeScreen';
import ShoppingTab from '../screens/shopping/ShoppingTab';
import WishlistScreen from '../screens/shopping/WishlistScreen';
import TransactionHistoryScreen from '../screens/transactions/TransactionHistoryScreen';
import ProfileHomeScreen from '../screens/profile/ProfileHomeScreen';
import ReferralScreen from '../screens/profile/ReferralScreen';
import SettingsScreen from '../screens/profile/SettingsScreen';
import SecurityScreen from '../screens/profile/SecurityScreen';
import KYCVerificationScreen from '../screens/profile/KYCVerificationScreen';

const Tab = createBottomTabNavigator<MainTabParamList>();
const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const PaymentsStack = createNativeStackNavigator<PaymentsStackParamList>();
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();

const HomeNavigator = () => (
  <HomeStack.Navigator screenOptions={{ headerShown: false }}>
    <HomeStack.Screen name="Dashboard" component={DashboardScreen} />
    <HomeStack.Screen name="Notifications" component={lazyScreens.NotificationsScreen} />
  </HomeStack.Navigator>
);

const PaymentsNavigator = () => (
  <PaymentsStack.Navigator screenOptions={{ headerShown: false }}>
    <PaymentsStack.Screen name="PaymentsHome" component={PaymentsHomeScreen} />
    <PaymentsStack.Screen name="SendMoney" component={lazyScreens.SendMoneyScreen} />
    <PaymentsStack.Screen name="BillPayment" component={lazyScreens.BillPaymentScreen} />
    {/* <PaymentsStack.Screen name="Remittance" component={RemittanceScreen} /> */} {/* Hidden - no permission for international transfers */}
    <PaymentsStack.Screen name="Airtime" component={lazyScreens.AirtimeScreen} />
    <PaymentsStack.Screen name="DataBundle" component={lazyScreens.DataBundleScreen} />
    <PaymentsStack.Screen name="Deposit" component={lazyScreens.DepositScreen} />
  </PaymentsStack.Navigator>
);

const ProfileNavigator = () => (
  <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
    <ProfileStack.Screen name="ProfileHome" component={ProfileHomeScreen} />
    <ProfileStack.Screen name="Referral" component={ReferralScreen} />
    <ProfileStack.Screen name="Settings" component={lazyScreens.SettingsScreen} />
    <ProfileStack.Screen name="Security" component={lazyScreens.SecurityScreen} />
    <ProfileStack.Screen name="KYCVerification" component={lazyScreens.KYCVerificationScreen} />
  </ProfileStack.Navigator>
);

const MainNavigator: React.FC = () => {
  const { colors, isDark } = useTheme();

  // Preload critical screens for better UX
  useEffect(() => {
    preloadCriticalScreens();
  }, []);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          switch (route.name) {
            case 'Home':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'Payments':
              iconName = focused ? 'wallet' : 'wallet-outline';
              break;
            case 'Shopping':
              iconName = focused ? 'storefront' : 'storefront-outline';
              break;
            case 'Wishlist':
              iconName = focused ? 'heart' : 'heart-outline';
              break;
            case 'History':
              iconName = focused ? 'time' : 'time-outline';
              break;
            case 'Profile':
              iconName = focused ? 'person' : 'person-outline';
              break;
            default:
              iconName = 'ellipse';
          }

          return (
            <View style={[styles.iconContainer, focused && { backgroundColor: colors.primary + '20' }]}>
              <Ionicons name={iconName} size={size} color={color} />
            </View>
          );
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: isDark ? colors.surface + 'F0' : colors.background + 'F0',
          borderTopWidth: 0,
          elevation: 0,
          height: Platform.OS === 'ios' ? 88 : 70,
          paddingBottom: Platform.OS === 'ios' ? 28 : 12,
          paddingTop: 12,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.1,
          shadowRadius: 12,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          marginTop: 4,
        },
        tabBarBackground: () => (
          Platform.OS === 'ios' ? (
            <BlurView
              intensity={80}
              tint={isDark ? 'dark' : 'light'}
              style={StyleSheet.absoluteFill}
            />
          ) : null
        ),
      })}
    >
      <Tab.Screen name="Home" component={HomeNavigator} />
      <Tab.Screen name="Payments" component={PaymentsNavigator} />
      <Tab.Screen name="Shopping" component={ShoppingTab} />
      <Tab.Screen name="Wishlist" component={WishlistScreen} />
      <Tab.Screen name="History" component={TransactionHistoryScreen} />
      <Tab.Screen name="Profile" component={ProfileNavigator} />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  iconContainer: {
    width: 44,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default MainNavigator;
