# Implementation Plan — WinstantPay Mobile Wallet Enhancement

**Created:** 2026-03-15
**Status:** Planning
**Scope:** Session persistence, PIN security, UI modernization, i18n completion, Help screen

---

## Current State Analysis

| Area | Current | Problem |
|---|---|---|
| **Session persistence** | `storage.saveCredentials()` / `getSavedCredentials()` exist but are **never called** from login.tsx. AuthContext init restores tokens from SecureStore, but tokens expire and no auto-re-login occurs. | User must re-enter username/password every time. |
| **PIN code** | Does not exist. | No secondary security gate before payments or FX. |
| **UI / Design** | Flat dark cards (`#1a1a1a` on `#0a0a0a`), no gradients, no currency/country icons, no visual depth. | Looks like a developer prototype, not a modern fintech app. |
| **i18n usage** | EN/FR JSON files are comprehensive. Only `pay-now.tsx` uses `t()`. All other 10 screens have hardcoded English strings. No language switcher UI. | French users see English everywhere. |
| **Help screen** | Placeholder: "Coming soon". Full help content exists in `english.json` / `french.json` under `help.sections`. | Feature is unfinished. |
| **Components** | `components/` directory is empty. Every screen builds its own cards, badges, buttons. | Massive code duplication, inconsistent styling. |

---

## Work Streams

### WS-1: Session Persistence & Auto-Login
**Goal:** User opens the app and goes straight to Dashboard without re-entering credentials.

| # | Task | Files | Status |
|---|---|---|---|
| 1.1 | Wire up `storage.saveCredentials()` in `AuthContext.login()` after successful login | `src/contexts/AuthContext.tsx` | [ ] |
| 1.2 | On app init, if tokens are expired but saved credentials exist, auto-re-login silently using `storage.getSavedCredentials()` | `src/contexts/AuthContext.tsx` | [ ] |
| 1.3 | Add "Remember Me" toggle to login screen; only save credentials when toggled on; persist toggle state | `app/(auth)/login.tsx`, `src/api/storageKeys.ts` | [ ] |
| 1.4 | On logout, clear saved credentials and tokens | `src/contexts/AuthContext.tsx` | [ ] |
| 1.5 | Test: cold start with saved creds → auto-login to Dashboard; cold start without → login screen | manual | [ ] |

---

### WS-2: 6-Digit PIN Code
**Goal:** User can set a PIN in Profile. Before confirming a payment or FX deal, the PIN entry screen appears.

| # | Task | Files | Status |
|---|---|---|---|
| 2.1 | Add `PIN_HASH` key to `storageKeys.ts`; add `setPin()`, `getPin()`, `hasPin()`, `clearPin()` to `storage.ts` using SecureStore | `src/api/storageKeys.ts`, `src/utils/storage.ts` | [ ] |
| 2.2 | Create `PinSetupScreen` — 6-digit input + confirm; store hashed PIN in SecureStore | `app/(app)/pin-setup.tsx` | [ ] |
| 2.3 | Add "Set PIN" / "Change PIN" button in Profile screen | `app/(app)/profile.tsx` | [ ] |
| 2.4 | Create reusable `PinEntryModal` component — 6 circles, numeric keypad, backspace, "Forgot PIN" link | `components/ui/PinEntryModal.tsx` | [ ] |
| 2.5 | Gate payment confirmation in `pay-now.tsx`: show `PinEntryModal` before calling `handleSend()` | `app/(app)/pay-now.tsx` | [ ] |
| 2.6 | Gate FX deal booking in `exchange.tsx`: show `PinEntryModal` before calling `handleBookDeal()` | `app/(app)/exchange.tsx` | [ ] |
| 2.7 | Register `pin-setup` as hidden tab in `(app)/_layout.tsx` | `app/(app)/_layout.tsx` | [ ] |
| 2.8 | Add PIN-related i18n keys to `english.json` and `french.json` | `src/lang/english.json`, `src/lang/french.json` | [ ] |
| 2.9 | Test: set PIN → make payment → PIN modal appears → correct PIN → payment proceeds; wrong PIN → error shake | manual | [ ] |

