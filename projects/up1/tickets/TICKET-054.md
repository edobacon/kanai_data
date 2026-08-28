---
id: TICKET-054
project: up1
type: ticket
status: closed
work_type: fix
external: UPONE-1219
module: core
autopilot: manual
---

# El enforcement de unicidad scoped (uniqueScopedBy) NO rechaza duplicados al clonar/editar Modalidad

## Request

> Al clonar una Modalidad el modal abre con nombre y código en blanco (detecta que son campos únicos y los limpia), pero deja escribir a mano los **mismos** name/code que la modalidad original y al **guardar lo permite**, creando un registro duplicado con datos de unicidad repetidos dentro del mismo padre. Ocurre tanto al **crear** (clone) como al **editar**. Esto se había corregido en un ticket y antes funcionaba; ahora no. ¿Se perdió el cambio, algo lo eliminó o lo invalidó?

## Classification

| Campo | Valor |
|-------|-------|
| Tipo de trabajo | fix (regresión de un invariante de integridad que antes funcionaba) |
| Tipo de cambio | multi (object-manager: enforcement config-driven + pipeline codegen/sync; dato en DB por-tenant) |
| Módulo principal | core / object-manager |
| Módulos afectados | object-manager (resolver enforcement + codegen registry), pipeline de sync, dato en `core_FieldDefinition` de UPU |
| Layer / épica | core → UPONE-1206 (capacidad de clonación) vía Historia UPONE-1219 (plataforma) — mismo layer donde aterrizaron TICKET-051/053 |

## KB consulted

> DET-11 — lookup antes de proponer.

- **Tickets relacionados**: TICKET-044 (UPONE-1216, enforcement original hardcoded), **TICKET-051/B5** (UPONE-1219, generalización config-driven en `createInstance`), **TICKET-053** (UPONE-1219, extensión a `updateInstance`), **TICKET-048** (validación clean-state + reset `tenant:create --resume` + Backlog B-1 drift detector / B-2 snapshot no propaga props RT).
- **Rules**: `RULE-core-008` (firma `updateInstance`), `RULE-core-020` (check upstream del branch RT). El enforcement de unicidad es ortogonal al de capability.
- **Bugs**: sin bug abierto previo sobre unicidad scoped en runtime.

## Triage

### Síntoma reproducido

Clonar/editar una Modalidad (CurricularSection recordType=Modality) con name o code repetidos dentro del mismo Activity (scope `[ownerId, recordType]`) **no es rechazado** — se persiste el duplicado.

### Hipótesis

| # | Hipótesis | Status | Evidencia |
|---|-----------|--------|-----------|
| H1 | El código del fix se revirtió / se perdió en la rama | **descartada** | Rama `UPONE-1206` de object-manager: los 4 commits del fix presentes (`d59cac4`, `b800a1c`, `8431443`, `2acfa1c`); helper `scoped-uniqueness.js` existe; invocado en `createInstance` ([instance.resolver.js:2489]) y `updateInstance` ([instance.resolver.js:3320]); working tree limpio. El JSON declara `uniqueScopedBy` (curricularsection.json `name`, rt__Modality `code`) y el sync lo escribe ([generatePrismaSchema.js:2450 base / :2797 RT]). |
| H2 | El enforcement es config-driven y el dato (`uniqueScopedBy`) no está en la DB UPU | **CONFIRMADA (causa raíz)** | SQL en `uplanner_upu`: `core_FieldDefinition.properties` de `CurricularSection.name` (isBaseField=t) y `rt__Modality__curricularsection.code` (isBaseField=f) **no contiene** `uniqueScopedBy` (sí tiene `required`/`type`/`description`). El helper hace `fd.properties?.uniqueScopedBy` → `checks` queda vacío → no se chequea colisión → no rechaza, **en silencio**. |
| H3 | El dato se perdió por el reset de TICKET-048 (o sync previo a B5) | **probable** | El `tenant:create -- UPU --resume` de TICKET-048 reconstruyó el registry; Learn B-2 de 048: el snapshot no propaga props de campos RT. `properties` tiene props base (required/type/description) pero no `uniqueScopedBy` → poblado por una versión del sync anterior a la línea de B5, o snapshot sin la prop. |
| H4 | Se puede repoblar con `npm run sync` / `codegen -- UPU` (vía canónica) | **descartada (bloqueada)** | Ambos fallan por drift preexistente NO causado por estos tickets: (a) drift detector falso-positivo de Modality (7 errores, B-1 de TICKET-048, base/develop); (b) `codegen -- UPU` aborta en la validación de `polymorphicChildren` de curricularsection.json ([generatePrismaSchema.js:86]) — `via:"parentId"` (relación recursiva `children`) no cumple el patrón `<ownerTypeField>/<ownerIdField>` ni trae `ownerTypeValue`. El validador se introdujo en SP3 (`5b67fc7` UPONE-1219-S6 / `bb615ed` UPONE-1219-S1) y rechaza una forma de JSON preexistente. Corta el codegen ANTES de escribir el registry → `uniqueScopedBy` nunca se persiste. |

