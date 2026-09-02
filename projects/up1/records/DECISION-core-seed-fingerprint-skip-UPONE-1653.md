---
id: DECISION-core-seed-fingerprint-skip-UPONE-1653
project: up1
type: decision
module: object-manager
tags:
  - UPONE-1653
  - sp9
  - seed
  - core
---

Se deja de gatear los seeds que dependen de funciones en runtime; el skip pasa a ser por fingerprint (huella).

sourceRef (verificado por diff): object-manager 761133e4 scripts/sync/modSeed.js + scripts/sync/up1Seed.js (stop gating runtime-dependent function seeds).
