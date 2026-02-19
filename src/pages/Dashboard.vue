<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { api, type Stats, type VehicleStatus } from '../services/api'

const stats = ref<Stats | null>(null)
const vehicle = ref<VehicleStatus | null>(null)
const loading = ref(true)

onMounted(async () => {
  try {
    const [s, v] = await Promise.all([api.getStats(), api.getVehicleStatus()])
    stats.value = s
    vehicle.value = v
  } catch (e) {
    console.error('Laden mislukt:', e)
  } finally {
    loading.value = false
  }
})

function formatKm(km: number): string {
  return km.toLocaleString('nl-NL', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
}
</script>

<template>
  <div class="page">
    <div class="container">
      <div class="header">
        <div>
          <h1>Audi e-tron</h1>
          <p class="subtitle">Rittenregistratie</p>
        </div>
        <div class="nav-links">
          <router-link to="/trips" class="nav-btn">Ritten</router-link>
          <router-link to="/settings" class="nav-btn">
            <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
              <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 00.12-.61l-1.92-3.32a.49.49 0 00-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 00-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58a.49.49 0 00-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6A3.6 3.6 0 1112 8.4a3.6 3.6 0 010 7.2z"/>
            </svg>
          </router-link>
        </div>
      </div>

      <div v-if="loading" class="loading">Laden...</div>

      <template v-else-if="stats">
        <!-- Vehicle Status -->
        <div class="vehicle-card" v-if="vehicle">
          <div class="vehicle-stats">
            <div class="vehicle-stat">
              <span class="stat-value">{{ vehicle.mileage ? Math.round(vehicle.mileage).toLocaleString('nl-NL') : '-' }}</span>
              <span class="stat-label">km-stand</span>
            </div>
            <div class="vehicle-stat" v-if="vehicle.battery_level !== null">
              <span class="stat-value">{{ vehicle.battery_level }}%</span>
              <span class="stat-label">batterij</span>
            </div>
            <div class="vehicle-stat" v-if="vehicle.range !== null">
              <span class="stat-value">{{ Math.round(vehicle.range) }}</span>
              <span class="stat-label">km bereik</span>
            </div>
          </div>
          <p class="last-update" v-if="vehicle.last_update">
            Laatst bijgewerkt: {{ new Date(vehicle.last_update).toLocaleString('nl-NL') }}
          </p>
        </div>

        <!-- Overzicht kaarten -->
        <div class="stats-grid">
          <div class="stat-card">
            <h3>Vandaag</h3>
            <span class="km-total">{{ formatKm(stats.today.total) }} km</span>
            <div class="km-split">
              <span class="zakelijk">Zakelijk: {{ formatKm(stats.today.zakelijk) }}</span>
              <span class="prive">Prive: {{ formatKm(stats.today.prive) }}</span>
            </div>
          </div>

          <div class="stat-card">
            <h3>Deze week</h3>
            <span class="km-total">{{ formatKm(stats.week.total) }} km</span>
            <div class="km-split">
              <span class="zakelijk">Zakelijk: {{ formatKm(stats.week.zakelijk) }}</span>
              <span class="prive">Prive: {{ formatKm(stats.week.prive) }}</span>
            </div>
          </div>

          <div class="stat-card">
            <h3>Deze maand</h3>
            <span class="km-total">{{ formatKm(stats.month.total) }} km</span>
            <div class="km-split">
              <span class="zakelijk">Zakelijk: {{ formatKm(stats.month.zakelijk) }}</span>
              <span class="prive">Prive: {{ formatKm(stats.month.prive) }}</span>
            </div>
          </div>

          <div class="stat-card">
            <h3>Dit jaar</h3>
            <span class="km-total">{{ formatKm(stats.year.total) }} km</span>
            <div class="km-split">
              <span class="zakelijk">Zakelijk: {{ formatKm(stats.year.zakelijk) }}</span>
              <span class="prive">Prive: {{ formatKm(stats.year.prive) }}</span>
            </div>
          </div>
        </div>

        <!-- Zakelijk percentage -->
        <div class="percentage-card">
          <div class="percentage-header">
            <span>Zakelijk / Prive verhouding</span>
            <span class="percentage-value">{{ stats.zakelijk_percent }}% zakelijk</span>
          </div>
          <div class="percentage-bar">
            <div class="percentage-fill" :style="{ width: stats.zakelijk_percent + '%' }"></div>
          </div>
          <div class="percentage-labels">
            <span>{{ stats.trip_count }} ritten totaal</span>
            <span>{{ formatKm(stats.total_km) }} km totaal</span>
          </div>
        </div>
      </template>

      <div v-else class="empty">
        <p>Geen data beschikbaar.</p>
        <p>Configureer eerst je MyAudi account in <router-link to="/settings">Instellingen</router-link>.</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page { min-height: 100vh; padding: 40px 20px; }
.container { max-width: 500px; margin: 0 auto; }

.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
}

h1 { font-size: 24px; font-weight: 700; color: #1a1a1a; margin: 0; }
.subtitle { font-size: 14px; color: #888; margin: 4px 0 0 0; }

.nav-links { display: flex; gap: 8px; }
.nav-btn {
  padding: 8px 16px;
  background: white;
  border-radius: 8px;
  color: #333;
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  display: flex;
  align-items: center;
  gap: 6px;
}
.nav-btn:hover { background: #f0f0f0; }

.vehicle-card {
  background: linear-gradient(135deg, #1a1a1a 0%, #333 100%);
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 16px;
  color: white;
}

.vehicle-stats { display: flex; justify-content: space-around; }
.vehicle-stat { text-align: center; }
.stat-value { display: block; font-size: 24px; font-weight: 700; }
.stat-label { display: block; font-size: 12px; opacity: 0.7; margin-top: 4px; }
.last-update { font-size: 11px; opacity: 0.5; margin: 12px 0 0 0; text-align: center; }

.stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }

.stat-card {
  background: white;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.08);
}
.stat-card h3 { margin: 0 0 8px 0; font-size: 12px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; }
.km-total { font-size: 22px; font-weight: 700; color: #1a1a1a; }
.km-split { margin-top: 8px; display: flex; flex-direction: column; gap: 2px; }
.zakelijk { font-size: 12px; color: #3b82f6; }
.prive { font-size: 12px; color: #888; }

.percentage-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.08);
}
.percentage-header { display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 14px; color: #555; }
.percentage-value { font-weight: 700; color: #3b82f6; }
.percentage-bar { height: 8px; background: #eee; border-radius: 4px; overflow: hidden; }
.percentage-fill { height: 100%; background: linear-gradient(90deg, #3b82f6, #60a5fa); border-radius: 4px; transition: width 0.5s ease; }
.percentage-labels { display: flex; justify-content: space-between; margin-top: 8px; font-size: 12px; color: #999; }

.loading { text-align: center; padding: 60px; color: #888; }
.empty { text-align: center; padding: 60px; color: #888; background: white; border-radius: 12px; }
.empty a { color: #3b82f6; }
</style>
