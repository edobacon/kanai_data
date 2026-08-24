# Doc de diseño — Versionamiento como capacidad declarativa del core de uP1 (v3.1)

| Campo | Valor |
|---|---|
| **Tipo de pieza** | Función transversal (contiene 4 ladrillos + 6 cambios en SOT) |
| **Autor** | Esteban Cortés (PM) — revision tecnica + prisma implementativo + validacion SP3 Eduardo Bacon |
| **Dev responsable** | A confirmar — sugerido Eduardo Bacon, pair con JuanDi Galdames en HUs core + track 0 |
| **Aprobador** | Klaus |
| **Sprint objetivo** | SP4 uP1 |
| **Fecha de envío** | 2026-05-26 |
| **Prisma** | **Implementacion primero, validado contra SP3 cerrado**. Modifica la SOT donde no contradice tickets cerrados; mantiene fallback v2 donde contradice. |
| **Reemplaza a** | `diseño-versionamiento_v2.md` (y `_v3.md` que era exploratorio) |
| **Reporte de cambios** | `cambios-versionamiento_v2-a-v3.1.md` |
| **Validacion** | `validacion-v3-vs-tickets-cerrados.md` |

---

## 1. Título y descripción

**Versionamiento de objetos como capacidad declarativa del core de uP1.**

Habilita que cualquier object pueda volverse versionable agregando ~12-15 líneas de configuración en su JSON, sin escribir resolvers ni código del mod. Internamente se construye sobre una capacidad más general (clonación = prefill desde otro objeto), expresada también como configuración JSON.

A nivel tecnico, Versionar y Clonar comparten un mismo mecanismo (`createInstance(prefillFrom, asNewVersion)`). A nivel UI son operaciones distintas (per CAP-CUR-018 vs CAP-CUR-022). El flag `asNewVersion` decide:

- **Clonar** = `prefillFrom + asNewVersion=false`. Instancia independiente, sin linaje. Fuera de scope UI en SP4.
- **Versionar** = `prefillFrom + asNewVersion=true`. Popula `linkageField` + bumpea `versionField` + audit con `versionSourceId` + reset estado inicial.

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

### 3.5 Prisma implementativo de v3.1

v2 acepto codigo y Confluence como SOT inmutable. v3.1 identifica **6 puntos** donde la SOT puede modificarse sin contradecir tickets SP3 cerrados, acercandose al vision declarativo de v1:

| Cambio SOT | Que modifica | Beneficio |
|------------|--------------|-----------|
| **IMP-1** | `Activity.version: Int` + `versionLabel: String?` | `versionStrategy: "increment"` funciona |
| **IMP-2** | Agregar transiciones `REV-DEC → APR → PUB` al workflow `activity-standard` | `allowedFromStates: ["APR", "PUB"]` coincide con vision PM |
| **IMP-4** | Codegen soporta `polymorphicChildren` (lectura) en object JSON | `deepClone: ["sections"]` simple funciona |
| **IMP-5** | Codegen auto-declara self-references reflexivas | `previousVersionId` no necesita declaracion explicita |
| **IMP-6** | SET NOT NULL en `workflowId` y `currentStatusId` | Resolver sin defensive null handling |
| **IMP-7** | Unificar `AcademicActivity → Activity` en KB | Coherencia codigo / docs |

Detalle completo + costo + riesgo + compatibilidad SP3: `cambios-versionamiento_v2-a-v3.1.md`.

**Nota sobre IMP-3 e IMP-8 (no incluidos)**: la exploracion v3 propuso 2 IMPs adicionales (rename `sourceRefId` → `parentChildRefId` y agregar `"Clone"` al enum `action`). La validacion contra SP3 cerrado (TICKET-020 + patron L40 promovido + AC2 verbatim) determino que ambos rompen contratos documentados. v3.1 los rechaza y aplica el fallback v2 (campo nuevo `versionSourceId` separado, enum `action` con sus 7 valores intactos).

## 4. Criterio de éxito (para dev uP1)

