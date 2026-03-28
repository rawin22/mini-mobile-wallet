<div align="center">
  <img src="../mini-wallet/public/winstantpay-logo-light.png" alt="WinstantPay Logo" width="280" />

  <h1>WinstantPay Mobile Wallet</h1>

  <p>A modern, multi-currency financial mobile wallet with KYC verification, instant payments, and FX exchange — built for the Winstant ecosystem.</p>

  <p>
    <img src="https://img.shields.io/badge/React_Native-0.81.5-61DAFB?logo=react&logoColor=white&labelColor=20232a" />
    <img src="https://img.shields.io/badge/Expo-54-000020?logo=expo&logoColor=white" />
    <img src="https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white&labelColor=1e1e2e" />
    <img src="https://img.shields.io/badge/Expo_Router-6.0-000020?logo=expo&logoColor=white" />
    <img src="https://img.shields.io/badge/Axios-1.13-5A29E4?logo=axios&logoColor=white&labelColor=1e1e2e" />
  </p>
  <p>
    <img src="https://img.shields.io/badge/Node-22_(nvm)-339933?logo=nodedotjs&logoColor=white&labelColor=1e1e2e" />
    <img src="https://img.shields.io/badge/Platform-Android%20%7C%20iOS-lightgrey?logo=android&logoColor=white&labelColor=3DDC84" />
    <img src="https://img.shields.io/badge/i18n-EN%20%7C%20FR-4CAF50?labelColor=2e7d32" />
    <img src="https://img.shields.io/badge/License-Proprietary-E53935?labelColor=b71c1c" />
  </p>
</div>

---

## Overview

`mini-mobile-wallet` is a React Native (Expo) port of the `mini-wallet` web application. It shares the same API layer and business logic, adapted for native mobile platforms using Expo Router for file-based navigation.

---

## Features

| Feature | Description |
|---|---|
| **Authentication** | Login with Remember Me / auto-login, full signup with field validation |
| **Dashboard** | Multi-currency balance cards, hide-zero toggle, favourites, quick exchange widget |
| **Send a Payment** | StealthID recipient lookup, QR code scanner, PIN-protected confirmation |
| **Receive a Payment** | Personal QR code display, tap-to-copy StealthID, share payment link |
| **FX Exchange** | Get live quotes, countdown timer, PIN-protected deal booking |
| **Payment History** | Paginated list of sent payments with reference and status |
| **Exchange History** | List of booked FX deals with rates, amounts, and value dates |
| **Account Statement** | Per-account transaction history with period filter |
| **Identity Verification** | 4-step KYC flow (personal info, ID document, selfie, review) |
| **Security / PIN** | 6-digit PIN setup and change; required for payments and FX deals |
| **Profile & Settings** | Change password, language switcher (EN / FR), verified links |
| **Onboarding** | 4-screen intro carousel shown on first launch |
| **Help Center** | Searchable help content in English and French |
| **i18n** | Full bilingual support — English and French, switchable at runtime |

---

## Project Structure

```
mini-mobile-wallet/
├── app/                        # Expo Router — screens & navigation
│   ├── _layout.tsx             # Root layout (font loading, providers)
│   ├── index.tsx               # Entry redirect
│   ├── (auth)/                 # Unauthenticated screens
│   │   ├── _layout.tsx
│   │   ├── login.tsx
│   │   └── signup.tsx
│   └── (app)/                  # Authenticated screens (tab navigator)
│       ├── _layout.tsx         # Bottom tab bar (Dashboard, Pay, Receive, Exchange, Profile)
│       ├── dashboard.tsx
│       ├── pay-now.tsx         # Send payment (lookup → form → review → PIN → success)
│       ├── receive.tsx         # QR code + share link
│       ├── exchange.tsx
│       ├── profile.tsx
│       ├── payment-history.tsx
│       ├── convert-history.tsx
│       ├── statement.tsx
│       ├── get-verified.tsx
│       ├── help.tsx
│       ├── settings.tsx
│       ├── change-password.tsx
│       └── onboarding.tsx
├── src/
│   ├── api/                    # Axios services
│   │   ├── client.ts           # Axios instance with auth interceptor
│   │   ├── config.ts           # Base URLs and endpoint constants
│   │   ├── auth.service.ts
│   │   ├── account.service.ts
│   │   ├── payment.service.ts
│   │   ├── exchange.service.ts
│   │   └── verified-link.service.ts
│   ├── components/             # Shared UI components
│   │   ├── CurrencyIcon.tsx
│   │   ├── PinEntryModal.tsx
│   │   └── SparklineChart.tsx
│   ├── contexts/
│   │   ├── AuthContext.tsx
│   │   └── LanguageContext.tsx
│   ├── lang/
│   │   ├── english.json
│   │   └── french.json
│   ├── types/                  # Shared TypeScript types
│   └── utils/
│       ├── currencyIcons.ts
│       ├── formatters.ts
│       └── storage.ts          # SecureStore (tokens) + AsyncStorage (prefs)
├── assets/
│   ├── fonts/
│   └── images/
├── docs/
│   └── IMPLEMENTATION_PLAN.md
├── app.json
├── eas.json
├── tsconfig.json
├── .eslintrc.js
└── package.json
```

