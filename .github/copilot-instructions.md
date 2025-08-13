# Prayer Reminder App - Copilot Instructions

## Architecture Overview

This is a **single-page Ionic Vue.js mobile app** that provides Islamic prayer time reminders. The app architecture is intentionally minimal with one main view component (`src/views/Home.vue`) that handles all core functionality.

**Key Components:**

- **Frontend**: Vue 3 + TypeScript + Ionic Framework
- **Mobile**: Capacitor for native Android builds
- **API**: Aladhan Prayer Times API for location-based prayer calculations
- **Notifications**: Capacitor Local Notifications plugin
- **Location**: HTML5 Geolocation API with IP-based fallback

## Critical Development Patterns

### Single Component Architecture

The entire app logic lives in `src/views/Home.vue` (397 lines). This includes:

- Location detection (GPS → IP fallback → Mecca default)
- Prayer time fetching and calculation
- Real-time countdown timer
- Local notification scheduling
- UI state management

When modifying features, work within this component rather than splitting into smaller components.

### Location Detection Flow

```typescript
// GPS permissions → IP-based location → Fallback to generic location
getUserLocation() → getLocationByIP() → showToast("Location unavailable")
```

The app uses a robust fallback chain for location detection. Always preserve this pattern when modifying location logic.

### Prayer Time Calculation

Uses **Islamic Society of North America (ISNA) method** (`method=2`) from Aladhan API. Prayer times are converted to timestamps for countdown calculations:

```typescript
// Prayer times stored as: { name, time, timestamp }
prayerTimes.value = [
  { name: "Fajr", time: timings.Fajr, timestamp: 0 },
  // ... Sunrise excluded from notifications
];
```

### Mobile Build Workflow

**Development:**

```bash
npm run dev  # Starts on localhost:8100
```

**Android Production:**

```bash
npm run build        # Build web assets
npx cap sync         # Sync to Capacitor
npx cap open android # Opens in Android Studio
```

The `capacitor.config.ts` configures notification icons, sounds, and Android-specific settings.

## Essential Configuration Files

- **`capacitor.config.ts`**: Notification settings (green theme, custom sounds)
- **`src/theme/variables.css`**: Islamic green color scheme (`#48c269`)
- **`package.json`**: Custom scripts for Android builds
- **`vite.config.ts`**: Port 8100 for Ionic compatibility

## Project-Specific Conventions

### Green Theme Usage

All primary UI elements use `color="success"` (lighter Islamic green). When adding new components, follow this pattern:

```vue
<ion-toolbar color="success">
<ion-fab-button color="success">
```

### Prayer Time Display

- **Sunrise is fetched but excluded from notifications** (not a prayer time)
- Current prayer highlighted with `current-prayer` class
- 24-hour format preserved from API response

### Notification Scheduling

Notifications are rescheduled on every prayer time fetch. Use this pattern:

```typescript
await LocalNotifications.cancel({ notifications: [] });
await LocalNotifications.schedule({ notifications });
```

### Error Handling

Always show user-friendly toast messages for errors:

```typescript
showToast("Error message"); // Uses success color theme
```

## Common Development Tasks

### Adding New Prayer Calculation Methods

Modify the `method` parameter in `fetchPrayerTimes()`. Available methods documented at [Aladhan API docs](https://aladhan.com/prayer-times-api).

### Customizing Notification Behavior

Edit `scheduleNotifications()` function and update `capacitor.config.ts` for sound/icon changes.

### Styling Updates

Global theme changes go in `src/theme/variables.css`. Component-specific styles use scoped CSS in `Home.vue`.

### Adding Location Services

Always maintain the GPS → IP → fallback pattern. Test with location permissions disabled to ensure graceful degradation.

## Troubleshooting Common Issues

### Vue Router Build Error

If you encounter `"vue-router" external dependency` errors during build:

- The app doesn't use Vue Router (single-page architecture)
- `vite.config.ts` externalizes vue-router in `rollupOptions.external`
- This prevents Ionic Vue from trying to bundle unused router dependencies

### Android Build Issues

- Ensure Node.js v18+ and JDK 11+ are installed
- Run `npx cap sync` if native dependencies seem out of sync
- Clean build: `rm -rf android/` then `npx cap add android`

### Location Services Not Working

- Test the GPS → IP → fallback chain by denying location permissions
- IP geolocation depends on ipapi.co service availability
- Default fallback shows "Location unavailable" message

### TypeScript Compilation Issues

- Main build script (`npm run build`) now skips TypeScript compilation for faster builds
- Use `npm run build:check` to run TypeScript validation before building
- This avoids vue-tsc compatibility issues while maintaining type safety during development