---

### WS-3: UI Modernization
**Goal:** Transform the flat prototype look into a polished fintech app with gradients, depth, currency flags, and country icons.

#### 3A. Theme & Design Tokens Update

| # | Task | Files | Status |
|---|---|---|---|
| 3A.1 | Extend `theme.ts` with gradient color pairs, shadow presets, and new semantic colors (e.g., `cardGradientStart`, `cardGradientEnd`) | `src/theme.ts` | [ ] |
| 3A.2 | Install `expo-linear-gradient` for gradient backgrounds | `package.json` | [ ] |

#### 3B. Reusable Components

| # | Task | Files | Status |
|---|---|---|---|
| 3B.1 | Create `GradientCard` — card with LinearGradient background, shadow, rounded corners | `components/ui/GradientCard.tsx` | [ ] |
| 3B.2 | Create `CurrencyIcon` — shows flag emoji or SVG icon for a given currency code (map CCY→country→flag) | `components/ui/CurrencyIcon.tsx` | [ ] |
| 3B.3 | Create `CountryFlag` — shows country flag for a given ISO country code | `components/ui/CountryFlag.tsx` | [ ] |
| 3B.4 | Create currency-to-country mapping utility (e.g., USD→US, EUR→EU, GBP→GB, XAF→CM, etc.) | `src/utils/currencyFlags.ts` | [ ] |
| 3B.5 | Create `AppButton` — primary/secondary/danger variants with consistent styling | `components/ui/AppButton.tsx` | [ ] |
| 3B.6 | Create `InfoRow` — reusable label/value row (currently duplicated in profile, exchange, statement) | `components/ui/InfoRow.tsx` | [ ] |

#### 3C. Screen-by-Screen UI Refresh

| # | Task | Files | Status |
|---|---|---|---|
| 3C.1 | **Login**: Add logo/brand mark at top, subtle gradient background, polished input fields with icons, animated sign-in button | `app/(auth)/login.tsx` | [ ] |
| 3C.2 | **Signup**: Match login styling | `app/(auth)/signup.tsx` | [ ] |
| 3C.3 | **Dashboard**: Gradient balance cards with `CurrencyIcon` flag, total portfolio value header, card press animation | `app/(app)/dashboard.tsx` | [ ] |
| 3C.4 | **Pay Now**: Currency picker shows `CurrencyIcon` flags beside each option, styled review card | `app/(app)/pay-now.tsx` | [ ] |
| 3C.5 | **Exchange**: Currency pickers show `CurrencyIcon` flags, quote card with gradient accent, countdown styling | `app/(app)/exchange.tsx` | [ ] |
| 3C.6 | **Profile**: Modern profile header with gradient, section cards with subtle shadows | `app/(app)/profile.tsx` | [ ] |
| 3C.7 | **Payment History**: Currency icons in each payment card, color-coded amounts | `app/(app)/history/payments.tsx` | [ ] |
| 3C.8 | **FX History**: Currency pair flags in each deal card | `app/(app)/history/convert.tsx` | [ ] |
| 3C.9 | **Statement**: Gradient summary card, cleaner transaction rows | `app/(app)/statement/[accountId].tsx` | [ ] |
| 3C.10 | **Tab bar**: Active tab highlight with gradient indicator, slightly larger icons | `app/(app)/_layout.tsx` | [ ] |

---

### WS-4: Complete i18n Across All Screens
**Goal:** Every user-facing string uses `t()` from LanguageContext. Add a language switcher.

