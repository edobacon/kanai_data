---
id: DOC-kb-archive-dise-o-versionamiento-v3
project: up1
type: doc
---

# Doc de diseño — Versionamiento como capacidad declarativa del core de uP1 (v3)

| Campo | Valor |
|---|---|
| **Tipo de pieza** | Función transversal (contiene 4 ladrillos + 7 cambios en SOT) |
| **Autor** | Esteban Cortés (PM) — revision tecnica + prisma implementativo Eduardo Bacon |
| **Dev responsable** | A confirmar — sugerido Eduardo Bacon, pair con JuanDi Galdames en HUs core + track 0 |
| **Aprobador** | Klaus |
| **Sprint objetivo** | SP4 uP1 |
| **Fecha de envío** | 2026-05-26 |
| **Prisma** | **Implementacion primero**. El diseño expresa el vision original de v1 y propone cambios en la SOT (codigo + Confluence + KB) para sostenerlo. |
| **Reemplaza a** | `diseño-versionamiento_v2.md` |
| **Reporte de cambios** | `cambios-versionamiento_v2-a-v3.md` (8 cambios `IMP-1..IMP-8` en SOT) |

---

## 1. Título y descripción

**Versionamiento de objetos como capacidad declarativa del core de uP1.**

Habilita que cualquier object pueda volverse versionable agregando ~12-15 líneas de configuración en su JSON, sin escribir resolvers ni código del mod. Internamente se construye sobre una capacidad más general (clonación = prefill desde otro objeto), expresada también como configuración JSON.

A nivel tecnico, Versionar y Clonar comparten un mismo mecanismo (`createInstance(prefillFrom, asNewVersion)`). A nivel UI son operaciones distintas (per CAP-CUR-018 vs CAP-CUR-022). El flag `asNewVersion` decide:

- **Clonar** = `prefillFrom + asNewVersion=false`. Instancia independiente, sin linaje. Fuera de scope UI en SP4.
- **Versionar** = `prefillFrom + asNewVersion=true`. Popula `linkageField` + bumpea `versionField` + audit `action=Clone` + reset estado inicial.

Primera adopción real: `Activity` en `curriculum-design`. Adopciones planificadas: `Syllabus`, `CurriculumPlan`, `CompetencyMap`.

## 2. Objetivo final

Que crear "una nueva versión de algo" sea una operación uniforme en uP1, sin que cada equipo invente su propia mecánica. El consultor (configurador) ve el mismo botón "Crear nueva versión" sin importar el objeto; el dev de mod activa la capacidad declarándola en JSON, sin escribir resolvers ni sintaxis verbosa.

## 3. Contexto: qué intenté ocupar antes y no me sirvió

### 3.1 CRUD generic (`createInstance` existente)

Acepta `data` desde input del usuario pero no tiene forma de pre-llenarlo desde un objeto existente. Si el frontend lo intentara emulando (lee source, copia campos, llama create), duplica lógica en cada mod, no respeta `exclude`/`deepClone` declarativos, y no garantiza linaje atómico.

Signature actual del platform ([object-manager/src/graphql/typeDefs/static.js:1145](object-manager/src/graphql/typeDefs/static.js)):

```graphql
createInstance(objectType: String!, data: JSON!): InstanceResult
```

### 3.2 `duplicateReport` (precedente en `up1.js` del core)

Mutation ad-hoc para `Report`, declarada en typeDefs (`up1.js:382`) y con resolver implementado y cableado (`reportData.resolver.js:1197-1290` via dynamic loader en `resolverIndex.js:70-85`).

Funciona — pero **no escala**:

- Cada objeto que necesite version requiere un resolver custom equivalente.
- No reusa validaciones del CRUD generic (`core_ObjectValidation`), RBAC (`objectname:create`), ni hooks (BullMQ post-create events).
- La logica de copy queda duplicada en cada mod, con divergencia inevitable.
- Confirma que el gap es real y se intento resolver con una operacion especifica del objeto — enfoque que rompe DRY a escala N objetos.

### 3.3 Implementarlo como resolver `*Validated` del mod

