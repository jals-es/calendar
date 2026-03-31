const express = require('express');
const Database = require('better-sqlite3');
const crypto = require('crypto');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Database setup
const db = new Database(path.join(__dirname, 'calendars.db'));
db.pragma('journal_mode = WAL');
db.exec(`
  CREATE TABLE IF NOT EXISTS calendars (
    id TEXT PRIMARY KEY,
    data TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )
`);

const insertStmt = db.prepare('INSERT INTO calendars (id, data) VALUES (?, ?)');
const updateStmt = db.prepare('UPDATE calendars SET data = ?, updated_at = datetime(\'now\') WHERE id = ?');
const selectStmt = db.prepare('SELECT data FROM calendars WHERE id = ?');

app.use(express.json({ limit: '5mb' }));
app.use(express.static(__dirname));

// Save calendar → returns short UUID
app.post('/api/save', (req, res) => {
  const { id, data } = req.body;
  if (!data || typeof data !== 'object') {
    return res.status(400).json({ error: 'Datos inválidos' });
  }
  const json = JSON.stringify(data);

  // If client sends an existing id, update it
  if (id) {
    const existing = selectStmt.get(id);
    if (existing) {
      updateStmt.run(json, id);
      return res.json({ id });
    }
  }

  // Generate short UUID (8 chars)
  const uuid = crypto.randomUUID().split('-')[0];
  insertStmt.run(uuid, json);
  res.json({ id: uuid });
});

// Load calendar by UUID
app.get('/api/load/:id', (req, res) => {
  const row = selectStmt.get(req.params.id);
  if (!row) {
    return res.status(404).json({ error: 'Calendario no encontrado' });
  }
  res.json({ data: JSON.parse(row.data) });
});

// Passenger (Plesk) expects the app to listen on 'passenger' or be exported
if (typeof(PhusionPassenger) !== 'undefined') {
  PhusionPassenger.configure({ autoInstall: false });
  app.listen('passenger', () => {
    console.log('Servidor corriendo con Passenger');
  });
} else {
  app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
  });
}
