// Gate 3 comparison harness: runs the same sequence of simulated status
// changes against both the baseline (polling) and candidate (push) client
// mechanisms, measures latency and a bandwidth proxy for each, and writes
// raw, traceable evidence to docs/gate3-raw-results/.
//
// Usage: node scripts/compareBaselineVsCandidate.js [numChanges] [pollIntervalMs]
// Requires the backend (backend/server.js) already running on :3000.
// Creates its own order (via POST /orders) so it always has a valid token.

const { io } = require('socket.io-client');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3000';
const NUM_CHANGES = parseInt(process.argv[2] || '10', 10);
const POLL_INTERVAL_MS = parseInt(process.argv[3] || '3000', 10);
const STATUSES = ['placed', 'accepted', 'picked_up', 'in_transit', 'delivered'];

function nextStatus(i) {
  return STATUSES[i % STATUSES.length] + `_${i}`; // unique per change, so we can match receipt to origin
}

async function createOrder() {
  const res = await fetch(`${BASE_URL}/orders`, { method: 'POST' });
  return res.json(); // { orderId, token }
}

async function postStatus(orderId, token, status) {
  const sentAt = Date.now();
  const res = await fetch(`${BASE_URL}/orders/${orderId}/status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ status }),
  });
  await res.json();
  return sentAt;
}

async function runPollingClient(orderId, token, events, requestLog) {
  let lastSeen = null;
  const timer = setInterval(async () => {
    try {
      const res = await fetch(`${BASE_URL}/orders/${orderId}/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      requestLog.push({ mechanism: 'polling', bytes: 120, at: Date.now() });
      if (!res.ok) return;
      const data = await res.json();
      if (data.status !== lastSeen) {
        lastSeen = data.status;
        events.push({ mechanism: 'polling', status: data.status, observedAt: Date.now() });
      }
    } catch (_) {
      /* ignore transient errors for this harness run */
    }
  }, POLL_INTERVAL_MS);
  return () => clearInterval(timer);
}

function runPushClient(orderId, token, events, requestLog) {
  const socket = io(BASE_URL, { reconnection: true, reconnectionAttempts: 5 });
  socket.on('connect', () => socket.emit('joinOrder', { orderId, token }));
  socket.on('statusUpdate', (data) => {
    requestLog.push({ mechanism: 'push', bytes: 140, at: Date.now() });
    events.push({ mechanism: 'push', status: data.status, observedAt: Date.now() });
  });
  return () => socket.disconnect();
}

function summarize(sentTimestamps, events, mechanism) {
  const latencies = [];
  events
    .filter((e) => e.mechanism === mechanism)
    .forEach((e) => {
      const sentAt = sentTimestamps[e.status];
      if (sentAt) latencies.push(e.observedAt - sentAt);
    });
  latencies.sort((a, b) => a - b);
  const median = latencies.length ? latencies[Math.floor(latencies.length / 2)] : null;
  const mean = latencies.length ? latencies.reduce((a, b) => a + b, 0) / latencies.length : null;
  return { count: latencies.length, medianMs: median, meanMs: mean, rawLatenciesMs: latencies };
}

async function main() {
  const { orderId, token } = await createOrder();
  console.log(`Gate 3 comparison run — order ${orderId}, ${NUM_CHANGES} status changes, poll interval ${POLL_INTERVAL_MS}ms`);

  const events = [];
  const requestLog = [];
  const sentTimestamps = {};

  const stopPolling = await runPollingClient(orderId, token, events, requestLog);
  const stopPush = runPushClient(orderId, token, events, requestLog);

  // give the push client a moment to connect and join the room
  await new Promise((r) => setTimeout(r, 500));

  for (let i = 0; i < NUM_CHANGES; i++) {
    const status = nextStatus(i);
    const sentAt = await postStatus(orderId, token, status);
    sentTimestamps[status] = sentAt;
    await new Promise((r) => setTimeout(r, 1000)); // space out changes
  }

  // let the polling client catch up to the last change
  await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS + 500));

  stopPolling();
  stopPush();

  const pollingSummary = summarize(sentTimestamps, events, 'polling');
  const pushSummary = summarize(sentTimestamps, events, 'push');

  const pollingBytes = requestLog.filter((r) => r.mechanism === 'polling').reduce((a, r) => a + r.bytes, 0);
  const pushBytes = requestLog.filter((r) => r.mechanism === 'push').reduce((a, r) => a + r.bytes, 0);

  const result = {
    orderId,
    numChanges: NUM_CHANGES,
    pollIntervalMs: POLL_INTERVAL_MS,
    runAt: new Date().toISOString(),
    baseline_polling: { ...pollingSummary, totalBytesProxy: pollingBytes },
    candidate_push: { ...pushSummary, totalBytesProxy: pushBytes },
  };

  console.log(JSON.stringify(result, null, 2));

  const outDir = path.join(__dirname, '..', 'docs', 'gate3-raw-results');
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `${Date.now()}.json`);
  fs.writeFileSync(outFile, JSON.stringify(result, null, 2));
  console.log(`Raw evidence written to ${outFile}`);

  process.exit(0);
}

main().catch((err) => {
  console.error('Gate 3 comparison run failed:', err);
  process.exit(1);
});