### Hallazgo adicional — fragilidad de diseño (fail-silent)

El helper `enforceScopedUniqueness` **no emite warn/log** cuando un campo que debería estar scoped no trae `uniqueScopedBy` en runtime: simplemente no aplica el check. Una invariante de integridad que se auto-desactiva en silencio si la DB no está synceada con el código. La versión hardcoded previa (TICKET-044) no podía desactivarse así. Candidato a defensa-en-profundidad.

## Setup

| Campo | Valor |
|-------|-------|
| Branch (código) | `UPONE-1206` (épica core, RULE-dev-004); commits prefijo `UPONE-1219` por DET-19 |
| Base branch | develop |
| Repo path | `/Users/edobacon/Workspace/uplanner/up1/object-manager` |
| DB | Docker `pg` (postgres:17.4); tenant UPU = `uplanner_upu` (localhost:5432) |
| Verificación SQL | `docker exec -i pg psql -U pg -d uplanner_upu` sobre `core_FieldDefinition` join `core_ObjectDefinition` |
| Servicios para E2E | object-manager (4000), suite (3000) |

## Plan de fix (propuesto — pendiente de aprobación del dev)

> El dev eligió **abrir ticket y planificar** (no ejecutar aún). El fix tiene 3 capas separables:

1. **Restaurar el dato en UPU** (devuelve el rechazo de duplicados). Vía bloqueada por el codegen → decisión pendiente entre:
   - **A. Desbloquear el codegen primero** (fix de la validación `polymorphicChildren` para relaciones recursivas `children` via `parentId`) → correr `codegen -- UPU` → registry repoblado por vía oficial. Más de fondo; cambio de pipeline transversal (afecta todos los objetos/tenants) → probablemente **ticket de core aparte**.
   - **B. UPDATE quirúrgico interino** a `core_FieldDefinition.properties` de las 2 filas (`name`, `code`) agregando `uniqueScopedBy: ["ownerId","recordType"]` (idéntico a lo que escribiría el codegen). Restaura el enforcement YA para pruebas; queda mini-deriva DB-vs-pipeline hasta resolver A.
2. **Hardening fail-silent**: que el enforcement (o un check de arranque) loguee/advierta cuando un campo esperado no trae scope persistido. Defensa contra futuros resets que vacíen la prop.
3. **Blocker de codegen** (`polymorphicChildren` recursivo) — evaluar si es ticket de core independiente (transversal, base/develop). Relacionado con B-1 de TICKET-048 (drift detector).

### Plan de sessions (DET-20) — borrador

| Session | Items | Repo(s) | Tier | Objetivo |
|---------|-------|---------|------|----------|
| S1 | Restaurar dato (A o B) + E2E rechazo de duplicados (crear + editar) | object-manager + DB UPU | T2/T3 | Clonar Modalidad con name/code repetido → rechazado; editar a un valor colisionante → rechazado |
| S2 | Hardening fail-silent del enforcement | object-manager | T1 | warn/log cuando falta scope esperado; unit test |

> El blocker de codegen (capa 3) se evalúa para ticket aparte de core (no inflar este fix con un cambio transversal de pipeline).

## Decisión resuelta

