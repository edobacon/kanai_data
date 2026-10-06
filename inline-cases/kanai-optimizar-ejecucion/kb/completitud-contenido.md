# Completitud del contenido antes del dictamen final

Fecha: 2026-10-06, F6. Mismo único juez, sin veredicto previo.

Arbiter identificó UNREAD_FILE: los marcadores de archivo nuevo demasiado grande/binario eran breves y budgetDiff los marcaba full. Se corrigió budgetDiff para registrarlos parcial (truncated) aun cuando entren por tamaño. coverageOf ya excluye partial de full, evitando reutilizar contenido nunca leído. Además N3 exige diffStats(...).complete para no aprobar frente a contenido ausente, incluso ante cobertura antigua mal clasificada.

Prueba real en tests/unit/integral-target-checks.test.ts: repo KT, archivo nuevo large.mjs de>200001bytes; levelCode.stats.complete=false, reviewComplete=false, coverage.full no incluye archivo, partial sí. Dirigidas19/19 verdes. Typecheck/lint exit0. Suite completa final en work/f6-suite.log.

Replay final Node24/proceso/store aislado f6-replay.json: KT sandbox real typecheckpass y1testpass0fail; TAO cobertura50full103omitted→153full0omitted en2pases deterministas. Tokens/rondasLLM no medidos. Presupuesto de400000 es objetivo de diff por pase, puede excederse para un archivo indivisible. Contenido ausente requiere revisión efectiva antes de cerrar; no se inventa una aprobación de activos binarios.

Un commit para F6; el único dictamen de Arbiter se emite sobre ese head. Evidencias f6-target.log, f6-typecheck.log, f6-lint.log, f6-suite.log, f6-replay.json, f6-replay.log.
