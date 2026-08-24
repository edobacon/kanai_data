# Reporte de cambios — `diseño-versionamiento_v2` → `_v3.1`

| Campo | Valor |
|---|---|
| **Autor** | Eduardo Bacon |
| **Fecha** | 2026-05-26 |
| **Prisma** | **Implementacion primero**, **validado contra SP3 cerrado**. v2 acepto codigo/Confluence/KB como SOT inmutable y limito el diseño. v3.1 propone modificar la SOT donde se puede hacer **sin contradecir tickets cerrados** para acercarse al vision original v1. |
| **Reemplaza a** | `diseño-versionamiento_v2.md` |
| **Historico de exploracion** | `cambios-versionamiento_v2-a-v3.md` (8 IMPs propuestos) + `validacion-v3-vs-tickets-cerrados.md` (2 IMPs rechazados). v3.1 es el sintesis final tras validacion. |
| **Reporte previo (v1→v2)** | `cambios-versionamiento_v1-a-v2.md` (conservador, sin modificar SOT) |

---

## Filosofia del cambio v2 → v3.1

v2 aplico el principio "doc/codigo es SOT, ajusta el diseño". Esto produjo concesiones:

- `versionStrategy: "user-provided"` en vez de `"increment"` (porque `version` es String libre).
- `allowedFromStates: ["PUB"]` en vez de `["Approved", "Published"]` (porque Activity workflow no tiene APR).
- Sintaxis `deepClone` polimorfica compleja (porque CurricularSection usa FK polimorfica abierta).
- Defensive null handling (porque workflowId/currentStatusId son nullable).
- KB con lag `AcademicActivity` (porque las specs no se renombraron post-TICKET-019).
- Campo `versionSourceId` separado (porque `sourceRefId` esta tomado por el patron L40).

v3.1 propone **6 cambios en la SOT** (`IMP-1, IMP-2, IMP-4, IMP-5, IMP-6, IMP-7`) que eliminan **5 de las 6 concesiones** y entregan ~85% del vision original v1 con implementacion mas limpia.

La 6ta concesion (audit row con `action=Clone` vs `versionSourceId` separado) **no se intenta** en SP4 — tocar el audit chain SP3 cerrado tiene costo > beneficio (ver seccion "IMPs explorados y rechazados").

---

## IMP-1 — Migrar `version` a Int + introducir `versionLabel: String`

### Que cambia en SOT

- **Schema**: `Activity.version: Int` (antes `String`). Nuevo campo `Activity.versionLabel: String?` (display libre, ej. `"v2022-actual"`, `"Semestre 2026-1"`).
- **Confluence**: actualizar CAP-CUR-018. La cadena de version queda asi:
  - `version` (numerico, system-managed): garantiza orden y unicidad de la cadena.
  - `versionLabel` (texto libre, user-managed): preserva la codificacion institucional.
- **Seed**: `_data-univalle.js`, `_data-aiep.js` cambian `PROGRAMA_VERSION = 1` + `PROGRAMA_VERSION_LABEL = "v2022-actual"`.
- **Specs vivas**: `programa-de-asignatura.md`, `legacy-examples.md`.

### Que habilita

- `versionStrategy: "increment"` funciona naturalmente para Activity. v3.1 vuelve al diseño original de v1.
- Cadena ordenable: `getVersionChain` puede ordenar por `version` (Int) estable independiente de `createdAt`.
- Constraint "solo una version vigente por curso" (BR-VER-001) expresable como query indexada.
- Row action no necesita modal de input — incremento automatico.

### Compatibilidad con SP3 cerrado

- **TICKET-006** cerro con `version: String`. v3.1 reinterpreta — la "codificacion libre" de CAP-CUR-018 se preserva en `versionLabel`. No contradice la regla de negocio.
- Requiere update de specs vivas + Confluence (P3.1).

### Costo / Riesgo

Bajo / Bajo. 2 records seedeados, pre-produccion. Migracion + schema + form UI.

---

## IMP-2 — Agregar estado `APR` al workflow `activity-standard`

### Que cambia en SOT

