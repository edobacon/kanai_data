---
id: DOC-kb-archive-dise-o-versionamiento-v2
project: up1
type: doc
---

# Doc de diseño — Versionamiento como capacidad declarativa del core de uP1 (v2)

| Campo | Valor |
|---|---|
| **Tipo de pieza** | Función transversal (contiene 4 ladrillos) |
| **Autor** | Esteban Cortés (PM) — revision tecnica Eduardo Bacon |
| **Dev responsable** | A confirmar — sugerido Eduardo Bacon, pair con JuanDi Galdames en HUs core |
| **Aprobador** | Klaus |
| **Sprint objetivo** | SP4 uP1 |
| **Fecha de envío** | 2026-05-26 |
| **Reemplaza a** | `diseño-versionamiento_v1.md` |
| **Reporte de cambios** | `cambios-versionamiento_v1-a-v2.md` |

---

## 1. Título y descripción

**Versionamiento de objetos como capacidad declarativa del core de uP1.**

Habilita que cualquier object pueda volverse versionable agregando un bloque de configuración en su JSON, sin escribir resolvers ni código del mod. Internamente se construye sobre una capacidad más general (clonación = prefill desde otro objeto), expresada también como configuración JSON.

Versionar y Clonar son operaciones distintas a nivel de producto (CAP-CUR-018 vs CAP-CUR-022 en Confluence) pero comparten el mismo mecanismo tecnico subyacente. La diferencia esta en el flag `asNewVersion`:

- **Clonar** = `prefillFrom + asNewVersion=false`. Instancia nueva independiente, sin linaje. Sin scope SP4 a nivel UI.
- **Versionar** = `prefillFrom + asNewVersion=true`. Popula `linkageField` (previousVersionId) + metadata. Primer adoptante real SP4.

Primera adopción: `Activity` en `curriculum-design`. Adopciones planificadas: `Syllabus`, `CurriculumPlan`, `CompetencyMap`.

## 2. Objetivo final

Que crear "una nueva versión de algo" sea una operación uniforme en uP1, sin que cada equipo invente su propia mecánica. El consultor (configurador) ve el mismo botón "Crear nueva versión" sin importar el objeto; el dev de mod activa la capacidad declarándola en JSON, sin escribir resolvers.

## 3. Contexto: qué intenté ocupar antes y no me sirvió

### 3.1 CRUD generic (`createInstance` existente)

Acepta `data` desde input del usuario pero no tiene forma de pre-llenarlo desde un objeto existente. Si el frontend lo intentara emulando (lee source, copia campos, llama create), duplica lógica en cada mod, no respeta `exclude`/`deepClone` declarativos, y no garantiza linaje atómico.

Signature actual del platform ([object-manager/src/graphql/typeDefs/static.js:1145](object-manager/src/graphql/typeDefs/static.js)):

```graphql
createInstance(objectType: String!, data: JSON!): InstanceResult
```

### 3.2 `duplicateReport` (precedente en `up1.js` del core)

Mutation ad-hoc para `Report`, declarada en typeDefs (`up1.js:382`) **y con resolver completo** en `reportData.resolver.js:1197-1290`. Funciona — hace `prisma.report.create` con includes (`ext__uplanner__report`, filters, sorting, visualization, pivot) y devuelve el report duplicado.

El problema NO es que no funcione para Reports — funciona. El problema es que **no escala**:

- Cada objeto que necesite version requiere un resolver custom equivalente.
- No reusa validaciones del CRUD generic (`core_ObjectValidation`), RBAC (`objectname:create`), ni hooks (BullMQ post-create events).
- La logica de copy queda duplicada en cada mod, con divergencia inevitable.
- Confirma que el gap es real y se intento resolver con una operacion especifica del objeto — enfoque que rompe DRY a escala N objetos.

### 3.3 Implementarlo como resolver `*Validated` del mod

Sigue el patrón ya establecido en curriculum-design (`transitionActivityValidated`, `updateActivityValidated` — ver [mods/curriculum-design/logic/activity.resolver.js:67-270](mods/curriculum-design/logic/activity.resolver.js)). Pero significa que cada mod que necesite versionar (curriculum-design, syllabus, plan-de-estudios, competencias) escribe el mismo resolver con variaciones. Rompe DRY y la regla `no cross-mod dependencies` impide que un mod reuse el de otro.