Sigue el patrón ya establecido en curriculum-design (`transitionActivityValidated`, `updateActivityValidated`). Pero significa que cada mod que necesite versionar escribe el mismo resolver con variaciones. Rompe DRY y la regla `no cross-mod dependencies` impide que un mod reuse el de otro.

### 3.4 Decisión de unificación técnica vs separación de producto

CAP-CUR-018 (Versionar, Must) y CAP-CUR-022 (Clonar, Should) son capacidades distintas en Confluence. BR-VER-002 verbatim: *"Origen de clonacion = campo separado de previousVersionId. La clonacion NO es versionamiento."*

Este diseño **unifica el mecanismo técnico** pero **mantiene separadas las operaciones a nivel UI/producto**.

### 3.5 Prisma implementativo de v3

v2 acepto codigo y Confluence como SOT inmutable. v3 detecto **8 puntos** donde la SOT no encajaba con el vision declarativo de v1, y propone modificar la SOT en cada uno. Tabla resumen:

| Cambio SOT | Que modifica | Beneficio |
|------------|--------------|-----------|
| **IMP-1** | `Activity.version: Int` + `versionLabel: String?` | `versionStrategy: "increment"` funciona |
| **IMP-2** | Agregar `APR` al workflow `activity-standard` | `allowedFromStates: ["APR", "PUB"]` coincide con vision PM |
| **IMP-3** | Rename `sourceRefId` → `parentChildRefId` en changeLog | `sourceRefId` libre para clone provenance |
| **IMP-4** | Codegen soporta `polymorphicChildren` en object JSON | `deepClone: ["sections"]` simple funciona |
| **IMP-5** | Codegen auto-declara self-references reflexivas | `previousVersionId` no necesita declaracion explicita |
| **IMP-6** | SET NOT NULL en `workflowId` y `currentStatusId` | Resolver sin defensive null handling |
| **IMP-7** | Unificar `AcademicActivity → Activity` en KB | Coherencia codigo / docs |
| **IMP-8** | Agregar `"Clone"` al enum `action` (no `source`) | Audit row distingue clone semanticamente |

Detalle completo de cada IMP + costo + riesgo: `cambios-versionamiento_v2-a-v3.md`.

## 4. Criterio de éxito (para dev uP1)

- Un dev de mod puede activar versionamiento agregando ~12-15 líneas a `objects/<entity>.json` (bloque `prefillFrom` simple + bloque `versioning` + opcional `polymorphicChildren`) y un row action en el layout. Sin código nuevo del mod.
- Un dev externo (sin experiencia previa en el core) puede entregar HU-1 a HU-5 con este doc aprobado como autorización + pair-programming inicial con dev core.
- La capacidad pasa el test de adopción simulada: un dev escribe la config para `Syllabus` y obtiene versionamiento funcional en menos de 30 minutos.
- Tests cubren: prefill con/sin `exclude`/`deepClone`, `asNewVersion` con/sin workflow, `allowedFromStates` enforcement con codes (`APR`, `PUB`), query `getVersionChain` correcta, version strategy `increment`, `polymorphicChildren` clona N hijos polimorficos, audit row con `action=Clone, sourceRefId=<sourceId>`.

## 5. Dependencias

### 5.1 Pre-requisitos cumplidos

- HU2 curriculum-design — audit chain (`changeLog`, enum `source`) — TICKET-020 closed
- HU3 curriculum-design — workflow platform (estados/transiciones) — TICKET-018 closed
- HU4 curriculum-design — Activity gobernada por workflow + patrón `*Validated` — TICKET-019 closed
- Casing PascalCase del audit chain — TICKET-030 closed

### 5.2 Pre-requisitos nuevos (track 0 — ejecutables semana 1 en paralelo)

Estas HUs modifican la SOT antes que el track 1 los consuma. Detalle en `historias-sprint-4_v3.md`:

