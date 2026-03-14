<div align="center">
  <img src="../mini-wallet/public/winstantpay-logo-light.png" alt="WinstantPay Logo" width="280" />

  <h1>WinstantPay Mobile Wallet</h1>

  <p>A modern, multi-currency financial mobile wallet with KYC verification, instant payments, and FX exchange — built for the Winstant ecosystem.</p>

  <p>
    <img src="https://img.shields.io/badge/React_Native-0.76-61DAFB?logo=react&logoColor=white&labelColor=20232a" />
    <img src="https://img.shields.io/badge/Expo-52-000020?logo=expo&logoColor=white" />
    <img src="https://img.shields.io/badge/TypeScript-5.3-3178C6?logo=typescript&logoColor=white&labelColor=1e1e2e" />
    <img src="https://img.shields.io/badge/Expo_Router-4.0-000020?logo=expo&logoColor=white" />
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

`mini-mobile-wallet` is a React Native (Expo) port of the `mini-wallet` web application. It shares the same API layer and business logic, adapted for native mobile platforms.

**Migration from:** `mini-wallet` (React + Vite + react-router-dom)
**Migration to:** React Native + Expo Router (file-based routing)

---

## Project Structure

```
mini-mobile-wallet/
├── app/                    # Expo Router — screens & navigation
│   ├── _layout.tsx         # Root layout (navigation shell)
│   └── index.tsx           # Home / entry screen
├── assets/
│   ├── fonts/              # Custom fonts
│   └── images/             # App icons, splash screen
├── src/                    # (to be populated — migrated from mini-wallet)
│   ├── api/                # Axios services (shared with web)
│   ├── contexts/           # AuthContext, LanguageContext
│   ├── lang/               # i18n JSON (EN / FR)
│   ├── types/              # Shared TypeScript types
│   └── utils/              # Storage (AsyncStorage / SecureStore)
├── app.json                # Expo config
├── babel.config.js         # Babel (expo preset + reanimated)
├── metro.config.js         # Metro bundler config
├── tsconfig.json           # TypeScript config
├── index.ts                # Entry point → expo-router/entry
└── package.json
```

---

## Design System / Style Guide

> Reference for the companion mobile app and any future projects.

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

### Logo & Brand Assets

| Asset | Path | Notes |
|---|---|---|
| Logo (light, PNG) | `mini-wallet/public/winstantpay-logo-light.png` | Use on dark backgrounds |
| App Icon | `assets/images/icon.png` | 1024×1024 PNG |
| Splash Screen | `assets/images/splash.png` | Centered, `#0a0a0a` bg |
| Adaptive Icon | `assets/images/adaptive-icon.png` | Android only |

### Component Mapping (Web → Mobile)

| Web | React Native |
|---|---|
| `<div>` | `<View>` |
| `<span>`, `<p>` | `<Text>` |
| `<button>` | `<TouchableOpacity>` or `<Pressable>` |
| `<input>` | `<TextInput>` |
| `<ul>` / data maps | `<FlatList>` |
| `<img>` | `<Image>` |
| CSS file | `StyleSheet.create({})` |
| `localStorage` | `expo-secure-store` (tokens) / `@react-native-async-storage/async-storage` (prefs) |
| `react-router-dom` | `expo-router` (file-based, `app/` directory) |

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

# 2. Clone / enter project
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
# or: npx expo start
```

Scan the **QR code** shown in the terminal with:
- **Android:** Expo Go app
- **iOS:** Camera app

### Android Emulator (AVD required)

```bash
nvm use 22
npm run android
```

### iOS Simulator (macOS only)

```bash
nvm use 22
npm run ios
```

### Web Preview

```bash
nvm use 22
npm run web
```

---

## Building for Production

### Using EAS Build (recommended — no local SDK needed)

```bash
# Install EAS CLI once
nvm use 22
npm install -g eas-cli

# Login to Expo account
eas login

# Configure project (first time)
eas build:configure

# Build Android APK (for testing / sideload)
eas build --platform android --profile preview

# Build Android AAB (Google Play)
eas build --platform android --profile production

# Build iOS IPA
eas build --platform ios --profile production
```

### Local Android Build (requires Android SDK)

```bash
# Install Android cmdline-tools only (no Android Studio)
# See docs/nhotes.md for full setup guide

nvm use 22
npm run android
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

## Migration Phases

This project follows a phased migration from the `mini-wallet` web app:

| Phase | Status | Description |
|---|---|---|
| Phase 1 | ✅ Done | Environment setup (this file) |
| Phase 2 | 🔜 Next | Architecture mapping & dependency plan |
| Phase 3.1 | ⬜ Pending | Core utils, types, API services |
| Phase 3.2 | ⬜ Pending | Auth & Language contexts |
| Phase 3.3 | ⬜ Pending | Navigation shell (Expo Router) |
| Phase 3.4 | ⬜ Pending | Screen-by-screen conversion |

See [CLAUDE.md](./CLAUDE.md) for full migration instructions.

---

## Related

- [mini-wallet](../mini-wallet/) — the original React/Vite web app
- [Expo Docs](https://docs.expo.dev)
- [Expo Router Docs](https://expo.github.io/router)
- [EAS Build](https://docs.expo.dev/build/introduction/)
