// Permission utility functions
export const requestCameraPermission = async (): Promise<boolean> => {
  try {
    const { requestPermissionsAsync } = await import('expo-camera');
    const { status } = await requestPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.warn('Camera permission request failed:', error);
    return false;
  }
};

export const requestLocationPermission = async (): Promise<boolean> => {
  try {
    const { requestForegroundPermissionsAsync } = await import('expo-location');
    const { status } = await requestForegroundPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.warn('Location permission request failed:', error);
    return false;
  }
};

export const requestNotificationPermission = async (): Promise<boolean> => {
  try {
    const { requestPermissionsAsync } = await import('expo-notifications');
    const { status } = await requestPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.warn('Notification permission request failed:', error);
    return false;
  }
};

export const checkPermissionStatus = async (permission: string): Promise<string> => {
  // Placeholder for checking permission status
  // Would need to implement for each permission type
  return 'unknown';
};

export const openSettings = async (): Promise<void> => {
  try {
    const { openSettings } = await import('expo-linking');
    openSettings();
  } catch (error) {
    console.warn('Could not open settings:', error);
  }
};