- **HU-0a** — Migrar `Activity.version` a Int + agregar `versionLabel: String?` (IMP-1)
- **HU-0b** — Agregar transiciones `REV-DEC → APR → PUB` al workflow `activity-standard` (IMP-2)
- **HU-0c** — Rename `sourceRefId` → `parentChildRefId` en changeLog (IMP-3)
- **HU-0d** — Codegen soporta `polymorphicChildren` (lectura) en object JSON (IMP-4 parcial)
- **HU-0e** — Codegen auto-declara self-references reflexivas (IMP-5)
- **HU-0f** — SET NOT NULL en `Activity.workflowId` y `Activity.currentStatusId` (IMP-6)
- **HU-0g** — Unificar KB `AcademicActivity → Activity` (IMP-7) + agregar `"Clone"` a enum `action` (IMP-8)

### 5.3 Equipos involucrados

- Equipo platform UP1 (JuanDi) — owner del core, owner del codegen, pair-programming con dev externo
- Mod curriculum-design (Eduardo) — primer adoptante + dev externo en validación del proceso
- Klaus — aprobador del diseño
- Esteban (PM) — aprobador de IMP-1 (CAP-CUR-018 update) y IMP-2 (APR state)

---

## 6. Campos adicionales — Función transversal

### 6.1 ¿Qué repositorios de uP1 implica esta función?

1. **`object-manager`** — extensión de `createInstance` con `prefillFrom` y `asNewVersion`, nueva query `getVersionChain`, lectura y validación de bloques `prefillFrom` / `versioning` / `polymorphicChildren` en JSONs, **nuevo codegen para polymorphicChildren y self-references reflexivas** (IMP-4 + IMP-5), resolucion code→id de workflow statuses.
2. **`layout`** — nuevas propiedades `prefillFromCurrent` y `asNewVersion` en row actions de tipo `create`, lógica de visibilidad basada en `allowedFromStates` (resolviendo code del status actual).
3. **`mods/curriculum-design`** — declaración de config en `objects/Activity.json` (incluyendo nuevo campo `versionLabel`), agregado de `"Clone"` al enum `action` de `changeLog.json`, rename de fields del audit chain (IMP-3), actualizacion del flow n8n `audit-capture`, row action en layout de Activity, migraciones de schema (IMP-1 + IMP-6).
4. **Confluence** (CAP-CUR-018) — actualizar pagina para reflejar `version` numerico + `versionLabel` libre.
5. **KB Deckard** (`projects/up1/specs/curriculum-design/`) — search-and-replace `AcademicActivity → Activity` (IMP-7).

### 6.2 ¿Cómo afecta a todos los productos existentes?

- **Mods que no usen la capacidad:** cero impacto. Las nuevas propiedades en `createInstance` son opcionales; layouts existentes ignoran las nuevas keys.
- **Mods que la usen:** ganan operación uniforme totalmente declarativa.
- **Productos desplegados con datos vivos:** ninguno todavía (uP1 pre-producción). La migracion IMP-1 (`version` Int) afecta los 2 records seedeados en UPU — trivial.
- **Audit chain de SP3:** IMP-3 (rename) requiere test de regresion completo del L40 antes del merge. IMP-8 (`"Clone"` en `action`) es aditivo.

### 6.3 ¿Qué permite hacer que antes uP1 no podía hacer?

1. Crear una instancia pre-llenada desde otra del mismo tipo, declarativamente, incluyendo relaciones polimorficas abiertas resueltas a nivel codegen.
2. Mantener linaje de versiones con `version` numerico auto-incremental + label libre para codigo institucional.
3. Versionar cualquier objeto agregando config JSON (sin tocar código).
4. Consultar la cadena completa de versiones de un objeto vía query genérica.
5. Auditar el origen de cada version creada (`action=Clone, sourceRefId=X`) sin colisionar con el patron L40 (renombrado a `parentChildRefId`).
6. Self-references reflexivas via convencion (sin boilerplate de FK en el JSON).

### 6.4 ¿Cómo se disponibiliza al cliente?

- **Cliente dev (consumidor de mods):** declarando bloques `prefillFrom`, `versioning`, y opcionalmente `polymorphicChildren` en el JSON del objeto, más row action en layout. Documentado en `object-manager/docs/prefill-capability.md` y `object-manager/docs/versioning-capability.md`.
- **Cliente consultor (configurador de mod desplegado):** vía la UI de Object Manager Editor cuando ese mod soporte editar estas keys — fuera de scope SP4.
- **Usuario final (consultor / coordinador):** vía el botón "Crear nueva versión" en RecordList del objeto, cuando el code del status actual está en `allowedFromStates`.

