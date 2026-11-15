import { io } from 'socket.io-client';
import config from '../config';

const BASE_URL = 'http://localhost:3000'; // match src/services/api.js's BASE_URL in real runs

/** Baseline (O2-style): poll GET /orders/:id/status on an interval. */
export function pollStatus(orderId, token, onUpdate, onError, intervalMs = config.status.pollIntervalMs) {
  const timer = setInterval(async () => {
    try {
      const res = await fetch(`${BASE_URL}/orders/${orderId}/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`status ${res.status}`);
      const data = await res.json();
      onUpdate(data);
    } catch (err) {
      if (onError) onError({ type: 'POLL_FAILED', message: err.message, at: Date.now() });
    }
  }, intervalMs);

  return () => clearInterval(timer);
}

/** Candidate (O3): subscribe to push updates over Socket.IO, token-checked at join time. */
export function subscribeStatus(orderId, token, onUpdate, onError) {
  const socket = io(BASE_URL, {
    reconnection: true,
    reconnectionAttempts: config.status.pushReconnectionAttempts,
  });

  socket.on('connect', () => socket.emit('joinOrder', { orderId, token }));
  socket.on('statusUpdate', (data) => {
    if (data.orderId === orderId) onUpdate(data);
  });
  socket.on('joinError', (err) => {
    if (onError) onError({ type: 'SOCKET_JOIN_REJECTED', message: err.message, at: Date.now() });
  });
  socket.on('connect_error', (err) => {
    if (onError) onError({ type: 'SOCKET_CONNECT_FAILED', message: err.message, at: Date.now() });
  });

  return () => socket.disconnect();
}
