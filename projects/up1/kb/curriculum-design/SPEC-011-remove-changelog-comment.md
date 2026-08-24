---
id: SPEC-011-remove-changelog-comment
project: up1
module: curriculum-design
status: done
ticket: TICKET-029
meta_specs: []
created: '2026-05-22'
updated: '2026-05-22'
tags:
  - changelog
  - cleanup
  - field-removal
  - hu2-followup
  - data-model
  - layouts
depends_on:
  - SPEC-007-hu2-changelog-audit
---

# Remove campo `comment` del object changeLog + columnas "Comentario" en vistas del historial

## Executive summary — lo que estas aprobando

> *Esta seccion esta disenada para revision rapida. Si solo lees esto y te basta para decidir, ese es el objetivo. El detalle tecnico vive abajo.*

**Que se quiere**: eliminar el campo `comment` del objeto `changeLog` (HU2) y las 10 columnas "Comentario" en los layouts del tab "Historial de cambios". El comment ya vive canonicamente en `workflowTransitionHistory.comment` (HU3) — duplicarlo en cada fila del changeLog (1 por field modificado) genera ruido visual sin aportar info nueva. Para DirectEdit (Update/Create/Delete) el comment esta vacio — columna inutil. El campo se introdujo apenas en TICKET-020 (cerrado 2026-05-20), asi que la limpieza llega antes de que se acumule data productiva relevante.

**Decisiones criticas que necesitan tu OK**:

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | Mantener el input `transitionContext.comment` en la mutation `recordAuditEvent` (no breaking change del schema GraphQL) — solo dejar de persistirlo al changeLog | El comment del input sigue persistiendo a `workflowTransitionHistory` (HU3). Eliminarlo del input rompe el contrato de `flows/audit-capture.json` y consumers eventuales. Mantenerlo es no-op para downstream y mas seguro |
| 2 | `DROP COLUMN ChangeLog.comment` sin backup explicito de data productiva, validando antes con `SELECT COUNT(*) FROM "ChangeLog" WHERE comment IS NOT NULL` en S1 | Field opcional recien introducido (2 dias) — caso comun para columnas nullable sin compromiso de retencion. Si count > 0 y el contenido fuera critico, escalar a backup antes del DROP. Decision empirica en S1.T1 |
| 3 | Gate de S2 marcado **⚑ fuerte** (validacion humana antes de continue) por ser cambio user-facing en 10 layouts + smoke UI manual del tab Historial | Sin gate fuerte, un test integration verde podria ocultar regresion visual en algun RT de curricularSection. Vale la pausa de aprobacion manual |

**Riesgos principales y como los mitigamos**:

- **Resolver `auditCapture.resolver.js` deja de poder escribir `comment` al `changeLog.create` (4 ocurrencias en lineas 504, 540, 582, 622)** → remover las 4 lineas Y los comentarios L341 + L355-356 que justifican el field. Validar con `npm run test:integration -- auditCapture` post-fix.
- **DROP COLUMN con data productiva no auditada** → SELECT COUNT antes del DROP en S1.T1. Si count > 0: confirmar con el dev si proceder o backup.
- **Layouts del tab Historial renderizan con error si el field desaparece del backend antes de los layouts** → orden de fases obligatorio: S1 termina con backend coherente (sin field + sin column) antes de empezar S2 (layouts). Restart de om dev en S1.GATE.
- **Apollo client cache de suite stale post-restart om** → hard refresh + verificar introspection sin field en S2 smoke UI.

**Que NO se hace en este ticket** (limites explicitos):

