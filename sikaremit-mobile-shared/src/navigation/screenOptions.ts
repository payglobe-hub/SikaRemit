// Screen options for navigation
import { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';

export const defaultStackScreenOptions: NativeStackNavigationOptions = {
  headerStyle: {
    backgroundColor: '#ffffff',
  },
  headerTintColor: '#000000',
  headerTitleStyle: {
    fontWeight: 'bold',
  },
  headerShadowVisible: false,
  animation: 'slide_from_right',
};

export const authStackScreenOptions: NativeStackNavigationOptions = {
  ...defaultStackScreenOptions,
  headerShown: false,
  animation: 'fade',
};

export const modalScreenOptions: NativeStackNavigationOptions = {
  presentation: 'modal',
  animation: 'slide_from_bottom',
  headerStyle: {
    backgroundColor: '#f8f9fa',
  },
};

export const tabScreenOptions: BottomTabNavigationOptions = {
  tabBarActiveTintColor: '#007AFF',
  tabBarInactiveTintColor: '#8E8E93',
  tabBarStyle: {
    backgroundColor: '#ffffff',
    borderTopColor: '#E5E5E5',
    borderTopWidth: 1,
    paddingBottom: 5,
    paddingTop: 5,
    height: 60,
  },
  tabBarLabelStyle: {
    fontSize: 12,
    fontWeight: '500',
  },
  headerStyle: {
    backgroundColor: '#ffffff',
  },
  headerTintColor: '#000000',
  headerTitleStyle: {
    fontWeight: 'bold',
  },
  headerShadowVisible: false,
};

export const hiddenTabBarOptions: BottomTabNavigationOptions = {
  ...tabScreenOptions,
  tabBarStyle: {
    display: 'none',
  },
};