### 6.5 ¿Es para cliente dev o cliente consultor?

**Cliente dev (primario):** la capacidad se entrega como contrato declarativo en JSON + UI que reacciona automáticamente.

**Cliente consultor (indirecto):** consume la feature vía mods que la activen. No interactúa con la config directamente en SP4.

### 6.6 ¿Requiere migración o cambios en productos ya desplegados?

- **Schema**:
  - `Activity.version: String → Int` + nuevo `versionLabel: String?` (IMP-1). Backfill: las 2 instancias UPU pasan a `version=1, versionLabel="v2022-actual"`.
  - `Activity.workflowId / currentStatusId: SET NOT NULL` (IMP-6). Pre-poblados via S15 de TICKET-019.
  - `Activity.previousVersionId`: codegen agrega `@relation` automaticamente (IMP-5).
  - `changeLog`: rename de 3 fields (IMP-3) + nuevo enum value `"Clone"` en `action` (IMP-8).
- **Sin migración masiva de datos** — todo se hace via sync + `tenant:reset` en dev.
- **Confluence**: 1 pagina actualizada (CAP-CUR-018) por Esteban.
- **KB**: doc-only, search-and-replace.

---

## 7. Anexo — 4 ladrillos que componen la función (vision v3 declarativa)

### 7.1 Ladrillo 1 — `prefillFrom` en `createInstance` (object-manager)

| Campo | Respuesta |
|---|---|
| ¿Resolver custom? | **No.** Extensión del resolver genérico `createInstance`. Reusa validaciones `core_ObjectValidation`, RBAC `objectname:create`, polymorphic RT handling. |
| ¿Layout nuevo? | No |
| Parámetros para que sirva a otros | `prefillFrom: { sourceId: ID!, includeRelations: Boolean = false }` en la mutation. En JSON del object: `"prefillFrom": { "exclude": [string], "deepClone": [string] }`. **Defaults**: `exclude` siempre agrega `id`, `createdAt`, `updatedAt`, `createdBy`. **deepClone** es array de field names que pueden ser (a) Prisma relations declaradas, (b) `polymorphicChildren` declarados a nivel object (resueltos por codegen — IMP-4). |
| Eventos y acciones expuestos | Hooks existentes de create disparan normal. Nueva metadata `createdVia: "prefill"` en el payload del evento. |

### 7.2 Ladrillo 2 — `asNewVersion` en `createInstance` (object-manager)

| Campo | Respuesta |
|---|---|
| ¿Resolver custom? | **No.** Extensión del mismo `createInstance`. |
| ¿Layout nuevo? | No |
| Parámetros para que sirva a otros | `asNewVersion: Boolean = false` en mutation (requiere `prefillFrom`). En JSON del object: bloque `versioning` con `linkageField`, `versionField`, `versionStrategy` (`"increment"` por default; `"user-provided"` disponible), `allowedFromStates` (opcional, codes), `initialStateField` (opcional), `initialStateValue` (opcional, code resuelto a id en runtime). |
| Errores expuestos | `OBJECT_NOT_VERSIONABLE` · `INVALID_SOURCE_STATE_FOR_VERSIONING` (post-resolucion code) · `AS_NEW_VERSION_REQUIRES_PREFILL` · `INITIAL_STATE_CODE_NOT_FOUND`. **NO** se necesita `VERSION_VALUE_REQUIRED` ni `SOURCE_WORKFLOW_NOT_ASSIGNED` (no aplican cuando `increment` + `NOT NULL`). |
| Eventos y acciones expuestos | Audit event registrado con `action="Clone"` (IMP-8) + `sourceRefId = prefillFrom.sourceId` (libre tras IMP-3). Consumidores filtran por `action="Clone"` para detectar versiones derivadas. |

### 7.3 Ladrillo 3 — Query `getVersionChain` (object-manager)

