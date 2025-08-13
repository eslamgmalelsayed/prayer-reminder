<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar color="success">
        <ion-title>Prayer Times</ion-title>
      </ion-toolbar>
    </ion-header>
    
    <ion-content :fullscreen="true" class="ion-padding">
      <ion-header collapse="condense">
        <ion-toolbar color="success">
          <ion-title size="large">Prayer Times</ion-title>
        </ion-toolbar>
      </ion-header>
      
      <!-- Location and Date -->
      <ion-card>
        <ion-card-header>
          <ion-card-title class="text-center">{{ currentLocation }}</ion-card-title>
          <ion-card-subtitle class="text-center">{{ currentDate }}</ion-card-subtitle>
        </ion-card-header>
      </ion-card>

      <!-- Next Prayer Countdown -->
      <ion-card color="success" v-if="nextPrayer">
        <ion-card-header>
          <ion-card-title class="text-center">Next Prayer</ion-card-title>
          <ion-card-subtitle class="text-center">{{ nextPrayer.name }}</ion-card-subtitle>
        </ion-card-header>
        <ion-card-content>
          <div class="countdown-container">
            <h1 class="countdown-timer">{{ timeUntilNext }}</h1>
            <p class="next-prayer-time">at {{ nextPrayer.time }}</p>
          </div>
        </ion-card-content>
      </ion-card>

      <!-- Prayer Times List -->
      <ion-card v-for="prayer in prayerTimes" :key="prayer.name">
        <ion-item :class="{ 'current-prayer': prayer.name === nextPrayer?.name }">
          <ion-label>
            <h2>{{ prayer.name }}</h2>
            <p>{{ prayer.time }}</p>
          </ion-label>
          <ion-icon
            v-if="prayer.name === nextPrayer?.name"
            :icon="timeOutline"
            color="success"
            slot="end"
          />
        </ion-item>
      </ion-card>

      <!-- Refresh Button -->
      <ion-fab vertical="bottom" horizontal="end" slot="fixed">
        <ion-fab-button color="success" @click="refreshPrayerTimes">
          <ion-icon :icon="refresh" />
        </ion-fab-button>
      </ion-fab>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
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
  IonFab,
  IonFabButton,
  toastController
} from '@ionic/vue'
import { timeOutline, refresh } from 'ionicons/icons'
import axios from 'axios'
import { LocalNotifications } from '@capacitor/local-notifications'

interface PrayerTime {
  name: string
  time: string
  timestamp: number
}

const currentLocation = ref('Loading...')
const currentDate = ref('')
const prayerTimes = ref<PrayerTime[]>([])
const nextPrayer = ref<PrayerTime | null>(null)
const timeUntilNext = ref('')
let countdownInterval: number | null = null

// Initialize date
const updateCurrentDate = () => {
  const now = new Date()
  currentDate.value = now.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

// Get user location
const getUserLocation = async () => {
  try {
    if ('geolocation' in navigator) {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject)
      })
      
      const { latitude, longitude } = position.coords
      
      // Get city name from coordinates using a reverse geocoding service
      try {
        const response = await axios.get(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
        )
        currentLocation.value = `${response.data.city}, ${response.data.countryName}`
      } catch {
        currentLocation.value = `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`
      }
      
      await fetchPrayerTimes(latitude, longitude)
    } else {
      // Fallback to a default location (Mecca)
      currentLocation.value = 'Mecca, Saudi Arabia'
      await fetchPrayerTimes(21.4225, 39.8262)
    }
  } catch (error) {
    console.error('Error getting location:', error)
    // Fallback to a default location (Mecca)
    currentLocation.value = 'Mecca, Saudi Arabia'
    await fetchPrayerTimes(21.4225, 39.8262)
  }
}

// Fetch prayer times from API
const fetchPrayerTimes = async (latitude: number, longitude: number) => {
  try {
    const response = await axios.get(
      `https://api.aladhan.com/v1/timings?latitude=${latitude}&longitude=${longitude}&method=2`
    )
    
    const timings = response.data.data.timings
    
    prayerTimes.value = [
      { name: 'Fajr', time: timings.Fajr, timestamp: 0 },
      { name: 'Sunrise', time: timings.Sunrise, timestamp: 0 },
      { name: 'Dhuhr', time: timings.Dhuhr, timestamp: 0 },
      { name: 'Asr', time: timings.Asr, timestamp: 0 },
      { name: 'Maghrib', time: timings.Maghrib, timestamp: 0 },
      { name: 'Isha', time: timings.Isha, timestamp: 0 }
    ]
    
    // Convert times to timestamps
    const today = new Date()
    prayerTimes.value.forEach(prayer => {
      const [hours, minutes] = prayer.time.split(':').map(Number)
      const prayerDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), hours, minutes)
      prayer.timestamp = prayerDate.getTime()
    })
    
    findNextPrayer()
    scheduleNotifications()
    
  } catch (error) {
    console.error('Error fetching prayer times:', error)
    showToast('Error fetching prayer times')
  }
}

// Find the next prayer
const findNextPrayer = () => {
  const now = new Date().getTime()
  const today = prayerTimes.value.filter(prayer => prayer.timestamp > now)
  
  if (today.length > 0) {
    nextPrayer.value = today[0]
  } else {
    // Next prayer is tomorrow's Fajr
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const [hours, minutes] = prayerTimes.value[0].time.split(':').map(Number)
    tomorrow.setHours(hours, minutes, 0, 0)
    
    nextPrayer.value = {
      name: prayerTimes.value[0].name,
      time: prayerTimes.value[0].time,
      timestamp: tomorrow.getTime()
    }
  }
}

// Update countdown timer
const updateCountdown = () => {
  if (!nextPrayer.value) return
  
  const now = new Date().getTime()
  const timeDiff = nextPrayer.value.timestamp - now
  
  if (timeDiff <= 0) {
    findNextPrayer()
    return
  }
  
  const hours = Math.floor(timeDiff / (1000 * 60 * 60))
  const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000)
  
  timeUntilNext.value = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

// Schedule notifications
const scheduleNotifications = async () => {
  try {
    await LocalNotifications.requestPermissions()
    await LocalNotifications.cancel({ notifications: [] })
    
    const notifications = prayerTimes.value
      .filter(prayer => prayer.name !== 'Sunrise') // Exclude sunrise
      .map((prayer, index) => ({
        title: `Time for ${prayer.name} Prayer`,
        body: `It's time for ${prayer.name} prayer at ${prayer.time}`,
        id: index + 1,
        schedule: { at: new Date(prayer.timestamp) },
        sound: 'default',
        attachments: [],
        actionTypeId: '',
        extra: null
      }))
    
    await LocalNotifications.schedule({ notifications })
  } catch (error) {
    console.error('Error scheduling notifications:', error)
  }
}

// Show toast message
const showToast = async (message: string) => {
  const toast = await toastController.create({
    message,
    duration: 3000,
    position: 'bottom',
    color: 'success'
  })
  await toast.present()
}

// Refresh prayer times
const refreshPrayerTimes = async () => {
  showToast('Refreshing prayer times...')
  await getUserLocation()
}

// Lifecycle hooks
onMounted(async () => {
  updateCurrentDate()
  await getUserLocation()
  
  // Update countdown every second
  countdownInterval = setInterval(updateCountdown, 1000)
})

onUnmounted(() => {
  if (countdownInterval) {
    clearInterval(countdownInterval)
  }
})
</script>

<style scoped>
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
</style>
