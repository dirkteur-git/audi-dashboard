<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { api, type Trip } from '../services/api'

const trips = ref<Trip[]>([])
const loading = ref(true)

onMounted(async () => {
  try {
    trips.value = await api.getTrips()
  } catch (e) {
    console.error('Laden mislukt:', e)
  } finally {
    loading.value = false
  }
})

async function toggleType(trip: Trip) {
  const newType = trip.type === 'zakelijk' ? 'prive' : 'zakelijk'
  try {
    const updated = await api.updateTrip(trip.id, { type: newType })
    const index = trips.value.findIndex(t => t.id === trip.id)
    if (index !== -1) trips.value[index] = updated
  } catch (e) {
    console.error('Update mislukt:', e)
  }
}

async function updateNote(trip: Trip, note: string) {
  try {
    const updated = await api.updateTrip(trip.id, { note })
    const index = trips.value.findIndex(t => t.id === trip.id)
    if (index !== -1) trips.value[index] = updated
  } catch (e) {
    console.error('Update mislukt:', e)
  }
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return d.toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function formatKm(km: number | null): string {
  if (km === null) return '-'
  return km.toLocaleString('nl-NL', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
}
</script>

<template>
  <div class="page">
    <div class="container">
      <div class="header">
        <div>
          <h1>Ritten</h1>
          <p class="subtitle">{{ trips.length }} ritten</p>
        </div>
        <router-link to="/" class="back-btn">
          <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
            <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
          </svg>
        </router-link>
      </div>

      <div v-if="loading" class="loading">Laden...</div>

      <div v-else-if="trips.length === 0" class="empty">
        <p>Nog geen ritten geregistreerd.</p>
        <p>Ritten worden automatisch gedetecteerd zodra je MyAudi account is ingesteld.</p>
      </div>

      <div v-else class="trips-list">
        <div
          v-for="trip in trips"
          :key="trip.id"
          class="trip-item"
          :class="{ 'trip-zakelijk': trip.type === 'zakelijk' }"
        >
          <div class="trip-header">
            <span class="trip-date">{{ formatDate(trip.start_time) }}</span>
            <button
              @click="toggleType(trip)"
              class="type-btn"
              :class="trip.type"
            >
              {{ trip.type === 'zakelijk' ? 'Zakelijk' : 'Prive' }}
            </button>
          </div>

          <div class="trip-route">
            <div class="route-point">
              <div class="dot dot-start"></div>
              <span>{{ trip.start_address || 'Onbekend' }}</span>
            </div>
            <div class="route-line"></div>
            <div class="route-point">
              <div class="dot dot-end"></div>
              <span>{{ trip.end_address || 'Onbekend' }}</span>
            </div>
          </div>

          <div class="trip-details">
            <span class="trip-distance">{{ formatKm(trip.distance) }} km</span>
            <span class="trip-km">{{ formatKm(trip.start_km) }} - {{ formatKm(trip.end_km) }}</span>
          </div>

          <input
            class="note-input"
            :value="trip.note || ''"
            placeholder="Notitie..."
            @change="updateNote(trip, ($event.target as HTMLInputElement).value)"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page { min-height: 100vh; padding: 40px 20px; }
.container { max-width: 500px; margin: 0 auto; }

.header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
h1 { font-size: 24px; font-weight: 700; color: #1a1a1a; margin: 0; }
.subtitle { font-size: 14px; color: #888; margin: 4px 0 0 0; }

.back-btn {
  width: 44px; height: 44px; background: white; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  color: #666; text-decoration: none; box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}
.back-btn:hover { background: #f0f0f0; }

.trips-list { display: flex; flex-direction: column; gap: 12px; }

.trip-item {
  background: white;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.08);
  border-left: 4px solid #ddd;
}
.trip-item.trip-zakelijk { border-left-color: #3b82f6; }

.trip-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.trip-date { font-size: 13px; color: #666; }

.type-btn {
  padding: 4px 12px; border: none; border-radius: 12px;
  font-size: 12px; font-weight: 600; cursor: pointer;
}
.type-btn.zakelijk { background: #dbeafe; color: #3b82f6; }
.type-btn.prive { background: #f3f4f6; color: #888; }

.trip-route { margin-bottom: 12px; }
.route-point { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #333; }
.dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.dot-start { background: #22cc44; }
.dot-end { background: #ef4444; }
.route-line { width: 2px; height: 16px; background: #ddd; margin-left: 3px; }

.trip-details { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.trip-distance { font-size: 18px; font-weight: 700; color: #1a1a1a; }
.trip-km { font-size: 12px; color: #999; }

.note-input {
  width: 100%; padding: 8px 12px; border: 1px solid #eee; border-radius: 6px;
  font-size: 13px; outline: none; color: #555;
}
.note-input:focus { border-color: #3b82f6; }

.loading { text-align: center; padding: 60px; color: #888; }
.empty { text-align: center; padding: 60px; color: #888; background: white; border-radius: 12px; }
</style>
