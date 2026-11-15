import * as Location from 'expo-location';
import config from '../config';

/**
 * Battery/bandwidth optimization (Gate 4, O4): switches between a
 * high-accuracy/high-frequency mode while the driver is moving and a
 * lower-power mode once they've been stationary for a while. This is the
 * "optimize" step the frozen contract explicitly deferred out of Gate 2 —
 * Gate 2 only measured the raw baseline, this is where it's actually acted on.
 */
class AdaptiveTracker {
  constructor(onUpdate, onError) {
    this.onUpdate = onUpdate;
    this.onError = onError;
    this.subscription = null;
    this.mode = 'moving';
    this.stationarySince = null;
  }

  async start() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      this.onError({ type: 'PERMISSION_DENIED', at: Date.now() });
      return false;
    }
    await this._subscribe();
    return true;
  }

  async _subscribe() {
    if (this.subscription) this.subscription.remove();

    const opts =
      this.mode === 'moving'
        ? {
            accuracy: Location.Accuracy.High,
            timeInterval: 3000,
            distanceInterval: config.location.movingDistanceIntervalM,
          }
        : {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 8000,
            distanceInterval: config.location.stationaryDistanceIntervalM,
          };

    this.subscription = await Location.watchPositionAsync(opts, (position) => {
      const speed = position.coords.speed ?? 0; // m/s; null on some devices when stationary
      this._evaluateMode(speed);
      this.onUpdate({
        lat: position.coords.latitude,
        lon: position.coords.longitude,
        capturedAt: position.timestamp,
        speedMs: speed,
        trackingMode: this.mode,
      });
    });
  }

  _evaluateMode(speed) {
    const isSlow = speed < config.location.stationarySpeedThresholdMs;
    const now = Date.now();

    if (!isSlow) {
      this.stationarySince = null;
      if (this.mode !== 'moving') {
        this.mode = 'moving';
        this._subscribe(); // re-subscribe with higher-accuracy options
      }
      return;
    }

    if (!this.stationarySince) this.stationarySince = now;
    const stationaryFor = now - this.stationarySince;
    if (this.mode !== 'stationary' && stationaryFor >= config.location.stationaryAfterMs) {
      this.mode = 'stationary';
      this._subscribe(); // re-subscribe with lower-power options
    }
  }

  stop() {
    if (this.subscription) this.subscription.remove();
  }
}

/** Gate 2-compatible entry point, now backed by the adaptive tracker. */
export async function startTracking(onUpdate, onError) {
  const tracker = new AdaptiveTracker(onUpdate, onError);
  const granted = await tracker.start();
  return granted ? tracker : null; // caller calls tracker.stop() instead of subscription.remove()
}

export function stopTracking(tracker) {
  if (tracker) tracker.stop();
}