### 3.4 Decisión de unificación técnica vs separación de producto

CAP-CUR-018 (Versionar, Must) y CAP-CUR-022 (Clonar, Should) son **capacidades distintas en Confluence**. BR-VER-002 verbatim: *"Origen de clonacion = campo separado de previousVersionId. La clonacion NO es versionamiento."*

Este diseño **unifica el mecanismo técnico** (un solo `createInstance` con flag) pero **mantiene separadas las operaciones a nivel UI/producto**:

- "Crear nueva versión" (Activity → APR / PUB con `asNewVersion=true`) → SP4.
- "Duplicar" (cualquier estado, sin linaje) → SP posterior.

La unificacion tecnica permite que cuando llegue el momento de "Duplicar", el mecanismo ya esta listo — solo cambia el flag.

## 4. Criterio de éxito (para dev uP1)

- Un dev de mod puede activar versionamiento agregando ~20-30 líneas a `objects/<entity>.json` (bloque `prefillFrom` con sintaxis polimorfica + bloque `versioning`) y un row action en el layout. Sin código nuevo del mod.
- Un dev externo (sin experiencia previa en el core) puede entregar HU-1 a HU-5 con este doc aprobado como autorización + pair-programming inicial con dev core.
- La capacidad pasa el test de adopción simulada: un dev escribe la config para `Syllabus` (sin pertenecer al sprint) y obtiene versionamiento funcional en menos de 45 minutos (revisado al alza desde 30 min de v1 — la sintaxis polimorfica es mas verbosa que el array simple).
- Tests cubren: prefill con/sin `exclude`/`deepClone` (simple + polimorfico), `asNewVersion` con/sin workflow, `allowedFromStates` enforcement con resolucion code→id, query `getVersionChain` correcta, version strategy `user-provided` con y sin valor explicito.

## 5. Dependencias

### 5.1 Pre-requisitos cumplidos

- HU2 curriculum-design — audit chain (`changeLog`, enum `source`) — TICKET-020 closed
- HU3 curriculum-design — workflow platform (estados/transiciones) — TICKET-018 closed
- HU4 curriculum-design — Activity gobernada por workflow + patrón `*Validated` — TICKET-019 closed
- Schema: `previousVersionId` ya existe en `objects/activity.json` (pero NO declarado como FK reflexivo — se corrige en HU8, ver pendiente P3)
- Casing PascalCase del audit chain — TICKET-030 closed

### 5.2 Equipos involucrados

- Equipo platform UP1 (JuanDi Galdames) — owner del core, pair-programming con dev externo
- Mod curriculum-design (Eduardo Bacon) — primer adoptante + dev externo en validación del proceso
- Klaus — aprobador del diseño
- Esteban (PM) — decisión pendiente sobre D1 (links al versionar, ver Pendientes)

---

## 6. Campos adicionales — Función transversal

### 6.1 ¿Qué repositorios de uP1 implica esta función?

1. **`object-manager`** — extensión de `createInstance` con `prefillFrom` y `asNewVersion`, nueva query `getVersionChain`, lectura y validación de bloques `prefillFrom` y `versioning` en JSONs de objects, resolucion code→id de workflow statuses.
2. **`layout`** — nuevas propiedades `prefillFromCurrent` y `asNewVersion` en row actions de tipo `create`, lógica de visibilidad basada en `allowedFromStates` (resolviendo code del status actual del row).
3. **`mods/curriculum-design`** — declaración de config en `objects/activity.json` (incluyendo agregar `isForeignKey` a `previousVersionId`), agregado de campo nuevo `versionSourceId` en `objects/changeLog.json`, actualizacion del flow n8n `flows/audit-capture.json` para persistir `versionSourceId`, row action en layout de Activity.
4. **(Condicional)** `suite` o nuevo primitivo en `layout` — si HU-11 (seccion Versiones en RecordDetail) requiere componente que hoy no existe. Decision post-discovery (ver HU-11).

### 6.2 ¿Cómo afecta a todos los productos existentes?

- **Mods que no usen la capacidad:** cero impacto. Las nuevas propiedades en `createInstance` son opcionales; layouts existentes ignoran las nuevas keys.
- **Mods que la usen:** ganan operación uniforme; no necesitan resolvers custom para clone/version.
- **Productos desplegados con datos vivos:** ninguno todavía (uP1 pre-producción). Cuando haya producción, la primera adopción real (Activity) requiere validar integridad referencial con datos existentes.
- **Audit chain de SP3:** sin impacto — el nuevo campo `versionSourceId` es aditivo, no toca `sourceRefId` ni el patron L40.