- **Seed** (`_data-workflow-objects.js`): agregar transiciones en activity-standard:
  - `REV-DEC → APR` ("Aprobar", `requiresComment: false`)
  - `APR → PUB` ("Publicar", `requiresComment: false`)
  - Mantener `REV-DEC → PUB` ("Aprobar y publicar") como atajo coexistente (decision P3.2).

### Que habilita

- `allowedFromStates: ["APR", "PUB"]` como propuso v1.
- Granularidad de auditoria: registro distinto "fue aprobado" vs "fue publicado".
- Coherencia con el modelo del PM (DECISION-005 original + BR-WKF-001 cita `Approved` separado).

### Compatibilidad con SP3 cerrado

- **TICKET-018** cerro con 9 workflowStatus seedeados, incluyendo `APR | Aprobado | Published`. APR ya esta seedeado pero solo cableado en `curriculumPlan-standard` y `changeRequest-standard`.
- v3.1 solo agrega transiciones — aditivo. No contradice TICKET-018.

### Costo / Riesgo

Trivial / Muy bajo. 2 entries al seed + tests del seed. Decision P3.2 sobre coexistencia con "Aprobar y publicar".

---

## IMP-4 — Codegen soporta `polymorphicChildren` en JSON del object (parcial — lectura)

### Que cambia en SOT

- **Codegen del platform**: cuando un object declara `polymorphicChildren`:

  ```json
  "polymorphicChildren": [
    {
      "name": "sections",
      "object": "CurricularSection",
      "via": "ownerType/ownerId",
      "ownerTypeValue": "Activity"
    }
  ]
  ```

  el codegen genera:
  - Una entrada en el "relation map" interno del platform que `prefillFrom.deepClone` consulta.
  - (Opcional SP4) Un resolver virtual `Activity.sections` que hace `findMany({ where: { ownerType: "Activity", ownerId: parent.id } })`.

- **Activity.json**: declara `polymorphicChildren` (no mas sintaxis polimorfica verbosa en `prefillFrom`).
- **CurricularSection** mantiene su FK polimorfica abierta — el cambio es solo en como Activity LEE su lado de la relacion.
- **NO incluye `polymorphicChildrenDerived`** (remap de FKs internas tipo CurricularLink) — eso queda para SP5. Activity en SP4 usa hook custom temporal del mod para los CurricularLinks (HU-8b).

### Que habilita

- `prefillFrom.deepClone: ["sections"]` funciona como v1 proponia. La complejidad polimorfica vive **una sola vez** en el codegen, no en cada JSON.
- Futuros adoptantes (Syllabus, CurriculumPlan) se benefician sin escribir sintaxis polimorfica.
- Mantiene la flexibilidad del polimorfismo abierto (CurricularSection puede pertenecer a Activity, Syllabus, etc.).

### Compatibilidad con SP3 cerrado

- Aditivo platform. TICKET-006 y TICKET-009 establecieron polimorfismo abierto via `ownerType/ownerId` — IMP-4 lo lee, no lo modifica.

### Costo / Riesgo

Alto / Alto en cuanto a scope. Spike P3.3 (renumerado desde P3.4 del v3) lo valida.

---

## IMP-5 — Codegen auto-declara self-references reflexivas

### Que cambia en SOT

- **Codegen del platform**: cuando un field declara `references: "<MismoObjectName>"`, codegen auto-agrega `isForeignKey: true` implicito y genera `@relation` reflexivo en Prisma sin requerir el flag explicito en el JSON.

### Que habilita

- HU-8a no necesita boilerplate en `Activity.json` — `previousVersionId: { references: "Activity" }` basta.
- Mods futuros con linaje (`previousVersionId`, `parentId` en arboles) no requieren declaracion verbosa.
- HU-4 (validacion `linkageField FK reflexivo`) se simplifica.

### Compatibilidad con SP3 cerrado

- Aditivo platform. No hay rule que prohiba auto-inferencia. Idempotente — no rompe declaraciones explicitas existentes.

### Costo / Riesgo

Bajo / Bajo. Convenience feature en codegen.

---

## IMP-6 — `workflowId` / `currentStatusId` SET NOT NULL en Activity

### Que cambia en SOT

- **Migracion Prisma**: SET NOT NULL en `Activity.workflowId` y `Activity.currentStatusId`.
- **JSON** (`Activity.json`): actualizar `not_null: true` en ambos campos.
- Las descripciones que mencionan "nullable hasta S14" se actualizan — S14 quedo deferido y este IMP cierra el loop.

