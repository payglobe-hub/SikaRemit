// Device utility functions
export const getDeviceInfo = async () => {
  try {
    const deviceInfo = await import('expo-device');
    return {
      brand: deviceInfo.brand,
      manufacturer: deviceInfo.manufacturer,
      modelName: deviceInfo.modelName,
      osName: deviceInfo.osName,
      osVersion: deviceInfo.osVersion,
      platformApiLevel: deviceInfo.platformApiLevel,
    };
  } catch (error) {
    console.warn('Device info not available:', error);
    return null;
  }
};

export const isEmulator = (): boolean => {
  // Basic emulator detection
  return false; // Would need platform-specific implementation
};

export const getDeviceId = (): string => {
  // Generate or retrieve device ID
  return 'device-id-placeholder'; // Would need proper implementation
};

export const getScreenDimensions = () => {
  // Get screen dimensions
  return {
    width: 375, // Default iPhone width
    height: 812, // Default iPhone height
  };
};