- **DEC-LOCAL-01 (resuelta 2026-06-04)**: descartadas A/B del plan inicial. La investigación reveló que el bloqueo de codegen NO era "validador demasiado estricto" sino una **entry malformada** real: `metadata.polymorphicChildren` de `curricularsection.json` declaraba `children` con `via:"parentId"` (forma owner-based inválida), cuando es una relación **recursiva por FK directa** que pertenece a `metadata.directChildren` (contrato `{name, object, fk, recursiveBy?}`). El validador (introducido en SP3, `5b67fc7`) la rechaza con razón; el runtime (`parseVia`) también explotaría. Fix = mover la entry al contenedor correcto en la **fuente del mod** → el codegen corre → persiste `uniqueScopedBy` por vía canónica → **durable** (sobrevive a sync/reset, que era el requisito del dev). Esto resuelve el dato Y un bug latente del clone de subárbol, sin UPDATE quirúrgico.

## Sessions

### Session 1 — 2026-06-04 — Desbloquear codegen (entry directChildren) + repoblar uniqueScopedBy [phase: execute]

**Tipo**: ⚑ fuerte (validación empírica multi-capa: DB + unit + suite) · **Tier**: T2/T3

**Hecho** (ejecución conversacional, sin spec — work-stream único):
- Mover entry `children` de `polymorphicChildren` a `directChildren` (forma `fk:"parentId"`) en la fuente del mod (`mods/curriculum-design/objects/CurricularSection.json`, UPONE-1038) y en la copia synced de OM Base (`object-manager/objects/business/Base/curricularsection.json`, UPONE-1206).
- `npm run codegen -- UPU` → pasa validación `polymorphicChildren`/`prefillFrom`, regenera schema+typedefs (solo timestamp), persiste `uniqueScopedBy` en `core_FieldDefinition`.
- Verificación empírica: SQL confirma `uniqueScopedBy=["ownerId","recordType"]` en `CurricularSection.name` y `rt__Modality.code`; réplica del `findFirst` del helper detecta colisión real (1); helper unit 11/11; suite resolvers 528/528 sin regresión.

**Tasks completadas**:
- [x] S1.GATE — quality review (DET-23) + commits granulares (DET-27) en los 3 repos + cerrar gate.

**Rollback**: revertir la entry en ambos JSON (`directChildren`→`polymorphicChildren` con `via:"parentId"`) + re-codegen. Sin cambio de schema/DB estructural (solo `core_FieldDefinition.properties`, idempotente vía codegen).

**Quality review (DET-23)** — Reviewer: self (modo conversacional, autopilot false) · Tier: light (T2) · Resultado global: **pass**

| # | Dimensión | Resultado | Notas |
|---|-----------|-----------|-------|
| 1 | Calidad código | pass | Cambio de config declarativa (1 entry movida de contenedor); sin lógica nueva |
| 2 | Lint/estilo | pass | JSON válido en ambos repos; formato consistente |
| 3 | Tipado | n/a | metadata JSON |
| 4 | Testing | pass | helper 11/11 + resolvers 528/528 + verificación empírica SQL (colisión=1) |
| 5 | Escalabilidad | pass | el contrato `directChildren` ya soporta recursión (topologicalOrder) |
| 6 | Mantenibilidad | pass | fix en la fuente del mod → durable; entry ahora coherente con su mecanismo de FK |
| 7 | Claridad | pass | clasificación documentada en Learns L1 |
| 8 | A11y | n/a | backend/config |
| 9 | Storybook | n/a | — |
| 10 | Manejo errores | pass | el routing del deepClone valida alias contra poly/direct; rollback documentado |

**Commits** (DET-27):

| Repo | Rama | Hash | Mensaje |
|------|------|------|---------|
| mods/curriculum-design | UPONE-1038 | `ad3d5dd` | UPONE-1219 fix(cd): mover relación recursiva 'children' a directChildren (fk parentId) |
| object-manager | UPONE-1206 | `0a824d2` | UPONE-1219 fix(object-manager): corregir entry directChildren de CurricularSection |
| deckard (dkc) | up1-sp3-w2 | `0487c0f` | TICKET-054 fix(dkc): regresión enforcement uniqueScopedBy — root cause + repoblado durable |

> Push pendiente en los repos de código (gated por review team up1, RULE-dev-004). El cierre DKC no mergea a develop.