| Campo | Respuesta |
|---|---|
| ¿Resolver custom? | **Sí.** Query genérica nueva. |
| ¿Layout nuevo? | No |
| Firma | `getVersionChain(objectType: String!, instanceId: ID!): [Instance!]!` |
| Comportamiento | Lee `versioning.linkageField` del JSON del object. Sigue la cadena en ambas direcciones desde `instanceId`. Retorna lista ordenada por `version` (Int) ascendente. Cada item con flags computed `isLatest: Boolean` y `versionNumber: Int` (alias de `version`). |
| Eventos y acciones expuestos | Query de lectura — no dispara eventos. Componentes de layout (sección "Versiones" en RecordDetail) la consumen. |

### 7.4 Ladrillo 4 — Row action con prefill + versioning (layout)

| Campo | Respuesta |
|---|---|
| ¿Layout nuevo? | **No.** Extensión del row action `create` existente del RecordList. |
| Parámetros nuevos | `prefillFromCurrent: Boolean = false` · `asNewVersion: Boolean = false` (requiere `prefillFromCurrent: true`) · `label` (free string) · `redirectTo` existente. |
| Comportamiento | Si `prefillFromCurrent: true`, llama `createInstance` con `prefillFrom: { sourceId: <currentRowId> }`. Si además `asNewVersion: true`, pasa `asNewVersion: true`. Si el object tiene `versioning.allowedFromStates`, el botón aparece solo cuando el code del status actual del row está en la lista (resolucion runtime). |
| Eventos y acciones expuestos | Tras éxito redirige según `redirectTo` (default `edit`); tras fallo muestra toast con el error code del Ladrillo 2. |

---

## 8. Decisiones de diseño

| ID | Decisión | Default v3 |
|---|---|---|
| D1 | Qué se clona del árbol de Activity | Activity + secciones (deepClone via `polymorphicChildren`). BibliographyReference se referencia (no se clona) per BR-VER-002. CurricularLink se **remapea** (no se vacia) per BR-VER-002 verbatim. |
| D2 | Campos sobrescritos al versionar Activity | `exclude`: `currentStatusId`, `previousVersionId`. `code` se hereda. `version` y `versionLabel` system-managed (bumpear `version`, mantener `versionLabel` o limpiarlo). |
| D5 | Constraint de unicidad sobre `code` | No constraint hard. Múltiples versiones con mismo `code` permitidas. Workflow gobierna vigencia. |
| D7 | Límite de árbol para transacción | ≤200 nodos en SP4. Optimización para árboles grandes fuera de scope. |
| D9 | `versionStrategy` default en SP4 | `increment` (gracias a IMP-1). `user-provided` disponible para objects que prefieran codes libres. |
| D10 | Bump arranca en 1 o 2 | Activity nueva nace con `version=1, versionLabel="..."`. Versión derivada → `version=2, versionLabel=null` (o input del usuario). |
| D11 | Metadata `createdVia` en eventos | Sí, agregar. |
| D12 | Asignación de HUs | Track 0 (SOT changes) en planning JuanDi-led con Esteban approval. Track 1+ siguiendo HU-13 (pair en HU-1, HU-3, HU-8). |
| D13 | ¿Se introduce `"Clone"` en enum `source` de changeLog? | **No** — va en enum `action` (IMP-8). `source` mantiene su semantica de canal. |
| D14 | ¿Splittear HU-2? | No — sintaxis declarativa simple gracias a IMP-4 codegen. |
| D15 | ¿IMP-4 entrega `polymorphicChildrenDerived` (remap de FKs) en SP4? | **Solo lectura** en SP4. Derived (remap CurricularLink) queda fuera — Activity usa hook custom temporal para los links (HU-8b). |
| D16 | ¿IMP-2 rompe la transicion combinada "Aprobar y publicar"? | **No** — mantenerla como atajo. Nuevas transiciones `REV-DEC → APR → PUB` coexisten. Por defecto, version desde APR o PUB. |
| D17 | ¿`versionLabel` se hereda o se vacia al versionar? | Se **vacia** por default (la nueva version pide su propio label si aplica). Excluido en `prefillFrom.exclude` implicito para Activity. |

---

## 9. Historias de usuario (sprint 4)

