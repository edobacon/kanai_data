---
id: TICKET-151
project: up1
type: ticket
status: closed
work_type: implement
external: UPONE-1770
tier: T3
module: curriculum-mapping
autopilot: manual
verification_policy: ask
teach_policy: skip
draft_policy: skip
review_policy: auto
story_points:
  estimated: 5
  executed: 5
---

## Objetivo

Regla de negocio confirmada por el PO (2026-09-24): un plan de estudios ya publicado no puede modificar sus tributaciones. Cambiar la tributación de un plan publicado exige versionar el plan o devolverlo a Borrador.

Hoy la regla no existe en el código: los resolvers de tributación de curriculum-mapping no leen el estado del plan (solo validan adopción vigente, R-1), y la grilla solo combina el modo del layout (`enableEdit`) con los permisos del usuario. Resultado: la tributación de un plan Activo se puede editar.

## Regla (decisión 1B)

- Estado del plan = `Curriculum.status` (enum de `mods/curriculum-design/objects/Curriculum.json`). "Vigente"/"publicado" = `Active` (label es: "Activo").
- **Editables:** `Draft`, `InReview`, `Approved`.
- **Bloqueados:** `Active`, `Deprecated`, `Archived`.
- Se declara como lista de estados EDITABLES (fail-closed): un estado nuevo del enum queda bloqueado hasta que se decida. Plan ausente o inexistente: se rechaza.
- Retirar una tributación también es modificar: queda bloqueado.

## Alcance (decisión 3A)

Repo: curriculum-mapping, sobre la rama de UPONE-1770 (`feat/UPONE-1770-tributacion-peso-del-eje-1`), porque el guardado en conjunto y la vía masiva solo existen ahí. Merge después de 1770; independiente de TICKET-150 (guard de suma al publicar).

1. **Helper del guard** `assertPlanEditable({ prisma, planId })` en `logic/helpers/alignmentRules.js`, junto a `assertActiveAdoption`. Patrón a replicar: `mods/curriculum-design/logic/helpers/planEntryPlanStatusGuard.js` (UPONE-1757: lee `curriculum.status` por el prisma del tenant, fail-closed, defensivo solo ante mock sin modelo). Error propio `COMPETENCYALIGNMENT_PLAN_LOCKED` con mensaje en lenguaje de negocio (es + en) que indique la salida: versionar el plan o devolverlo a Borrador.
2. **Enganches server-side** (dentro de la transacción, antes de escribir, igual que R-1):
   - `createCompetencyAlignment`: plan derivado del source.
   - `updateCompetencyAlignment`: plan de ORIGEN (fila actual) y plan de DESTINO (source efectivo) si el movimiento cambia de plan.
   - `deleteCompetencyAlignment`: plan de la fila.
   - `upsertCompetencyAlignmentSet` (guardado en conjunto): una vez por llamada, sobre el planId del alcance.
   - `bulkApplyCompetencyAlignment` (vía masiva): una vez por llamada, sobre el plan del alcance resuelto.
3. **Grilla (FE):** `competencyAlignmentView` devuelve además si el plan es editable (la política vive solo en el backend, sin constante duplicada en el FE). `CompetencyAlignmentGrid` pasa a solo lectura cuando el plan no es editable, aunque el layout sea de edición y el usuario tenga permisos, y muestra un aviso con la salida (versionar o devolver a Borrador). i18n es/en.
4. **MCP:** hoy la escritura genérica de `CompetencyAlignment` ya está bloqueada en el MCP (`governedObjects` en `ai/index.js` + `mcp/src/contracts/generic-write-block.js`, ambos en develop) y el pack no expone tools propias de tributación, así que por MCP no se puede escribir. Dejar asentado en el comentario del pack que toda tool futura de tributación debe pasar por los resolvers `*Validated` (y así hereda el guard). Extender `tests/unit/competencyAlignmentParity.test.js` con el caso de plan bloqueado (mismo rechazo sin importar el canal).
5. **Tests:** rechazo por cada vía con plan en `Active`, `Deprecated` y `Archived`; paso libre en `Draft`, `InReview` y `Approved`; plan inexistente rechaza; mover de un plan editable a uno bloqueado (y viceversa) rechaza; la fila queda intacta en el rechazo; grilla en solo lectura con aviso.

