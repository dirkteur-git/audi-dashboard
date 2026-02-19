<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { api } from '../services/api'

const username = ref('')
const password = ref('')
const vin = ref('')
const saving = ref(false)
const syncing = ref(false)
const message = ref('')
const loaded = ref(false)

onMounted(async () => {
  try {
    const settings = await api.getSettings()
    username.value = settings.username || ''
    password.value = settings.password === '********' ? '' : ''
    vin.value = settings.vin || ''
  } catch (e) {
    console.error('Laden mislukt:', e)
  } finally {
    loaded.value = true
  }
})

async function saveSettings() {
  saving.value = true
  message.value = ''
  try {
    if (username.value) await api.saveSetting('username', username.value)
    if (password.value) await api.saveSetting('password', password.value)
    if (vin.value) await api.saveSetting('vin', vin.value)
    message.value = 'Instellingen opgeslagen!'
    password.value = ''
  } catch (e) {
    message.value = 'Opslaan mislukt'
  } finally {
    saving.value = false
  }
}

async function forceSync() {
  syncing.value = true
  message.value = ''
  try {
    const result = await api.forceSync()
    message.value = result.message
  } catch (e) {
    message.value = 'Sync mislukt'
  } finally {
    syncing.value = false
  }
}
</script>

<template>
  <div class="page">
    <div class="container">
      <div class="header">
        <h1>Instellingen</h1>
        <router-link to="/" class="back-btn">
          <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
            <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
          </svg>
        </router-link>
      </div>

      <div class="card" v-if="loaded">
        <h2>MyAudi Account</h2>
        <p class="hint">Vul je MyAudi inloggegevens in om automatisch ritten op te halen.</p>

        <div class="field">
          <label>Gebruikersnaam / Email</label>
          <input v-model="username" type="text" placeholder="email@voorbeeld.nl" />
        </div>

        <div class="field">
          <label>Wachtwoord</label>
          <input v-model="password" type="password" placeholder="Nieuw wachtwoord invoeren..." />
        </div>

        <div class="field">
          <label>VIN nummer</label>
          <input v-model="vin" type="text" placeholder="WAUZZZGE..." />
          <p class="field-hint">Te vinden in de MyAudi app onder voertuiggegevens</p>
        </div>

        <button @click="saveSettings" class="save-btn" :disabled="saving">
          {{ saving ? 'Opslaan...' : 'Opslaan' }}
        </button>
      </div>

      <div class="card">
        <h2>Data synchronisatie</h2>
        <p class="hint">Ritten worden automatisch elke 15 minuten opgehaald. Je kunt ook handmatig synchroniseren.</p>

        <button @click="forceSync" class="sync-btn" :disabled="syncing">
          {{ syncing ? 'Synchroniseren...' : 'Nu synchroniseren' }}
        </button>
      </div>

      <p v-if="message" class="message">{{ message }}</p>
    </div>
  </div>
</template>

<style scoped>
.page { min-height: 100vh; padding: 40px 20px; }
.container { max-width: 500px; margin: 0 auto; }

.header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
h1 { font-size: 24px; font-weight: 700; color: #1a1a1a; margin: 0; }

.back-btn {
  width: 44px; height: 44px; background: white; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  color: #666; text-decoration: none; box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.card {
  background: white; border-radius: 12px; padding: 24px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.08); margin-bottom: 16px;
}
.card h2 { margin: 0 0 8px 0; font-size: 18px; font-weight: 600; }
.hint { font-size: 13px; color: #888; margin: 0 0 20px 0; }

.field { margin-bottom: 16px; }
.field label { display: block; font-size: 13px; font-weight: 600; color: #555; margin-bottom: 6px; }
.field input {
  width: 100%; padding: 12px 14px; border: 1px solid #e0e0e0; border-radius: 8px;
  font-size: 15px; outline: none;
}
.field input:focus { border-color: #3b82f6; }
.field-hint { font-size: 11px; color: #aaa; margin: 4px 0 0 0; }

.save-btn, .sync-btn {
  width: 100%; padding: 14px; border: none; border-radius: 8px;
  font-size: 15px; font-weight: 600; cursor: pointer;
}
.save-btn { background: #1a1a1a; color: white; }
.save-btn:disabled { opacity: 0.5; }
.sync-btn { background: #3b82f6; color: white; }
.sync-btn:disabled { opacity: 0.5; }

.message {
  text-align: center; padding: 12px; background: white; border-radius: 8px;
  font-size: 14px; color: #22cc44;
}
</style>
