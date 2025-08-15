<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar color="success">
        <ion-title class="fancy-title">
          <!-- Replace this line in both header and condense header -->
          <!-- <ion-icon :icon="moonOutline" class="logo-icon"></ion-icon> -->
          <span
            class="logo-icon"
            style="display: inline-block; vertical-align: middle"
          >
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <path
                d="M16 4a12 12 0 1 0 0 24c-5.523 0-10-4.477-10-10S10.477 4 16 4z"
                fill="#48c269"
              />
              <path d="M22 10.5l1.5 4.5h-3l1.5-4.5z" fill="#fff" />
            </svg>
          </span>
          <span class="title-text">Prayer Times</span>
        </ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true" class="ion-padding">
      <ion-refresher slot="fixed" @ionRefresh="handleRefresh">
        <ion-refresher-content
          pulling-icon="chevron-down-circle-outline"
          pulling-text="Pull to refresh"
          refreshing-spinner="circles"
          refreshing-text="Refreshing prayer times..."
        >
          <div class="circle-loader"></div>
        </ion-refresher-content>
      </ion-refresher>

      <ion-header collapse="condense">
        <ion-toolbar color="success">
          <ion-title size="large" class="fancy-title large">
            <!-- Replace this line in both header and condense header -->
            <!-- <ion-icon :icon="moonOutline" class="logo-icon"></ion-icon> -->
            <span
              class="logo-icon"
              style="display: inline-block; vertical-align: middle"
            >
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <path
                  d="M16 4a12 12 0 1 0 0 24c-5.523 0-10-4.477-10-10S10.477 4 16 4z"
                  fill="#48c269"
                />
                <path d="M22 10.5l1.5 4.5h-3l1.5-4.5z" fill="#fff" />
              </svg>
            </span>
            <span class="title-text">Prayer Times</span>
          </ion-title>
        </ion-toolbar>
      </ion-header>

      <div class="card-container">
        <!-- Location and Date -->
        <ion-card class="compact-card">
          <ion-card-header>
            <ion-card-title class="text-center">{{
              currentLocation
            }}</ion-card-title>
            <ion-card-subtitle class="text-center">{{
              currentDate
            }}</ion-card-subtitle>
          </ion-card-header>
        </ion-card>

        <!-- Next Prayer Countdown -->
        <ion-card color="success" v-if="nextPrayer" class="compact-card">
          <ion-card-header>
            <ion-card-title class="text-center">Next Prayer</ion-card-title>
            <ion-card-subtitle class="text-center">{{
              nextPrayer.name
            }}</ion-card-subtitle>
          </ion-card-header>
          <ion-card-content>
            <div class="countdown-container">
              <h1 class="countdown-timer">{{ timeUntilNext }}</h1>
              <p class="next-prayer-time">
                at {{ formatTime(nextPrayer.time) }}
              </p>
            </div>
          </ion-card-content>
        </ion-card>

        <!-- Prayer Times List -->
        <div class="prayer-grid">
          <ion-card
            v-for="prayer in prayerTimes"
            :key="prayer.name"
            class="compact-card prayer-card"
          >
            <ion-item
              :class="{ 'current-prayer': prayer.name === nextPrayer?.name }"
            >
              <ion-label>
                <h2>{{ prayer.name }}</h2>
                <p>{{ formatTime(prayer.time) }}</p>
              </ion-label>
              <ion-icon
                v-if="prayer.name === nextPrayer?.name"
                :icon="timeOutline"
                color="success"
                slot="end"
              />
            </ion-item>
          </ion-card>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from "vue";
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonCardContent,
  IonItem,
  IonLabel,
  IonIcon,
  IonRefresher,
  IonRefresherContent,
  toastController,
} from "@ionic/vue";
import { timeOutline, star } from "ionicons/icons";
import axios from "axios";
import {
  LocalNotifications,
  type PendingLocalNotificationSchema,
} from "@capacitor/local-notifications";
import { Geolocation } from "@capacitor/geolocation";

interface PrayerTime {
  name: string;
  time: string;
  timestamp: number;
}

const currentLocation = ref("Loading...");
const currentDate = ref("");
const prayerTimes = ref<PrayerTime[]>([]);
const nextPrayer = ref<PrayerTime | null>(null);

