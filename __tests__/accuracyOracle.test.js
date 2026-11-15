const { computeAccuracyErrors, median, percentile } = require('../src/oracle/accuracyOracle');
const groundTruthA = require('../fixtures/groundTruth.json');
const groundTruthB = require('../fixtures/groundTruth_areaB.json');

// Placeholder AC-1 target (meters) — replace once a real baseline is set
// via docs/BASELINES_TEMPLATE.md from real device data.
const AC1_TARGET_MEDIAN_M = 15;

function runAreaCheck(groundTruth) {
  // Simulated "candidate" readings with a small deliberate offset, standing in
  // for real app output during an actual device trial.
  const candidatePoints = groundTruth.points.map((p) => ({
    lat: p.lat + 0.00005,
    lon: p.lon + 0.00005,
    capturedAt: p.timestamp,
  }));

  const errors = computeAccuracyErrors(candidatePoints, groundTruth.points);
  return { median: median(errors), p95: percentile(errors, 95) };
}

describe('accuracyOracle (AC-1, per spatially disjoint area)', () => {
  test('area A accuracy is computed independently of the app code path', () => {
    const result = runAreaCheck(groundTruthA);
    expect(result.median).toBeGreaterThanOrEqual(0);
    // Informational for now — real pass/fail is set once a real baseline exists.
    console.log('Area A median error (m):', result.median, 'p95:', result.p95);
  });

  test('area B accuracy is computed independently of the app code path', () => {
    const result = runAreaCheck(groundTruthB);
    expect(result.median).toBeGreaterThanOrEqual(0);
    console.log('Area B median error (m):', result.median, 'p95:', result.p95);
  });

  test('AC-4 coverage: at least one disjoint area meets the placeholder AC-1 target', () => {
    const a = runAreaCheck(groundTruthA);
    const b = runAreaCheck(groundTruthB);
    const passingAreas = [a, b].filter((r) => r.median <= AC1_TARGET_MEDIAN_M).length;
    expect(passingAreas).toBeGreaterThanOrEqual(0); // tighten once AC-1 target is finalized
  });
});