### 6.3 ¿Qué permite hacer que antes uP1 no podía hacer?

1. Crear una instancia pre-llenada desde otra del mismo tipo, declarativamente, incluyendo relaciones polimorficas abiertas (CurricularSection → Activity).
2. Mantener linaje de versiones de un objeto con campos auto-gobernados.
3. Versionar cualquier objeto agregando config JSON (sin tocar código).
4. Consultar la cadena completa de versiones de un objeto vía query genérica.
5. Auditar el origen de cada version creada (`versionSourceId` en `changeLog`) sin colisionar con el patron L40 de consolidacion al padre.

### 6.4 ¿Cómo se disponibiliza al cliente?

- **Cliente dev (consumidor de mods):** declarando bloques `prefillFrom` y `versioning` en el JSON del objeto, más row action en layout. Documentado en `object-manager/docs/prefill-capability.md` y `object-manager/docs/versioning-capability.md` con receta + ejemplos para relaciones simples y polimorficas.
- **Cliente consultor (configurador de mod desplegado):** vía la UI de Object Manager Editor cuando ese mod soporte editar estas keys — fuera de scope SP4.
- **Usuario final (consultor / coordinador):** vía el botón "Crear nueva versión" en RecordList del objeto, cuando el estado actual está en `allowedFromStates`.

### 6.5 ¿Es para cliente dev o cliente consultor?

**Cliente dev (primario):** la capacidad se entrega como contrato declarativo en JSON + UI que reacciona automáticamente.

**Cliente consultor (indirecto):** consume la feature vía mods que la activen. No interactúa con la config directamente en SP4.

### 6.6 ¿Requiere migración o cambios en productos ya desplegados?

- **Schema:** sí, acotado:
  - Activity: agregar `isForeignKey` + `references: "Activity"` a `previousVersionId` (declarar FK reflexivo).
  - changeLog: agregar campo nuevo `versionSourceId: String (nullable)`.
  - Ambos via sync + `tenant:reset` en dev. No se toca `sourceRefId` / `sourceRefName` / `sourceRefType` (mantienen semantica L40).
- **Mods que adopten en el futuro:** cada uno declara su `linkageField`, `versionField` (puede ser String o Int) y `versionStrategy`. Si el objeto no los tiene, los agrega en su próxima migración.
- **No requiere migración masiva de datos** — versionamiento solo aplica a objetos creados a partir de la entrega.

---

## 7. Anexo — 4 ladrillos que componen la función

### 7.1 Ladrillo 1 — `prefillFrom` en `createInstance` (object-manager)

| Campo | Respuesta |
|---|---|
| ¿Resolver custom? | **No.** Extensión del resolver genérico `createInstance` existente. Razón: clone es caso particular de create, no operación distinta. Reusa validaciones `core_ObjectValidation`, RBAC `objectname:create`, polymorphic RT handling. |
| ¿Layout nuevo? | No |
| Parámetros para que sirva a otros | `prefillFrom: { sourceId: ID!, includeRelations: Boolean = false }` en la mutation. En JSON del object: `"prefillFrom": { "exclude": [string], "deepClone": [...] }` con dos sintaxis para `deepClone` (simple Prisma relations + polimorfico abierto, ver HU-2). Defaults: `exclude` siempre agrega `id`, `createdAt`, `updatedAt`, `createdBy`. |
| Eventos y acciones expuestos | Hooks existentes de create (BullMQ post-create events) se disparan normal. Nueva metadata `createdVia: "prefill"` en el payload del evento — consumidores que quieran distinguir clone de create scratch pueden filtrar. |

### 7.2 Ladrillo 2 — `asNewVersion` en `createInstance` (object-manager)

