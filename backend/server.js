const express = require('express');
const http = require('http');
const crypto = require('crypto');
const { Server } = require('socket.io');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());

const httpServer = http.createServer(app);
const io = new Server(httpServer, { cors: { origin: '*' } });

const store = {}; // { [orderId]: { lat, lon, capturedAt, receivedAt } }
const statusStore = {}; // { [orderId]: { status, updatedAt } }
const orders = {}; // { [orderId]: { token, createdAt } } — security/safety control (Gate 4)
const FAILURE_LOG = path.join(__dirname, 'failure.log');
const TELEMETRY_LOG = path.join(__dirname, 'telemetry.log');

function logFailure(entry) {
  fs.appendFileSync(FAILURE_LOG, JSON.stringify({ ...entry, at: Date.now() }) + '\n');
}

function logTelemetry(entry) {
  fs.appendFileSync(TELEMETRY_LOG, JSON.stringify({ ...entry, at: Date.now() }) + '\n');
}

// Security/safety control (Gate 4): every order-scoped request must carry
// the bearer token issued at order creation. This is intentionally simple
// (no user accounts) — it's scoped to "don't let anyone read/write an
// arbitrary order's data by guessing its ID," not full auth/authz.
function requireOrderToken(req, res, next) {
  const { orderId } = req.params;
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const order = orders[orderId];

  if (!order || !token || token !== order.token) {
    logFailure({ type: 'UNAUTHORIZED', orderId, at: Date.now() });
    return res.status(401).json({ error: 'invalid or missing order token' });
  }
  next();
}

// Order setup — issues the per-order token used by all other endpoints.
app.post('/orders', (req, res) => {
  const orderId = crypto.randomUUID();
  const token = crypto.randomBytes(16).toString('hex');
  orders[orderId] = { token, createdAt: Date.now() };
  logTelemetry({ type: 'ORDER_CREATED', orderId });
  return res.json({ orderId, token });
});

// Health check — customer/driver apps use this for degraded-mode detection.
app.get('/health', (req, res) => res.json({ status: 'ok', at: Date.now() }));

// Telemetry sink — apps report client-side events here for a unified trace.
app.post('/telemetry', (req, res) => {
  logTelemetry({ source: 'client', ...req.body });
  res.json({ received: true });
});

io.on('connection', (socket) => {
  socket.on('joinOrder', ({ orderId, token } = {}) => {
    const order = orders[orderId];
    if (!order || !token || token !== order.token) {
      socket.emit('joinError', { message: 'invalid order or token' });
      logFailure({ type: 'SOCKET_UNAUTHORIZED', orderId });
      return;
    }
    socket.join(orderId);
  });
});

// Driver pushes a location update.
app.post('/orders/:orderId/location', requireOrderToken, (req, res) => {
  const { orderId } = req.params;
  const { lat, lon, capturedAt } = req.body || {};

  if (typeof lat !== 'number' || typeof lon !== 'number' || !capturedAt) {
    logFailure({ type: 'INVALID_PAYLOAD', orderId, body: req.body });
    return res.status(400).json({ error: 'invalid payload' });
  }

  store[orderId] = { lat, lon, capturedAt, receivedAt: Date.now() };
  return res.json(store[orderId]);
});

// Customer polls the latest known location.
app.get('/orders/:orderId/location', requireOrderToken, (req, res) => {
  const { orderId } = req.params;
  const loc = store[orderId];
  if (!loc) {
    logFailure({ type: 'NO_LOCATION_YET', orderId });
    return res.status(404).json({ error: 'no location yet' });
  }
  return res.json(loc);
});

// Baseline (O2-style) status endpoints, now token-protected too.
app.post('/orders/:orderId/status', requireOrderToken, (req, res) => {
  const { orderId } = req.params;
  const { status } = req.body || {};

  if (typeof status !== 'string' || !status) {
    logFailure({ type: 'INVALID_STATUS_PAYLOAD', orderId, body: req.body });
    return res.status(400).json({ error: 'invalid payload' });
  }

  const record = { status, updatedAt: Date.now() };
  statusStore[orderId] = record;
  io.to(orderId).emit('statusUpdate', { orderId, ...record });
  return res.json(record);
});

app.get('/orders/:orderId/status', requireOrderToken, (req, res) => {
  const { orderId } = req.params;
  const record = statusStore[orderId];
  if (!record) {
    logFailure({ type: 'NO_STATUS_YET', orderId });
    return res.status(404).json({ error: 'no status yet' });
  }
  return res.json(record);
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => console.log(`relay backend (HTTP + Socket.IO) listening on :${PORT}`));

module.exports = { app, httpServer, io, orders }; // exported for tests
