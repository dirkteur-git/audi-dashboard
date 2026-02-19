const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : import.meta.env.DEV
    ? 'http://localhost:3002/api'
    : '/api'

export interface Trip {
  id: number
  start_time: string
  end_time: string
  start_km: number
  end_km: number
  distance: number
  start_lat: number | null
  start_lon: number | null
  end_lat: number | null
  end_lon: number | null
  start_address: string | null
  end_address: string | null
  type: 'zakelijk' | 'prive'
  note: string | null
}

export interface Stats {
  today: { total: number; zakelijk: number; prive: number }
  week: { total: number; zakelijk: number; prive: number }
  month: { total: number; zakelijk: number; prive: number }
  year: { total: number; zakelijk: number; prive: number }
  total_km: number
  trip_count: number
  zakelijk_percent: number
}

export interface VehicleStatus {
  mileage: number | null
  battery_level: number | null
  range: number | null
  latitude: number | null
  longitude: number | null
  last_update: string | null
}

export const api = {
  async getTrips(limit = 50, offset = 0): Promise<Trip[]> {
    const res = await fetch(`${API_BASE}/trips?limit=${limit}&offset=${offset}`)
    return res.json()
  },

  async updateTrip(id: number, updates: Partial<Trip>): Promise<Trip> {
    const res = await fetch(`${API_BASE}/trips/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    })
    return res.json()
  },

  async deleteTrip(id: number): Promise<void> {
    await fetch(`${API_BASE}/trips/${id}`, { method: 'DELETE' })
  },

  async getStats(): Promise<Stats> {
    const res = await fetch(`${API_BASE}/stats`)
    return res.json()
  },

  async getVehicleStatus(): Promise<VehicleStatus> {
    const res = await fetch(`${API_BASE}/vehicle`)
    return res.json()
  },

  async getSettings(): Promise<Record<string, string>> {
    const res = await fetch(`${API_BASE}/settings`)
    return res.json()
  },

  async saveSetting(key: string, value: string): Promise<void> {
    await fetch(`${API_BASE}/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value })
    })
  },

  async forceSync(): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE}/sync`, { method: 'POST' })
    return res.json()
  }
}