### Que habilita

- Resolver de versionamiento (HU3) sin defensive null handling.
- Visibilidad del row action (HU7) sin fail-closed defensivo — siempre hay un estado.
- Codigo del mod ya no defiende contra null en campos garantizados.

### Compatibilidad con SP3 cerrado

- **TICKET-019** documenta explicito en `activity.json:90,100`: *"Nullable hasta S14, luego SET NOT NULL"*. El slot S14 fue reusado para otra cosa — IMP-6 cierra un deferral intencional documentado. **NO es cambio de direccion**.
- S15 de TICKET-019 ya migro las 2 instancias UPU para poblar las FKs.

### Costo / Riesgo

Trivial / Muy bajo. Migracion Prisma + 2 not_null flags. Pre-check de filas null antes.

---

## IMP-7 — Unificar `AcademicActivity` → `Activity` en specs del KB

### Que cambia en SOT

- **Specs del mod en deckard** (`projects/up1/specs/curriculum-design/`): search-and-replace `AcademicActivity` → `Activity` en:
  - `overview.md`, `programa-de-asignatura.md`, `legacy-examples.md`, `open-questions.md`
  - `business-rules/BR-VER-*.md`, `business-rules/BR-WKF-*.md`
  - `capabilities/CAP-CUR-*.md`
- Mantener mencion historica del rename en una linea ("renombrado de AcademicActivity post-TICKET-019").

### Que habilita

- KB y codebase consistentes. Sin necesidad de "nota al pie" sobre KB lag.
- Reduce friccion para devs nuevos.

### Compatibilidad con SP3 cerrado

- **TICKET-019** y **TICKET-030** ya renombraron en codigo. v3.1 cierra el rename en docs. Pura limpieza documental.

### Costo / Riesgo

Trivial / Cero. Doc-only.

---

## Tabla decisional — los 6 IMPs adoptados

| # | Cambio | Costo | Riesgo | Compatibilidad SP3 | Recomendacion v3.1 |
|---|--------|-------|--------|---------------------|---------------------|
| **IMP-1** | `version` Int + `versionLabel` String | Bajo | Bajo | Extiende sin romper | **Adoptar** |
| **IMP-2** | Agregar `APR` al workflow Activity | Trivial | Muy bajo | Aditivo (APR ya seedeado) | **Adoptar** |
| **IMP-4** | Codegen `polymorphicChildren` (lectura) | Alto | Alto | Aditivo platform | **Adoptar tras spike** |
| **IMP-5** | Codegen auto self-refs | Bajo | Bajo | Aditivo platform | **Adoptar** |
| **IMP-6** | SET NOT NULL workflowId/currentStatusId | Trivial | Muy bajo | Cierra deferral intencional | **Adoptar** |
| **IMP-7** | KB rename `AcademicActivity → Activity` | Trivial | Cero | Housekeeping documental | **Adoptar** |

**Esfuerzo total track 0**: ~2-3 HUs entregables en semana 1 en paralelo con HU-1, HU-2, HU-4.

---

## IMPs explorados en v3 y rechazados en v3.1 (cita: `validacion-v3-vs-tickets-cerrados.md`)

Durante la exploracion v3 se propusieron 2 IMPs adicionales que la validacion encontro incompatibles con tickets SP3 cerrados:

### IMP-3 (rechazado) — rename `sourceRefId` → `parentChildRefId` en changeLog

**Por que se rechaza:**

- TICKET-020 AC verbatim de UPONE-1098 lista `sourceRefId` literalmente entre los 12 properties de changeLog.
- `mods/curriculum-design/.ai/PATTERNS.md` documenta el **patron L40** como receta promovida para futuros mods, usando `sourceRefId/Name/Type` como nombres canonicos.
- 2 layouts user-facing consumen los campos (`default_ChangeLog_list.json`, `default_Activity_view.json` — columna "Seccion" del tab Historial).
- 5 docs arquitecturales del mod, i18n, y tests integration referencian los nombres.

El rename ataca un contrato documentado y user-facing del audit chain que acaba de cerrar. Costo > beneficio.

