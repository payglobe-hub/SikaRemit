// Navigation helper functions
import { NavigationProp, RouteProp } from '@react-navigation/native';
import { ROUTES, RouteName, RouteParams } from './routes';

export type NavigationType = NavigationProp<RouteParams>;

export const navigateToAuth = (navigation: NavigationType) => {
  navigation.reset({
    index: 0,
    routes: [{ name: ROUTES.LOGIN }],
  });
};

export const navigateToHome = (navigation: NavigationType) => {
  navigation.reset({
    index: 0,
    routes: [{ name: ROUTES.HOME }],
  });
};

export const navigateToPayment = (
  navigation: NavigationType,
  params?: { amount?: number; recipient?: string }
) => {
  if (params) {
    navigation.navigate(ROUTES.PAYMENTS, params);
  } else {
    navigation.navigate(ROUTES.PAYMENTS);
  }
};

export const navigateToScanQR = (navigation: NavigationType) => {
  navigation.navigate(ROUTES.SCAN_QR);
};

export const navigateToSendMoney = (
  navigation: NavigationType,
  recipientId?: string
) => {
  navigation.navigate(ROUTES.SEND_MONEY, { recipientId });
};

export const goBack = (navigation: NavigationType) => {
  navigation.goBack();
};

export const canGoBack = (navigation: NavigationType): boolean => {
  return navigation.canGoBack();
};

export const getCurrentRouteName = (navigation: NavigationType): string | undefined => {
  return navigation.getState()?.routes?.[navigation.getState()?.index || 0]?.name;
};

export const isRouteActive = (
  navigation: NavigationType,
  routeName: RouteName
): boolean => {
  return getCurrentRouteName(navigation) === routeName;
};