| Campo | Respuesta |
|---|---|
| ¿Resolver custom? | **No.** Extensión del mismo `createInstance`. Razón: versionar = prefill + metadata auto-gestionada. Mantener una única operación de creación evita divergencia conceptual. |
| ¿Layout nuevo? | No |
| Parámetros para que sirva a otros | `asNewVersion: Boolean = false` en mutation (requiere `prefillFrom`). En JSON del object: bloque `versioning` con `linkageField`, `versionField`, `versionStrategy` (`"user-provided"` \| `"increment"`), `auditSourceField` (default `"versionSourceId"`), `allowedFromStates` (opcional, codes), `initialStateField` (opcional), `initialStateValue` (opcional, code resuelto a id en runtime). |
| Errores expuestos | `OBJECT_NOT_VERSIONABLE` (si `asNewVersion=true` y el object no tiene `versioning` config) · `INVALID_SOURCE_STATE_FOR_VERSIONING` (si source no está en `allowedFromStates` post-resolucion code) · `AS_NEW_VERSION_REQUIRES_PREFILL` (si se invoca sin `prefillFrom`) · `VERSION_VALUE_REQUIRED` (si strategy es `user-provided` y `data.version` no viene en el input) · `INITIAL_STATE_CODE_NOT_FOUND` (si `initialStateValue` no existe como `WorkflowStatus.code` en la institucion del source) |
| Eventos y acciones expuestos | Audit event registrado con `versionSourceId = prefillFrom.sourceId` en el row del `changeLog`. Source del audit row queda `DirectEdit` / `Workflow` segun el canal real (no se introduce valor `"Clone"` en el enum). Consumidores pueden filtrar creates con `versionSourceId != null`. |

### 7.3 Ladrillo 3 — Query `getVersionChain` (object-manager)

| Campo | Respuesta |
|---|---|
| ¿Resolver custom? | **Sí.** Query genérica nueva — no existe equivalente. Razón: navegar el linaje requiere lógica que el CRUD generic no tiene. |
| ¿Layout nuevo? | No |
| Firma | `getVersionChain(objectType: String!, instanceId: ID!): [Instance!]!` |
| Comportamiento | Lee `versioning.linkageField` del JSON del object. Sigue la cadena en ambas direcciones desde `instanceId`. Retorna lista ordenada por `createdAt`. Cada item con flags computed `isLatest: Boolean` y `versionLabel: String` (valor del `versionField`, puede ser string libre o entero segun strategy). |
| Eventos y acciones expuestos | Query de lectura — no dispara eventos. Componentes de layout (sección "Versiones" en RecordDetail) la consumen. |

### 7.4 Ladrillo 4 — Row action con prefill + versioning (layout)

| Campo | Respuesta |
|---|---|
| ¿Layout nuevo? | **No.** Extensión del row action `create` existente del RecordList. |
| ¿Es versión de RecordList? | Sí — extensión, no nuevo layout. |
| Parámetros nuevos | `prefillFromCurrent: Boolean = false` · `asNewVersion: Boolean = false` (requiere `prefillFromCurrent: true`) · `label` (free string) · `redirectTo` existente. |
| Comportamiento | Si `prefillFromCurrent: true`, llama `createInstance` con `prefillFrom: { sourceId: <currentRowId> }`. Si además `asNewVersion: true`, pasa `asNewVersion: true`. Si el object tiene `versioning.allowedFromStates`, el botón aparece solo cuando el code del status actual del row está en la lista (visibilidad automática vía resolucion en runtime del cliente layout). |
| Eventos y acciones expuestos | Tras éxito redirige según `redirectTo`; tras fallo muestra toast con el error code del Ladrillo 2. |

---

## 8. Decisiones de diseño

