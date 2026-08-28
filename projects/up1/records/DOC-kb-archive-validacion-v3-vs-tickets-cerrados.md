---
id: DOC-kb-archive-validacion-v3-vs-tickets-cerrados
project: up1
type: doc
---

# Validacion v3 contra tickets cerrados de up1 SP3

| Campo | Valor |
|---|---|
| **Autor** | Eduardo Bacon |
| **Fecha** | 2026-05-26 |
| **Proposito** | Verificar que los 8 IMPs propuestos en `diseño-versionamiento_v3.md` NO contradicen lo implementado y cerrado en tickets de SP3 (TICKET-006, 009, 018, 019, 020, 030, 031, 032). |
| **Metodologia** | Cross-reference de cada IMP contra: (a) AC verbatim del ticket cerrado, (b) RULEs promovidas, (c) DECISIONs aceptadas, (d) consumers reales en codigo del mod. |

---

## Resumen ejecutivo

| IMP | Estado | Friccion con SP3 cerrado | Accion v3 |
|-----|--------|--------------------------|------------|
| **IMP-1** (version Int + versionLabel) | **Extiende** | TICKET-006 cerro con `version: String`. CAP-CUR-018 dice codificacion libre. | OK — agrega Int sin perder libertad (via `versionLabel`). Documentar como evolucion del modelo, citar CAP-CUR-018. |
| **IMP-2** (APR state en activity-standard) | **Aditivo** | TICKET-018 cerro con 9 statuses (APR incluido como WorkflowStatus) pero solo activo en `curriculumPlan-standard`. activity-standard quedo con 5 transitions sin APR. | OK — agregar 2 transiciones al seed (REV-DEC→APR, APR→PUB). Decision PM sobre coexistencia con "Aprobar y publicar". |
| **IMP-3** (rename sourceRefId → parentChildRefId) | **Rompe** | TICKET-020 cerro con `sourceRefId` listado VERBATIM en AC del ticket UPONE-1098 + promovido como **patron L40 en PATTERNS.md** + consumido en 2 layouts user-facing + 5 docs + i18n + tests. | **Reconsiderar**. El rename ataca un patron documentado y user-facing. Recomendacion: **mantener `sourceRefId` para L40, agregar campo nuevo `versionSourceId`** (modelo v2 — esta validacion lo confirma). |
| **IMP-4** (codegen polymorphicChildren) | **Aditivo** | Sin precedente. TICKET-006/009 establecieron polimorfismo abierto via ownerType/ownerId. IMP-4 agrega capacidad declarativa de lectura sin tocar el modelo. | OK — feature platform nuevo. Spike P3.4 valida viabilidad. |
| **IMP-5** (codegen self-refs auto) | **Aditivo** | Sin precedente que contradiga. Patrones reflexivos existen via declaracion manual. | OK — convenience feature. |
| **IMP-6** (SET NOT NULL workflowId/currentStatusId) | **Cierra deferral** | TICKET-019 documenta explicito: *"Nullable hasta S14, luego SET NOT NULL"*. S14 fue reusado para otra cosa — la migracion quedo pendiente. | OK — cierra deuda intencional documentada. NO es cambio de direccion. |
| **IMP-7** (KB rename AcademicActivity → Activity) | **Aditivo** | TICKET-019 renombro en codigo. KB lag es deuda documental conocida. | OK — pura limpieza de docs. |
| **IMP-8** (Clone en enum action) | **Rompe (parcial)** | TICKET-020 AC2 verbatim del ticket UPONE-1098 lista 7 valores en `action`. changeLog.json description dice "7 valores per AC2 (verbatim)". | Requiere aprobacion PM/Esteban — verbatim del ticket externo se extiende. Bajo riesgo tecnico, pero cambia el contrato verbatim. |

**Conclusion**: de 8 IMPs, **6 son seguros** (clear/aditivo/cierre de deferral) y **2 requieren reconsideracion** (IMP-3 toca patron documentado, IMP-8 extiende contrato verbatim).

---

## Detalle por IMP

### IMP-1 — Migrar `version` a Int + agregar `versionLabel: String`

**Lo que dice SP3 cerrado:**