## Fuera de alcance

- Bulk-edit genérico del core y GraphQL directo (`createInstance`/`updateInstance`): saltean los resolvers del mod. Misma deuda que R-1..R-5, se cierra en el core (N3).
- Versionado del plan y réplica de tributación (UPONE-1771): la réplica escribe sobre la versión nueva (Borrador), no le afecta el guard.
- Limpieza de tributaciones huérfanas (UPONE-1772): debe respetar esta regla; se define allá.
- Hallazgo preexistente, no se toca aquí: `curriculum-design/modsComponents/CurriculumMesh/curriculumMesh.logic.ts` declara solo 3 estados del plan (el enum tiene 6); con InReview/Approved/Deprecated la alerta de malla no editable queda sin label.

## Contexto

- Salidas existentes: transición `Active -> Draft` (capability `curriculum:revert`) y versionado desde `Approved`/`Active` (`versionableFromStates`). Al republicar, el guard de suma de TICKET-150 vuelve a validar los pesos.
- Coherencia con la malla: la malla solo se edita en Borrador (UPONE-1757); la tributación además se permite en En revisión y Aprobado (se tributa sobre una malla ya fija).
- Relacionados: TICKET-149 (UPONE-1770), TICKET-150 (D1 de 1770), UPONE-1771, UPONE-1772. Precedentes: `requirementActivityGuard.js` (UPONE-1352), `planEntryPlanStatusGuard.js` (UPONE-1757).

## Adendas al request

### Adenda 1 - 2026-09-24 - dev (opcion A tras review kn-dredd 2026-09-24)

Correcciones post-review, sin cambiar la regla de negocio:
1. (S2) docs/reference/competencyalignment-object.md: registrar la regla de plan editable (R-PL) en la tabla de reglas (§3), en las tablas de escrituras gobernadas (§4 y las de guardado en conjunto / via masiva) indicando que corre primero, y agregar a la tabla de errores (§7) COMPETENCYALIGNMENT_PLAN_LOCKED_PERSONALISED_ERROR y COMPETENCYALIGNMENT_PLAN_UNRESOLVED_PERSONALISED_ERROR con su causa.
2. (S3, regresion) logic/competencyAlignment.resolver.js updateCompetencyAlignment: validar el plan de ORIGEN solo si current.planId no esta vacio (una fila con planId nulo y source valido vuelve a poder editarse y se repara con el planId derivado, como antes; el destino lo sigue validando assertGovernedWrite).
3. (S3) CompetencyAlignmentGridElement.vue onSaveAlignmentSet: ante un rechazo con code COMPETENCYALIGNMENT_PLAN_LOCKED_PERSONALISED_ERROR, recargar la vista para que la grilla pase a solo lectura y muestre el aviso (sin perder el mensaje de error).
4. (S3) create/update: evaluar R-PL antes de la validacion de peso (R-6), para que con plan publicado el motivo informado sea siempre PLAN_LOCKED, como pide el propio comentario de assertGovernedWrite.
Cada correccion con su test (el caso de planId nulo, la recarga tras PLAN_LOCKED y el orden R-PL antes de R-6).

**Motivo**: Review kn-dredd (jurado 3, veredicto aprobable con reservas): 1 S2 de documentacion + 3 S3 de codigo confirmados. El dev elige corregirlos antes de cerrar.

## Enmiendas post-cierre

### Enmienda post-cierre 1 - 2026-09-24 - Eduardo (dev)

**Origen**: revisión del PR (PR curriculum-mapping #41; kb/sp11/UPONE-1770-adendas-post-review-cm41.md)
**Motivo**: Correcciones de la revisión del PR curriculum-mapping #41 (veredicto iterar: un hallazgo alto y seis medios), aplicadas con los tickets ya cerrados.

**Cambios**:
- La doc de referencia aclara el alcance de la regla de plan publicado: aplica en las cinco vías gobernadas; el CRUD genérico no pasa por ella. Queda como deuda de alcance enlazada a UPONE-1771 y UPONE-1758; el guard no cambia de comportamiento

**Commits**: curriculum-mapping@d035a6f
**Evidencia**: typecheck pass · lint pass · tests 3059/3059 en verde · 21 tests nuevos en la tanda (declarada)
**Misma revisión, también en**: TICKET-149, TICKET-152
