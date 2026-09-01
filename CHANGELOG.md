# Changelog

## Indoor response lab

- Replace the default outdoor view with a compact cutaway factory, PBR equipment,
  concrete surfaces, roof trusses, interior lighting and restrained bloom.
- Add state-driven flame/smoke sprites, blast flashes/sparks and falling wall debris.
- Add eight animated evacuation agents, obstacle routing and blocked-exit states.
- Replace the long failure form with contextual action cards, an asset browser,
  intensity control and persistent transport/response controls.
- Add indoor model tests and browser coverage for fire, blast, collapse and evacuation.
- Retain the large outdoor generator for benchmarks; document reference-model limits.

## 0.3.0 — Industrial platform release candidate

- Integrate the existing foundation and industrial branch history under
  `feat/hazardlens-industrial-platform`.
- Generate 240 assets plus weather from one core facility definition.
- Add FacilityTwinGraph, service dependencies and industrial equipment twins.
- Connect all facility geometry to twin IDs and remove disconnected viewer stubs.
- Add search, selection highlighting, dependency inspection, graph overlay, reference
  suppression comparison, incident export and responsive controls.
- Integrate thermal dose by elapsed time, bound histories, preserve clone metadata,
  conserve finite fuel and stop isolated source withdrawal.
- Add locked installs, two Node-version gates, benchmark and Chromium/WebGL workflow.
- Document research rationale, assumptions, validation evidence and deployment scope.
