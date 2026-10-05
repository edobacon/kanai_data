# F2: juez ciego de fase

Fecha: 2026-10-05. Juez sonnet de contexto limpio; leyó vía git a7e4c22 sobre 2d80dc0 y corrió las suites en worktree aparte.

Veredicto: **aprobado con nits**. Sin bloqueantes. Tests: F2 30 OK (4 suites, sin skips), regresión F1 55 OK, 0 referencias prohibidas en toda la skill. Tabla de veredicto verificada caso por caso contra la decisión D4 (nombres v1).

| Id | Sev | Hallazgo | Estado |
|---|---|---|---|
| N1 | S2 | Diff de alto riesgo sin extensión de lógica (solo .sql, deps, JSON de roles) quedaba trivial con un revisor | Corregido en 4cb2f83 (jurado K2) + test |
| N2 | S3 | Con config_behavior descartada, F2.8 se excluía con un motivo falso | Corregido en 4cb2f83 + test |
| N3 | S3 | "amplio" se mide por repos, no por carpetas | Documentado en protocol/core.md (Topología y revisores) |
| N4 | S3 | Needles de coverage.json genéricos | Aceptado; muestreo manual del juez: 46 encabezados v1 pasan a 51, sin pérdida de fases |

Suite F2 tras los arreglos: 32 tests OK en 3.9 y 3.14.
