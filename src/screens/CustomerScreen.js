import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import Mapbox from '@rnmapbox/maps';
import { fetchDriverLocation, checkBackendHealth } from '../services/api';
import { pollStatus, subscribeStatus } from '../services/statusService';
import { getEta } from '../services/etaService';
import config from '../config';

const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN;
Mapbox.setAccessToken(MAPBOX_TOKEN || 'YOUR_MAPBOX_TOKEN_HERE');

// Placeholder destination for ETA calc — in a full app this comes from the
// order's delivery address; hardcoded here to keep the vertical slice thin.
const DESTINATION = { lat: 16.4419, lon: 80.6221 };

export default function CustomerScreen({ orderId, token }) {
  const [driverLoc, setDriverLoc] = useState(null);
  const [staleSince, setStaleSince] = useState(null);
  const [status, setStatus] = useState(null);
  const [eta, setEta] = useState(null);
  const [backendHealthy, setBackendHealthy] = useState(true);
  const lastUpdateRef = useRef(Date.now());

  // Location: still poll-based here (candidate push is proven out for
  // status in Gate 3; extending push to location is a natural next step
  // but is intentionally left on the Gate 2 baseline for this slice).
  useEffect(() => {
    const interval = setInterval(async () => {
      const loc = await fetchDriverLocation(orderId, token, (err) => console.warn(err));
      if (loc) {
        setDriverLoc(loc);
        setStaleSince(null);
        lastUpdateRef.current = Date.now();
      } else if (Date.now() - lastUpdateRef.current > config.network.staleThresholdMs) {
        setStaleSince(lastUpdateRef.current);
      }
    }, config.status.pollIntervalMs);
    return () => clearInterval(interval);
  }, [orderId, token]);

  // Status: candidate push (Gate 3), falling back to polling automatically
  // if the socket never connects (degraded mode for this feature).
  useEffect(() => {
    const unsubscribe = subscribeStatus(
      orderId,
      token,
      (data) => setStatus(data.status),
      () => {
        // push failed to connect — fall back to the O2 baseline mechanism
        const stopPolling = pollStatus(orderId, token, (data) => setStatus(data.status), console.warn);
        return stopPolling;
      }
    );
    return unsubscribe;
  }, [orderId]);

  // Degraded-mode detection: periodic backend health check independent of
  // the location/status polling, so we can tell "backend is down" apart
  // from "this one order just has no data yet."
  useEffect(() => {
    const interval = setInterval(async () => {
      setBackendHealthy(await checkBackendHealth());
    }, config.network.healthCheckIntervalMs);
    return () => clearInterval(interval);
  }, []);

  // ETA: recompute whenever the driver's location changes.
  useEffect(() => {
    if (!driverLoc) return;
    getEta(driverLoc, DESTINATION, MAPBOX_TOKEN, (degraded) => console.warn('ETA degraded:', degraded)).then(setEta);
  }, [driverLoc]);

  return (
    <View style={styles.container}>
      {!backendHealthy && <Text style={styles.errorBanner}>Backend unreachable — showing last known data</Text>}
      {staleSince && backendHealthy && <Text style={styles.staleBanner}>Driver location is stale — reconnecting…</Text>}
      {status && <Text style={styles.statusBanner}>Order status: {status}</Text>}
      {eta && (
        <Text style={styles.etaBanner}>
          ETA: {eta.etaMinutes.toFixed(0)} min ({eta.distanceKm.toFixed(1)} km) — {eta.source}
        </Text>
      )}
      <Mapbox.MapView style={styles.map}>
        <Mapbox.Camera
          zoomLevel={13}
          centerCoordinate={driverLoc ? [driverLoc.lon, driverLoc.lat] : [DESTINATION.lon, DESTINATION.lat]}
          animationMode="flyTo"
        />
        {driverLoc && (
          <Mapbox.PointAnnotation id="driver" coordinate={[driverLoc.lon, driverLoc.lat]}>
            <View style={styles.driverMarker} />
          </Mapbox.PointAnnotation>
        )}
        <Mapbox.PointAnnotation id="destination" coordinate={[DESTINATION.lon, DESTINATION.lat]}>
          <View style={styles.destMarker} />
        </Mapbox.PointAnnotation>
        {eta && eta.route && (
          <Mapbox.ShapeSource id="routeSource" shape={{ type: 'Feature', geometry: eta.route }}>
            <Mapbox.LineLayer id="routeLine" style={{ lineColor: '#2563eb', lineWidth: 4 }} />
          </Mapbox.ShapeSource>
        )}
      </Mapbox.MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  driverMarker: { width: 16, height: 16, borderRadius: 8, backgroundColor: '#2563eb' },
  destMarker: { width: 16, height: 16, borderRadius: 8, backgroundColor: '#16a34a' },
  staleBanner: { backgroundColor: '#fbbf24', padding: 8, textAlign: 'center' },
  errorBanner: { backgroundColor: '#ef4444', color: 'white', padding: 8, textAlign: 'center' },
  statusBanner: { backgroundColor: '#e5e7eb', padding: 8, textAlign: 'center' },
  etaBanner: { backgroundColor: '#dbeafe', padding: 8, textAlign: 'center' },
});