- Un dev de mod puede activar versionamiento agregando ~12-15 líneas a `objects/<entity>.json` (bloque `prefillFrom` simple + bloque `versioning` + opcional `polymorphicChildren`) y un row action en el layout. Sin código nuevo del mod.
- Un dev externo (sin experiencia previa en el core) puede entregar HU-1 a HU-5 con este doc aprobado como autorización + pair-programming inicial con dev core.
- La capacidad pasa el test de adopción simulada: un dev escribe la config para `Syllabus` y obtiene versionamiento funcional en menos de 30 minutos.
- Tests cubren: prefill con/sin `exclude`/`deepClone`, `asNewVersion` con/sin workflow, `allowedFromStates` enforcement con codes (`APR`, `PUB`), query `getVersionChain` correcta, version strategy `increment`, `polymorphicChildren` clona N hijos polimorficos, audit row con `action=Create, versionSourceId=<sourceId>, sourceRefId=null` (L40 intacto).

## 5. Dependencias

### 5.1 Pre-requisitos cumplidos

- HU2 curriculum-design — audit chain (`changeLog`, enum `source`) — TICKET-020 closed
- HU3 curriculum-design — workflow platform (estados/transiciones) — TICKET-018 closed
- HU4 curriculum-design — Activity gobernada por workflow + patrón `*Validated` — TICKET-019 closed
- Casing PascalCase del audit chain — TICKET-030 closed

### 5.2 Pre-requisitos nuevos (track 0 — ejecutables semana 1 en paralelo)

Estas HUs modifican la SOT antes que el track 1+ las consuma. Detalle en `historias-sprint-4_v3.1.md`:

- **HU-0a** — Migrar `Activity.version` a Int + agregar `versionLabel: String?` (IMP-1)
- **HU-0b** — Agregar transiciones `APR` al workflow `activity-standard` (IMP-2)
- **HU-0d** — Codegen soporta `polymorphicChildren` (lectura) en object JSON (IMP-4 parcial)
- **HU-0e** — Codegen auto-declara self-references reflexivas (IMP-5)
- **HU-0f** — SET NOT NULL en `Activity.workflowId` y `Activity.currentStatusId` (IMP-6)
- **HU-0g** — Unificar KB `AcademicActivity → Activity` (IMP-7)

> Nota: en v3 existian HU-0c (rename audit fields) y HU-0g parte 2 (Clone en action enum). Ambas eliminadas en v3.1 por contradiccion con TICKET-020. Detalle en `validacion-v3-vs-tickets-cerrados.md`.

### 5.3 Equipos involucrados

- Equipo platform UP1 (JuanDi) — owner del core, owner del codegen, pair-programming con dev externo
- Mod curriculum-design (Eduardo) — primer adoptante + dev externo en validación del proceso
- Klaus — aprobador del diseño
- Esteban (PM) — aprobador de IMP-1 (CAP-CUR-018 update) y IMP-2 (APR state coexistente)

---

## 6. Campos adicionales — Función transversal

### 6.1 ¿Qué repositorios de uP1 implica esta función?

1. **`object-manager`** — extensión de `createInstance` con `prefillFrom` y `asNewVersion`, nueva query `getVersionChain`, lectura y validación de bloques `prefillFrom` / `versioning` / `polymorphicChildren` en JSONs, **nuevo codegen para polymorphicChildren y self-references reflexivas** (IMP-4 + IMP-5), resolucion code→id de workflow statuses.
2. **`layout`** — nuevas propiedades `prefillFromCurrent` y `asNewVersion` en row actions de tipo `create`, lógica de visibilidad basada en `allowedFromStates` (resolviendo code del status actual).
3. **`mods/curriculum-design`** — declaración de config en `objects/Activity.json` (incluyendo nuevo campo `versionLabel`), agregado de campo NUEVO `versionSourceId` en `objects/changeLog.json` (sin rename de campos existentes), actualizacion del flow n8n `audit-capture`, row action en layout de Activity, migraciones de schema (IMP-1 + IMP-6).
4. **Confluence** (CAP-CUR-018) — actualizar pagina para reflejar `version` numerico + `versionLabel` libre.
5. **KB Deckard** (`projects/up1/specs/curriculum-design/`) — search-and-replace `AcademicActivity → Activity` (IMP-7).

### 6.2 ¿Cómo afecta a todos los productos existentes?

- **Mods que no usen la capacidad:** cero impacto. Las nuevas propiedades en `createInstance` son opcionales; layouts existentes ignoran las nuevas keys.
- **Mods que la usen:** ganan operación uniforme totalmente declarativa.
- **Productos desplegados con datos vivos:** ninguno todavía (uP1 pre-producción). La migracion IMP-1 (`version` Int) afecta los 2 records seedeados en UPU — trivial.
- **Audit chain de SP3:** sin impacto — `sourceRefId`/`sourceRefName`/`sourceRefType` (patron L40) **NO se tocan**. Solo se agrega un campo nuevo `versionSourceId` con descripcion que aclara la distincion semantica.

