// Independent oracle for AC-1 (location accuracy). Deliberately implemented
// standalone, with no dependency on src/services/locationService.js, so the
// candidate and the reference never share a measurement code path
// (frozen contract, Section 4).

const EARTH_RADIUS_M = 6371000;

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

// Haversine distance between two lat/lon points, in meters.
function haversineDistance(a, b) {
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;

  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

// Matches each candidate reading to the nearest-in-time ground-truth point
// and returns the distance errors (meters), for AC-1 median/p95 reporting.
function computeAccuracyErrors(candidatePoints, groundTruthPoints) {
  return candidatePoints.map((candidate) => {
    const nearest = groundTruthPoints.reduce((best, gt) => {
      const dt = Math.abs(gt.timestamp - candidate.capturedAt);
      const bestDt = Math.abs(best.timestamp - candidate.capturedAt);
      return dt < bestDt ? gt : best;
    }, groundTruthPoints[0]);

    return haversineDistance(candidate, nearest);
  });
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function percentile(values, p) {
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

module.exports = { haversineDistance, computeAccuracyErrors, median, percentile };