**Fallback v3.1**: campo nuevo `versionSourceId` en changeLog (modelo v2). El patron L40 queda intacto con `sourceRefId/Name/Type`.

### IMP-8 (rechazado) — agregar `"Clone"` al enum `action`

**Por que se rechaza:**

- changeLog.json description dice literal: *"7 valores per AC2 del ticket UPONE-1098 (verbatim)"*. Agregar un 8vo valor pisa el AC2 verbatim de un ticket Jira cerrado.
- Esta acoplado a IMP-3. Si IMP-3 revierte, el discriminador `versionSourceId != null` cubre el caso — no se necesita extender enum.

**Fallback v3.1**: enum `action` queda con 7 valores. Consumidores filtran versioning por `versionSourceId != null`.

---

## Que se simplifica en v3.1 respecto a v2

| Aspecto | v2 (limitado por SOT) | v3.1 (con SOT modificada) |
|---------|-----------------------|----------------------------|
| `versionStrategy` para Activity | `user-provided` (con modal user-input) | `increment` (system-managed, sin modal) |
| `allowedFromStates` para Activity | `["PUB"]` (concesion) | `["APR", "PUB"]` (vision PM) |
| Sintaxis `deepClone` para sections | Polimorfica explicita en prefillFrom de Activity | `"deepClone": ["sections"]` simple (gracias a `polymorphicChildren` IMP-4) |
| FK reflexivo `previousVersionId` | HU8 declara `isForeignKey` explicito | Codegen lo infiere (IMP-5) |
| Manejo de FKs null en source | Defensive en HU3/HU7 | SET NOT NULL — sin defensa (IMP-6) |
| KB referencia `AcademicActivity` | Nota al pie sobre lag | Unificado (IMP-7) |
| Campo en changeLog para origen | `versionSourceId` campo nuevo | `versionSourceId` campo nuevo (igual que v2 — IMP-3 rechazado) |
| Audit row de version | `action="Create", versionSourceId=<sourceId>` | `action="Create", versionSourceId=<sourceId>` (igual que v2 — IMP-8 rechazado) |

**5 de 6 concesiones de v2 eliminadas**. La 6ta (audit `action=Clone`) se mantiene porque tocarla rompe SP3.

---

## Que se mantiene de v2 (independiente del prisma)

Algunos cambios v1 → v2 son correctos por evidencia factual y aplican en v3.1:

- **Correccion factual** — el doc no afirma "`duplicateReport` resolver no implementado": el resolver SI esta implementado y cableado. v3.1 mantiene la correccion en seccion 3.2.
- **Naming `objectType` no `objectName`** — alineado con la signature real del platform.
- **`previousVersionId` necesita declaracion FK** — en v3.1 lo resuelve IMP-5 (codegen auto), no HU8 manual.
- **D1 (CurricularLink se remapea)** — resuelto en v2 por BR-VER-002 verbatim. v3.1 lo mantiene resuelto.

---

## Pendientes que v3.1 elimina (vs v2)

| Pendiente v2 | Estado en v3.1 |
|--------------|----------------|
| **P1** — ¿Links se vacian o remapean? | **Resuelto en v2** por BR-VER-002 (remapear). |
| **P2** — ¿Sintaxis polimorfica completa o hook custom? | **Reemplazado por IMP-4** — codegen lo absorbe. Decision residual: ¿IMP-4 entrega derived en SP4 o SP5? (P3.3 nueva) |
| **P3** — ¿Codegen soporta self-refs reflexivas? | **Reemplazado por IMP-5** — si no las soporta, se agrega. |

v3.1 introduce pendientes nuevos:

| Pendiente v3.1 | Quien decide | Bloquea |
|---|---|---|
| **P3.1** | ¿Esteban actualiza CAP-CUR-018 para `version` Int + `versionLabel`? | Esteban (PM) | HU-0a |
| **P3.2** | ¿IMP-2 (APR state) agrega puro o coexistente con "Aprobar y publicar"? | JuanDi + Esteban | HU-0b |
| **P3.3** | ¿IMP-4 (polymorphicChildren) entrega solo lectura o tambien derived? | JuanDi (spike) + Klaus | HU-0d, HU-8a, HU-8b |

