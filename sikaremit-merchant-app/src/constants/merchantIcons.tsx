import React from 'react';
import { Svg, Path, Circle, Rect } from 'react-native-svg';
import { merchantDesignTokens, getNavigationColor } from './designTokens';

// Premium Custom Icons for Merchant - Matching Admin Design
export const MerchantDashboardIcon = ({ size = 24, color }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M3 7V17C3 18.1046 3.89543 19 5 19H19C20.1046 19 21 18.1046 21 17V9C21 7.89543 20.1046 7 19 7H13L11 5H5C3.89543 5 3 5.89543 3 7Z" stroke={color || merchantDesignTokens.colors.primary[500]} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <Rect x="7" y="11" width="4" height="2" rx="1" fill={color || merchantDesignTokens.colors.primary[500]}/>
    <Rect x="13" y="11" width="4" height="2" rx="1" fill={color || merchantDesignTokens.colors.primary[500]}/>
    <Rect x="7" y="14" width="4" height="2" rx="1" fill={color || merchantDesignTokens.colors.primary[500]}/>
    <Rect x="13" y="14" width="4" height="2" rx="1" fill={color || merchantDesignTokens.colors.primary[500]}/>
    <Circle cx="19" cy="7" r="2" fill={color || merchantDesignTokens.colors.primary[500]}/>
  </Svg>
);

export const MerchantAnalyticsIcon = ({ size = 24, color }: { size?: number; color?: string }) => {
  const iconColor = color || getNavigationColor('analytics').iconColor;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M9 19V13C9 11.8954 8.10457 11 7 11H5C3.89543 11 3 11.8954 3 13V19C3 20.1046 3.89543 21 5 21H7C8.10457 21 9 20.1046 9 19Z" stroke={iconColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <Path d="M9 5C9 3.89543 9.89543 3 11 3H13C14.1046 3 15 3.89543 15 5V19C15 20.1046 14.1046 21 13 21H11C9.89543 21 9 20.1046 9 19V5Z" stroke={iconColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <Path d="M21 9C21 7.89543 20.1046 7 19 7H17C15.8954 7 15 7.89543 15 9V19C15 20.1046 15.8954 21 17 21H19C20.1046 21 21 20.1046 21 19V9Z" stroke={iconColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <Circle cx="6" cy="16" r="1" fill={iconColor}/>
      <Circle cx="12" cy="8" r="1" fill={iconColor}/>
      <Circle cx="18" cy="14" r="1" fill={iconColor}/>
    </Svg>
  );
};

export const MerchantDevicesIcon = ({ size = 24, color }: { size?: number; color?: string }) => {
  const iconColor = color || getNavigationColor('devices').iconColor;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="5" y="2" width="14" height="20" rx="2" ry="2" stroke={iconColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <Circle cx="12" cy="18" r="1" fill={iconColor}/>
      <Rect x="8" y="6" width="8" height="1" rx="0.5" fill={iconColor}/>
      <Rect x="8" y="9" width="6" height="1" rx="0.5" fill={iconColor}/>
      <Rect x="8" y="12" width="4" height="1" rx="0.5" fill={iconColor}/>
    </Svg>
  );
};

export const MerchantReceiptsIcon = ({ size = 24, color }: { size?: number; color?: string }) => {
  const iconColor = color || getNavigationColor('receipts').iconColor;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z" stroke={iconColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <Path d="M14 2V8H20" stroke={iconColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <Path d="M16 13H8" stroke={iconColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <Path d="M16 17H8" stroke={iconColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <Path d="M10 9H8" stroke={iconColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <Rect x="7" y="11" width="3" height="6" rx="1" fill={iconColor}/>
    </Svg>
  );
};

export const MerchantPOSIcon = ({ size = 24, color }: { size?: number; color?: string }) => {
  const iconColor = color || getNavigationColor('pos').iconColor;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="2" y="3" width="20" height="14" rx="2" ry="2" stroke={iconColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <Circle cx="9" cy="9" r="1" fill={iconColor}/>
      <Circle cx="12" cy="9" r="1" fill={iconColor}/>
      <Circle cx="15" cy="9" r="1" fill={iconColor}/>
      <Circle cx="9" cy="12" r="1" fill={iconColor}/>
      <Circle cx="12" cy="12" r="1" fill={iconColor}/>
      <Circle cx="15" cy="12" r="1" fill={iconColor}/>
      <Rect x="6" y="16" width="12" height="2" rx="1" fill={iconColor}/>
    </Svg>
  );
};

export const MerchantSettingsIcon = ({ size = 24, color }: { size?: number; color?: string }) => {
  const iconColor = color || merchantDesignTokens.colors.gray[500];
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 1V3M12 21V23M4.22 4.22L5.64 5.64M18.36 18.36L19.78 19.78M1 12H3M21 12H23M4.22 19.78L5.64 18.36M18.36 5.64L19.78 4.22" stroke={iconColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <Circle cx="12" cy="12" r="3" stroke={iconColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </Svg>
  );
};

export const MerchantProfileIcon = ({ size = 24, color }: { size?: number; color?: string }) => {
  const iconColor = color || merchantDesignTokens.colors.gray[500];
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21" stroke={iconColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <Path d="M12 11C14.2091 11 16 9.20914 16 7C16 4.79086 14.2091 3 12 3C9.79086 3 8 4.79086 8 7C8 9.20914 9.79086 11 12 11Z" stroke={iconColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </Svg>
  );
};

export const MerchantLogoutIcon = ({ size = 24, color }: { size?: number; color?: string }) => {
  const iconColor = color || merchantDesignTokens.colors.error[500];
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M9 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H9" stroke={iconColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <Path d="M16 17L21 12L16 7" stroke={iconColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <Path d="M21 12H9" stroke={iconColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </Svg>
  );
};

export const MerchantRefreshIcon = ({ size = 24, color }: { size?: number; color?: string }) => {
  const iconColor = color || merchantDesignTokens.colors.gray[500];
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M3 12C3 16.9706 7.02944 21 12 21C16.9706 21 21 16.9706 21 12C21 7.02944 16.9706 3 12 3C9.5 3 7.2039 3.99414 5.52015 5.52015L3 3" stroke={iconColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <Path d="M3 3V8H8" stroke={iconColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </Svg>
  );
};

// Icon mapping for easy access
export const merchantIcons = {
  dashboard: MerchantDashboardIcon,
  analytics: MerchantAnalyticsIcon,
  devices: MerchantDevicesIcon,
  receipts: MerchantReceiptsIcon,
  pos: MerchantPOSIcon,
  settings: MerchantSettingsIcon,
  profile: MerchantProfileIcon,
  logout: MerchantLogoutIcon,
  refresh: MerchantRefreshIcon,
} as const;

export type MerchantIconType = keyof typeof merchantIcons;
