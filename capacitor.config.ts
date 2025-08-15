import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.prayer.reminder",
  appName: "Prayer Reminder",
  webDir: "dist",
  server: {
    androidScheme: "https",
  },
  plugins: {
    LocalNotifications: {
      smallIcon: "ic_stat_icon_config_sample",
      iconColor: "#28A745",
      // Use device default notification sound (no custom sound)
    },
  },
};

export default config;