function formatTime(time: string): string {
  if (!time) return "";
  let [h, m] = time.split(":").map(Number);
  // Clamp minutes to 59 if invalid
  if (m >= 60) m = 59;
  const date = new Date();
  date.setHours(h, m, 0, 0);
  // Always use 12-hour format with AM/PM
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

const formattedPrayerTimes = computed(() =>
  prayerTimes.value.map((prayer) => ({
    ...prayer,
    formattedTime: formatTime(prayer.time),
  }))
);

const formattedNextPrayerTime = computed(() =>
  nextPrayer.value ? formatTime(nextPrayer.value.time) : ""
);
const timeUntilNext = ref("");
let countdownInterval: NodeJS.Timeout | null = null;

// Initialize date
const updateCurrentDate = () => {
  const now = new Date();
  currentDate.value = now.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

// Get user location
const getUserLocation = async () => {
  try {
    // Try native GPS first via Capacitor (prompts for permission on Android 6+)
    try {
      const perm = await Geolocation.requestPermissions();
      if (
        (perm as any).location === "granted" ||
        (perm as any).coarseLocation === "granted"
      ) {
        const position = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 10000,
        });
        const { latitude, longitude } = position.coords;
        currentLocation.value = "Getting location...";
        await fetchPrayerTimes(latitude, longitude);
        return;
      }
    } catch {
      // ignore and fall back
    }

    // Fallback to browser geolocation
    if ("geolocation" in navigator) {
      const position = await new Promise<GeolocationPosition>(
        (resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
          });
        }
      );
      const { latitude, longitude } = position.coords;
      currentLocation.value = "Getting location...";
      await fetchPrayerTimes(latitude, longitude);
    } else {
      // Final fallback - IP-based location
      await getLocationByIP();
    }
  } catch (error) {
    console.error("Error getting location:", error);
    // Location denied or failed - try IP-based location
    await getLocationByIP();
  }
};

// Get location based on IP address
const getLocationByIP = async () => {
  try {
    currentLocation.value = "Detecting location...";
    const response = await axios.get("https://ipapi.co/json/");

    const { latitude, longitude, city, country_name } = response.data;
    currentLocation.value = `${city}, ${country_name}`;

    await fetchPrayerTimes(latitude, longitude);
  } catch (error) {
    console.error("IP location failed:", error);
    // Final fallback - prompt user to enable location or show generic message
    currentLocation.value = "Location unavailable";
    showToast("Please enable location services for accurate prayer times");
  }
};

// Fetch prayer times from API
const fetchPrayerTimes = async (latitude: number, longitude: number) => {
  try {
    const response = await axios.get(
      `https://api.aladhan.com/v1/timings?latitude=${latitude}&longitude=${longitude}&method=2`
    );

    const timings = response.data.data.timings;
    const meta = response.data.data.meta;

    // Extract location from the API response meta data
    if (meta && meta.timezone) {
      // Extract city/country from timezone (e.g., "Asia/Riyadh" -> "Riyadh")
      const timezoneParts = meta.timezone.split("/");
      const city = timezoneParts[timezoneParts.length - 1].replace("_", " ");
      currentLocation.value = city;
    }

    prayerTimes.value = [
      { name: "Fajr", time: timings.Fajr, timestamp: 0 },
      { name: "Sunrise", time: timings.Sunrise, timestamp: 0 },
      { name: "Dhuhr", time: timings.Dhuhr, timestamp: 0 },
      { name: "Asr", time: timings.Asr, timestamp: 0 },
      { name: "Maghrib", time: timings.Maghrib, timestamp: 0 },
      { name: "Isha", time: timings.Isha, timestamp: 0 },
    ];

    // Convert times to timestamps
    const today = new Date();
    prayerTimes.value.forEach((prayer) => {
      const [hours, minutes] = prayer.time.split(":").map(Number);
      const prayerDate = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
        hours,
        minutes
      );
      prayer.timestamp = prayerDate.getTime();
    });

    findNextPrayer();
    scheduleNotifications();
  } catch (error) {
    console.error("Error fetching prayer times:", error);
    showToast("Error fetching prayer times");
  }
};

// Find the next prayer
const findNextPrayer = () => {
  const now = new Date().getTime();
  const today = prayerTimes.value.filter((prayer) => prayer.timestamp > now);

  if (today.length > 0) {
    nextPrayer.value = today[0];
  } else {
    // Next prayer is tomorrow's Fajr
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const [hours, minutes] = prayerTimes.value[0].time.split(":").map(Number);
    tomorrow.setHours(hours, minutes, 0, 0);

    nextPrayer.value = {
      name: prayerTimes.value[0].name,
      time: prayerTimes.value[0].time,
      timestamp: tomorrow.getTime(),
    };
  }
};

