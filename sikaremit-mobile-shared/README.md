# SikaRemit Mobile Shared Library

A comprehensive shared library for SikaRemit mobile applications, providing common components, services, types, and utilities for both customer and merchant apps.

## Architecture Overview

```
sikaremit-mobile-shared/
├── src/
│   ├── components/          # Shared UI components
│   │   ├── ui/             # Basic UI components (Button, Input, Card, etc.)
│   │   ├── qr/             # QR-related components
│   │   ├── offline/        # Offline functionality components
│   │   └── index.ts        # Component exports
│   ├── services/           # Shared API services
│   │   ├── api.ts          # Base API configuration
│   │   ├── authService.ts  # Authentication service
│   │   ├── paymentService.ts # Payment processing service
│   │   ├── qrService.ts    # QR code service
│   │   ├── mobileMoneyService.ts # Mobile money service
│   │   ├── kycService.ts   # KYC verification service
│   │   ├── exchangeRateService.ts # Exchange rate service
│   │   ├── biometricService.ts # Biometric authentication
│   │   ├── notificationService.ts # Notification handling
│   │   ├── offline/        # Offline services
│   │   └── index.ts        # Service exports
│   ├── types/              # Shared TypeScript types
│   │   ├── auth.ts         # Authentication types
│   │   ├── payment.ts      # Payment-related types
│   │   ├── user.ts         # User types
│   │   ├── qr.ts           # QR code types
│   │   ├── mobileMoney.ts  # Mobile money types
│   │   ├── kyc.ts          # KYC types
│   │   ├── navigation.ts   # Navigation types
│   │   ├── api.ts          # API response types
│   │   └── index.ts        # Type exports
│   ├── constants/          # Shared constants
│   │   ├── api.ts          # API endpoints
│   │   ├── theme.ts        # Theme configuration
│   │   ├── mobileMoney.ts  # Mobile money providers
│   │   └── index.ts        # Constant exports
│   ├── hooks/              # Shared React hooks
│   │   ├── useAuth.ts      # Authentication hook
│   │   ├── useTheme.ts     # Theme hook
│   │   ├── useOffline.ts   # Offline functionality hook
│   │   └── index.ts        # Hook exports
│   ├── context/            # Shared React contexts
│   │   ├── ThemeContext.tsx
│   │   ├── AuthContext.tsx
│   │   └── index.ts
│   ├── utils/              # Utility functions
│   │   ├── validation.ts   # Input validation
│   │   ├── formatting.ts   # Data formatting
│   │   ├── storage.ts      # Storage utilities
│   │   ├── encryption.ts   # Encryption utilities
│   │   └── index.ts
│   └── assets/             # Shared assets
│       ├── logos/          # Payment method logos
│       ├── icons/          # Common icons
│       └── images/         # Common images
├── package.json
├── tsconfig.json
├── README.md
└── index.ts                # Main library export
```

## Key Features

### 1. **Shared UI Components**
- **Button**: Unified button component with variants, sizes, loading states
- **Input**: Consistent input fields with validation
- **Card**: Flexible card layouts
- **Skeleton**: Loading skeleton components
- **PremiumCard**: Enhanced card with glass effects
- **KYCRequiredModal**: KYC verification modal
- **GlassCard**: Glass morphism card component
- **AnimatedPressable**: Animated pressable component

### 2. **Shared Services**
- **Authentication**: Login, logout, token management, profile management
- **Payments**: Transaction processing, payment methods, wallet operations
- **QR Codes**: QR generation, validation, processing
- **Mobile Money**: Provider integration, balance checks, transfers
- **KYC**: Document upload, verification status
- **Exchange Rates**: Real-time rate fetching and conversion
- **Biometrics**: Fingerprint/Face ID authentication
- **Notifications**: Push notification handling
- **Offline**: Offline queue management, sync operations

### 3. **Shared Types**
- **Auth Types**: User, LoginRequest, RegisterRequest, AuthTokens
- **Payment Types**: Transaction, PaymentMethod, Wallet, Currency
- **QR Types**: QRCodeData, validation responses
- **Mobile Money**: Provider configurations, network types
- **Navigation**: Stack param lists for both apps
- **API**: Response types, error handling

### 4. **Shared Constants**
- **API Endpoints**: Centralized endpoint definitions
- **Theme**: Colors, typography, spacing, shadows
- **Mobile Money**: Provider configurations (MTN, AirtelTigo, Telecel, G-Money)

### 5. **Shared Hooks**
- **useAuth**: Authentication state management
- **useTheme**: Theme switching and management
- **useOffline**: Offline functionality and sync status

### 6. **Shared Contexts**
- **ThemeContext**: Light/dark theme management
- **AuthContext**: Authentication state provider

### 7. **Utilities**
- **Validation**: Form validation helpers
- **Formatting**: Currency, phone number, date formatting
- **Storage**: Secure storage operations
- **Encryption**: Data encryption/decryption

## Installation & Usage

### Installation
```bash
npm install @sikaremit/mobile-shared
# or
yarn add @sikaremit/mobile-shared
```

### Basic Usage
```typescript
// Import components
import { Button, Input, Card } from '@sikaremit/mobile-shared/components';

// Import services
import { authService, paymentService } from '@sikaremit/mobile-shared/services';

// Import types
import { User, Transaction } from '@sikaremit/mobile-shared/types';

// Import hooks
import { useAuth, useTheme } from '@sikaremit/mobile-shared/hooks';
```

## Configuration

### Theme Configuration
```typescript
import { ThemeProvider } from '@sikaremit/mobile-shared/context';

const App = () => {
  return (
    <ThemeProvider>
      {/* Your app content */}
    </ThemeProvider>
  );
};
```

### API Configuration
```typescript
import { configureApi } from '@sikaremit/mobile-shared/services';

configureApi({
  baseURL: 'https://api.sikaremit.com',
  timeout: 10000,
});
```

## Benefits

1. **Reduced Code Duplication**: Single source of truth for common functionality
2. **Consistency**: Unified UI/UX across both apps
3. **Maintainability**: Easier updates and bug fixes
4. **Type Safety**: Shared TypeScript interfaces
5. **Performance**: Optimized bundle sizes through tree-shaking
6. **Testing**: Centralized testing for shared functionality

## Versioning

This library follows semantic versioning (semver):
- **Major**: Breaking changes
- **Minor**: New features (backward compatible)
- **Patch**: Bug fixes (backward compatible)

## Development

### Building
```bash
npm run build
```

### Testing
```bash
npm run test
```

### Linting
```bash
npm run lint
```

## Migration Guide

The library is designed to be a drop-in replacement for existing duplicated code. Migration involves:

1. Installing the shared library
2. Updating imports to use shared components
3. Removing duplicated files from individual apps
4. Testing functionality

## Platform Support

- **React Native**: iOS, Android
- **Expo**: Managed workflow
- **TypeScript**: Full type support
- **React Native 0.70+**: Latest features and APIs