### 6.3 ¿Qué permite hacer que antes uP1 no podía hacer?

1. Crear una instancia pre-llenada desde otra del mismo tipo, declarativamente, incluyendo relaciones polimorficas abiertas resueltas a nivel codegen.
2. Mantener linaje de versiones con `version` numerico auto-incremental + label libre para codigo institucional.
3. Versionar cualquier objeto agregando config JSON (sin tocar código).
4. Consultar la cadena completa de versiones de un objeto vía query genérica.
5. Auditar el origen de cada version creada (`versionSourceId` poblado) coexistiendo con el patron L40 intacto.
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
  - `changeLog`: campo NUEVO `versionSourceId: String?` (sin modificar campos existentes — `sourceRefId/Name/Type` mantienen su semantica L40).
- **Sin migración masiva de datos** — todo se hace via sync + `tenant:reset` en dev.
- **Confluence**: 1 pagina actualizada (CAP-CUR-018) por Esteban.
- **KB**: doc-only, search-and-replace.

---

## 7. Anexo — 4 ladrillos que componen la función (vision v3.1 declarativa)

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
| Parámetros para que sirva a otros | `asNewVersion: Boolean = false` en mutation (requiere `prefillFrom`). En JSON del object: bloque `versioning` con `linkageField`, `versionField`, `versionStrategy` (`"increment"` por default; `"user-provided"` disponible), `auditSourceField` (default `"versionSourceId"`), `allowedFromStates` (opcional, codes), `initialStateField` (opcional), `initialStateValue` (opcional, code resuelto a id en runtime). |
| Errores expuestos | `OBJECT_NOT_VERSIONABLE` · `INVALID_SOURCE_STATE_FOR_VERSIONING` (post-resolucion code) · `AS_NEW_VERSION_REQUIRES_PREFILL` · `INITIAL_STATE_CODE_NOT_FOUND`. **NO** se necesita `VERSION_VALUE_REQUIRED` ni `SOURCE_WORKFLOW_NOT_ASSIGNED` (no aplican gracias a `increment` + `NOT NULL`). |
| Eventos y acciones expuestos | Audit event registrado con `action="Create"` + `versionSourceId = prefillFrom.sourceId` (campo nuevo, sin colision con L40). `source` queda con el valor del canal real (`DirectEdit` / `Workflow`). Consumidores filtran por `versionSourceId != null` para detectar versiones derivadas. |

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

| ID | Decisión | Default v3.1 |
|---|---|---|
| D1 | Qué se clona del árbol de Activity | Activity + secciones (deepClone via `polymorphicChildren`). BibliographyReference se referencia (no se clona) per BR-VER-002. CurricularLink se **remapea** (no se vacia) per BR-VER-002 verbatim. |
| D2 | Campos sobrescritos al versionar Activity | `exclude`: `currentStatusId`, `previousVersionId`, `versionLabel`. `code` se hereda. `version` system-managed (bumpear). `versionLabel` se vacia (la nueva version pide su propio label si aplica). |
| D5 | Constraint de unicidad sobre `code` | No constraint hard. Múltiples versiones con mismo `code` permitidas. Workflow gobierna vigencia. |
| D7 | Límite de árbol para transacción | ≤200 nodos en SP4. Optimización para árboles grandes fuera de scope. |
| D9 | `versionStrategy` default en SP4 | `increment` (gracias a IMP-1). `user-provided` disponible para objects que prefieran codes libres. |
| D10 | Bump arranca en 1 o 2 | Activity nueva nace con `version=1, versionLabel="..."`. Versión derivada → `version=2, versionLabel=null` (o input del usuario). |
| D11 | Metadata `createdVia` en eventos | Sí, agregar. |
| D12 | Asignación de HUs | Track 0 (SOT changes) en planning JuanDi-led con Esteban approval. Track 1+ siguiendo HU-13 (pair en HU-1, HU-3, HU-8a). |
| D13 | ¿Se introduce `"Clone"` en enum `action` de changeLog? | **No** — fallback v2. El AC2 verbatim de TICKET-020 lista 7 valores. Distinguir versioning via `versionSourceId != null`. |
| D14 | ¿Splittear HU-2? | No — sintaxis declarativa simple gracias a IMP-4 codegen. |
| D15 | ¿IMP-4 entrega `polymorphicChildrenDerived` (remap de FKs) en SP4? | **Solo lectura** en SP4. Derived (remap CurricularLink) queda fuera — Activity usa hook custom temporal para los links (HU-8b). |
| D16 | ¿IMP-2 rompe la transicion combinada "Aprobar y publicar"? | **No** — mantenerla como atajo. Nuevas transiciones `REV-DEC → APR → PUB` coexisten. Por defecto, version desde APR o PUB. |
| D17 | ¿`versionLabel` se hereda o se vacia al versionar? | Se **vacia** por default (la nueva version pide su propio label si aplica). Excluido en `prefillFrom.exclude` para Activity. |
| **D18** | ¿Se renombra `sourceRefId` → `parentChildRefId`? | **No** — fallback v2. El patron L40 esta promovido en `mods/curriculum-design/.ai/PATTERNS.md`, AC verbatim de TICKET-020 lista `sourceRefId`, 2 layouts user-facing consumen los fields. Agregar campo NUEVO `versionSourceId` en su lugar. Ver `validacion-v3-vs-tickets-cerrados.md`. |