| ID | Decisión | Default propuesto | Estado |
|---|---|---|---|
| D1 | ¿CurricularLink se vacía o se remapea al versionar Activity? | **Pendiente Esteban (PM)** — bloquea HU8 | **Pendiente** |
| D2 | Campos sobrescritos al versionar Activity | `exclude`: `currentStatusId`, `createdAt`, `approvedBy`, `previousVersionId`. `code` se hereda. `version` viene del input del usuario (user-provided). | Validar |
| D3 | Sintaxis polimorfica de `deepClone` para CurricularSection | Objeto con `via: "polymorphic" / "polymorphic-derived"`, `recursiveBy: "parentId"`, `remapFields` para FKs internas. Detalle en HU-2. | Validar |
| D5 | Constraint de unicidad sobre `code` | No constraint hard. Múltiples versiones con mismo `code` permitidas. Workflow gobierna vigencia. | Acepto |
| D7 | Límite de árbol para transacción | ≤200 nodos en SP4. Optimización para árboles grandes fuera de scope. | Acepto |
| D9 | `versionStrategy` default en SP4 | `user-provided` (Activity adopta con este) e `increment` disponible. `semver` para SP futuro. | **Cambio vs v1** |
| D10 | Si strategy=increment, ¿bump arranca en 1 o 2? | Instancia nueva nace `version=1`. Versión derivada de v1 → `version=2`. (No aplica a Activity, que usa user-provided.) | Acepto |
| D11 | Metadata `createdVia` en eventos | Sí, agregar — bajo costo, útil para auditoría. | Acepto |
| D12 | Asignación de HUs | A confirmar en planning con JuanDi y Eduardo. Pair en HU-1, HU-3. | Pendiente planning |
| D13 | ¿Se introduce `"Clone"` en enum `source` de changeLog? | **No.** El audit row queda con `source` segun el canal real (DirectEdit / Workflow). El versioning se distingue por `versionSourceId != null`. | **Nuevo en v2** |
| D14 | ¿Splittear HU-2 en simple + polimorfico? | Solo si scope crece — evaluar despues de spike de 1 dia con JuanDi sobre soporte de codegen para self-references reflexivas. | **Nuevo en v2** |

---

## 9. Historias de usuario (sprint 4)

Detalle completo de HUs en `historias-sprint-4_v2.md`. Resumen aqui:

### Track 1 — Core object-manager

- **HU-1** · `prefillFrom` param en `createInstance` (objectType + data + prefillFrom)
- **HU-2** · Config `prefillFrom` en JSON del object (sintaxis simple + polimorfica para CurricularSection)
- **HU-3** · `asNewVersion` param en `createInstance` con resolucion code→id para statuses + validacion `VERSION_VALUE_REQUIRED` para user-provided
- **HU-4** · Config `versioning` en JSON del object (linkageField FK reflexivo + versionStrategy: user-provided | increment)
- **HU-5** · Query `getVersionChain(objectType, instanceId)`
- **HU-6** · `createdVia` metadata en eventos BullMQ (`scratch | prefill | version`) + persistencia de `versionSourceId` en changeLog via n8n flow del mod

### Track 2 — Core layout

- **HU-7** · Row action con `prefillFromCurrent` + `asNewVersion` y visibilidad por `allowedFromStates` (codes)

### Track 3 — Aplicación en curriculum-design

- **HU-8** · Declarar `prefillFrom` polimorfico + `versioning` en `activity.json` + declarar `previousVersionId` como FK reflexivo (`isForeignKey: true, references: "Activity"`)
- **HU-9** · Agregar campo NUEVO `versionSourceId` en `changeLog.json` + actualizar flow n8n `audit-capture` del mod + actualizar resolver `recordAuditEvent`. **NO se toca el enum `source` ni el campo `sourceRefId`.**
- **HU-10** · Row action "Crear nueva versión" en RecordList de Activity con codes reales `["APR", "PUB"]`
- **HU-11** · Sección "Versiones" en RecordDetail de Activity — **discovery primero** sobre primitivos existentes; split a HU-11a / HU-11b si falta primitivo

### Track 4 — Documentación + adopción futura

- **HU-12** · Documentación de la capacidad para futuros adoptantes (incluye ejemplos de sintaxis simple Y polimorfica)

### Track 5 — Validación del proceso

- **HU-13** · Pair-programming inicial dev externo + dev core (HU-1, HU-3, HU-8) + retro

---

## 10. Fuera de alcance (explícito)

- Versionamiento de objetos distintos a Activity en SP4 (Syllabus, CurriculumPlan, CompetencyMap — adopción posterior).
- **Versionamiento masivo (job BullMQ asincrono con tracking de progreso)** — CAP-CUR-018 lo menciona; BR-VER-002 confirma que clonacion masiva es async. SP4 solo individual. SP futuro.
- `versionStrategy = "semver"` (solo `user-provided` e `increment` en SP4).
- Edición de la config `versioning` desde Object Manager Editor (UI declarativa para no-devs).
- Diff visual entre versiones (comparar v1 vs v2 lado a lado).
- Bloqueo de edición de versiones anteriores tras publicación (inmutabilidad post-aprobación).
- Optimización para árboles >200 nodos (timeouts de Prisma).
- Migración de Activities pre-versionamiento (no existen aún en producción).
- UI para el flag `includeRelations: true` del `prefillFrom` — en SP4 siempre se controla via JSON `deepClone`.
- Operacion "Duplicar" (clone sin linaje) a nivel UI — el mecanismo tecnico esta listo, falta el row action + decision PM de cuando habilitarlo.