// Update countdown timer
const updateCountdown = () => {
  if (!nextPrayer.value) return;

  const now = new Date().getTime();
  const timeDiff = nextPrayer.value.timestamp - now;

  if (timeDiff <= 0) {
    findNextPrayer();
    return;
  }

  const hours = Math.floor(timeDiff / (1000 * 60 * 60));
  const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);

  timeUntilNext.value = `${hours.toString().padStart(2, "0")}:${minutes
    .toString()
    .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
};

// Schedule notifications
const scheduleNotifications = async () => {
  try {
    const perm = await LocalNotifications.requestPermissions();
    if (perm.display !== "granted") {
      await showToast("Please allow notifications for prayer alerts");
      return;
    }

    // Create a channel on Android for prayer reminders (default sound)
    try {
      // @ts-ignore - createChannel exists on Android
      await LocalNotifications.createChannel?.({
        id: "prayers",
        name: "Prayer Times",
        description: "Prayer reminders",
        importance: 5,
        // no custom sound -> uses device default
        vibration: true,
        lights: true,
        visibility: 1,
      });
    } catch {}

    await LocalNotifications.cancel({ notifications: [] });

    const notifications: PendingLocalNotificationSchema[] = prayerTimes.value
      .filter((prayer) => prayer.name !== "Sunrise") // Exclude sunrise
      .map((prayer, index) => ({
        title: `Time for ${prayer.name} Prayer`,
        body: `It's time for ${prayer.name} prayer at ${prayer.time}`,
        id: index + 1,
        schedule: { at: new Date(prayer.timestamp) },
        channelId: "prayers",
        // omit sound to use system default
        attachments: [],
        actionTypeId: "",
        extra: null,
      }));

    await LocalNotifications.schedule({ notifications });
  } catch (error) {
    console.error("Error scheduling notifications:", error);
  }
};

// Show toast message
const showToast = async (message: string) => {
  const toast = await toastController.create({
    message,
    duration: 3000,
    position: "bottom",
    color: "success",
  });
  await toast.present();
};

// Refresh prayer times
const refreshPrayerTimes = async () => {
  showToast("Refreshing prayer times...");
  await getUserLocation();
};

// Handle pull-to-refresh
const handleRefresh = async (event: CustomEvent) => {
  await getUserLocation();
  event.detail.complete();
};

// Lifecycle hooks
onMounted(async () => {
  updateCurrentDate();
  await getUserLocation();

  // Update countdown every second
  countdownInterval = setInterval(updateCountdown, 1000);
});

onUnmounted(() => {
  if (countdownInterval) {
    clearInterval(countdownInterval);
  }
});

// Expose formatTime for parent access (if needed)
defineExpose({ formatTime });
</script>

<style scoped>
.fade-header {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  backdrop-filter: blur(0px);
  background: rgba(109, 217, 138, 0.9);
  transform: translateY(0);
}

.header-faded {
  opacity: 0.88;
  backdrop-filter: blur(15px);
  background: rgba(109, 217, 138, 0.75);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.card-container {
  max-width: 400px;
  margin: 0 auto;
  padding: 0 10px;
}

/* Fancy Title Styling */
.fancy-title {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  height: 100%;
}

.logo-icon {
  font-size: 1.8rem;
  color: white;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
  animation: gentleGlow 3s ease-in-out infinite alternate;
  transition: transform 0.3s ease;
  margin-bottom: 4px;
  padding-inline: 4px;
  vertical-align: middle;
}

.logo-icon.large {
  font-size: 2.2rem;
}

.logo-icon:hover {
  transform: scale(1.1);
}

@keyframes gentleGlow {
  0% {
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2))
      drop-shadow(0 0 8px rgba(255, 255, 255, 0.3));
  }
  100% {
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2))
      drop-shadow(0 0 12px rgba(255, 255, 255, 0.5));
  }
}

.title-text {
  font-family: "Playfair Display", "Georgia", "Times New Roman", serif;
  font-weight: 600;
  letter-spacing: 0.8px;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  background: linear-gradient(135deg, #ffffff 0%, #f8f9ff 50%, #ffffff 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  position: relative;
}

.compact-card {
  margin: 8px 0;
  border-radius: 12px;
}

.prayer-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-top: 8px;
}

.prayer-card {
  margin: 0;
}

.text-center {
  text-align: center;
}

.countdown-container {
  text-align: center;
}

.countdown-timer {
  font-size: 2.5rem;
  font-weight: bold;
  color: white;
  margin: 0;
}

.next-prayer-time {
  color: white;
  font-size: 1.1rem;
  margin: 0.5rem 0 0 0;
}

.current-prayer {
  --background: var(--ion-color-success-tint);
  --color: var(--ion-color-success-contrast);
}

.circle-loader {
  width: 48px;
  height: 48px;
  border: 4px solid #e0ffe0;
  border-top: 4px solid #48c269;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto;
  padding: 8px 0;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
</style>