---

## Design System / Style Guide

### Colors

| Token | Hex | Usage |
|---|---|---|
| `background` | `#0a0a0a` | Screen backgrounds |
| `surface` | `#1a1a1a` | Cards, modals |
| `border` | `#2a2a2a` | Dividers, input borders |
| `primary` | `#2563EB` | Primary actions, buttons (blue) |
| `primary-light` | `#3B82F6` | Hover / focus states |
| `accent` | `#10B981` | Success, positive balance (green) |
| `danger` | `#EF4444` | Errors, negative values (red) |
| `warning` | `#F59E0B` | Warnings, pending states |
| `text-primary` | `#FFFFFF` | Headings, primary text |
| `text-secondary` | `#888888` | Labels, placeholder text |
| `text-muted` | `#555555` | Disabled, hints |

### Typography

| Role | Size | Weight |
|---|---|---|
| Screen Title | 28–32px | Bold (700) |
| Section Heading | 18–20px | SemiBold (600) |
| Body | 14–16px | Regular (400) |
| Caption / Label | 12px | Regular (400) |
| Button | 14–16px | SemiBold (600) |

> Font family: System default (`-apple-system` / Roboto). Custom font support via `expo-font` is pre-configured.

---

## Prerequisites

| Tool | Version | Install |
|---|---|---|
| nvm | any | [nvm-sh/nvm](https://github.com/nvm-sh/nvm) |
| Node.js | **22** | `nvm install 22` |
| npm | 10+ | bundled with Node 22 |
| Expo Go (phone) | latest | [expo.dev/go](https://expo.dev/go) |

> **No Android Studio required.** Use **Expo Go** on your physical device for development. EAS Build handles production APK/IPA in CI.

---

## Setup

```bash
# 1. Use correct Node version
nvm use 22

# 2. Enter project
cd mini-mobile-wallet

# 3. Install dependencies
npm install
```

---

## Running the App

### On Physical Device (Expo Go — recommended)

```bash
nvm use 22
npm start
```

Scan the **QR code** shown in the terminal with:
- **Android:** Expo Go app
- **iOS:** Camera app

### Android Emulator

```bash
nvm use 22
npm run android
```

### iOS Simulator (macOS only)

```bash
nvm use 22
npm run ios
```

---

## Code Quality

```bash
# TypeScript compile check (zero errors required)
npm run typecheck

# ESLint (zero errors; warnings are non-blocking)
npm run lint
```

Both checks run against the full `src/` and `app/` tree. Fix all `typecheck` errors before committing. Lint warnings (`no-explicit-any`, `no-unused-vars`) are informational.

---

## Building for Production

### Using EAS Build (recommended — no local SDK needed)

```bash
# Install EAS CLI once
npm install -g eas-cli

# Login to Expo account
eas login

# Build Android APK (for testing / sideload)
eas build --platform android --profile preview

# Build Android AAB (Google Play)
eas build --platform android --profile production

# Build iOS IPA
eas build --platform ios --profile production
```

---

## Environment Variables

Create `.env` at the project root (never commit this):

```env
EXPO_PUBLIC_API_BASE_URL=https://api.winstantpay.com
EXPO_PUBLIC_API_TIMEOUT=30000
```

> For local Android emulator testing, use `10.0.2.2` instead of `localhost`:
> ```env
> EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:3000
> ```

---

## Android SDK (Lean Setup — No Android Studio)

If you want a local Android emulator without installing Android Studio:

```bash
# 1. Download cmdline-tools
mkdir -p ~/Android/cmdline-tools && cd ~/Android/cmdline-tools
wget https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip
unzip commandlinetools-linux-*.zip -d latest && rm *.zip

# 2. Add to shell profile (~/.zshrc or ~/.bashrc)
export ANDROID_HOME=$HOME/Android
export PATH=$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$PATH

source ~/.zshrc

# 3. Accept licenses
sdkmanager --licenses

# 4. Install platform tools + emulator
sdkmanager "platform-tools" "platforms;android-35" "emulator" "system-images;android-35;google_apis;x86_64"

# 5. Create AVD
avdmanager create avd -n Pixel8 -k "system-images;android-35;google_apis;x86_64" --device "pixel_8"

# 6. Start emulator
emulator -avd Pixel8 &

# 7. Verify
adb devices
```

---

## Related

- [mini-wallet](../mini-wallet/) — the original React/Vite web app
- [Expo Docs](https://docs.expo.dev)
- [Expo Router Docs](https://expo.github.io/router)
- [EAS Build](https://docs.expo.dev/build/introduction/)