- **TICKET-006** (cerrado, modelo base): lista `version` entre los 13 campos de AcademicActivity sin especificar tipo en el verbatim. Implementacion: `String`.
- **Spec** `programa-de-asignatura.md:245`: *"`version` | string | Cadena libre (ej: 'v2022-actual', 'v2')"*.
- **CAP-CUR-018** verbatim Confluence: *"La codificacion de version es libre (codigo de periodo academico, año, secuencial, u otro esquema)"*.
- **Seed UPU** (`_data-univalle.js:18`, `_data-aiep.js:18`): `PROGRAMA_VERSION = 'v2022-actual'`.

**Friccion con IMP-1:**

- Cambiar `version: String → Int` contradice la implementacion de TICKET-006.
- Pero IMP-1 introduce `versionLabel: String?` que **conserva** la codificacion libre. La libertad NO se pierde — se mueve a otro campo.
- CAP-CUR-018 hablaba de "codificacion libre" como concepto del usuario; el campo `version` puede ser numerico interno + `versionLabel` libre externo.

**Compatibilidad**:

- BR-VER-001 ("cadena de versiones encadenadas") — preservada.
- Spec `programa-de-asignatura.md` requiere update (no es ticket cerrado, es spec viva).

**Veredicto**: **Extiende sin romper**. Requiere update de spec viva + Confluence (P3.1). No contradice TICKET-006 cerrado; reinterpreta el modelo.

**Accion en v3**: mantener IMP-1 como propuesto. Agregar a HU-0a un AC explicito: *"Update Confluence CAP-CUR-018 + spec `programa-de-asignatura.md` para reflejar la dualidad `version`/`versionLabel`. Coordinar con Esteban."*

---

### IMP-2 — Agregar transiciones APR al workflow `activity-standard`

**Lo que dice SP3 cerrado:**

- **TICKET-018** (cerrado, workflow platform): seedea 9 workflowStatus en BD UPU, incluyendo `APR | Aprobado | Published`.
- Seed activity-standard tiene 5+ transiciones: `BOR→EDIT, EDIT→REV-DEC, EDIT→BOR, REV-DEC→EDIT, REV-DEC→PUB ("Aprobar y publicar"), PUB→DIS`.
- `APR` esta seedeado como status PERO solo activo en `curriculumPlan-standard` (EVAL→APR) y `changeRequest-standard` (EVAL→APR).

**Friccion con IMP-2:**

- Cero a nivel de schema/data: `APR` ya existe en BD UPU. Solo falta cablearlo en activity-standard.
- A nivel de PM: el seed actual usa "Aprobar y publicar" como UNA transicion (REV-DEC→PUB). IMP-2 propone SPLIT a dos pasos (REV-DEC→APR→PUB).
- DECISION-005 original proponia `[Draft, Review, Approved, Published, OpenForEdit, Deprecated]` — el `Approved` separado era parte del modelo original.

**Decision PM pendiente (P3.2)**: ¿el split rompe la transicion combinada o coexiste como atajo?

**Compatibilidad**:

- Aditivo si la combinada coexiste: ambas paths disponibles, el usuario elige.
- Si se elimina la combinada: cambia el flujo de aprobacion productivo. PM debe firmar.

**Veredicto**: **Aditivo** con decision PM menor. No contradice TICKET-018 cerrado — extiende activity-standard con statuses ya disponibles.

**Accion en v3**: HU-0b queda como propuesta con P3.2 explicito.

---

### IMP-3 — Renombrar `sourceRefId` → `parentChildRefId` en changeLog

**Lo que dice SP3 cerrado:**

- **TICKET-020** (cerrado, audit chain) line 73 lista los 12 properties de changeLog VERBATIM:
  > *"id, entityType, entityId, userId, action (...), source (...), field/oldValue/newValue, changeRequestId, workflowTransitionHistoryId, **sourceRefId**, comment, createdAt"*.
- **PATTERNS.md** del mod tiene seccion "ChangeLog audit — registro universal de cambios" que documenta **patron L40** (consolidacion al padre) usando explicitamente `sourceRefId`/`sourceRefName`/`sourceRefType` como nombres canonicos del patron.
- **changeLog.json description** dice literal: *"12 properties: ... sourceRefId ..."* + *"7 valores per AC2 del ticket UPONE-1098 (verbatim)"*.
- **Consumers reales en codigo del mod**:

  | Archivo | Refs |
  |---------|------|
  | `config/layouts/default_ChangeLog_list.json` | 2 (columnas user-facing) |
  | `config/layouts/default_Activity_view.json` | 1 (`sourceRefType` como columna "Seccion" en tab Historial) |
  | `lang/es_CL@changeLog.json` | 1 (i18n column title) |
  | `.ai/PATTERNS.md` | 3 (documentacion del patron L40) |
  | `docs/architecture/audit-chain-hu2.md` | 4 (arquitectura HU2) |
  | `tests/integration/auditCapture-handlers.test.ts` | 3 (test assertions) |
  | `logic/auditCapture.resolver.js` | multiple (resolver del patron) |
  | `flows/audit-capture.json` | (pass-through del payload) |