Detalle completo de HUs en `historias-sprint-4_v3.md`. Resumen:

### Track 0 — SOT changes (nuevo en v3)

- **HU-0a** — Migrar `Activity.version` a Int + agregar `versionLabel: String?` (IMP-1)
- **HU-0b** — Agregar transiciones `APR` al workflow `activity-standard` (IMP-2)
- **HU-0c** — Rename `sourceRefId → parentChildRefId` en changeLog (IMP-3)
- **HU-0d** — Codegen soporta `polymorphicChildren` (lectura) (IMP-4 parcial)
- **HU-0e** — Codegen auto-declara self-references reflexivas (IMP-5)
- **HU-0f** — SET NOT NULL en `workflowId` y `currentStatusId` (IMP-6)
- **HU-0g** — Unificar KB + agregar `"Clone"` a `action` enum (IMP-7 + IMP-8)

### Track 1 — Core object-manager

- **HU-1** — `prefillFrom` param en `createInstance`
- **HU-2** — Config `prefillFrom` en JSON del object (declarativo simple, sin sintaxis polimorfica explicita)
- **HU-3** — `asNewVersion` param con resolucion code→id (sin defensive null gracias a HU-0f)
- **HU-4** — Config `versioning` con `versionStrategy: increment | user-provided`
- **HU-5** — Query `getVersionChain` ordenando por `version` (Int)
- **HU-6** — `createdVia` metadata + flow n8n persiste `sourceRefId` para Clone

### Track 2 — Core layout

- **HU-7** — Row action con visibilidad por `allowedFromStates` (sin fail-closed gracias a HU-0f)

### Track 3 — Aplicación en curriculum-design

- **HU-8a** — Declarar `prefillFrom` + `versioning` + `polymorphicChildren` en `Activity.json` (config ~12-15 lineas)
- **HU-8b** — Hook temporal del mod para remapear CurricularLinks (se reemplaza por `polymorphicChildrenDerived` en SP5)
- **HU-9** — Agregar `"Clone"` al enum `action` en `changeLog.json` + actualizar flow n8n + resolver
- **HU-10** — Row action "Crear nueva versión" en RecordList de Activity con `allowedFromStates: ["APR", "PUB"]`
- **HU-11** — Sección "Versiones" en RecordDetail de Activity (discovery primero, split a 11a/11b si requiere primitivo nuevo)

### Track 4 — Documentación + adopción futura

- **HU-12** — Documentación de la capacidad (incluye ejemplos para `polymorphicChildren`)

### Track 5 — Validación del proceso

- **HU-13** — Pair-programming inicial dev externo + dev core (HU-1, HU-3, HU-8a)

---

## 10. Fuera de alcance (explícito)

- Versionamiento de objetos distintos a Activity en SP4 (Syllabus, CurriculumPlan, CompetencyMap).
- **Versionamiento masivo async** (job BullMQ con tracking) — BR-VER-002 lo menciona, SP4 solo individual.
- `versionStrategy: "semver"` — solo `increment` y `user-provided` en SP4.
- Edición de la config `versioning` desde Object Manager Editor.
- Diff visual entre versiones.
- Bloqueo de edición de versiones anteriores post-publicación.
- Optimización para árboles >200 nodos.
- UI para el flag `includeRelations: true` del `prefillFrom`.
- Operacion "Duplicar" (clone sin linaje) a nivel UI — mecanismo tecnico listo, falta el row action.
- **`polymorphicChildrenDerived`** (remap de FKs internas tipo CurricularLink) en codegen — queda para SP5. Activity en SP4 usa hook temporal del mod.
- IMP-4 forma completa: SP4 entrega solo lectura. Derived va a SP5.

---

## 11. Riesgos y dificultades posibles

