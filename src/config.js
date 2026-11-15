// Central, single-source config for Gate 4 — every tunable that affects
// evidence path, battery/bandwidth behavior, or degraded-mode thresholds
// lives here, not scattered across files, so it's a documentable interface
// contract in its own right (see docs/GATE4_INTEGRATION_DESIGN.md).

module.exports = {
  // Location capture (driver side)
  location: {
    movingAccuracy: 'High', // Location.Accuracy.High while the driver is moving
    stationaryAccuracy: 'Balanced', // lower-power mode once stationary (battery optimization)
    movingDistanceIntervalM: 5,
    stationaryDistanceIntervalM: 25,
    stationarySpeedThresholdMs: 0.5, // below this speed (m/s), treat as "stationary"
    stationaryAfterMs: 15000, // how long below threshold before switching modes
  },
  // Status updates (customer side)
  status: {
    pollIntervalMs: 3000, // baseline fallback if push is unavailable
    pushReconnectionAttempts: 5,
  },
  // Backend reachability / degraded mode
  network: {
    locationPushRetryBackoffMs: [1000, 3000, 8000], // retry schedule for failed pushes
    staleThresholdMs: 10000, // customer shows "stale" banner if no update within this window
    healthCheckIntervalMs: 15000,
  },
  // ETA / routing
  eta: {
    useDirectionsApi: true, // falls back to straight-line estimate if this fails or is false
    fallbackAverageSpeedKmh: 25, // used only in the haversine fallback estimate
  },
};