**Friccion con IMP-3:**

El rename toca:
1. **AC verbatim** del ticket externo UPONE-1098 (publicado en Jira).
2. **Patron documentado y promovido** en `PATTERNS.md` como receta para futuros mods auditables.
3. **2 layouts user-facing** — la columna "Seccion" del tab Historial usa `sourceRefType`.
4. **Documentacion arquitectural** (`audit-chain-hu2.md`) con 4 menciones del nombre.
5. **i18n del mod** — la traduccion de "Seccion" mapea al field `sourceRefType`.
6. **Tests integration** que assertan en el field name.

**Riesgo**: alto. No es solo rename de schema — es rename de un **contrato documentado** y **consumido por UI**. Si despues otro mod adopta el patron L40 mirando PATTERNS.md, encontraria el nombre nuevo. Si una integracion externa lee el changeLog API, encontraria un campo distinto.

**Veredicto**: **Rompe contrato verbatim + patron promovido**. NO recomendado para SP4. La ganancia (liberar `sourceRefId` para clone provenance) es estetica; el costo es real.

**Accion en v3**: **revertir IMP-3** al fallback v2 — **agregar campo NUEVO `versionSourceId`** en changeLog.json (sin tocar `sourceRefId` ni el patron L40). Esto:

- Preserva el AC verbatim de TICKET-020.
- Preserva el patron L40 en PATTERNS.md sin cambios.
- Preserva los layouts user-facing.
- Preserva i18n.
- Preserva tests.
- Costo: 1 campo nuevo en lugar de rename. Audit chain queda con 2 campos similares pero **semanticamente distintos** (documentar inline en JSON description).

Si en algun SP futuro el equipo decide que la convivencia de 2 campos es indeseable, **ese sera un ticket dedicado de housekeeping** con todos sus mitigantes (deprecation period, dual-write, etc.) — no parte de SP4.

---

### IMP-4 — Codegen `polymorphicChildren` (lectura)

**Lo que dice SP3 cerrado:**

- **TICKET-006** (cerrado): CurricularSection se modelo con FK polimorfica abierta (`ownerType` + `ownerId`).
- **DECISION-006**: custom-section-fixed-rt (no toca polimorfismo de CurricularSection).
- **DECISION-007**: recordtypes-global (idem).
- No hay precedente de capacidad declarativa `polymorphicChildren` en codegen — es feature nuevo.

**Friccion con IMP-4:**

- Cero contradiccion. El feature lee el patron polimorfico abierto y lo expone declarativamente.
- No modifica datos ni schema de CurricularSection — solo agrega un alias virtual en Activity.

**Veredicto**: **Aditivo**. Feature platform nuevo, sin precedente que contradiga.

**Accion en v3**: HU-0d procede tras spike P3.4 (validar viabilidad).

---

### IMP-5 — Codegen auto-declara self-references reflexivas

**Lo que dice SP3 cerrado:**

- **TICKET-006** y **TICKET-019**: declararon `previousVersionId` como string libre (sin `isForeignKey`). No hay rule que prohiba auto-inferencia.
- Sin precedente que mande declaracion manual.

**Friccion con IMP-5:**

- Cero. Es convenience feature que detecta un patron y genera codigo Prisma.
- Idempotente — no rompe declaraciones explicitas existentes.

**Veredicto**: **Aditivo**.

**Accion en v3**: HU-0e procede.

---

### IMP-6 — SET NOT NULL en `workflowId` / `currentStatusId`

**Lo que dice SP3 cerrado:**

- **TICKET-019** (HU4 rename + workflow integration) — comments inline en `activity.json:90,100`:
  > *"Workflow asignado al activity para gobernar transiciones de estado (HU3+HU4). Nullable hasta S14 (post-migracion de instancias en UPU), luego SET NOT NULL."*
  > *"Estado actual del activity en su workflow. ... Nullable hasta S14, luego SET NOT NULL."*
