---
id: DEC-KANAI-KB009-P1.5-store-integrity
project: kanai_self
type: decision
module: integrity
tags:
  - KANAI-KB009
  - setup
  - integrity
  - store
---

Decision: enforcement del store INDEPENDIENTE DEL HARNESS por deteccion, no prevencion.

- Contra un proceso del MISMO usuario la prevencion dura es inviable sin aislamiento a nivel SO; el piso es DETECCION + aviso ruidoso: Kanai nunca sigue en silencio tras una escritura fuera de banda (edicion directa que no paso por las tools MCP), en cualquier harness (incluidos los sin hooks).
- Mecanismo A+B: manifest firmado (HMAC) con hash por archivo de las fuentes del store; `verifyStore` compara y ante drift dice EXACTAMENTE que cambio (added/modified/removed), con forense git best-effort. La clave HMAC vive FUERA del store (~/.kanai/integrity.key o KANAI_INTEGRITY_KEY) para que un escritor fuera de banda no pueda re-sellar.
- Costo: el store real tiene ~5951 archivos; hashear todo cuesta ~890ms. El digest es INCREMENTAL (cache mtime+size): re-hashea solo lo cambiado, asi el reseal post-op cuesta ~46ms.
- Wiring: verify + reseal al boot; reseal post-op tras cada mutacion (cache en memoria, escribe solo si el digest cambio). KANAI_INTEGRITY=strict suma verify pre-op (caza drift a mitad de sesion, +1 recorrido); =off desactiva. Drift => warning a stderr + audit `integrity_drift`, sin bloquear. Manifest gitignoreado en el data-repo.
- Nota: la DB se re-materializa desde el texto (NDJSON/markdown) y el data-repo no se auto-commitea, por eso el manifest (no git) es el ledger primario; git es solo forense.

sourceRef: server/data/integrity.ts (computeStoreDigest incremental, sealStore/verifyStore, ensureStoreGitignore), server/mcp/server.ts (boot verify/reseal + reseal post-op + reportIntegrity). tests/unit/integrity.test.ts (8 casos). Commit 000cb8b (rama setup).