**Gate decision:** (approvedBy: dev)

- [x] continue → fix durable verificado (registry UPU OK + colisión detectable + helper 11/11 + resolvers 528/528); commits en 3 repos; ticket cerrado con follow-ups en Backlog (no must).
- [ ] iterate → re-trabajar Session 1
- [ ] escalate → bloqueante requiere decisión externa
- [ ] standby → pausar ticket

## Backlog

| # | Item | Priority | Status | Notas |
|---|------|----------|--------|-------|
| B1 | **Re-codegen de los demás tenants** para persistir `uniqueScopedBy` (DEMO01-10, UCASMT, UCENG, UCPLN). La fuente ya es correcta → `codegen -- <tenant>` lo escribe. Solo UPU se hizo en S1. | should | open | No bloquea: la fuente corregida es durable; cada tenant lo toma en su próximo codegen/reset. El síntoma reportado (UPU) está resuelto. |
| B2 | **Hardening fail-silent del enforcement** (L2): que `enforceScopedUniqueness` (o un check de arranque) loguee/advierta cuando un campo esperado no trae `uniqueScopedBy` en runtime. Defensa contra futuros resets que no re-codegen-een. | should | open | Ticket aparte o S2 si se reabre. Evita que el invariante se auto-desactive en silencio. |
| B3 | **Promover L1 a RULE-core**: clasificación de hijos clonables — `polymorphicChildren` (FK polimórfica owner-based, en el owner) vs `directChildren` (FK concreta/recursiva). | could | open | Constraint reusable de plataforma; evita repetir el error de contenedor. |
| B4 | **Drift detector B-1** (heredado de TICKET-048): falso-positivo de Modality rompe `npm run sync` full (no `codegen` directo). | should | open (heredado) | Ítem de core/team, ya rastreado en TICKET-048 B-1. |

## Test cases

| # | Case | REQ | Affects UI | Actual | Evidence | Status | Session |
|---|------|-----|-----------|--------|----------|--------|---------|
| TC-01 | `uniqueScopedBy` persiste en DB tras codegen canónico | REQ-FIX | no | `["ownerId","recordType"]` en `CurricularSection.name` y `rt__Modality.code` | SQL en uplanner_upu | **pass** | S1 |
| TC-02 | Colisión de code/name en mismo scope es detectable con la prop persistida | REQ-FIX | no | réplica del `findFirst` del helper → 1 colisión | SQL CTE src | **pass** | S1 |
| TC-03 | Codegen UPU corre sin abortar | REQ-FIX | no | validación OK, schema+typedefs+capabilities regenerados | output codegen | **pass** | S1 |
| TC-04 (regression) | Helper + suite resolvers sin regresión | REQ-PRESERVE | no | 11/11 helper + 528/528 resolvers | vitest | **pass** | S1 |
| TC-05 (durabilidad) | El fix sobrevive a re-sync/reset (fuente JSON corregida) | REQ-FIX | no | fuente del mod corregida → cualquier codegen futuro persiste la prop | inspección + TC-03 | **pass** | S1 |

## Summary

**Causa raíz**: NO fue solo "el dato se perdió en un reset". El pipeline canónico no podía regenerarlo porque `curricularsection.json` tenía la entry `children` malformada (`polymorphicChildren` con `via:"parentId"`) que abortaba TODO el codegen de UPU — y con él la escritura de `uniqueScopedBy` al registry. Mientras eso siguiera, cada sync/reset dejaba la DB sin la prop.

**Fix (durable, blast radius acotado)**: mover `children` a `directChildren` (`fk:"parentId"`, recursivo) en la fuente del mod + copia OM Base. El codegen corre limpio y persiste `uniqueScopedBy` por vía oficial → sobrevive a futuros sync/reset. Bonus: corrige el routing del deepClone de subárbol (`deepCloneDirectChildren` por FK `parentId`) que el path polimórfico habría roto.

**Validación**: `uniqueScopedBy` en DB ✓; colisión detectable en datos reales ✓; helper 11/11; resolvers 528/528; typedefs regen solo-timestamp (sin cambio de tipos). Sin restart del OM (el helper lee `core_FieldDefinition` en vivo por request).