| # | Task | Files | Status |
|---|---|---|---|
| 4.1 | **Login screen**: Replace all hardcoded strings with `t('auth.*')` calls | `app/(auth)/login.tsx` | [ ] |
| 4.2 | **Signup screen**: Replace all hardcoded strings with `t('auth.*')` calls | `app/(auth)/signup.tsx` | [ ] |
| 4.3 | **Dashboard**: Replace hardcoded strings with `t('dashboard.*')` calls | `app/(app)/dashboard.tsx` | [ ] |
| 4.4 | **Exchange**: Replace hardcoded strings with `t('fx.*')` calls | `app/(app)/exchange.tsx` | [ ] |
| 4.5 | **Payment History**: Replace hardcoded strings with `t('history.*')` calls | `app/(app)/history/payments.tsx` | [ ] |
| 4.6 | **FX History**: Replace hardcoded strings with `t('history.*')` calls | `app/(app)/history/convert.tsx` | [ ] |
| 4.7 | **Statement**: Replace hardcoded strings with `t('statement.*')` calls | `app/(app)/statement/[accountId].tsx` | [ ] |
| 4.8 | **Profile**: Replace hardcoded strings with `t('profile.*')` calls | `app/(app)/profile.tsx` | [ ] |
| 4.9 | **Change Password**: Replace hardcoded strings with `t('profile.*')` calls | `app/(app)/change-password.tsx` | [ ] |
| 4.10 | **Get Verified**: Replace hardcoded strings with `t('verification.*')` calls | `app/(app)/get-verified.tsx` | [ ] |
| 4.11 | **Tab bar labels**: Use `t('nav.*')` for tab titles | `app/(app)/_layout.tsx` | [ ] |
| 4.12 | Add language switcher dropdown/modal to Profile screen (or Settings section) | `app/(app)/profile.tsx` | [ ] |
| 4.13 | Add any missing translation keys discovered during wiring (PIN, new UI labels) to both `english.json` and `french.json` | `src/lang/english.json`, `src/lang/french.json` | [ ] |
| 4.14 | Test: switch to French → navigate all screens → verify no English fallbacks remain | manual | [ ] |

---

### WS-5: Help Screen
**Goal:** Build a full, searchable Help screen using the existing i18n help content.

| # | Task | Files | Status |
|---|---|---|---|
| 5.1 | Build Help screen with search bar, collapsible sections, and styled items | `app/(app)/help.tsx` | [ ] |
| 5.2 | Read help content from `t('help.sections.*')` so it's fully translated | `app/(app)/help.tsx` | [ ] |
| 5.3 | Add "Help" action button in Profile screen (currently exists but targets placeholder) | verify link works | [ ] |
| 5.4 | Test: search "quote" → shows Exchange help items; switch to French → content in French | manual | [ ] |

---

## Execution Order (Recommended)

```
Phase A — Foundation (do first, other work builds on these)
  WS-3A  Theme tokens + expo-linear-gradient install
  WS-3B  Reusable components (GradientCard, CurrencyIcon, CountryFlag, AppButton, InfoRow)
  WS-1   Session persistence (small, self-contained)

Phase B — Core features
  WS-2   PIN code (needs new components from 3B)
  WS-4   i18n wiring (touch every screen — pair with UI refresh)

Phase C — Screen polish (use new components)
  WS-3C  Screen-by-screen UI refresh (apply GradientCard, CurrencyIcon, etc.)
  WS-5   Help screen

Phase D — Verification
  Manual testing across all flows
  French language full walkthrough
```

---

## Definitions

- **CCY icon**: A flag or symbol representing a currency (e.g., USD shows US flag, EUR shows EU flag)
- **Country flag**: An emoji or image representing a country's flag by ISO 3166-1 alpha-2 code
- **PIN hash**: The PIN is hashed before storage — never stored in plaintext
- **Auto-login**: On cold start, if valid saved credentials exist, the app logs in silently without showing the login form

---

## Risk Notes

| Risk | Mitigation |
|---|---|
| expo-linear-gradient may need native rebuild | Use `expo install` to get compatible version; test on Expo Go first |
| PIN hash without server-side verification is local-only security | Acceptable for MVP — server already validates the payment/FX API calls |
| Currency→country mapping won't cover all exotic CCY codes | Provide a fallback (generic coin icon or first 2 letters of CCY code) |
| i18n wiring across 10+ screens is tedious and error-prone | Do it systematically screen by screen; test with FR to catch misses |
