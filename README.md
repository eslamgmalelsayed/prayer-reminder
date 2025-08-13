# Prayer Reminder App

A beautiful prayer time reminder app built with Ionic Vue.js featuring:

- Real-time prayer times based on your location
- Countdown timer to next prayer
- Local notifications for prayer times
- Green primary color theme
- Single screen interface

## Features

- 📍 **Location-based Prayer Times**: Automatically detects your location and shows accurate prayer times
- ⏰ **Live Countdown**: Real-time countdown to the next prayer
- 🔔 **Smart Notifications**: Receive notifications for each prayer time
- 🌙 **5 Daily Prayers**: Fajr, Dhuhr, Asr, Maghrib, and Isha
- 🎨 **Beautiful Green Theme**: Islamic green color scheme
- 📱 **Mobile Ready**: Built with Capacitor for native mobile features

## Prerequisites

Before running this project, you need to update your Node.js to a supported version:

1. Download and install Node.js v18 or later from [nodejs.org](https://nodejs.org/)
2. Install Android Studio for APK builds
3. Install Java Development Kit (JDK) 11 or later

## Setup Instructions

1. **Install dependencies**:

   ```bash
   npm install
   ```

2. **Install Ionic CLI** (if not already installed):

   ```bash
   npm install -g @ionic/cli
   ```

3. **Install Capacitor CLI**:

   ```bash
   npm install -g @capacitor/cli
   ```

4. **Initialize Capacitor**:

   ```bash
   npx cap init
   ```

5. **Add Android platform**:
   ```bash
   npx cap add android
   ```

## Development

Run the app in development mode:

```bash
npm run dev
```

The app will open at `http://localhost:8100`

## Building for Production

1. **Build the web app**:

   ```bash
   npm run build
   ```

2. **Sync with Capacitor**:

   ```bash
   npx cap sync
   ```

3. **Open in Android Studio**:

   ```bash
   npx cap open android
   ```

4. **Build APK in Android Studio**:
   - Click on Build → Build Bundle(s) / APK(s) → Build APK(s)
   - The APK will be generated in `android/app/build/outputs/apk/debug/`

## Quick APK Build Command

For a quick build:

```bash
npm run build:android
```

## API Used

This app uses the [Aladhan Prayer Times API](https://aladhan.com/prayer-times-api) to fetch accurate prayer times based on your location.

## Notifications

The app requests permission for local notifications to remind you of prayer times. Make sure to allow notifications when prompted.

## Troubleshooting

- **Node.js version error**: Update to Node.js v18 or later
- **Location not detected**: The app will fall back to Mecca, Saudi Arabia
- **Notifications not working**: Check if notification permissions are granted in your device settings
- **APK build fails**: Ensure Android Studio and JDK are properly installed

## Customization

You can customize the prayer calculation method by modifying the API call in `src/views/Home.vue`. The current method uses the Islamic Society of North America (ISNA) method.

## License

This project is for personal use as requested.
