Hi Friend, we are working on an existing project. Please re-analyze the repository now to account for recent updates. Once you have the full context, say OK and i will give you your net task
Important: If any part of the repo or the instructions are unclear or contradictory, stop and ask me for clarification. Do not make assumptions or begin coding until you are 100% certain of the requirements.

# Prompt — WinstantPay Mobile Wallet Enhancement

Use this prompt with Claude Code to execute the implementation plan step by step.
Reference: [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md)

---

## Context

You are working on a React Native + Expo mobile wallet app (`mini-mobile-wallet`). The app has 11 screens, uses Expo Router (file-based routing), SecureStore for tokens, AsyncStorage for preferences, and Axios for API calls. The theme is dark-mode only. Translation JSON files (EN/FR) are comprehensive but almost unused.

**Environment:** `nvm use 22`, Expo SDK 54, React Native 0.81.5, TypeScript strict.

---

## Phase A: Foundation

### A1 — Theme Tokens & Gradient Support

```
Install expo-linear-gradient:
  npx expo install expo-linear-gradient

Extend src/theme.ts:
- Add gradient pairs: cardGradient (e.g., ['#1e293b', '#0f172a']), primaryGradient (['#2563EB', '#1d4ed8']), accentGradient (['#10B981', '#059669'])
- Add shadow presets: cardShadow = { shadowColor, shadowOffset, shadowOpacity, shadowRadius, elevation }
- Add new colors: surfaceHighlight, borderLight, textAccent
```

### A2 — Reusable Components

Create the following in `components/ui/`:

**GradientCard.tsx** — Wraps children in a LinearGradient with rounded corners and shadow. Props: `colors?: string[]`, `style?`, `children`.

**CurrencyIcon.tsx** — Given a `currencyCode` prop (e.g., "USD"), renders the corresponding country flag emoji in a circular badge. Use the mapping from `src/utils/currencyFlags.ts`. Fallback: show first 2 characters of the currency code.

**CountryFlag.tsx** — Given a `countryCode` prop (ISO 3166-1 alpha-2), renders the flag emoji. Use regional indicator symbols: `String.fromCodePoint(0x1F1E6 + charCode - 65)` per letter.

**src/utils/currencyFlags.ts** — Export a `const CURRENCY_COUNTRY_MAP: Record<string, string>` mapping currency codes to ISO country codes: USD→US, EUR→EU, GBP→GB, JPY→JP, CHF→CH, CAD→CA, AUD→AU, NZD→NZ, ZAR→ZA, NGN→NG, KES→KE, GHS→GH, XOF→SN, XAF→CM, INR→IN, CNY→CN, SGD→SG, HKD→HK, AED→AE, BRL→BR, MXN→MX, etc. Also export `getCurrencyFlag(code: string): string` helper.

**AppButton.tsx** — Props: `title`, `onPress`, `variant: 'primary' | 'secondary' | 'danger'`, `disabled?`, `loading?`. Renders ActivityIndicator when loading.

**InfoRow.tsx** — Props: `label`, `value`, `icon?`. Currently duplicated in profile.tsx, exchange.tsx, statement.tsx — extract into one component.

### A3 — Session Persistence (WS-1)

In `src/contexts/AuthContext.tsx`:
1. After successful `login()`, call `await storage.saveCredentials(username, password)`.
2. In the `init` function: if tokens exist but are expired, try `refreshToken()` first. If refresh fails AND saved credentials exist, call `authService.login()` with saved credentials for silent re-login.
3. Add a `REMEMBER_ME` key to `storageKeys.ts`. Only save credentials if remember-me is enabled.

In `app/(auth)/login.tsx`:
1. Add a "Remember Me" toggle (switch). Persist its state in AsyncStorage.
2. On mount, if saved credentials exist, pre-fill username/password and auto-submit.

In `AuthContext.logout()`:
1. Also call `storage.clearSavedCredentials()`.

---

## Phase B: Core Features

### B1 — PIN Code (WS-2)