- **TICKET-019 plan de sessions** ([ticket-019.md:445-459](tickets/ticket-019.md)) — el slot S14 fue **reutilizado** para "Analisis platform deps + diseño alternativa pure-mod (emergente, no planificado)" cuando el SET NOT NULL real quedo deferred. Ver: *"S14 ad-hoc agrega ~2h"*.
- **S15 ejecutado**: migracion de las 2 instancias UPU pre-existentes para poblar `workflowId` + `currentStatusId`. Las FKs estan pobladas en BD.

**Friccion con IMP-6:**

- Cero. SET NOT NULL era la **intencion documentada** desde TICKET-019. Solo no se ejecuto por reasignacion del slot S14.
- Las 2 instancias UPU ya tienen FKs pobladas — la migracion no requiere backfill.

**Veredicto**: **Cierra un deferral intencional documentado**. NO es cambio de direccion.

**Accion en v3**: HU-0f procede. Agregar referencia explicita en el ticket: "cierra el SET NOT NULL deferred de TICKET-019 S14".

---

### IMP-7 — Unificar KB `AcademicActivity → Activity`

**Lo que dice SP3 cerrado:**

- **TICKET-019** (cerrado, HU4 rename): renombro en CODIGO `academicActivity → Activity` (PascalCase).
- **TICKET-030/031** (cerrados, PascalCase fix): cerraron el casing en codigo.
- **KB Deckard** (`specs/curriculum-design/`): no fue refactorizado — sigue usando `AcademicActivity` en specs como `programa-de-asignatura.md`, `overview.md`, `legacy-examples.md`, `open-questions.md`, `business-rules/BR-*.md`, `capabilities/CAP-CUR-*.md`.

**Friccion con IMP-7:**

- Cero. Es housekeeping documental — el codigo ya esta migrado, el KB esta laggeado. La intencion del rename fue total; solo no se ejecuto en docs.

**Veredicto**: **Aditivo** (doc-only). No requiere aprobacion — es deuda documental que cualquier dev puede limpiar.

**Accion en v3**: HU-0g (parte 1) procede.

---

### IMP-8 — Agregar `"Clone"` al enum `action` de changeLog

**Lo que dice SP3 cerrado:**

- **TICKET-020** line 73 verbatim: *"action (Create/Update/Delete/StateTransition/MADSSync/Import/Restore)"* — 7 valores.
- **changeLog.json** description (post-TICKET-020 closure): literal *"7 valores per AC2 del ticket UPONE-1098 (verbatim)"*.
- Es un contrato externo (Jira AC2) literalmente citado en el codigo.

**Friccion con IMP-8:**

- Tecnicamente trivial: agregar 1 valor a un enum es backward compatible.
- Procedural: extiende un contrato verbatim de un ticket Jira ya cerrado. Cualquier consumer que asuma "exactamente 7 valores" (validaciones, dashboards, queries hardcoded) pierde garantia.
- Bajo riesgo de consumers reales: el enum es de uso interno del mod, no expuesto a integraciones externas conocidas.

**Veredicto**: **Rompe el contrato verbatim** procedural — no rompe nada tecnico, pero pisa el AC2 del ticket Jira UPONE-1098.

**Accion en v3**:

**Opcion A** (recomendada): **mantener IMP-8 con aprobacion PM explicita**. Esteban firma que el AC2 verbatim de UPONE-1098 se extiende a 8 valores (`+Clone`). Documentar la extension en el changeLog.json description: *"8 valores en SP4 — `Clone` agregado por SP4 versioning (extension del AC2 original con aprobacion Esteban YYYY-MM-DD)"*.

**Opcion B** (fallback v2): NO tocar el enum. Distinguir versioning de un Create scratch via campo nuevo `versionSourceId` (acompaña IMP-3 invertido). Audit row queda `action="Create", source=<canal>, versionSourceId=<sourceId>`.

**Recomendacion default v3**: opcion B si IMP-3 se revierte a v2 (como esta validacion sugiere). Si Esteban prefiere mantener IMP-8, opcion A.

---

## Recomendacion consolidada para v3 (post-validacion)

