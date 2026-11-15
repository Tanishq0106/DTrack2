jest.mock('../src/config', () => ({
  location: {
    movingAccuracy: 'High',
    stationaryAccuracy: 'Balanced',
    movingDistanceIntervalM: 5,
    stationaryDistanceIntervalM: 25,
    stationarySpeedThresholdMs: 0.5,
    stationaryAfterMs: 15000,
  },
}));

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  watchPositionAsync: jest.fn(),
  Accuracy: { High: 4, Balanced: 3 },
}));

const Location = require('expo-location');
const { startTracking, stopTracking } = require('../src/services/locationService');

describe('locationService (Gate 4 adaptive tracker)', () => {
  afterEach(() => jest.clearAllMocks());

  test('emits a record with lat/lon/capturedAt on each position update', async () => {
    Location.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' });
    Location.watchPositionAsync.mockImplementation((_opts, callback) => {
      callback({ coords: { latitude: 12.97, longitude: 77.59, speed: 3 }, timestamp: 12345 });
      return Promise.resolve({ remove: jest.fn() });
    });

    const onUpdate = jest.fn();
    const onError = jest.fn();
    const tracker = await startTracking(onUpdate, onError);

    expect(onUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ lat: 12.97, lon: 77.59, capturedAt: 12345 })
    );
    expect(onError).not.toHaveBeenCalled();
    stopTracking(tracker);
  });

  test('reports PERMISSION_DENIED via onError instead of failing silently (N5)', async () => {
    Location.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'denied' });

    const onUpdate = jest.fn();
    const onError = jest.fn();
    const result = await startTracking(onUpdate, onError);

    expect(result).toBeNull();
    expect(onUpdate).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ type: 'PERMISSION_DENIED' }));
  });

  test('tags updates with the current tracking mode (moving vs stationary)', async () => {
    Location.requestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' });
    Location.watchPositionAsync.mockImplementation((_opts, callback) => {
      callback({ coords: { latitude: 1, longitude: 1, speed: 5 }, timestamp: 1 });
      return Promise.resolve({ remove: jest.fn() });
    });

    const onUpdate = jest.fn();
    const tracker = await startTracking(onUpdate, jest.fn());

    expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ trackingMode: 'moving' }));
    stopTracking(tracker);
  });
});
