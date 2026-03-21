import React from 'react';
import { View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/authStore';
import WelcomeScreen from '../screens/auth/WelcomeScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import ResetPasswordScreen from '../screens/auth/ResetPasswordScreen';
import MerchantLayout from '../components/MerchantLayout';
import MerchantDashboardScreen from '../screens/dashboard/MerchantDashboardScreen';
import MerchantHeader from '../components/MerchantHeader';
import AnalyticsScreen from '../screens/analytics/AnalyticsScreen';
import DevicesScreen from '../screens/devices/DevicesScreen';
import ReceiptsScreen from '../screens/receipts/ReceiptsScreen';
import SoftPOSHomeScreen from '../screens/pos/SoftPOSHomeScreen';
import PaymentProcessingScreen from '../screens/pos/PaymentProcessingScreen';
import MerchantStoreManagementScreen from '../screens/ecommerce/MerchantStoreManagementScreen';
import MerchantProductManagementScreen from '../screens/ecommerce/MerchantProductManagementScreen';
import MerchantOrderFulfillmentScreen from '../screens/ecommerce/MerchantOrderFulfillmentScreen';
import MerchantPayoutManagementScreen from '../screens/ecommerce/MerchantPayoutManagementScreen';

export type RootStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  ResetPassword: { token: string };
  MainApp: undefined;
};

export type MainTabParamList = {
  Dashboard: undefined;
  POS: undefined;
  Analytics: undefined;
  Store: undefined;
  More: undefined;
};

export type POSStackParamList = {
  POSHome: undefined;
  PaymentProcessing: undefined;
  Devices: undefined;
  Receipts: undefined;
};

export type StoreStackParamList = {
  StoreHome: undefined;
  Products: undefined;
  Orders: undefined;
  Payouts: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();
const POSStack = createNativeStackNavigator<POSStackParamList>();
const StoreStack = createNativeStackNavigator<StoreStackParamList>();

// POS Stack Navigator
const POSNavigator: React.FC = () => (
  <POSStack.Navigator screenOptions={{ headerShown: false }}>
    <POSStack.Screen name="POSHome" component={SoftPOSHomeScreen} />
    <POSStack.Screen name="PaymentProcessing" component={PaymentProcessingScreen} />
    <POSStack.Screen name="Devices" component={DevicesScreen} />
    <POSStack.Screen name="Receipts" component={ReceiptsScreen} />
  </POSStack.Navigator>
);

// Store/E-commerce Stack Navigator
const StoreNavigator: React.FC = () => (
  <StoreStack.Navigator screenOptions={{ headerShown: false }}>
    <StoreStack.Screen name="StoreHome" component={MerchantStoreManagementScreen} />
    <StoreStack.Screen name="Products" component={MerchantProductManagementScreen} />
    <StoreStack.Screen name="Orders" component={MerchantOrderFulfillmentScreen} />
    <StoreStack.Screen name="Payouts" component={MerchantPayoutManagementScreen} />
  </StoreStack.Navigator>
);

// Main Tab Navigator with all merchant sections
const MainTabNavigator: React.FC = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarIcon: ({ focused, color, size }) => {
        let iconName: keyof typeof Ionicons.glyphMap = 'home';
        if (route.name === 'Dashboard') iconName = focused ? 'home' : 'home-outline';
        else if (route.name === 'POS') iconName = focused ? 'card' : 'card-outline';
        else if (route.name === 'Analytics') iconName = focused ? 'bar-chart' : 'bar-chart-outline';
        else if (route.name === 'Store') iconName = focused ? 'storefront' : 'storefront-outline';
        else if (route.name === 'More') iconName = focused ? 'ellipsis-horizontal' : 'ellipsis-horizontal-outline';
        return <Ionicons name={iconName} size={size} color={color} />;
      },
      tabBarActiveTintColor: '#2563EB',
      tabBarInactiveTintColor: '#6B7280',
      tabBarStyle: { paddingBottom: 5, height: 60 },
    })}
  >
    <Tab.Screen name="Dashboard" component={MerchantDashboardScreen} />
    <Tab.Screen name="POS" component={POSNavigator} />
    <Tab.Screen name="Analytics" component={AnalyticsScreen} />
    <Tab.Screen name="Store" component={StoreNavigator} />
    <Tab.Screen name="More">
      {() => (
        <MerchantLayout showHeader={false}>
          <ReceiptsScreen />
        </MerchantLayout>
      )}
    </Tab.Screen>
  </Tab.Navigator>
);

// Main App Layout Component
const MainAppLayout: React.FC<{ navigation?: any }> = ({ navigation }) => {
  return (
    <MerchantLayout showHeader={false}>
      <MainTabNavigator />
    </MerchantLayout>
  );
};

export const RootNavigator: React.FC = () => {
  const { isAuthenticated } = useAuthStore();

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isAuthenticated ? (
        <>
          <Stack.Screen name="Welcome" component={WelcomeScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
        </>
      ) : (
        <Stack.Screen name="MainApp" component={MainAppLayout} />
      )}
    </Stack.Navigator>
  );
};