---

## 11. Riesgos y dificultades posibles

| # | Riesgo | Mitigación |
|---|---|---|
| 1 | El dev externo (Eduardo) no logra entregar las HUs del core sin ayuda continua del dev core, ralentizando ambos | Pair-programming acotado a HU-1, HU-3 y HU-8 (la polimorfica es la mas compleja); resto se hace en paralelo con review async. Si en HU-2 Eduardo está bloqueado, JuanDi asume |
| 2 | El bloque `versioning` en JSON termina siendo verboso para activación en muchos objects | Aceptable en SP4 — si crece la adopción y se vuelve doloroso, agregar shortcut (ej. `"versionable": true` que aplica defaults razonables) |
| 3 | La transacción de versioning con `deepClone` polimorfico en árbol grande (>200 nodos) falla por timeout | Documentar el límite. Si en producción aparecen Activities reales con más nodos, levantar ticket de optimización (batched insert, raw SQL) |
| 4 | Conflicto entre `versioning.initialStateField` y validaciones de workflow (HU3/HU4): la nueva versión debería poder forzar estado `BOR` aunque la transición desde "nuevo" no esté declarada en `workflowTransition` | El resolver de Ladrillo 2 bypasea `transitionActivityValidated` al setear el estado inicial (solo aplica al primer set, no a cambios subsecuentes). Documentar explícitamente |
| 5 | Adoptantes futuros descubren limitaciones de los Ladrillos 1-4 que solo aparecen al usar | Test de adopción simulada (HU-12) intenta cubrir esto. Aceptar que la primera iteración puede requerir extensiones — el costo de descubrirlo ahora es mayor |
| 6 | Eventos BullMQ con `createdVia: "version"` no son consumidos por handlers existentes y se acumulan | Verificar que el handler del audit-chain (n8n flow del mod) consume el evento. Si otro handler espera distinto, agregarlo a `events/` del mod |
| 7 | El codegen del platform NO soporta self-references reflexivas en Prisma — HU8 quedaria bloqueada por la validacion de HU4 | **Mitigacion en spike de 1 dia (JuanDi)**: verificar que codegen genera `@relation` self-ref correctamente. Si no, HU4 baja la validacion de `linkageField FK reflexivo` a `should` con warning, no error. HU8 declara FK + valida en runtime el resolver de Ladrillo 2 |
| 8 | La sintaxis polimorfica de `deepClone` (CAMBIO-4) introduce complejidad alta en HU-2 que infla el SP de la HU | **Opcion A** (preferida): HU-2 entrega ambas sintaxis (simple + polimorfica) en SP4. **Opcion B** (fallback): si HU-2 crece demasiado, Activity arranca con hook custom del mod (`onClone` en resolver de curriculum-design) y la sintaxis polimorfica queda para SP5 — la HU8 se ajusta. Decision al final del spike tecnico |
| 9 | La decision D1 (links vaciados vs remapeados) no se resuelve a tiempo de planning | Sin D1 no se puede cerrar HU8. Esteban define antes del kick-off del sprint, o la HU8 queda con flag de feature pendiente |

---

## 12. Pendientes para Esteban / Klaus antes de aprobar

| # | Tema | Quien decide | Cita en KB |
|---|------|--------------|-----------|
| **P1** | CAMBIO-11 — ¿Links se vacian o se remapean al versionar? | Esteban (PM) | BR-VER-002 + CurricularLink.json |
| **P2** | CAMBIO-4 — ¿SP4 entrega sintaxis polimorfica completa, o Activity arranca con hook custom y la sintaxis va a SP5? | JuanDi + Klaus | Cambio tecnico de scope |
| **P3** | CAMBIO-8 — ¿Codegen del platform soporta self-references reflexivas hoy? | Spike tecnico de 1 dia (JuanDi) | Verificacion empirica en object-manager |

---

## 13. Próximos pasos (post-aprobación)

