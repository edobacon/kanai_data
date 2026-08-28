---
id: SPEC-curriculum-design-refactor-retire-workflow
project: up1
ticket: TICKET-114
status: done
---

# Retiro del subsistema workflow relacional (curriculum-design)

# Retiro del subsistema workflow relacional (curriculum-design)

## Executive summary — lo que estas aprobando

**Que se quiere**: eliminar el motor de workflow relacional del mod `curriculum-design`, que quedo como codigo muerto tras migrar el estado de Activity al motor de enum de core (UPONE-1381). Su presencia (objetos, resolvers, columnas de schema) confunde el modelo de datos y bloquea la limpieza que SS-423 dejo pendiente. Zero cambio de comportamiento observable: nada vivo lo consume.

**Decisiones criticas que necesitan tu OK**:

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 (OQ-1) | Snapshots: dejar v1-v5 como historia inmutable; capturar el retiro via `model:bump` (genera `snapshot-v7`), NO hand-edit | El drift hook compara contra el snapshot mas reciente (v6). Sin bump, `drift:check` reportara el delta. El bump es una accion de versionado de modelo core |
| 2 | Migracion destructiva (drop de 4 tablas + 2 columnas) — SIEMPRE requiere tu consentimiento explicito en S2 | Borra datos irreversiblemente. Precondicion: 0 Activity con FK no-null |

**Riesgos principales y como los mitigamos**:

- **Superficie de borrado mayor a la documentada** (3 resolvers, no 1; +schemas +helpers +errors.js) → enumerada exhaustivamente en el refactor map por grounding directo; DET-33 verifica 0 imports colgantes tras cada borrado.
- **Regresion silenciosa** (algo dependia del workflow y no se detecto) → baseline verde (1251/1251) + re-run tras cada task; el invariante es zero-behavior-change.
- **Drop destructivo irreversible** → precondicion 0-FK verificada + consentimiento + flujo canonico (nunca ALTER/db push a mano).

**Que NO se hace en este ticket**:

- `N8nWorkflow` (up1-manager): objeto n8n, dominio distinto. Intacto.
- Reconciliacion del seed `_data-mesh.js` de TICKET-113 (roto por SS-423): se resuelve en ese ticket.
- Edicion manual de `object-manager` (es destino de sync; los `Base/workflow*.json` desaparecen al re-sincronizar).

**Tamano estimado**: 2 sessions. S1 (borrado + regen local, T2, ~1.5-2h). S2 (migracion destructiva, T3, gate fuerte, bloqueante por consentimiento).

**Como vas a saber que funciona**:

- `npm test` del mod queda verde tras el retiro (menos los tests del propio workflow, eliminados).
- `npm run codegen` regenera `schema.prisma` sin tablas `workflow*` ni columnas `workflowId`/`currentStatusId`.
- `drift:check` sin drift (tras bump a v7). Smoke en UPU: alta/edicion de Activity (status enum) funciona.

---

## Purpose

Retiro de codigo muerto: el motor de workflow relacional del mod fue reemplazado por el enum engine de core (UPONE-1381). Se eliminan sus objetos, logica y columnas de schema. El comportamiento externo del mod NO cambia — la maquina de estados de Activity ya corre sobre el enum engine.

## Requirements (behavior preservation)

> **REQ-PRESERVE-01 — La API publica y el comportamiento del mod MUST no cambiar.**
> Que cambia: nada observable. Por que: es retiro de codigo muerto; ningun consumidor vivo usa el workflow relacional (grounding: grep del modelo prisma `Workflow*` en `logic/` sin resultados vivos).

<details><summary>Scenarios de validacion</summary>

- GIVEN una Activity existente WHEN se consulta/edita su `status` THEN el enum engine responde identico a antes del retiro.
- GIVEN el resto de resolvers del mod (activity, activity-formtemplate, polymorphicUpdate) WHEN corren THEN comportamiento identico (sus refs a workflow eran solo comentarios).
</details>

> **REQ-PRESERVE-02 — Los tests existentes (menos los del propio workflow) MUST pasar sin modificacion de aserciones.**
> Que cambia: se elimina `workflow-resolvers.test.ts` y se limpian refs tangenciales. Por que: si un test no-workflow falla, el retiro rompio algo real.

> **REQ-PRESERVE-03 — El schema regenerado MUST quedar sin tablas `workflow*` ni columnas `workflowId`/`currentStatusId`, y sin imports colgantes.**
> Que cambia: `codegen`+`sync` regeneran `schema.prisma`. Por que: es el resultado estructural del retiro; DET-33 verifica 0 refs colgantes.

## Artifacts — Refactor map

### Files (action / before / reason)

