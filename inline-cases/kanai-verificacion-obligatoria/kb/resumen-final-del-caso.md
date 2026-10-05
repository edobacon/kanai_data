# Caso `kanai-verificacion-obligatoria` — Resumen final

**Estado: plan completo (5 de 5 fases), cada fase con su juez de fase en veredicto aprobatorio.**

## El objetivo

Que la sesión de verificación de un ticket sea **obligatoria cuando el ticket la tiene**: cada ítem pasa o queda no ejecutado **con su motivo**, Kanai puede informar por qué, y en la ejecución de épica la política se vuelve obligatoria por defecto (fuera de ella sigue advisory). Un ticket **sin** sesión de verificación se omite: no se ve afectado.

## Qué se entregó

| Fase | Qué cambió |
|---|---|
| **F1** | La política de verificación del ticket **se persiste y sobrevive al rearme**: frontmatter, re-render al setear la config, parser que la lee y el mapa de autopilot arreglado. Medido: las políticas no-default que sobrevivían pasaron de **0/56 a 56/56**; los autopilot degradados de 51 a 0 |
| **F2** | El ítem no ejecutado **tiene su motivo**: causa y nota validadas antes de escribir, el registro rechaza un pendiente con la política obligatoria, y el porqué se informa en el reporte, el gate, la vista y el panel |
| **F3** | El **guard del cierre** (DET-36): con la política obligatoria el cierre exige los ítems resueltos —bloquean los sin resolver **y los que fallaron**— y el mensaje dice qué quedó sin correr y por qué. La política además vuelve bloqueante el gate de la sesión (DET-20). Escape del dev auditado (`verificationAck`) |
| **F4** | **La épica**: la verificación es obligatoria por defecto, en el mismo lugar donde se fuerza el autopilot autónomo, y la política efectiva llega a **todas** las rutas que bloquean o cierran (una sola definición, `epicVerificationRequired`, válida en `running`, `ready`, `review` y `paused`). El contrato de entrega la nombra |
| **F5** | La **prueba de punta a punta** con las herramientas reales sobre KT-013 en `kanai_test`: un ítem verificado de verdad y otro no ejecutado con su causa y su nota; el registro lo rechaza sin motivo; el cierre lo informa; el reconocimiento del dev destraba y queda auditado |

## Los hallazgos de los jueces (lo que hizo valer la pena el proceso)

Cada fase pasó por un juez ciego, y **cinco veces encontraron cosas que la implementación daba por buenas**:

1. **F2**: el detalle del ítem no sobrevivía al rearme, y el smoke automático inventaba motivos.
2. **F3**: un ítem con `fail` contaba como resuelto: un ticket obligatorio podía cerrar con una verificación **fallida**.
3. **F4 (ronda 1)**: la política se perdía **justo en el momento en que la épica cierra sus tickets** (el cierre por lote, con la corrida en `ready`), y el test que la "probaba" usaba una combinación que el flujo real nunca produce.
4. **F4 (ronda 2)**: la corrida sigue siendo del ticket en `review` y `paused`, y la vista podía decir `ask` mientras el guard exigía `required`.
5. **F5**: el mensaje del cierre repetía el mismo ítem en dos listas.

Ninguno de esos se veía en un test verde: hicieron falta lecturas del flujo real.

## Estado y verificación

- **Código** (`kanai-app`, rama `codex/epicas-autonomas`): `d9d485b`, `9155af2`, `ecf94b4` (F1) · `f4773cd`, `7238e65`, `32ab77c`, `c21575a`, `3252cc5`, `8921862` (F2) · `534f8aa`, `322ba93` (F3) · `a976304`, `fd2b917`, `fa84b72`, `0d04d26` (F4) · `7ae3dda` (F5).
- **Verificación al cierre**: `pnpm typecheck` exit 0 y suite completa **357 archivos / 2819 tests en verde**.
- **Data repo**: local, con commit; **sin push** (por contrato del workspace).
- **Ticket de prueba**: KT-013 en `kanai_test`, con su verificación obligatoria y sus dos ítems resueltos.

## Lo que queda fuera del plan

- **Subir (o no) la rama** `codex/epicas-autonomas`: ~45 commits sin push.
- **Subir (o no) el data repo**: ~92 commits locales.
- **Limpiar las copias temporales** de `/tmp` usadas para medir (rearme, F2, F5).
- **Un nit preexistente** que dejó el juez de F5: la lista "ya quedaron sin correr" del mensaje incluye los `not_run` pero no un `skipped` con causa.
- **El incidente del MCP viejo**: el proceso que servía las herramientas quedó corriendo código antiguo y hubo que reiniciarlo para la prueba. Vale como recordatorio: si una función nueva "no aparece", conviene mirar el diagnóstico de entrega antes de dudar del código.