1. Klaus aprueba o pide ajustes.
2. Esteban resuelve P1.
3. JuanDi corre spike de 1 dia para resolver P2 y P3.
4. Si todo aprueba: las HUs se crean en Jira con este doc adjunto. Asignación según HU-13 (pair en HU-1/HU-3/HU-8).
5. Devs entregan en paralelo según el Flujo (paso 5: desarrollo + revisión paralela). Specs por HU se llenan con el template `_spec-template-es.docx.md`.
6. Al cierre del sprint: retro del proceso (HU-13) y lecciones aprendidas escaladas al equipo platform UP1.

---

## 14. Anexo — Configs completos de Activity (referencia rapida v2)

**`objects/activity.json` — fragmento agregado / modificado:**

```json
{
  "properties": {
    "previousVersionId": {
      "type": "string",
      "title": "Previous Version",
      "not_null": false,
      "description": "Versión anterior del mismo programa, en caso de existir.",
      "isForeignKey": true,
      "references": "Activity",
      "targetField": "id"
    }
  },
  "prefillFrom": {
    "exclude": [
      "currentStatusId",
      "createdAt",
      "approvedBy",
      "previousVersionId"
    ],
    "deepClone": [
      {
        "name": "sections",
        "via": "polymorphic",
        "object": "CurricularSection",
        "ownerTypeField": "ownerType",
        "ownerIdField": "ownerId",
        "ownerTypeValue": "Activity",
        "recursiveBy": "parentId"
      },
      {
        "name": "links",
        "via": "polymorphic-derived",
        "object": "CurricularLink",
        "derivedFrom": "sections",
        "remapFields": {
          "sourceSectionId": "sections.id",
          "targetSectionId": "sections.id"
        },
        "skipIfEmpty": true,
        "_comment": "Solo aplica si D1 se resuelve como 'remapear'. Si D1 = 'vaciar', remover este bloque del deepClone."
      }
    ]
  },
  "versioning": {
    "linkageField": "previousVersionId",
    "versionField": "version",
    "versionStrategy": "user-provided",
    "auditSourceField": "versionSourceId",
    "allowedFromStates": ["APR", "PUB"],
    "initialStateField": "currentStatusId",
    "initialStateValue": "BOR"
  }
}
```

**`objects/changeLog.json` — fragmento agregado (campo nuevo):**

```json
{
  "properties": {
    "versionSourceId": {
      "type": "string",
      "title": "Version Source ID",
      "not_null": false,
      "description": "ID de la instancia origen cuando esta fila refleja un Create derivado de versionamiento (asNewVersion=true). Distinto de sourceRefId — que captura el id del hijo polimorfico en el patron L40 de consolidacion al padre del audit chain SP3."
    }
  }
}
```

**`config/layouts/Activity-list.json` (PascalCase per RULE-platform-006) — row action agregado:**

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

---

## 15. Apendice — Evidencia de la revision tecnica v2

Cada decision del v2 se valido contra codigo o KB. Tabla de trazabilidad:

| Decision v2 | Evidencia |
|-------------|-----------|
| `versionStrategy: user-provided` default | `mods/curriculum-design/objects/activity.json:39-43` + CAP-CUR-018 verbatim |
| Nuevo campo `versionSourceId` (no reusar `sourceRefId`) | `mods/curriculum-design/objects/changeLog.json:91-119` + `logic/auditCapture.resolver.js:443-499` (uso productivo L40) |
| `duplicateReport` implementado y cableado | `object-manager/src/graphql/typeDefs/up1.js:382` + `resolvers/up1/report-builder/reportData.resolver.js:1197` + `resolverIndex.js:70-85` (dynamic loader) |
| `deepClone` polimorfico necesario | `mods/curriculum-design/objects/activity.json` (sin campo sections) + `objects/CurricularSection.json:17-29` (FK polimorfica abierta) |
| Codes `APR` / `PUB` (no `Approved` / `Published`) | `mods/curriculum-design/seed/_data-workflow-objects.js` (codes seed reales) |
| Resolucion code→id explicita | `mods/curriculum-design/objects/workflowStatus.json:11-14` (unique por institutionId) + `objects/activity.json:95-104` (FK a id) |
| `previousVersionId` requiere declaracion FK | `mods/curriculum-design/objects/activity.json:45-50` (sin isForeignKey) + `prisma/UPU/schema.prisma:502` (sin @relation) |
| `objectType` no `objectName` | `object-manager/src/graphql/typeDefs/static.js:1145` |
| Separacion Versionar / Clonar | BR-VER-002 + CAP-CUR-018 + CAP-CUR-022 |