| Action | Target | Reason |
|--------|--------|--------|
| delete | `objects/workflow.json`, `workflowStatus.json`, `workflowTransition.json`, `workflowTransitionHistory.json` | 4 objetos del motor relacional muerto |
| delete | `logic/workflow.resolver.js` + `logic/workflow.schema.graphql` | resolver + schema muertos |
| delete | `logic/workflowTransition.resolver.js` + `logic/workflowTransition.schema.graphql` | resolver + schema muertos |
| delete | `logic/workflowTransitionHistory.resolver.js` + `logic/workflowTransitionHistory.schema.graphql` | resolver + schema muertos |
| delete | `logic/helpers/getInitialStatus.js` | helper muerto post-1381 (sin importador externo) |
| delete | `logic/helpers/assertExists.js` | helper usado SOLO por los 3 resolvers de workflow → muere con ellos |
| prune | `logic/errors.js` | remover seccion `WORKFLOW_*` completa (0 consumidores vivos; comentarios de "audit reusa" stale) |
| clean-comments | `logic/activity.resolver.js`, `logic/activity-formtemplate.resolver.js`, `logic/polymorphicUpdate.resolver.js`, `seed/_data-academicprogram.js` | refs a workflow son solo comentarios historicos |
| clean | `seed/_data-aiep.js`, `seed/_data-univalle.js`, `seed/_data-indexes.js`, `seed/seed.js` | refs residuales de siembra de workflow |
| delete | `tests/integration/workflow-resolvers.test.ts` | test del subsistema retirado |
| clean | `tests/integration/{ensureIndexes-errors,seed-entry,seed-counts,fixtures-vs-seed,activity-status-badge-a11y,activity-publish-weights,lang-enums}.test.ts` | refs tangenciales (index entry, seed count, enum) |
| regen | `object-manager/objects/business/Base/workflow*.json` | desaparecen via `npm run sync` (destino de sync, no editar a mano) |
| regen | `object-manager/prisma/schema.prisma` | via `npm run codegen` (auto-generado) |
| bump | `object-manager/objects/snapshots/snapshot-v7.json` + `model.json` | OQ-1: captura el delta de modelo (v1-v6 inmutables) |

## Tasks

### Session S1 — Borrado + regeneracion local `[auto] [tier: T2]`

- **S1.T1 — Baseline snapshot** (ya ejecutado): `npm test` → 1251/1251 passing. source_ref: REQ-PRESERVE-02. rollback: N/A.
- **S1.T2 — Borrar objetos (4)**. source_ref: REQ-01/REQ-PRESERVE-03. validation: archivos ausentes. rollback: `git checkout objects/`.
- **S1.T3 — Borrar logica muerta (3 resolvers + 3 schemas + 2 helpers)**. source_ref: REQ-02. validation: `grep` de imports colgantes = 0 (DET-33). rollback: `git checkout logic/`.
- **S1.T4 — Podar `errors.js` + limpiar comentarios** (activity/activity-formtemplate/polymorphicUpdate resolvers, `_data-academicprogram.js`). source_ref: REQ-02. validation: sin refs a codes `WORKFLOW_*` en codigo vivo; sin comentarios huerfanos. rollback: `git checkout`.
- **S1.T5 — Limpiar seeds** (`_data-aiep`, `_data-univalle`, `_data-indexes`, `seed.js`). source_ref: REQ-03. validation: `seed.js` sin import de workflow. rollback: `git checkout seed/`.
- **S1.T6 — Borrar `workflow-resolvers.test.ts` + limpiar refs tangenciales en 7 tests**. source_ref: REQ-PRESERVE-02. validation: suite re-corre verde. rollback: `git checkout tests/`.
- **S1.T7 — codegen + sync local + re-run suite**. source_ref: REQ-PRESERVE-02/03. validation: `codegen` sin `workflow*` en `schema.prisma`; `npm test` verde (baseline − tests workflow); `lint`/`typecheck` limpios. rollback: revertir la rama.
- **S1.GATE** — quality review (tier standard) + verificacion self-report (DET-33): archivos borrados confirmados, suite re-corrida real, 0 imports colgantes.

### Session S2 — Migracion destructiva `[⚑ fuerte] [tier: T3]` (BLOQUEA por consentimiento)

- **S2.T1 — Precondicion 0-FK**: query al tenant UPU confirmando 0 Activity con `workflowId`/`currentStatusId` no-null. source_ref: REQ-05. validation: conteo = 0. Si > 0: BLOQUEAR, escalar.
- **S2.T2 — [BLOQUEA: consentimiento del dev] Migracion destructiva** via flujo canonico (`codegen` + `sync` + `migrate`): drop de 4 tablas + 2 columnas. source_ref: REQ-05. validation: migracion aplicada; schema sin workflow. rollback: restore de backup del tenant (documentar antes del drop).
- **S2.T3 — model:bump → snapshot-v7** (si OQ-1 aprobado). source_ref: REQ-04. validation: `drift:check` sin drift. rollback: `git checkout snapshots/ model.json`.
- **S2.T4 — Smoke UPU + drift:check**: alta/edicion de Activity (status enum) funciona; `drift:check` limpio. source_ref: REQ-PRESERVE-01. validation: evidencia runtime real.
- **S2.GATE** — validacion completa + acceptance checkpoints.

## Risks

| Riesgo | Prob | Impacto | Mitigacion |
|--------|------|--------|------------|
| Consumer no detectado (import dinamico) | Baja | codegen/sync o build falla | grep exhaustivo (hecho) + codegen + suite completa tras S1 |
| errors.js: code aun usado por test string-literal | Media | test rojo | limpiar refs de tests en S1.T6 antes de podar; re-run |
| Drop con datos presentes | Baja | perdida de datos | precondicion 0-FK dura + consentimiento + backup |
| drift:check rojo tras retiro | Alta si no se bumpea | sync reporta drift | model:bump → v7 (OQ-1) |

## Open questions

- **OQ-1**: ¿Bump del modelo a `snapshot-v7` (+`model.json`) como parte de S2, o se difiere a un bump agrupado posterior? Recomendacion: bump en S2 (el retiro es un delta de modelo legitimo; deja `drift:check` limpio). Deja v1-v6 intactos como historia.

## Acceptance

Ver "## Criterios de aceptación" y "## Definition of Done" en [TICKET-114](../../tickets/TICKET-114.md).