3 pendientes. Mas tractable que los 4 de v3.

---

## Composicion del sprint v3.1

| Track | HUs en v3.1 |
|-------|-------------|
| **Track 0 — SOT changes** | **5 HUs**: HU-0a (IMP-1), HU-0b (IMP-2), HU-0d (IMP-4 parcial), HU-0e (IMP-5), HU-0f (IMP-6), HU-0g (IMP-7) |
| **Track 1 — Core object-manager** | HU-1..HU-6 (HU-3, HU-6 wording v2 — `versionSourceId`, `action=Create`) |
| **Track 2 — Core layout** | HU-7 (sin modal user-input, sin fail-closed null) |
| **Track 3 — Aplicacion curriculum-design** | HU-8a, HU-8b, HU-9 (wording v2 — `versionSourceId`), HU-10, HU-11 |
| **Track 4 — Docs** | HU-12 |
| **Track 5 — Proceso** | HU-13 |

**Total estimado v3.1**: ~17-18 HUs. Mas ambicioso que v2 (13 HUs), mas factible que v3 (20 HUs). 6 IMPs en track 0 vs 8 de v3.

Si el sprint no acomoda 17-18 HUs:

- **HU-0d** (polymorphicChildren) es la mas pesada del track 0. Si el spike P3.3 indica que crece, fallback a sintaxis polimorfica explicita en `prefillFrom` para Activity → HU-8a se vuelve verbosa pero sigue funcionando. Esto baja a ~15 HUs.
- **HU-8b** (hook temporal links) — si IMP-4 derived sale en SP5, esta HU desaparece. Pero en SP4 sigue necesaria para CurricularLinks de Activity (la decision SP5 de IMP-4 derived afecta SP5+, no SP4).
- **HU-11** (seccion Versiones) — si discovery muestra camino B sin primitivo, mover a SP5.
- **HU-12** (docs completos) — empezar en SP4, entregar formal en SP5.
- **HU-6** (createdVia events) — nice-to-have. Mover a SP5 si presion.

Con estos recortes: ~13-14 HUs entregables en SP4.

---

## Alineamiento v3.1 con vision original v1

| Vision v1 (original) | v2 (limitada por SOT) | v3.1 (final, validado contra SP3) |
|----------------------|------------------------|------------------------------------|
| `versionStrategy: "increment"` para Activity | `user-provided` | `increment` ✓ |
| `allowedFromStates: ["Approved", "Published"]` | `["PUB"]` | `["APR", "PUB"]` ✓ |
| `"deepClone": ["sections"]` simple | Sintaxis polimorfica explicita | `["sections"]` simple ✓ |
| `source=Clone` en audit | `versionSourceId` extra (campo nuevo) | `versionSourceId` extra (igual que v2 — no se toca audit chain) ✗ |
| ~12 lineas en JSON del object para activar | ~30 lineas con polimorficos | ~12-15 lineas ✓ |
| Sin codigo nuevo del mod | Sin codigo nuevo del mod ✓ | Sin codigo nuevo del mod ✓ (excepto HU-8b — hook temporal CurricularLink remap) |

**Cobertura vision v1**: 5 de 6 puntos = **~85%**. Mejora vs v2 (~50% en estos mismos puntos) sin sacrificar SP3 cerrado.

---

## Decision final

v3.1 es el **plan propuesto de SP4** post-validacion:

- Entrega **5 de 6 puntos del vision v1** sin contradecir tickets SP3 cerrados.
- 17-18 HUs entregables (vs 20 de v3, 13 de v2).
- 3 pendientes para planning (P3.1, P3.2, P3.3).
- 6 cambios en SOT, todos validados como aditivos o no-conflictivos con SP3.
- 2 cambios en SOT explorados en v3 fueron rechazados al validar (IMP-3, IMP-8) — documentados en `validacion-v3-vs-tickets-cerrados.md` como propuestas futuras (post-SP4 housekeeping del audit chain).

Si se aprueba, los 3 archivos finales del sprint son:

- `diseño-versionamiento_v3.1.md` (diseño operativo)
- `historias-sprint-4_v3.1.md` (HUs para Jira)
- Este reporte como evidencia del proceso de validacion v1 → v2 → v3 → v3.1.
