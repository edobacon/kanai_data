---
id: TICKET-149
project: up1
type: ticket
status: open
work_type: implement
external: UPONE-1770
module: curriculum-mapping
autopilot: manual
story_points:
  estimated: 5
---

## Objetivo

Completar la captura de tributación sobre el CRUD ya entregado (UPONE-1756, fila por fila): guardado en conjunto y transaccional, gobierno del peso del eje 1 con su reparto, vía masiva, vista por malla, y dos cierres chicos (fix del selector en la vista solo lectura + test de paridad MCP del peso). Todo del lado de curriculum-mapping (backend gobernado + UI del mod). Se apoya en UPONE-1769 (modelo cableado: `contributionPercentage` nullable + índice de grupo, ya en develop).

## Alcance (dentro, cm-interno)

1. **Upsert transaccional de conjunto** de `CompetencyAlignment`, acotado a `(planId, matriz)`. Reemplazo total en `runInTransaction`, corriendo R-1..R-5/R-10 por fila y derivando `planId` server-side (REQ-01). Una sola entrada de historial. Patrón: `logic/competencyTree-upsert.resolver.js` + RBAC restituido como `curriculum-design/logic/planEntry-batch.resolver.js` (no delega en el generic; exige create+modify+delete).
   - **Scope de borrado (confirmado en código):** `CompetencyAlignment` NO tiene columna `matrixId`; se acota por `planId` + `competencyNodeId ∈ competencias de la matriz` (el `competencyAlignmentView` ya filtra así, línea 293). El batch retira SOLO las tributaciones de ese scope que no vinieron; nunca las de otras matrices adoptadas por el mismo plan, ni las "fuera de diseño" (R-12: se marcan, no se borran).
   - **Contrato de guardado (confirmado):** el cliente reenvía el conjunto completo del `(planId, matriz)` cargado (el view no pagina), así "lo que no vino = retirar" es seguro dentro de ese scope.
2. **Peso del eje 1:** agregar `contributionPercentage` a `WRITABLE_FIELDS` (`logic/helpers/validateCompetencyAlignment.js`) + validación por fila (string 0-100, 2 decimales, no truncar). **R-6:** solo `Evaluates`/`Both` pesan; `Develops` queda `null`. Grupo por `(planId, competencyNodeId, developmentLevelId)`.
3. **Reparto en partes iguales:** client-side (`weights.ts`, G-6). Estado auto/manual del grupo **derivado** (no persistido).
4. **Vía masiva:** aplicar un destino (nivel + tipo) a varias asignaturas en una transacción, con troceo en el backend (AD-12, patrón `logic/matrixAdoption.resolver.js:246-300`). Reporta cuáles se saltearon y por qué.
5. **Vista "Por malla":** modo de vista de la propia tributación (asignaturas por período), sobre los datos que `alignmentView.resolver.js` ya trae (`planEntry` con `period`/`position`). NO importa `CurriculumMesh` de curriculum-design (M-26).
6. **Fix de UI:** quitar el selector de asignatura de la vista solo lectura (pertenece solo al editor, en los dos modos).
7. **Test de paridad MCP:** extender el test para cubrir `contributionPercentage` (documenta el hueco de la vía genérica; el cierre real es de los tickets de MCP de cm, patrón `blockGenericMutation`).

## Fuera de alcance

- **Validación "suma 100 al publicar el plan" (D1):** cross-mod hacia curriculum-design, ticket aparte (ver `Pendiente cross-mod - Guard de suma al publicar el plan (D1, derivado de 1770)`).
- Indicadores y versionado del plan (UPONE-1771); outcomeAlignment y retiro con aviso (UPONE-1772); migración de niveles (UPONE-1773).
- R-9 (gate del peso por institución): legacy, no aplica en up1 (el único parámetro de tenant del mod es `cm.displayDecimals`).

## Reglas a respetar

R-1..R-5/R-10 (de 1756, por fila dentro del batch); R-6 (solo Evaluates/Both pesan); G-6 (reparto y estado derivado client-side); AD-12 (troceo en backend); M-26 (no import cross-mod de componentes); escrituras gobernadas `*Validated` con `runInTransaction`, sin CRUD generic.

## Criterios de aceptación

- El guardado de una matriz es un upsert de conjunto transaccional (todo o nada), acotado a `(planId, matriz)`; no toca otras matrices adoptadas ni las filas "fuera de diseño".
- En una celda con varias asignaturas `Evaluates`/`Both` se ve y se edita el peso de cada una; solo esas pesan (R-6).
- "Repartir en partes iguales" distribuye 100 en el grupo (client-side).
- El estado automático/manual del grupo se deriva, no se persiste (sin campo ni objeto nuevo).
- La vía masiva aplica un destino a varias asignaturas en una transacción; reporta las salteadas.
- La vista por malla y la por competencia operan sobre la misma vía gobernada (el batch).
- El selector de asignatura ya no aparece en la vista solo lectura.
- El test de paridad cubre `contributionPercentage`.
- El CRUD de tributación de 1756 sigue verde; `sync`/`codegen` sin drift; artefactos de sync no commiteados.

## Referencias (KB sp11)

- Cierre de alcance (autoritativo): `UPONE-1770 - cierre de alcance y correcciones`.
- Maqueta: `UPONE-1770 - referencias visuales de la maqueta` (10 capturas).
- Guía de ejecución: `UPONE-1770-pre-intake`. Contrato: `UPONE-1770-detalle`. Frontera: `UPONE-1770-aduana`.
- Origen del peso y del nullable: `UPONE-1756-detalle-tecnico` §7. División de tickets del PO: `UPONE-1756-plan-po`.

## Adendas al request

### Adenda 1 - 2026-09-16 - Eduardo (dev)

1770 EXTIENDE la tributación ya entregada (1756) reutilizando sus componentes, no la reemplaza. Además del fix del selector en solo lectura, entran como restricciones de fidelidad/reuso (no como rediseño):
(a) El editor conserva su panel lateral de SELECCIÓN con el elemento "en mano": PlanSubjectsPanel en modo por competencia; la matriz de competencias en modo por malla.
(b) Solo-lectura y edición son dos superficies distintas: la pestaña "Tributación" del plan (con "Tributar", sin selector) y la pantalla que abre "Tributar" (editor).
(c) El detalle vive en el CompetencyAlignmentDetailModal YA EXISTENTE, extendido con el bloque de peso; no un panel lateral ni un componente nuevo.
(d) La asignación es por selección lateral + click, sin drag (ni draggable ni handlers de arrastre).
Motivo: estas restricciones existen para que el ejecutor REUTILICE los componentes reales de curriculum-mapping/modsComponents/CompetencyAlignmentGrid/ y no re-invente (evitar DetailSidePanel/CompetencyLevelGrid).

**Motivo**: Refinamiento 2026-09-16: se detectó que el request original no explicitaba las restricciones de reutilización/fidelidad, y el spec las incorporó como REQ. Se registran como alcance efectivo para que deriven del request.