---

## 9. Historias de usuario (sprint 4)

Detalle completo de HUs en `historias-sprint-4_v3.1.md`. Resumen:

### Track 0 — SOT changes

- **HU-0a** — Migrar `Activity.version` a Int + agregar `versionLabel: String?` (IMP-1)
- **HU-0b** — Agregar transiciones `APR` al workflow `activity-standard` (IMP-2)
- **HU-0d** — Codegen soporta `polymorphicChildren` (lectura) (IMP-4 parcial)
- **HU-0e** — Codegen auto-declara self-references reflexivas (IMP-5)
- **HU-0f** — SET NOT NULL en `workflowId` y `currentStatusId` (IMP-6)
- **HU-0g** — Unificar KB `AcademicActivity → Activity` (IMP-7)

### Track 1 — Core object-manager

- **HU-1** — `prefillFrom` param en `createInstance`
- **HU-2** — Config `prefillFrom` en JSON del object (declarativo simple, sin sintaxis polimorfica explicita)
- **HU-3** — `asNewVersion` param con resolucion code→id (sin defensive null gracias a HU-0f); audit con `action=Create, versionSourceId=<sourceId>`
- **HU-4** — Config `versioning` con `versionStrategy: increment | user-provided`
- **HU-5** — Query `getVersionChain` ordenando por `version` (Int)
- **HU-6** — `createdVia` metadata + flow n8n persiste `versionSourceId` en el changeLog

### Track 2 — Core layout

- **HU-7** — Row action con visibilidad por `allowedFromStates` (sin fail-closed gracias a HU-0f, sin modal gracias a HU-0a)

### Track 3 — Aplicación en curriculum-design

- **HU-8a** — Declarar `prefillFrom` + `versioning` + `polymorphicChildren` en `Activity.json` (config ~12-15 lineas)
- **HU-8b** — Hook temporal del mod para remapear CurricularLinks (se reemplaza por `polymorphicChildrenDerived` en SP5)
- **HU-9** — Agregar campo NUEVO `versionSourceId` en `changeLog.json` + actualizar flow n8n + validacion en resolver
- **HU-10** — Row action "Crear nueva versión" en RecordList de Activity con `allowedFromStates: ["APR", "PUB"]` (sin modal user-input — increment automatico)
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
- **Rename del audit chain** (`sourceRefId` → `parentChildRefId`) y **extension del enum `action`** con `"Clone"` — explorados en v3, rechazados en v3.1 por contradiccion con TICKET-020 cerrado. Pueden retomarse como ticket dedicado de housekeeping post-SP4 con todos sus mitigantes (deprecation period, etc.).

---

## 11. Riesgos y dificultades posibles

