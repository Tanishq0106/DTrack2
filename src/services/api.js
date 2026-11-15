import config from '../config';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.66:3000';

// Recovery (Gate 4): failed location pushes retry on a backoff schedule
// instead of being silently dropped, so a brief network blip doesn't lose
// data — only a genuinely prolonged outage does (and that's still logged
// via the backend's failure.log either way).
function scheduleRetry(orderId, token, location, attempt, onError) {
  const delay = config.network.locationPushRetryBackoffMs[
    Math.min(attempt, config.network.locationPushRetryBackoffMs.length - 1)
  ];
  setTimeout(() => attemptPush(orderId, token, location, attempt + 1, onError), delay);
}

async function attemptPush(orderId, token, location, attempt, onError) {
  try {
    const res = await fetch(`${BASE_URL}/orders/${orderId}/location`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(location),
    });
    if (!res.ok) throw new Error(`relay failed: ${res.status}`);
    return await res.json();
  } catch (err) {
    if (attempt < config.network.locationPushRetryBackoffMs.length) {
      scheduleRetry(orderId, token, location, attempt, onError);
    } else if (onError) {
      onError({ type: 'PUSH_FAILED_EXHAUSTED_RETRIES', message: err.message, at: Date.now() });
    }
    return null;
  }
}

export async function pushDriverLocation(orderId, token, location, onError) {
  return attemptPush(orderId, token, location, 0, onError);
}

export async function fetchDriverLocation(orderId, token, onError) {
  try {
    const res = await fetch(`${BASE_URL}/orders/${orderId}/location`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
    return await res.json();
  } catch (err) {
    if (onError) onError({ type: 'FETCH_FAILED', message: err.message, at: Date.now() });
    return null;
  }
}

/** Degraded-mode detection: lightweight backend health check. */
export async function checkBackendHealth() {
  try {
    const res = await fetch(`${BASE_URL}/health`);
    return res.ok;
  } catch (_) {
    return false;
  }
}

/** Order setup: creates an order and returns its per-order bearer token. */
export async function createOrder() {
  const res = await fetch(`${BASE_URL}/orders`, { method: 'POST' });
  if (!res.ok) throw new Error(`order creation failed: ${res.status}`);
  return res.json(); // { orderId, token }
}