| # | Riesgo | Mitigación |
|---|---|---|
| 1 | El track 0 (SOT changes) infla el sprint a 20 HUs y no entrega versionamiento | Algunas IMPs son acoplables a otras HUs (IMP-2/6/7/8 son <0.5 HU cada uno). Si no caben todas, fallback es mantener v2 para los IMPs no entregados. La capacidad sigue funcional. |
| 2 | El dev externo (Eduardo) no logra entregar HUs del core sin ayuda continua | Pair-programming acotado a HU-1, HU-3 y HU-8a. Track 0 lo lleva JuanDi (cambios platform). |
| 3 | IMP-3 (rename audit fields) causa regresion en audit chain SP3 | Tests de regresion completos del L40 antes del merge. Plan B: revertir el rename, mantener `versionSourceId` separado (v2 fallback). |
| 4 | IMP-4 (codegen polymorphicChildren) crece mas alla de lo previsto | Spike de 1 dia con JuanDi al inicio del sprint. Si scope crece, fallback es la sintaxis polimorfica explicita en `prefillFrom` (v2). |
| 5 | IMP-1 (version Int) requiere update de Confluence que Esteban no aprueba a tiempo | Coordinar con Esteban en planning. Si rechaza, fallback es `versionStrategy: "user-provided"` (v2). |
| 6 | Transacción de versioning con polymorphicChildren en árbol grande (>200 nodos) timeout | Documentar el límite. Future ticket de optimizacion. |
| 7 | Conflicto entre `versioning.initialStateField` y `transitionActivityValidated` (RULE-cd-004) | El resolver de Ladrillo 2 bypasea `transitionActivityValidated` al setear el estado inicial. Es **creacion**, no transicion — no viola la regla. Documentar explicitamente en HU-3. |
| 8 | Eventos BullMQ con `createdVia: "version"` no son consumidos por handlers existentes | Verificar que el handler n8n del audit-chain del mod consume el evento. |

---

## 12. Pendientes para Esteban / Klaus antes de aprobar

| # | Tema | Quien decide | Bloquea |
|---|------|--------------|---------|
| **P3.1** | ¿Coordinamos con Esteban actualizacion de CAP-CUR-018 para `version` numerico + `versionLabel`? (IMP-1) | Esteban (PM) | HU-0a |
| **P3.2** | ¿IMP-2 agrega APR puro o coexistente con "Aprobar y publicar"? (D16) | JuanDi + Esteban | HU-0b |
| **P3.3** | ¿IMP-3 (rename audit fields) cabe en SP4 dado el riesgo? Decision sobre adopcion completa o fallback v2 | Klaus + JuanDi | HU-0c |
| **P3.4** | ¿IMP-4 entrega solo lectura o tambien derived? (D15) | JuanDi (spike) + Klaus | HU-0d, HU-8a, HU-8b |

Si alguno se vetoea, el sprint entrega la version v2-equivalente para esa concesion + cierra el resto de IMPs adoptados.

---

## 13. Diff resumen — v2 vs v3

| Aspecto | v2 | v3 |
|---------|----|----|
| Filosofia | SOT inmutable → diseño se ajusta | SOT modificable → diseño en su forma natural |
| HUs totales | 13 | 13 base + 7 track 0 = 20 (con composiciones, ~17-18 entregables) |
| Sintaxis `deepClone` Activity | Polimorfica explicita (~20 lineas) | Simple (`["sections"]`) gracias a IMP-4 |
| `versionStrategy` Activity | `user-provided` (modal user-input) | `increment` (system-managed) |
| `allowedFromStates` Activity | `["PUB"]` | `["APR", "PUB"]` |
| Audit row de version | `action=Create, source=DirectEdit, versionSourceId=X` | `action=Clone, sourceRefId=X` |
| FK reflexivo `previousVersionId` | HU8 lo agrega manualmente | Codegen lo infiere (IMP-5) |
| Manejo null `workflowId`/`currentStatusId` | Defensive en HU3/HU7 | SET NOT NULL — sin defensa (IMP-6) |
| KB `AcademicActivity` vs `Activity` | Nota al pie sobre lag | Unificado (IMP-7) |
| Vision v1 vs entregable | Concesiones en 4 puntos | Vision v1 entregada |
| Costo platform | Mod escribe sintaxis verbosa | Platform absorbe complejidad una vez |

---

## 14. Próximos pasos (post-aprobación)

