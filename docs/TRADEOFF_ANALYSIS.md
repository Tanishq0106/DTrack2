# Gate 2 Trade-off Analysis — Location Capture Reference Approach

Two feasible approaches were compared for the driver-side location capture layer (the "Reference" node in the frozen contract). This selection feeds AC-1 (accuracy) and AC-3 (efficiency) measurement.

## Approach A — `expo-location` (Expo managed workflow)
- **Pros:** JS-only API, no native build config, works in Expo Go for fast iteration, built-in foreground/background permission flow, cross-platform accuracy tiers (`Accuracy.Balanced`, `Accuracy.High`, etc.)
- **Cons:** Less granular control over Android's fused-location-provider internals; background updates on iOS are throttled by the OS more aggressively than a bare module allows.

## Approach B — `react-native-geolocation-service` (bare/dev-client workflow)
- **Pros:** Closer to native Android `FusedLocationProviderClient`, finer-grained background location control, often better real-world accuracy on Android.
- **Cons:** Requires a bare or custom dev-client build (no Expo Go), more native setup (Google Play Services, manifest permissions), slower CP1 iteration speed.

## Decision

**Approach A (`expo-location`) selected for the CP1 Gate 2 vertical slice.**

Rationale: CP1's goal is a *reproducible, measurable* reference implementation, not a production-optimized one (optimization is explicitly deferred to a later Assurance/Integration stage per the frozen contract, Section 3). Expo's managed workflow gets a working, testable pipeline in place fastest, and its accuracy tiers are sufficient to produce a valid AC-1/AC-3 baseline. If Gate 2 baselines show Approach A can't meet accuracy or battery targets, Approach B becomes the documented fallback — this is recorded so the decision can be revisited without re-litigating the comparison.

This decision does not modify the frozen contract (ADR-001 already fixed React Native + Mapbox at the app-framework level); it resolves one layer below — how location is captured — as Gate 2 requires.
