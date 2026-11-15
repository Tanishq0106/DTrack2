import config from '../config';

const DIRECTIONS_URL = 'https://api.mapbox.com/directions/v5/mapbox/driving';

// Independent-of-oracle haversine helper (small local copy — kept separate
// from src/oracle/accuracyOracle.js on purpose, since that oracle must stay
// unused by any app-side code per the frozen contract's Section 4 rule).
function haversineKm(a, b) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Degraded-mode fallback: straight-line distance / assumed average speed.
 * Used when the Directions API is disabled, unreachable, or errors out —
 * this is what keeps the ETA feature from hard-failing (Gate 4 requirement).
 */
function fallbackEta(driverLoc, destLoc) {
  const km = haversineKm(driverLoc, destLoc);
  const etaMinutes = (km / config.eta.fallbackAverageSpeedKmh) * 60;
  return { source: 'fallback', distanceKm: km, etaMinutes, route: null };
}

/**
 * Real ETA via Mapbox Directions API. Falls back automatically on any
 * failure — network error, bad token, rate limit — so the customer app
 * always gets *an* ETA, just a less precise one in degraded mode.
 */
export async function getEta(driverLoc, destLoc, accessToken, onDegraded) {
  if (!config.eta.useDirectionsApi || !accessToken) {
    if (onDegraded) onDegraded({ reason: 'directions_disabled_or_no_token' });
    return fallbackEta(driverLoc, destLoc);
  }

  try {
    const coords = `${driverLoc.lon},${driverLoc.lat};${destLoc.lon},${destLoc.lat}`;
    const url = `${DIRECTIONS_URL}/${coords}?geometries=geojson&access_token=${accessToken}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`directions api ${res.status}`);
    const data = await res.json();
    const route = data.routes && data.routes[0];
    if (!route) throw new Error('no route in response');

    return {
      source: 'directions_api',
      distanceKm: route.distance / 1000,
      etaMinutes: route.duration / 60,
      route: route.geometry, // GeoJSON LineString, for drawing on the map
    };
  } catch (err) {
    if (onDegraded) onDegraded({ reason: 'directions_api_failed', message: err.message });
    return fallbackEta(driverLoc, destLoc);
  }
}
