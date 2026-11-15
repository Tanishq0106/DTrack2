import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { startTracking, stopTracking } from '../services/locationService';
import { pushDriverLocation } from '../services/api';

export default function DriverScreen({ orderId, token }) {
  const [status, setStatus] = useState('starting');
  const [lastUpdate, setLastUpdate] = useState(null);
  const trackerRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    async function begin() {
      const tracker = await startTracking(
        (location) => {
          if (cancelled) return;
          setLastUpdate(location);
          setStatus('tracking');
          pushDriverLocation(orderId, token, location, (err) => {
            console.warn('location push failed after retries', err); // also in backend/failure.log
          });
        },
        (error) => setStatus(`error: ${error.type}`)
      );
      trackerRef.current = tracker;
    }

    begin();
    return () => {
      cancelled = true;
      stopTracking(trackerRef.current);
    };
  }, [orderId, token]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Driver — {orderId}</Text>
      <Text>Status: {status}</Text>
      {lastUpdate && (
        <>
          <Text>
            Last capture: {lastUpdate.lat.toFixed(5)}, {lastUpdate.lon.toFixed(5)} @{' '}
            {new Date(lastUpdate.capturedAt).toLocaleTimeString()}
          </Text>
          <Text>Tracking mode: {lastUpdate.trackingMode} (battery/bandwidth optimized)</Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
});