| IMP | Recomendacion final | Razon |
|-----|---------------------|--------|
| **IMP-1** | **Adoptar** (con update Confluence + spec) | Extiende sin romper. Libertad del codigo libre conservada via `versionLabel`. |
| **IMP-2** | **Adoptar** (con decision PM coexistencia) | Aditivo. APR ya seedeado. |
| **IMP-3** | **REVERTIR a v2 fallback** — agregar campo NUEVO `versionSourceId`, NO rename | Rompe contrato verbatim + patron promovido + UI consumers. Costo > beneficio. |
| **IMP-4** | **Adoptar (parcial, lectura)** | Aditivo platform. Spike valida. |
| **IMP-5** | **Adoptar** | Aditivo platform. |
| **IMP-6** | **Adoptar** | Cierra deferral intencional. |
| **IMP-7** | **Adoptar** | Housekeeping documental. |
| **IMP-8** | **Acoplar a IMP-3** — si IMP-3 revierte, IMP-8 tambien revierte | Si `versionSourceId` distingue versioning, no necesitamos extender enum `action`. |

**Subconjunto final v3 (post-validacion)**: **6 IMPs adoptados** (IMP-1, IMP-2, IMP-4, IMP-5, IMP-6, IMP-7) + 1 fallback v2 unificado (IMP-3 + IMP-8 → `versionSourceId` campo nuevo).

---

## Que cambia en los docs v3 tras esta validacion

### `cambios-versionamiento_v2-a-v3.md`

- IMP-3: marcar como **revertido a v2 fallback** con cita explicita a evidencia de SP3 (TICKET-020 + PATTERNS.md L40 + layouts user-facing).
- IMP-8: marcar como **revertido a v2 fallback** (acoplado a IMP-3).
- Tabla decisional final: 6 IMPs adoptados + 2 revertidos a v2.

### `diseño-versionamiento_v3.md`

- Seccion 7.2 Ladrillo 2: error y eventos vuelven a la version v2 (`versionSourceId` campo nuevo, no rename de `sourceRefId`).
- Seccion 8 D13: revertir — `"Clone"` NO se agrega al enum action.
- Seccion 13 Diff resumen: actualizar las 2 filas afectadas.
- Anexo 14 changeLog.json: agregar `versionSourceId` (como v2), NO rename de `sourceRefId`.

### `historias-sprint-4_v3.md`

- **HU-0c (rename audit fields)** — **eliminar** o transformar en HU `agregar campo versionSourceId en changeLog` (que es la HU-9 de v2).
- **HU-0g (KB rename + Clone action)** — mantener solo IMP-7 (KB rename). IMP-8 (Clone action) se elimina.
- HU-3, HU-6, HU-9 — vuelven al wording v2 (`versionSourceId`, `action=Create`).
- Track 0 cae de 7 HUs a 5 HUs (HU-0a, HU-0b, HU-0d, HU-0e, HU-0f, HU-0g-parcial).

**Esfuerzo SP4 post-validacion**: ~17-18 HUs (vs 20 propuestas en v3 original). Mas alineado a la capacidad real del sprint.

---

## Conclusion

v3 era **ambiciosa** y proponia limpiezas estructurales que un v3 honesto **no debe entregar sin friccion con SP3**. La validacion identifica que **6 de 8 IMPs** son seguros; **2 (IMP-3 e IMP-8)** rompen contratos verbatim o patrones documentados que SP3 acaba de cerrar.

La recomendacion es:

- **Generar `v3.1`** (o "v3 final") con los 6 IMPs validados + el fallback v2 para los 2 que rompen SP3.
- Mantener IMP-3/IMP-8 como **propuesta futura** (post-SP4) — un ticket dedicado de housekeeping del audit chain con todos sus mitigantes.

El vision de v1 se entrega **al ~90%** con los 6 IMPs adoptados:

- `versionStrategy: "increment"` ✓ (IMP-1)
- `allowedFromStates: ["APR", "PUB"]` ✓ (IMP-2)
- `"deepClone": ["sections"]` simple ✓ (IMP-4)
- FK reflexivo sin boilerplate ✓ (IMP-5)
- Sin defensive null ✓ (IMP-6)
- KB sin lag ✓ (IMP-7)

Lo unico que no se entrega: el audit row con `action=Clone, sourceRefId=X` cae al fallback v2 (`action=Create, sourceRefId=null, versionSourceId=X`). Menos elegante semanticamente, pero NO contradice SP3.

¿Procedemos con v3.1 que incorpora estas validaciones?
