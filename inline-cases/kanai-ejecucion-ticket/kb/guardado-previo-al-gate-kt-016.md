# Guardado previo al gate: implementación y prueba real en KT-016

Fecha: 2026-10-05.

## Qué se pidió

Sin avisos ni guardados por tarea, pero sí un guardado antes del gate. Decisiones de la persona: commit al iniciar el gate (1A), el orquestador sigue reportando a Kanai (2A), bandera encendida.

## Qué se construyó

| Commit | Qué |
|---|---|
| 7124b0e (F1) | Al empezar el gate de una sesión, Kanai commitea lo pendiente en la rama de trabajo y lo registra en la sesión; el gate arma el diff y elige los tests desde esos commits. Asuntos: el primero lleva el criterio de la sesión, los siguientes "correcciones del gate", el resto al aprobar "ajustes al cerrar el gate". Bandera KANAI_PREGATE_COMMIT (encendida, depende de KANAI_SESSION_AUTOCOMMIT). No aplica al refinamiento. Si un hook rechaza el commit, se informa y el gate sigue |
| a15e1b4 (F2) | Documentación: orquestador de gates, niveles, subagentes, skill de ejecución y .env.example |
| 51deac3 (F3) | El gate integral del ticket también guarda antes de juzgar, con el marcador de la última sesión de código |

## Prueba real (KT-016, dos sesiones)

Preparación: se agregó un package.json mínimo a main de kanai_test_repo (18a055f). Sin él, el gate no tomaba el repo como repo de trabajo: no veía el diff del código ni corría los tests (afectó a KT-014 y KT-015).

| Paso | Resultado |
|---|---|
| Gate de la sesión 1 | Guardado eb0e23c (código y tests) antes de juzgar; árbol limpio; verificación real del gate: 6 pass, 100% de cobertura; dos jueces aprobaron |
| Gate de la sesión 2 | Guardado cd85e07 (README); aprobado; al aprobar no quedó nada por commitear |
| Gate integral | Pidió ajustes: faltaba el test de null y undefined, que el agente de la sesión 1 había declarado como hueco |
| Corrección | Test agregado sin commitear |
| Re-gate integral | Guardado a072409 "KT-016 sesión 2: correcciones del gate" antes de juzgar; aprobado |

## Hallazgos de la prueba

- El guardado no cubría el gate integral: corregido en 51deac3.
- H11 (preexistente, sin corregir): al ejecutar la sesión 1, el encargo decía "Sesión actual: S2" y le faltaba la sección con el contrato de cada tarea (rollback y comando de verificación). Al ejecutar la sesión 2 sí apareció.
- Los jueces de sesión no marcaron dos casos automatizables declarados como huecos por el agente; el gate integral detectó uno.
