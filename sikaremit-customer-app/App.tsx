import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StripeProvider } from '@stripe/stripe-react-native';
import { LinkingOptions } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import RootNavigator from './src/navigation/RootNavigator';
import { useAuthStore } from './src/store/authStore';
import { ThemeProvider } from './src/context/ThemeContext';
import Constants from 'expo-constants';

const linking: LinkingOptions<any> = {
  prefixes: [Linking.createURL('/'), 'sikaremit://'],
  config: {
    screens: {
      Auth: {
        screens: {
          ResetPassword: 'auth/reset-password',
          VerifyEmail: 'auth/verify-email',
        },
      },
    },
  },
};

SplashScreen.preventAutoHideAsync();

export default function App() {
  const [appIsReady, setAppIsReady] = useState(false);
  const { checkAuth } = useAuthStore();

  useEffect(() => {
    async function prepare() {
      try {
        await checkAuth();
      } catch (e) {
        console.warn(e);
      } finally {
        setAppIsReady(true);
        await SplashScreen.hideAsync();
      }
    }
    prepare();
  }, []);

  if (!appIsReady) {
    return null;
  }

  const stripePublishableKey = Constants.expoConfig?.extra?.stripePublishableKey || process.env.EXPO_PUBLIC_STRIPE_PUBLIC_KEY || '';

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StripeProvider publishableKey={stripePublishableKey}>
          <ThemeProvider>
            <NavigationContainer linking={linking}>
              <StatusBar style="auto" />
              <RootNavigator />
            </NavigationContainer>
          </ThemeProvider>
        </StripeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