| # | Riesgo | Mitigación |
|---|---|---|
| 1 | El track 0 (SOT changes) infla el sprint a 18+ HUs y no entrega versionamiento | Algunos IMPs son acoplables a otras HUs (IMP-2/6/7 son <0.5 HU cada uno). Si no caben todas, fallback es mantener v2 para los IMPs no entregados. La capacidad sigue funcional. |
| 2 | El dev externo (Eduardo) no logra entregar HUs del core sin ayuda continua | Pair-programming acotado a HU-1, HU-3 y HU-8a. Track 0 lo lleva JuanDi (cambios platform). |
| 3 | IMP-4 (codegen polymorphicChildren) crece mas alla de lo previsto | Spike de 1 dia con JuanDi al inicio del sprint. Si scope crece, fallback es la sintaxis polimorfica explicita en `prefillFrom` (modelo v2). |
| 4 | IMP-1 (version Int) requiere update de Confluence que Esteban no aprueba a tiempo | Coordinar con Esteban en planning. Si rechaza, fallback es `versionStrategy: "user-provided"` (v2). |
| 5 | Transacción de versioning con polymorphicChildren en árbol grande (>200 nodos) timeout | Documentar el límite. Future ticket de optimizacion. |
| 6 | Conflicto entre `versioning.initialStateField` y `transitionActivityValidated` (RULE-cd-004) | El resolver de Ladrillo 2 bypasea `transitionActivityValidated` al setear el estado inicial. Es **creacion**, no transicion — no viola la regla. Documentar explicitamente en HU-3. |
| 7 | Eventos BullMQ con `createdVia: "version"` no son consumidos por handlers existentes | Verificar que el handler n8n del audit-chain del mod consume el evento. |

> Nota: el riesgo "IMP-3 causa regresion en audit chain SP3" que aparecia en v3 se elimina en v3.1 — IMP-3 no se ejecuta.

---

## 12. Pendientes para Esteban / Klaus antes de aprobar

| # | Tema | Quien decide | Bloquea |
|---|------|--------------|---------|
| **P3.1** | ¿Coordinamos con Esteban actualizacion de CAP-CUR-018 para `version` numerico + `versionLabel`? (IMP-1) | Esteban (PM) | HU-0a |
| **P3.2** | ¿IMP-2 agrega APR puro o coexistente con "Aprobar y publicar"? (D16) | JuanDi + Esteban | HU-0b |
| **P3.3** | ¿IMP-4 entrega solo lectura o tambien derived? (D15) | JuanDi (spike) + Klaus | HU-0d, HU-8a, HU-8b |

3 pendientes. Si alguno se vetoea, el sprint entrega la version v2-equivalente para esa concesion + cierra el resto de IMPs adoptados.

---

## 13. Diff resumen — v2 vs v3.1

| Aspecto | v2 | v3.1 |
|---------|----|----|
| Filosofia | SOT inmutable → diseño se ajusta | SOT modificable donde no contradice SP3 → diseño en su forma natural |
| HUs totales | 13 | 13 base + 6 track 0 = **~17-18** |
| Sintaxis `deepClone` Activity | Polimorfica explicita (~20 lineas) | Simple (`["sections"]`) gracias a IMP-4 |
| `versionStrategy` Activity | `user-provided` (modal user-input) | `increment` (system-managed) |
| `allowedFromStates` Activity | `["PUB"]` | `["APR", "PUB"]` |
| Audit row de version | `action=Create, versionSourceId=<sourceId>` | `action=Create, versionSourceId=<sourceId>` (igual — audit chain SP3 no se toca) |
| FK reflexivo `previousVersionId` | HU8 lo agrega manualmente | Codegen lo infiere (IMP-5) |
| Manejo null `workflowId`/`currentStatusId` | Defensive en HU3/HU7 | SET NOT NULL — sin defensa (IMP-6) |
| KB `AcademicActivity` vs `Activity` | Nota al pie sobre lag | Unificado (IMP-7) |
| Vision v1 vs entregable | Concesiones en 4 puntos | Vision v1 entregada en 5 de 6 puntos (~85%) |
| Costo platform | Mod escribe sintaxis verbosa | Platform absorbe complejidad una vez |
| Compatibilidad SP3 cerrado | 100% (no toca nada) | 100% (validado IMP por IMP) |

---

## 14. Próximos pasos (post-aprobación)