**Storage:**
- Add `PIN_HASH` to `storageKeys.ts`.
- In `storage.ts` add: `setPin(pin: string)` — hash with simple SHA-like approach (use the existing XOR cipher with a fixed salt, or just store in SecureStore since it's already encrypted at rest). `verifyPin(pin: string): boolean`. `hasPin(): boolean`. `clearPin()`.

**PIN Setup Screen** (`app/(app)/pin-setup.tsx`):
- Title: "Set Your PIN" or "Change PIN"
- 6 individual digit inputs (or a hidden TextInput with 6 circle indicators)
- Step 1: Enter PIN → Step 2: Confirm PIN → Save
- Navigate back to Profile on success
- Register in `_layout.tsx` with `href: null`

**PIN Entry Modal** (`components/ui/PinEntryModal.tsx`):
- Full-screen modal overlay
- 6 circle indicators (filled/empty)
- Numeric keypad (1-9, 0, backspace)
- Props: `visible`, `onSuccess`, `onCancel`
- On wrong PIN: shake animation + "Incorrect PIN" message
- Max 5 attempts then lock out for 30 seconds

**Integration:**
- `pay-now.tsx`: Before `handleSend()`, if `storage.hasPin()`, show PinEntryModal. On success, proceed.
- `exchange.tsx`: Before `handleBookDeal()`, if `storage.hasPin()`, show PinEntryModal. On success, proceed.
- `profile.tsx`: Add "Set PIN" / "Change PIN" button (shows "Set PIN" if no pin, "Change PIN" if exists).

### B2 — i18n Wiring (WS-4)

For each screen, add `const { t } = useLanguage();` and replace every hardcoded string with the corresponding `t('key')` call. The translation keys already exist in english.json and french.json.

**Screen → Key prefix mapping:**
- `login.tsx` → `t('auth.*')`
- `signup.tsx` → `t('auth.*')`
- `dashboard.tsx` → `t('dashboard.*')`
- `exchange.tsx` → `t('fx.*')`
- `pay-now.tsx` → already done, verify completeness
- `history/payments.tsx` → `t('history.*')`
- `history/convert.tsx` → `t('history.*')`
- `statement/[accountId].tsx` → `t('statement.*')`
- `profile.tsx` → `t('profile.*')`
- `change-password.tsx` → `t('profile.*')`
- `get-verified.tsx` → `t('verification.*')`
- `_layout.tsx` → `t('nav.*')` for tab labels
- `help.tsx` → `t('help.*')`

**Language Switcher:**
Add to Profile screen in the Settings card: a Pressable that opens a modal listing available languages (from `languages` in LanguageContext). On select, call `setLanguage(code)`.

**New keys needed** (add to both EN and FR):
- `pin.setPin`, `pin.changePin`, `pin.enterPin`, `pin.confirmPin`, `pin.pinMismatch`, `pin.pinSet`, `pin.incorrectPin`, `pin.tooManyAttempts`, `pin.forgotPin`
- `auth.rememberMe`

---

## Phase C: Screen Polish

### C1 — Screen-by-Screen UI Refresh (WS-3C)

Apply new components to each screen. Key changes per screen:

**Login:**
- LinearGradient background (subtle blue-to-dark)
- App logo/icon at top (use existing assets or Ionicons `wallet` icon large)
- Input fields with left icons (person, lock)
- Animated button press feedback

**Dashboard:**
- GradientCard for each balance card
- CurrencyIcon (flag) displayed prominently on each card
- Total portfolio value summary at top in a hero card
- Smooth card press animation (scale 0.98 on press)

**Exchange:**
- CurrencyIcon flags in currency picker modal rows
- CurrencyIcon flags next to selected buy/sell currency
- Quote card with gradient accent border or background
- Countdown timer styled as a circular progress or pill badge

**Pay Now:**
- CurrencyIcon flags in currency picker
- Review card with subtle gradient
- Success checkmark with animated scale-in

**Profile:**
- Gradient header behind avatar
- Modern rounded action buttons

**History screens (payments + convert):**
- CurrencyIcon in each row
- Color-coded amounts (green for credit, red for debit — already partially done)

**Statement:**
- GradientCard for the summary section
- Cleaner separator lines

**Tab bar:**
- Consider a subtle gradient or highlight on the active tab

### C2 — Help Screen (WS-5)

Replace the placeholder with a full implementation:

```
Structure:
- Search bar at top (filters sections and items by label/description)
- Collapsible sections (Pressable header → toggle show/hide items)
- Each item: bold label + description text
- All content from t('help.sections.*')

Implementation:
- Read section keys from help.sections object
- For each section: render title, then items
- Filter: match query against item.label and item.description (case-insensitive)
- Use Ionicons for section icons (rocket for Getting Started, wallet for Dashboard, etc.)
```

---

## Phase D: Testing Checklist

- [ ] Cold start with no saved data → login screen appears
- [ ] Login with "Remember Me" on → close app → reopen → auto-login to Dashboard
- [ ] Login with "Remember Me" off → close app → reopen → login screen appears
- [ ] Logout → clears credentials → next open shows login screen
- [ ] Set PIN from Profile → 6 digits → confirm → saved
- [ ] Send payment → PIN modal appears → correct PIN → payment sends
- [ ] Book FX deal → PIN modal appears → wrong PIN 3x → error message
- [ ] Switch language to French → navigate all screens → all text in French
- [ ] Switch back to English → all text in English
- [ ] Help screen → search "quote" → Exchange section items appear
- [ ] Dashboard balance cards show currency flag icons
- [ ] Exchange currency picker shows flag icons
- [ ] Pay Now currency picker shows flag icons
- [ ] App looks polished and modern, not flat/boring

---

## File Change Summary

### New Files
| File | Purpose |
|---|---|
| `components/ui/GradientCard.tsx` | Gradient card wrapper |
| `components/ui/CurrencyIcon.tsx` | Currency flag badge |
| `components/ui/CountryFlag.tsx` | Country flag emoji renderer |
| `components/ui/AppButton.tsx` | Reusable styled button |
| `components/ui/InfoRow.tsx` | Label/value row |
| `components/ui/PinEntryModal.tsx` | PIN entry overlay |
| `src/utils/currencyFlags.ts` | Currency→country code mapping |
| `app/(app)/pin-setup.tsx` | PIN setup screen |

### Modified Files
| File | Changes |
|---|---|
| `src/theme.ts` | Gradients, shadows, new colors |
| `src/api/storageKeys.ts` | PIN_HASH, REMEMBER_ME keys |
| `src/utils/storage.ts` | PIN methods, remember-me |
| `src/contexts/AuthContext.tsx` | Save credentials on login, auto-re-login on expired tokens |
| `src/lang/english.json` | PIN + remember-me keys |
| `src/lang/french.json` | PIN + remember-me keys |
| `app/(auth)/login.tsx` | Remember Me toggle, auto-fill, i18n, UI refresh |
| `app/(auth)/signup.tsx` | i18n, UI refresh |
| `app/(app)/_layout.tsx` | i18n tab labels, pin-setup route, tab bar styling |
| `app/(app)/dashboard.tsx` | GradientCard, CurrencyIcon, i18n |
| `app/(app)/pay-now.tsx` | PinEntryModal gate, CurrencyIcon, UI refresh |
| `app/(app)/exchange.tsx` | PinEntryModal gate, CurrencyIcon, i18n, UI refresh |
| `app/(app)/profile.tsx` | PIN setup button, language switcher, i18n, UI refresh |
| `app/(app)/help.tsx` | Full implementation with search + sections |
| `app/(app)/change-password.tsx` | i18n |
| `app/(app)/get-verified.tsx` | i18n |
| `app/(app)/history/payments.tsx` | CurrencyIcon, i18n |
| `app/(app)/history/convert.tsx` | CurrencyIcon, i18n |
| `app/(app)/statement/[accountId].tsx` | GradientCard, i18n |
| `package.json` | expo-linear-gradient dependency |