1. Klaus aprueba o pide ajustes (incluye decision sobre P3.3).
2. Esteban resuelve P3.1 y P3.2.
3. JuanDi corre spike de 1 dia para P3.4 al inicio del sprint.
4. Si todo aprueba: las HUs se crean en Jira con este doc adjunto. Track 0 arranca primero (lunes-martes), track 1-3 en paralelo cuando los pre-requisitos correspondientes esten cerrados.
5. Al cierre del sprint: retro del proceso (HU-13) + lecciones aprendidas + decision sobre IMPs deferidos (`polymorphicChildrenDerived` para SP5).

---

## 15. Anexo — Configs completos de Activity v3 (referencia)

**`objects/Activity.json` — vista final post-track 0 + adopcion (~15 lineas agregadas):**

```json
{
  "properties": {
    "version": {
      "type": "integer",
      "title": "Version",
      "not_null": true,
      "static_default": "1",
      "description": "Version numerica system-managed. Auto-incremental via versionStrategy."
    },
    "versionLabel": {
      "type": "string",
      "title": "Version Label",
      "not_null": false,
      "description": "Codigo institucional libre (ej. 'v2022-actual', 'Semestre 2026-1'). No system-managed."
    },
    "previousVersionId": {
      "type": "string",
      "title": "Previous Version",
      "not_null": false,
      "references": "Activity",
      "_comment": "FK reflexiva inferida por codegen via IMP-5. No necesita isForeignKey explicito."
    }
  },
  "polymorphicChildren": [
    {
      "name": "sections",
      "object": "CurricularSection",
      "via": "ownerType/ownerId",
      "ownerTypeValue": "Activity"
    }
  ],
  "prefillFrom": {
    "exclude": ["currentStatusId", "previousVersionId", "versionLabel"],
    "deepClone": ["sections"]
  },
  "versioning": {
    "linkageField": "previousVersionId",
    "versionField": "version",
    "versionStrategy": "increment",
    "allowedFromStates": ["APR", "PUB"],
    "initialStateField": "currentStatusId",
    "initialStateValue": "BOR"
  }
}
```

**`objects/changeLog.json` — cambio agregado (enum action):**

```json
{
  "properties": {
    "action": {
      "type": "string",
      "title": "Action",
      "not_null": true,
      "enum": ["Create", "Update", "Delete", "StateTransition", "MADSSync", "Import", "Restore", "Clone"]
    }
  }
}
```

(Mas cambios en changeLog.json por IMP-3: rename de 3 fields documentado en HU-0c.)

**`config/layouts/default_Activity_list.json` (PascalCase per RULE-platform-006) — row action agregado:**

```json
{
  "type": "create",
  "prefillFromCurrent": true,
  "asNewVersion": true,
  "label": "{{$t('createNewVersion')}}",
  "redirectTo": "edit",
  "icon": "bi-arrow-clockwise"
}
```

Sin modal de version requerido (gracias a `versionStrategy: "increment"`).

---

## 16. Apendice — Trazabilidad cada decision v3 → IMP

| Decision v3 | IMP que la habilita | Si no se adopta el IMP |
|-------------|---------------------|------------------------|
| `versionStrategy: "increment"` para Activity | IMP-1 | Fallback v2: `user-provided` + modal |
| `allowedFromStates: ["APR", "PUB"]` | IMP-2 | Fallback v2: `["PUB"]` |
| `action=Clone, sourceRefId=X` en audit | IMP-3 + IMP-8 | Fallback v2: campo `versionSourceId` separado |
| `"deepClone": ["sections"]` simple | IMP-4 (parcial) | Fallback v2: sintaxis polimorfica explicita |
| `previousVersionId` sin FK explicit | IMP-5 | Fallback v2: HU-8a declara `isForeignKey` |
| Sin defensive null en HU-3/HU-7 | IMP-6 | Fallback v2: error `SOURCE_WORKFLOW_NOT_ASSIGNED` + fail-closed |
| KB sin lag | IMP-7 | Fallback v2: nota al pie |
| `"Clone"` en `action` enum | IMP-8 | Fallback v2: distinguir por `versionSourceId != null` |

v3 es robusto a vetos parciales: cada IMP rechazado degrada elegantemente al equivalente de v2 sin invalidar el resto.