1. Klaus aprueba o pide ajustes.
2. Esteban resuelve P3.1 y P3.2.
3. JuanDi corre spike de 1 dia para P3.3 al inicio del sprint.
4. Si todo aprueba: las HUs se crean en Jira con este doc adjunto. Track 0 arranca primero (lunes-martes), track 1-3 en paralelo cuando los pre-requisitos correspondientes esten cerrados.
5. Al cierre del sprint: retro del proceso (HU-13) + lecciones aprendidas + decision sobre IMPs deferidos:
   - `polymorphicChildrenDerived` para SP5.
   - Ticket dedicado de housekeeping del audit chain (rename `sourceRefId` + Clone en enum action) si el equipo decide tomarlo post-SP4.

---

## 15. Anexo — Configs completos de Activity v3.1 (referencia)

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
    "auditSourceField": "versionSourceId",
    "allowedFromStates": ["APR", "PUB"],
    "initialStateField": "currentStatusId",
    "initialStateValue": "BOR"
  }
}
```

**`objects/changeLog.json` — fragmento agregado (campo nuevo, sin tocar existentes):**

```json
{
  "properties": {
    "versionSourceId": {
      "type": "string",
      "title": "Version Source ID",
      "not_null": false,
      "description": "ID de la instancia origen cuando esta fila refleja un Create derivado de versionamiento (asNewVersion=true). DISTINTO de sourceRefId — que captura el id del hijo polimorfico en el patron L40 de consolidacion al padre del audit chain SP3. Los dos campos coexisten con semanticas distintas."
    }
  }
}
```

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

## 16. Apendice — Trazabilidad cada decision v3.1 → IMP

| Decision v3.1 | IMP que la habilita | Si no se adopta el IMP |
|---------------|---------------------|------------------------|
| `versionStrategy: "increment"` para Activity | IMP-1 | Fallback v2: `user-provided` + modal |
| `allowedFromStates: ["APR", "PUB"]` | IMP-2 | Fallback v2: `["PUB"]` |
| `"deepClone": ["sections"]` simple | IMP-4 (parcial) | Fallback v2: sintaxis polimorfica explicita |
| `previousVersionId` sin FK explicit | IMP-5 | Fallback v2: HU-8a declara `isForeignKey` |
| Sin defensive null en HU-3/HU-7 | IMP-6 | Fallback v2: error `SOURCE_WORKFLOW_NOT_ASSIGNED` + fail-closed |
| KB sin lag | IMP-7 | Fallback v2: nota al pie |
| Audit row con `action=Create, versionSourceId=<sourceId>` | (sin IMP) | Es el modelo final v3.1 — IMP-3 e IMP-8 rechazados por validacion vs SP3. Cita: `validacion-v3-vs-tickets-cerrados.md`. |

v3.1 es **robusto a vetos parciales** — cada IMP rechazado degrada elegantemente al equivalente v2 sin invalidar el resto del entregable.

---

## 17. Apendice — Resumen del proceso v1 → v3.1

| Version | Filosofia | Resultado | Estado |
|---------|-----------|-----------|--------|
| **v1** (original PM) | Vision declarativa pura, sin investigar costo | 12 HUs propuestas, varias asumiendo SOT mas simple que la real | Reemplazado |
| **v2** (validado vs codigo) | SOT inmutable, diseño se ajusta | 13 HUs viables. Concesiones en increment / states / polimorfismo / audit / null handling | Operativo como conservador |
| **v3** (exploratorio implementativo) | Modificar SOT donde haga falta | 20 HUs propuestas (8 IMPs). 2 IMPs (IMP-3, IMP-8) rompian SP3 cerrado | Exploratorio — no recomendado |
| **v3.1** (final post-validacion) | Modificar SOT donde NO contradiga SP3 | ~17-18 HUs (6 IMPs). 100% compatible con tickets SP3 cerrados | **Plan SP4 recomendado** |

Archivos en `specs/up1/`:

- `diseño-versionamiento_v1.md` + `historias-sprint-4_v1.md` (vision PM original)
- `cambios-versionamiento_v1-a-v2.md` + `diseño-versionamiento_v2.md` + `historias-sprint-4_v2.md` (conservador)
- `cambios-versionamiento_v2-a-v3.md` + `diseño-versionamiento_v3.md` + `historias-sprint-4_v3.md` (exploratorio — historico)
- `validacion-v3-vs-tickets-cerrados.md` (decision de rechazar IMP-3 + IMP-8)
- `cambios-versionamiento_v2-a-v3.1.md` + `diseño-versionamiento_v3.1.md` + `historias-sprint-4_v3.1.md` (plan SP4 final)
