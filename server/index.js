const express = require('express')
const cors = require('cors')
const path = require('path')
const Database = require('better-sqlite3')

const app = express()
const PORT = process.env.PORT || 3002

// Database setup
const db = new Database(path.join(__dirname, 'audi.db'))
db.exec(`
  CREATE TABLE IF NOT EXISTS trips (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    start_time DATETIME,
    end_time DATETIME,
    start_km REAL,
    end_km REAL,
    distance REAL,
    start_lat REAL,
    start_lon REAL,
    end_lat REAL,
    end_lon REAL,
    start_address TEXT,
    end_address TEXT,
    type TEXT DEFAULT 'prive',
    note TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE TABLE IF NOT EXISTS vehicle_status (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    mileage REAL,
    battery_level REAL,
    range_km REAL,
    latitude REAL,
    longitude REAL,
    last_update DATETIME
  );
`)

// Init vehicle_status row
try {
  db.prepare('INSERT OR IGNORE INTO vehicle_status (id) VALUES (1)').run()
} catch (e) {}

// Middleware
app.use(cors())
app.use(express.json())
app.use(express.static(path.join(__dirname, '../dist')))

// ============ TRIPS API ============

app.get('/api/trips', (req, res) => {
  const limit = parseInt(req.query.limit) || 50
  const offset = parseInt(req.query.offset) || 0
  const trips = db.prepare(
    'SELECT * FROM trips ORDER BY start_time DESC LIMIT ? OFFSET ?'
  ).all(limit, offset)
  res.json(trips)
})

app.put('/api/trips/:id', (req, res) => {
  const { id } = req.params
  const { type, note } = req.body

  const trip = db.prepare('SELECT * FROM trips WHERE id = ?').get(id)
  if (!trip) return res.status(404).json({ error: 'Trip not found' })

  db.prepare(`
    UPDATE trips SET
      type = COALESCE(?, type),
      note = COALESCE(?, note)
    WHERE id = ?
  `).run(type || null, note !== undefined ? note : null, id)

  const updated = db.prepare('SELECT * FROM trips WHERE id = ?').get(id)
  res.json(updated)
})

app.delete('/api/trips/:id', (req, res) => {
  db.prepare('DELETE FROM trips WHERE id = ?').run(req.params.id)
  res.json({ success: true })
})

// ============ STATS API ============

app.get('/api/stats', (req, res) => {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay() + 1).toISOString()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const yearStart = new Date(now.getFullYear(), 0, 1).toISOString()

  function getStats(since) {
    const row = db.prepare(`
      SELECT
        COALESCE(SUM(distance), 0) as total,
        COALESCE(SUM(CASE WHEN type = 'zakelijk' THEN distance ELSE 0 END), 0) as zakelijk,
        COALESCE(SUM(CASE WHEN type = 'prive' THEN distance ELSE 0 END), 0) as prive
      FROM trips WHERE start_time >= ?
    `).get(since)
    return { total: Math.round(row.total * 10) / 10, zakelijk: Math.round(row.zakelijk * 10) / 10, prive: Math.round(row.prive * 10) / 10 }
  }

  const totals = db.prepare('SELECT COALESCE(SUM(distance), 0) as total_km, COUNT(*) as trip_count FROM trips').get()
  const zakelijkTotal = db.prepare("SELECT COALESCE(SUM(distance), 0) as km FROM trips WHERE type = 'zakelijk'").get()

  res.json({
    today: getStats(todayStart),
    week: getStats(weekStart),
    month: getStats(monthStart),
    year: getStats(yearStart),
    total_km: Math.round(totals.total_km * 10) / 10,
    trip_count: totals.trip_count,
    zakelijk_percent: totals.total_km > 0 ? Math.round((zakelijkTotal.km / totals.total_km) * 100) : 0
  })
})

// ============ VEHICLE STATUS ============

app.get('/api/vehicle', (req, res) => {
  const status = db.prepare('SELECT * FROM vehicle_status WHERE id = 1').get()
  res.json({
    mileage: status?.mileage || null,
    battery_level: status?.battery_level || null,
    range: status?.range_km || null,
    latitude: status?.latitude || null,
    longitude: status?.longitude || null,
    last_update: status?.last_update || null
  })
})

// ============ SETTINGS API ============

app.get('/api/settings', (req, res) => {
  const rows = db.prepare('SELECT key, value FROM settings').all()
  const settings = {}
  rows.forEach(r => {
    // Mask password
    if (r.key === 'password') {
      settings[r.key] = r.value ? '********' : ''
    } else {
      settings[r.key] = r.value
    }
  })
  res.json(settings)
})

app.put('/api/settings', (req, res) => {
  const { key, value } = req.body
  if (!key) return res.status(400).json({ error: 'Key is required' })

  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value)
  res.json({ success: true })
})

// ============ SYNC ============

app.post('/api/sync', (req, res) => {
  // This triggers the Python service to do a manual sync
  // For now, we write a flag file the Python service checks
  const fs = require('fs')
  fs.writeFileSync(path.join(__dirname, '.sync_requested'), Date.now().toString())
  res.json({ message: 'Sync aangevraagd. Data wordt binnen 1 minuut bijgewerkt.' })
})

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'))
})

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Audi Dashboard running on http://0.0.0.0:${PORT}`)
})