- **NO se toca `workflowTransitionHistory.comment`** — sigue siendo source of truth del comment de transitions (HU3, required cuando `transition.requiresComment=true`).
- **NO se elimina el input `transitionContext.comment` del schema GraphQL** del mutation `recordAuditEvent` (decision #1) — solo se deja de persistir al changeLog.
- **NO se hacen otros cambios en el changeLog** (entityType, action, source, oldValue, newValue, etc. — todos preservados).
- **NO se migra data productiva de UPU** salvo que S1.T1 detecte count > 0 critico — decision empirica.
- **NO aplica tooltip de truncamiento (OQ3 scope A de TICKET-020)** — obsoleto: si el field no existe, no hay nada que truncar.

**Tamano estimado**: 2 sessions ejecutables (S1 + S2), aproximadamente 1.5h efectivos distribuidos. **S2 es la mas riesgosa** — toca 10 layouts cross-file + smoke UI manual del tab Historial en sandbox UPU.

**Como vas a saber que funciona**:

- Abro el tab "Historial de cambios" en RecordDetail de un `Activity` en UPU sandbox y NO veo columna "Comentario" — el resto de columnas (Fecha, Seccion, Antes, Despues) sigue intacto.
- Idem en al menos 1 RecordType de `curricularSection` (ej. EvaluationComponent) + el `default_changeLog_list` global.
- `npm run test:integration -- curriculum-design` pasa (existing + nuevos TCs sin regresion).
- `grep -r '"comment"' mods/curriculum-design/objects/changeLog.json mods/curriculum-design/config/layouts/` retorna 0 matches.
- Prisma schema generado no contiene `comment` en el model `ChangeLog`.

---

## Purpose

Cleanup del field `comment` del object `changeLog` (HU2) por decision UX/data-hygiene del equipo: redundancia con `workflowTransitionHistory.comment` (HU3) para StateTransition + vacio para DirectEdit. Impacto: 1 object JSON + 10 layouts + 1 resolver del mod + Prisma DROP COLUMN. Followup directo de TICKET-020 (parent).

## Requirements

### REQ-IMPROVE-01: Eliminar property `comment` del object `changeLog`

> **Que cambia**: el JSON del object `changeLog` ya no declara la property `comment`. Codegen no la genera al schema Prisma ni a los tipos GraphQL. La columna desaparece de la tabla `ChangeLog` en BD.
> **Por que**: el comment canonico para StateTransition vive en `workflowTransitionHistory.comment`. Duplicarlo en N filas de changeLog (1 por field modificado en la transition) es ruido visual sin info nueva.

El sistema MUST eliminar la property `comment` del archivo `mods/curriculum-design/objects/changeLog.json`. La regeneracion via `npm run codegen` MUST producir un schema Prisma sin la columna `comment` en el model `ChangeLog` y typedefs GraphQL sin el field `comment` en el tipo `ChangeLog`.

**Actor**: dev (codegen al ejecutarse)
**Layers**: database, api, config

<details><summary>Scenarios de validacion</summary>

#### Scenario: codegen sin field comment
- **GIVEN** `objects/changeLog.json` editado sin la property `comment`
- **WHEN** `npm run codegen` se ejecuta
- **THEN** `object-manager/prisma/UPU/schema.prisma` no contiene linea `comment` dentro del block `model ChangeLog`
- **AND** `object-manager/src/graphql/typeDefs/dynamic.js` no contiene field `comment: String` dentro del tipo `ChangeLog`

#### Scenario: introspection GraphQL post-restart sin field
- **GIVEN** codegen ejecutado + om dev restart
- **WHEN** query introspection `{ __type(name: "ChangeLog") { fields { name } } }`
- **THEN** la lista de fields NO incluye `comment`
- **AND** la lista incluye los otros fields preservados: `entityType`, `entityId`, `userId`, `action`, `source`, `field`, `oldValue`, `newValue`, `changeRequestId`, `workflowTransitionHistoryId`, `sourceRefId`, `createdAt`

</details>

### REQ-IMPROVE-02: Eliminar columna "Comentario" en 10 layouts del tab Historial

> **Que cambia**: las vistas del tab "Historial de cambios" en Activity (`default_Activity_view`), curricularLink (`default_curricularLink_view`), 6 RecordTypes de curricularSection (Bibliography/Content/CustomSection/EvaluationComponent/LearningOutcome/Modality/Session) y la lista global `default_changeLog_list` dejan de mostrar la columna "Comentario".
> **Por que**: la columna esta vacia para DirectEdit (Update/Create/Delete) y duplica el comment de wth para StateTransition. Sin info util — ruido visual.

El sistema MUST eliminar la entry `{ "key": "comment", ... }` del array `columns` en los 10 archivos de layouts del mod `curriculum-design`. Los layouts MUST seguir renderizando sin errores con las columnas restantes preservadas.

**Actor**: dev consumidor de la UI del tab Historial
**Layers**: config (layouts), frontend (renderizado)

<details><summary>Scenarios de validacion</summary>

#### Scenario: layout grep sin matches de comment
- **GIVEN** los 10 layouts editados
- **WHEN** `grep -r '"comment"' mods/curriculum-design/config/layouts/`
- **THEN** retorna 0 matches

#### Scenario: tab Historial renderiza sin columna Comentario en Activity
- **GIVEN** ambos cambios (REQ-IMPROVE-01 + REQ-IMPROVE-02) aplicados + om dev restart + suite hard refresh
- **WHEN** dev abre RecordDetail de un `Activity` en sandbox UPU y clickea tab "Historial de cambios"
- **THEN** la tabla renderiza con columnas Fecha, Seccion, Antes, Despues (sin "Comentario") sin errores en consola
- **AND** las filas de changeLog existentes aparecen sin la celda Comentario (no celda vacia, no celda con error)

#### Scenario: tab Historial renderiza en al menos 1 RecordType de curricularSection
- **GIVEN** idem
- **WHEN** dev abre RecordDetail de un EvaluationComponent y clickea tab "Historial de cambios"
- **THEN** mismo resultado: render OK sin columna Comentario

</details>

### REQ-IMPROVE-03: Prisma migration DROP COLUMN ChangeLog.comment ejecutada limpia

> **Que cambia**: la BD UPU local pierde la columna `comment` del table `ChangeLog`. Queries SQL que la referencian fallan post-migration. La migration corre clean sin perdida de data critica (validacion empirica con SELECT COUNT en S1.T1).
> **Por que**: codegen sin field genera schema Prisma sin columna, pero `prisma db push` o `migrate dev` necesitan ejecutarse para alinear BD con schema. Sin esto, la BD queda con columna huerfana.

El sistema MUST ejecutar `npm run prisma:generate && npx prisma db push` en el workspace `@uplanner/object-management-backend` para reflejar el schema sin la columna `comment` en la tabla `ChangeLog` de la BD UPU local. Antes del DROP, SELECT COUNT(*) WHERE `comment` IS NOT NULL MUST documentarse en `S1` del ticket. Si count > 0 critico (>10 rows con data significativa), escalar a backup antes del DROP.

**Actor**: dev (Prisma CLI)
**Layers**: database

<details><summary>Scenarios de validacion</summary>

#### Scenario: count antes del DROP
- **GIVEN** BD UPU pre-migration con codegen aplicado
- **WHEN** `psql -c 'SELECT COUNT(*) FROM "ChangeLog" WHERE comment IS NOT NULL'`
- **THEN** numero documentado en `### Session 1` del ticket markdown bajo la task S1.T1
- **AND** si count > 10: pausar antes del db push, escalar al dev para confirmar backup

#### Scenario: column eliminada post-migration
- **GIVEN** `prisma db push` ejecutado
- **WHEN** `psql -c '\d "ChangeLog"'`
- **THEN** la lista de columnas NO incluye `comment`
- **AND** el resto de columnas (entityType, entityId, userId, action, source, field, oldValue, newValue, changeRequestId, workflowTransitionHistoryId, sourceRefId, createdAt) sigue presente

</details>

### REQ-PRESERVE-01: Resolver `auditCapture.resolver.js` sigue funcionando sin escribir comment al changeLog

> **Que cambia**: las 4 ocurrencias actuales de `comment: ...` en llamadas `prisma.changeLog.create({ data: { ... } })` se eliminan. Los comentarios L341 + L355-356 que justifican el field tambien se remueven. El resolver sigue invocandose desde el flow n8n con el mismo schema input.
> **Por que**: si el resolver intenta escribir un field que ya no existe en Prisma, falla. Mantener compatibilidad sin breaking change del input GraphQL (decision #1 del Executive summary).

El sistema MUST eliminar las 4 lineas `comment: ...` del archivo `mods/curriculum-design/logic/auditCapture.resolver.js` (lineas actuales 504, 540, 582, 622) Y los comentarios obsoletos (lineas 341, 355-356). El input `transitionContext.comment` del mutation `recordAuditEvent` MUST preservarse en el schema GraphQL del mod (L43 del `auditCapture.schema.graphql`) — el comment sigue persistiendo a `workflowTransitionHistory.comment` via la transition runtime del workflow, no via el resolver del mod.

**Actor**: workflow n8n `flows/audit-capture.json` (consumer del resolver)
**Layers**: backend (resolver)

<details><summary>Scenarios de validacion</summary>

#### Scenario: resolver no escribe comment al changeLog
- **GIVEN** resolver editado sin las 4 ocurrencias de `comment:` en llamadas changeLog.create
- **WHEN** test integration invoca recordAuditEvent con un payload que incluye `transitionContext.comment: "test"`
- **THEN** el resolver completa sin error
- **AND** la fila `changeLog` resultante NO tiene field comment (porque el field no existe en Prisma)
- **AND** la fila `workflowTransitionHistory` correspondiente SI tiene comment poblado (preservado, no se toca)

#### Scenario: grep cero ocurrencias de comment en resolver post-fix
- **GIVEN** resolver editado
- **WHEN** `grep -n 'comment' mods/curriculum-design/logic/auditCapture.resolver.js`
- **THEN** retorna 0 matches (las 4 lineas de `comment:` Y los 3 comentarios obsoletos eliminados)

</details>

### REQ-PRESERVE-02: `workflowTransitionHistory.comment` intacto

> **Que cambia**: nada — el field `comment` del object `workflowTransitionHistory` (HU3) sigue siendo source of truth del comment de transitions. Schema GraphQL del mutation `recordAuditEvent` mantiene el input `transitionContext.comment`.
> **Por que**: el comment canonico para StateTransition vive aca. Eliminarlo seria romper la audit chain HU3.

El sistema MUST preservar la property `comment` del object `workflowTransitionHistory` (en el platform up1, no en el mod) y el field `comment` en el input `TransitionContextInput` del schema GraphQL del mod curriculum-design.

**Actor**: system (preservacion)
**Layers**: database, api

<details><summary>Scenarios de validacion</summary>

#### Scenario: workflowTransitionHistory.comment sigue en schema Prisma
- **GIVEN** post-codegen
- **WHEN** `grep 'comment' object-manager/prisma/UPU/schema.prisma`
- **THEN** retorna al menos 1 match en el block `model WorkflowTransitionHistory`

#### Scenario: input comment sigue en mutation
- **GIVEN** post-fix
- **WHEN** `grep 'comment: String' mods/curriculum-design/logic/auditCapture.schema.graphql`
- **THEN** retorna al menos 1 match en el block `input TransitionContextInput`

</details>

### REQ-PRESERVE-03: Suite tab Historial renderiza sin errores

> **Que cambia**: nada visible para el usuario salvo la ausencia de la columna "Comentario". El resto del tab (lista de cambios, filtros existentes salvo el de comment, paginacion, agrupacion por seccion) sigue funcionando identico.
> **Por que**: cambio user-facing — verificacion manual obligatoria. Si algo se rompe, el dev consumidor abre el tab y ve error.

El sistema MUST renderizar el tab "Historial de cambios" sin errores de consola, sin celdas vacias residuales, y con todas las columnas preservadas (Fecha, Seccion, Antes, Despues + las propias de cada layout segun aplique). El filtro `filterable: true` del `default_changeLog_list` que apuntaba a `comment` se elimina con la columna — el filtro UI no debe quedar huerfano apuntando a un field inexistente.

**Actor**: dev consumidor de UPU sandbox
**Layers**: frontend (suite)

<details><summary>Scenarios de validacion</summary>

#### Scenario: smoke UI Activity
- **GIVEN** todo lo anterior aplicado + suite hard refresh
- **WHEN** dev abre Activity > tab Historial en UPU sandbox
- **THEN** sin errores en consola del browser
- **AND** sin filtro huerfano apuntando a "comment"

#### Scenario: smoke UI EvaluationComponent
- **GIVEN** idem
- **WHEN** dev abre EvaluationComponent > tab Historial
- **THEN** mismo resultado

#### Scenario: smoke UI default_changeLog_list (lista global)
- **GIVEN** idem
- **WHEN** dev navega a la lista global del changeLog
- **THEN** render OK sin columna Comentario, sin filtro huerfano

</details>

## Changes

### Modified: `mods/curriculum-design/objects/changeLog.json`

| Aspecto | Antes | Despues | Por que |
|---------|-------|---------|---------|
| `properties.comment` | declarado: type String, not_null false, title "Comment", description larga | eliminado | redundancia con wth.comment para StateTransition + vacio para DirectEdit |

### Modified: `mods/curriculum-design/logic/auditCapture.resolver.js`

| Aspecto | Antes | Despues | Por que |
|---------|-------|---------|---------|
| L341 (comentario reservacion field) | `// referenciado en sourceRefId, sourceRefName, sourceRefType y comment para no perder` | comentario actualizado sin mencionar comment | obsoleto post-fix |
| L355-356 (comentario L43 reserva texto usuario) | bloque `// L43: el campo comment queda reservado para texto del USUARIO ...` | bloque eliminado | obsoleto post-fix |
| L432 (select wth) | `select: { id: true, entityType: true, entityId: true, transitionId: true, comment: true }` | `select: { id: true, entityType: true, entityId: true, transitionId: true }` | ya no se copia comment al changeLog, no es necesario seleccionarlo |
| L504 (StateTransition heredado de wth) | `comment: input.transitionContext?.comment ?? wth.comment ?? null` | linea eliminada | field no existe en changeLog |
| L540 (DirectEdit transitionContext) | `comment: input.transitionContext?.comment ?? null` | linea eliminada | idem |
| L582 (sourceRef case) | `comment: null` | linea eliminada | idem |
| L622 (futuros endpoints case) | `comment: null` | linea eliminada | idem |

### Modified: 10 layouts del mod (entry de columna)

| Layout | Linea aprox | Cambio |
|--------|-------------|--------|
| `default_changeLog_list.json` | L22 | eliminar `{ "key": "comment", "label": "Comentario", "filterable": true }` |
| `default_Activity_view.json` | L350 | eliminar `{ "key": "comment", "label": "Comentario" }` |
| `default_curricularLink_view.json` | L86 | eliminar `{ "key": "comment", "label": "Comentario" }` |
| `default_rt__Bibliography__curricularsection_view.json` | L84 | eliminar entry `{ "key": "comment", ... }` |
| `default_rt__Content__curricularsection_view.json` | L74 | idem |
| `default_rt__CustomSection__curricularsection_view.json` | L82 | idem |
| `default_rt__EvaluationComponent__curricularsection_view.json` | L96 | idem |
| `default_rt__LearningOutcome__curricularsection_view.json` | L81 | idem |
| `default_rt__Modality__curricularsection_view.json` | L109 | idem |
| `default_rt__Session__curricularsection_view.json` | L89 | idem |

### Removed: columna BD `ChangeLog.comment`

| Tabla | Columna | Action |
|-------|---------|--------|
| `ChangeLog` | `comment` (text, nullable) | DROP COLUMN via `prisma db push` post-codegen |

## Tasks

### Session 1 — Backend coherente sin field comment [tipo: auto] [tier: T2]

> **Objetivo**: dejar el backend (object JSON + resolver + Prisma schema + BD) sin el field `comment`. Restart om dev al final con introspection limpia. Pre-condicion para S2 (layouts).

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | SELECT COUNT(*) FROM "ChangeLog" WHERE comment IS NOT NULL en BD UPU local + documentar resultado en `### Session 1` del ticket. Si count > 10 con data significativa, pausar y escalar al dev. | REQ-IMPROVE-03 | researcher | — | (psql contra docker pg, no edita codigo) | output numerico documentado en ticket markdown | (no aplica — solo lectura) | DET-1, DET-13 | pending | 1 |
| S1.T2 | Eliminar property `comment` de `objects/changeLog.json` (lineas con `"comment": { "type": "string", ... }` hasta cierre `}`) | REQ-IMPROVE-01 | developer | S1.T1 | mods/curriculum-design/objects/changeLog.json | grep `"comment"` en changeLog.json retorna 0 matches | git revert | DET-5, DET-8, DET-11 | pending | 1 |
| S1.T3 | Editar `logic/auditCapture.resolver.js`: eliminar las 4 lineas `comment:` en llamadas changeLog.create (L504, L540, L582, L622), eliminar `comment: true` del select de L432, eliminar comentarios obsoletos L341 + L355-356 | REQ-PRESERVE-01 | developer | S1.T2 | mods/curriculum-design/logic/auditCapture.resolver.js | grep `comment` en auditCapture.resolver.js retorna 0 matches | git revert | DET-5, DET-8, DET-10, DET-11 | pending | 1 |
| S1.T4 | Ejecutar `npm run codegen` desde el monorepo up1 + verificar que `prisma/UPU/schema.prisma` no contiene `comment` en el model ChangeLog Y SI contiene `comment` en model WorkflowTransitionHistory | REQ-IMPROVE-01, REQ-PRESERVE-02 | developer | S1.T3 | object-manager/prisma/UPU/schema.prisma (auto-gen), object-manager/src/graphql/typeDefs/dynamic.js (auto-gen) | grep verifica ausencia en ChangeLog + presencia en WorkflowTransitionHistory | git revert + re-codegen del estado anterior | DET-5, DET-11, RULE-platform-005 | pending | 1 |
| S1.T5 | Ejecutar `npm run prisma:generate && npx prisma db push` desde object-manager workspace. Confirmar que BD UPU pierde la columna comment de ChangeLog Y que workflowTransitionHistory.comment sigue intacto | REQ-IMPROVE-03, REQ-PRESERVE-02 | developer | S1.T4 | (Prisma client + BD UPU local) | `psql -c '\d "ChangeLog"'` no muestra comment + `psql -c '\d "WorkflowTransitionHistory"'` SI muestra comment | re-codegen + re-push (restore previo si critico) | DET-5, DET-8, RULE-platform-005 | pending | 1 |
| S1.T6 | Ejecutar `npm run sync` desde root del monorepo para propagar artifacts del mod a core workspaces | REQ-IMPROVE-01 | developer | S1.T5 | (sync 8 phases) | exit code 0 + sync log sin errores | git revert + re-sync del estado anterior | DET-5, DET-11 | pending | 1 |
| S1.T7 | Restart object-manager dev + verificar introspection GraphQL: `{ __type(name: "ChangeLog") { fields { name } } }` no incluye `comment` Y `{ __type(name: "WorkflowTransitionHistory") { fields { name } } }` SI incluye `comment` | REQ-IMPROVE-01, REQ-PRESERVE-02 | developer | S1.T6 | (om dev restart + curl graphql introspection) | introspection JSON validado | restart om + revert si introspection broken | DET-5, DET-13 | pending | 1 |
| **S1.GATE** | **Gate de sync Session 1 (tier: T2)** — persistir resultados en `## Sessions` del ticket usando Template de Gate. Quality review DET-23 dimensiones 1/2/3/4/6/7/10 + n/a 5/8/9. Decidir continue/iterate/escalate | — | reviewer | S1.T1..S1.T7 | tickets/ticket-029.md | gate persistido + decision documentada + TCs S1 registrados inline (DET-25) | (no aplica — cierre de session) | DET-20, DET-23, DET-25 | pending | 1 |

### Session 2 — Layouts sin columna Comentario + smoke UI [tipo: ⚑ fuerte] [tier: T3]

> **Objetivo**: editar los 10 layouts, correr tests integration completos + smoke UI manual en sandbox UPU (Activity + 1 RT curricularSection + lista global). Gate fuerte por ser cambio user-facing.

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S2.T1 | Editar 10 layouts removiendo la entry `{ "key": "comment", ... }` del array `columns` de cada uno. Verificar no quedar coma huerfana al final del array | REQ-IMPROVE-02 | developer | S1.GATE | 10 archivos en mods/curriculum-design/config/layouts/ (ver Changes seccion Modified layouts) | grep `'"comment"'` en config/layouts/ retorna 0 matches | git revert | DET-5, DET-8, DET-11, DET-16 | pending | 2 |
| S2.T2 | Ejecutar `npm run sync` para propagar layouts al core workspace + restart suite dev si hot-reload no detecta | REQ-IMPROVE-02 | developer | S2.T1 | (sync layouts phase) | exit 0 + layouts visibles en suite | git revert + re-sync | DET-5 | pending | 2 |
| S2.T3 | Tests integration: ejecutar `npm test --workspace=@uplanner/object-management-backend -- auditCapture` + verificar pass. Si falla por algun assertion sobre `comment`, agregar TC nuevo que valide ausencia del field post-fix | REQ-PRESERVE-01 | developer | S2.T2 | mods/curriculum-design/tests/unit/auditCapture.test.js (posible nueva assertion) | tests pasan + coverage delta no degrada | git revert + analizar regresion | DET-7, DET-13, DET-23 | pending | 2 |
| S2.T4 | Smoke UI manual en sandbox UPU: abrir Activity > tab Historial + abrir EvaluationComponent > tab Historial + abrir lista global default_changeLog_list. Capturar screenshot por cada vista en `tickets/TICKET-029.screenshots/` (nombrar TICKET-029-historial-{vista}.png) | REQ-PRESERVE-03, REQ-IMPROVE-02 | reviewer | S2.T3 | (screenshots + ticket markdown) | 3 screenshots con tabla renderizada sin columna Comentario, sin errores en consola | git revert + reportar regresion visual | DET-13, DET-23 | pending | 2 |
| **S2.GATE** | **Gate de sync Session 2 (tier: T3) ⚑ fuerte** — persistir resultados en `## Sessions` del ticket, ejecutar Quality review DET-23 con 10 dimensiones (8 a11y + 9 storybook n/a, resto evaluables), correr regression completa, requiere aprobacion humana explicita antes de cerrar el ticket | — | reviewer | S2.T1..S2.T4 | tickets/ticket-029.md | gate persistido + decision humana explicita + TCs S2 registrados inline (DET-25) + screenshots vinculados | (no aplica — cierre de session) | DET-20, DET-23, DET-25 | pending | 2 |

### Task contracts (detalle ampliado)

Por brevedad, los contracts arriba estan en formato compacto en la tabla. Notas adicionales por task:

- **S1.T1**: si count = 0 → continue auto sin escalar. Si 0 < count <= 10 → continue documentando los IDs en el ticket. Si count > 10 → pausar y escalar al dev humano.
- **S1.T3**: el resolver tiene `import { withTenantContext } from '...'` y otros patterns del mod — preservar imports/exports, solo eliminar las 4 lineas + el select + 3 comentarios obsoletos.
- **S1.T4 + S1.T5**: orden critico — codegen genera schema Prisma, db push lo aplica a BD. Sin codegen el schema queda con la columna; sin push BD queda con columna huerfana. Verificar ambos.
- **S2.T1**: cada layout tiene la entry en formato distinto (single-line vs multi-line). Verificar JSON valido post-edit con `jq . <file>` o equivalente.
- **S2.T4**: smoke UI manual es no negociable — los tests integration validan resolver pero no el render del componente RecordList. Sin smoke UI no se cierra.

## Constraints

- **RULE-platform-005**: BD UP1 usa columnas camelCase quoted — aplica al SELECT COUNT de S1.T1 y a `\d "ChangeLog"` de S1.T5. Comillas dobles obligatorias.
- **RULE-platform-006**: Objects, layouts y GraphQL resolver types MUST usar PascalCase — verificar que ningun cambio rompe esta convencion (no se introduce lowercase nuevo).
- **DEC-LOCAL-01** (de este spec, abajo): mantener input `transitionContext.comment` en schema GraphQL del mutation.

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| `workflowTransitionHistory.comment` | internal (platform up1) | Source of truth del comment de transitions HU3 — debe seguir existiendo | low (no se toca, solo se preserva) |
| Prisma client generation (`@uplanner/object-management-backend`) | internal | Regenera tipos TypeScript del client post-codegen | low (auto via npm script) |
| BD UPU local (docker pg) | internal | Receptor del DROP COLUMN | medium (data productiva si count > 0) |
| Suite Apollo client cache | internal | Necesita refresh post-restart om | low (hard refresh suficiente) |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| `prisma db push` falla por constraint check existente sobre comment (improbable, field nullable) | low | medium (rollback de codegen + investigacion) | S1.T1 SELECT COUNT antes del push detecta data preexistente; ademas el field es nullable, sin constraint NOT NULL ni unique |
| Resolver auditCapture queda inconsistente con la BD si S1.T3 (resolver) se aplica antes de S1.T5 (Prisma push) | medium | high (prod broken si fuera prod) | orden secuencial estricto en S1; gate S1.GATE persiste resultados antes de continuar a S2 |
| Layouts editados generan JSON invalido (coma huerfana en columns array post-eliminar entry) | medium | medium (tab Historial no renderiza) | smoke UI obligatorio en S2.T4 + parse JSON con jq durante edit |
| Apollo client de suite mantiene cache con field comment post-restart om | low | low (hard refresh resuelve) | smoke UI con hard refresh explicito en S2.T4 |
| Tests integration existentes asumen `comment` en respuesta del query changeLog | medium | medium (suite test red) | S2.T3 detecta empirico + ajustar assertions si aplica |
| TICKET-029 toca codigo que TICKET-028 acaba de mergear (rebase intent casing) — conflicto de branch | low | low (merge conflict simple) | branch desde develop post-merge TICKET-028 — ya consolidado |

## Open questions

- [ ] **OQ1**: ¿queda algun resolver custom del platform (no del mod) que LEA `changeLog.comment` y rompe post-DROP? Verificar empirico en S1.T7 con introspection + grep en `object-manager/src/resolvers/` por `changeLog` o `ChangeLog.comment`.

## Decisions

### DEC-LOCAL-01: Preservar input `transitionContext.comment` en schema GraphQL del mutation `recordAuditEvent`

- **Contexto**: al eliminar `changeLog.comment`, evaluar si tambien eliminar el input `comment` del schema GraphQL del mutation `recordAuditEvent` (declarado en `auditCapture.schema.graphql:64`)
- **Drivers**: (a) breaking change del API GraphQL del mod afecta consumidores (flow n8n `flows/audit-capture.json`); (b) el input `comment` sigue siendo usado para persistir a `workflowTransitionHistory.comment` (HU3) — eliminarlo rompe la audit chain de transitions
- **Opcion elegida**: preservar el input `comment` en el schema GraphQL del mutation. El resolver lo recibe pero no lo persiste al changeLog — solo lo pass-through a wth via el workflow runtime
- **Alternativas**: eliminar el input del schema (rechazado: breaking change para consumers + perderia el comment de wth para transitions que requieren comment)
- **Consecuencias**: ganamos compatibilidad backward y preservacion de la audit chain HU3. Perdemos consistencia visual (el schema input tiene comment pero el output changeLog no — no aparente para consumers porque el resolver del mod nunca lee el output con `comment` del changeLog)
- **Session**: design (S0 implicito)

## Success metrics

| Metric | Current | Target | How to measure |
|--------|---------|--------|----------------|
| Columnas vacias en tab Historial | 1 ("Comentario" siempre vacio para DirectEdit + duplicado de wth para StateTransition) | 0 | inspeccion visual smoke UI S2.T4 |
| Filas changeLog con `comment` IS NOT NULL en UPU | N (medir en S1.T1) | 0 (post-DROP) | psql query antes/despues |
| Render time del tab Historial (no NFR critico — measurement informativo) | baseline (medible si interesa al dev) | <= baseline | DevTools Performance tab en smoke UI |

## Technical reference

### Estructura del object changeLog post-fix (16 properties → 15)

```json
{
  "title": "changeLog",
  "type": "object",
  "metadata": { ... },
  "properties": {
    "createdAt": { ... },
    "entityType": { ... },
    "entityId": { ... },
    "userId": { ... },
    "action": { ... },
    "source": { ... },
    "field": { ... },
    "oldValue": { ... },
    "newValue": { ... },
    "changeRequestId": { ... },
    "workflowTransitionHistoryId": { ... },
    "sourceRefId": { ... }
    // comment ELIMINADO
  }
}
```

### Snippet resolver auditCapture.resolver.js post-fix (caso StateTransition)

Antes (L500-505 aprox):

```javascript
const changeLogData = {
  // ...
  comment: input.transitionContext?.comment ?? wth.comment ?? null,
  // ...
};
await prisma.changeLog.create({ data: changeLogData });
```

Despues:

```javascript
const changeLogData = {
  // ...
  // L43: comment ELIMINADO — el comment canonico vive en wth.comment (HU3)
  // ...
};
await prisma.changeLog.create({ data: changeLogData });
```

### Comando de verificacion empirica end-to-end

```bash
cd /Users/edobacon/Workspace/uplanner/up1

# 1. Object JSON sin comment
grep '"comment"' mods/curriculum-design/objects/changeLog.json | wc -l  # esperado: 0

# 2. Resolver sin comment
grep -n 'comment' mods/curriculum-design/logic/auditCapture.resolver.js  # esperado: vacio

# 3. Schema Prisma: ChangeLog sin comment, WorkflowTransitionHistory CON comment
grep -A 20 'model ChangeLog' object-manager/prisma/UPU/schema.prisma | grep comment  # esperado: vacio
grep -A 20 'model WorkflowTransitionHistory' object-manager/prisma/UPU/schema.prisma | grep comment  # esperado: 1+ match

# 4. BD UPU: ChangeLog sin column, WorkflowTransitionHistory CON column
psql -c '\d "ChangeLog"' | grep comment  # esperado: vacio
psql -c '\d "WorkflowTransitionHistory"' | grep comment  # esperado: 1 match

# 5. Layouts sin entry comment
grep -r '"comment"' mods/curriculum-design/config/layouts/  # esperado: vacio
```

## Rules discovered

(pending — se llena durante execute si emergen rules nuevas)

## Bugs found

(pending)

## Acceptance checkpoints

- [ ] **Funcional**: scenarios de REQ-IMPROVE-01/02/03 + REQ-PRESERVE-01/02/03 pasan
- [ ] **Tests**: TC-1..TC-16 ejecutados, registrados inline en sessions (DET-25), Status pass
- [ ] **NFRs**: no aplican (improvement sin perf/availability targets criticos)
- [ ] **Rules**: RULE-platform-005 (SQL quoted) + RULE-platform-006 (PascalCase preservado) respetadas
- [ ] **Integration**: tests integration de auditCapture pasan sin regresion; suite render OK en smoke UI
- [ ] **Docs**: ticket markdown sessions completas con TCs registrados; teach-close en close (DET-22) o skipped con razon