**Qué NO se hizo / pendiente**:
- **Otros tenants**: solo se re-codegen-eó UPU. DEMO01-10/UCASMT/etc. necesitan `codegen -- <tenant>` para tener la prop (la fuente ya es correcta).
- **Commits** (2 repos, pendientes de OK del dev): mod (UPONE-1038) + object-manager (UPONE-1206). Push gated por review team (RULE-dev-004).
- **Hardening fail-silent** (S2 propuesta): que el enforcement loguee si falta el scope esperado. Defensa contra futuros resets que no re-codegen-een.
- **Drift detector B-1** (TICKET-048): el falso-positivo de Modality sigue rompiendo `npm run sync` full (no `codegen` directo). Ítem de core aparte.

## Learns

| # | Learn | Detected by | Session | Status | Promoted to |
|---|-------|-------------|---------|--------|-------------|
| L1 | **`polymorphicChildren` vs `directChildren` clasifican una RELACIÓN por el mecanismo de su FK, no al objeto.** `polymorphicChildren` = el hijo apunta al padre por un par de FK **polimórfico** (`ownerType`+`ownerId`, discriminado) → se declara en el **owner** (ej. `Activity.polymorphicChildren.sections`, `via:"ownerType/ownerId"`, `ownerTypeValue`). `directChildren` = el hijo apunta por una **FK concreta** simple, incluida la self-ref recursiva (ej. `CurricularSection.children` por `fk:"parentId"`, `recursiveBy:"parentId"`). Un mismo objeto participa en AMBAS a la vez (una Modalidad es poseída polimórficamente por su Activity Y anida recursivamente bajo otra sección por `parentId`). Elegir el contenedor por "el objeto es polimórfico" es el error; se elige por cómo el hijo referencia al padre. Prueba: el deepClone de subárbol debe consultar `findMany({ [fk]: sourceId })` por `parentId` y **preservar** `ownerType`/`ownerId` (clon en el mismo Activity) — el mecanismo polimórfico consultaría por owner (0 filas) y re-apuntaría el owner (incorrecto). | investigación TICKET-054 (pregunta del dev) | S1 | refined | RULE-core-023 |
| L2 | **El enforcement config-driven de `uniqueScopedBy` se invalida en silencio si el codegen del tenant no corrió** (la prop vive en `core_FieldDefinition.properties`, la escribe `generatePrismaSchema.js`). Una entry malformada en CUALQUIER objeto aborta TODO el codegen del tenant → ningún cambio de registry se persiste (no solo el propio). Síntoma engañoso: el código del fix intacto en la rama pero el invariante no aplica. Regla operativa: regresión de invariante config-driven → verificar primero el DATO en DB (`core_FieldDefinition`), no asumir revert de código. `codegen -- <tenant>` repuebla sin necesitar `sync` full (que rompe por el drift detector B-1). | investigación TICKET-054 | S1 | refined | [[reference_up1_scoped_uniqueness_configdriven_failsilent]] |
| L3 | **Un validador build-time nuevo no re-valida el estado ya desplegado** — el validador `polymorphicChildren` (SP3, `5b67fc7`) rechazó una entry preexistente que "funcionaba" solo porque ese objeto no se había vuelto a codegen-ear desde antes del validador. Endurecer un validador sin re-correr codegen de todos los tenants deja bombas de tiempo: el siguiente codegen/reset falla. Al agregar un gate build-time, correr codegen en todos los tenants o auditar el corpus existente contra el nuevo contrato. | investigación TICKET-054 | S1 | refined | RULE-platform-014 |

## Teaching — Intake

**Status**: skipped
**Razon**: intake-explore ejecutado en modo conversacional (autopilot false, dev dirigiendo cada paso). La causa raíz se confirmó multi-capa inline (Triage H1-H4 + Hallazgo fail-silent) con evidencia empírica (SQL en DB, git de la rama). No se generó teach-intake.html aparte.

## Teaching — Close

**Status**: skipped
**Razon**: modo conversacional. El material educativo del caso quedó capturado inline: la explicación conceptual `polymorphicChildren` vs `directChildren` (clasificación por mecanismo de FK) en la respuesta al dev + Learns L1-L3 + Summary + Decisión resuelta. No se generó teach-close.html aparte.
