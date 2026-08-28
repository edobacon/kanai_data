---
id: TICKET-055
project: up1
type: ticket
status: closed
work_type: explore
module: core
autopilot: manual
---

# Registro de auditoría de calidad de código — Sprint SP3 (versionado/clonado de objetos curriculares)

## Request

> Revisión general de calidad de código de todo lo implementado este sprint (SP3): escalabilidad, claridad, huérfanos, magic numbers, etc. Reporte de todo lo que se pueda o deba mejorar. Registrar los hallazgos en un ticket para ver qué se puede abarcar y revisar (triage), sin ejecución inmediata.

## Classification

| Campo | Valor |
|-------|-------|
| Tipo de trabajo | explore (registro + triage de deuda técnica; sin execute) |
| Tipo de cambio | n/a (no modifica código — cataloga hallazgos) |
| Módulo principal | core / object-manager (mayor peso de ingeniería) |
| Módulos afectados | object-manager (UPONE-1206), layout (UPONE-1206), mods/curriculum-design (UPONE-1038) |
| Layer / épica | transversal: core (UPONE-1206) + mod clonación/versionado (UPONE-1216) |
| External | null — registro multi-épica. Los ítems que se promuevan tomarán el `external` del Jira correspondiente (DET-19) al despacharse |

## Alcance auditado

**Ventana**: 2026-05-28 → 2026-06-04. **Tema del sprint**: versionado (`asNewVersion`) y clonado (`prefillFrom`) de objetos curriculares, con enforcement RBAC (`requiredCapability`), unicidad scoped config-driven (`uniqueScopedBy`), derived remap polimórfico y UI de row actions.

| Repo | Líneas (diff) | Archivos fuente | Rango diff | Hallazgos |
|------|---------------|-----------------|------------|-----------|
| object-manager | +3.738 | 10 | `cecdb83^..HEAD` | 10 (2A / 5M / 3B) |
| layout | +3.070 | 18 | `d62258e^..HEAD` | 14 (3A / 6M / 5B) |
| mods/curriculum-design | +733 | 7 + JSON | `718e200^..HEAD` | 8 (1A / 4M / 3B) |
| suite | +218 | (solo i18n sync) | `b5e3d25^..HEAD` | — |
| **Total** | **~7.760** | **35** | — | **32 (6A / 15M / 11B)** |

**Método**: 3 agentes (sonnet, read-only) — uno por repo — sobre el diff del sprint. El hallazgo de mayor riesgo (A1) fue verificado manualmente leyendo el código. Working tree de los 3 repos confirmado intacto tras la revisión.

**Veredicto**: el diseño es sólido. La extracción de helpers puros y testeables (`prepareVersionData`, `enforceScopedUniqueness`, `deriveCreatedVia`, validators de codegen) es el patrón correcto y la cobertura de tests es buena (~20 archivos de test). Los hallazgos ALTA son acotados y atacables; el resto es deuda de mantenibilidad, no bugs.

## Backlog de triage — 32 hallazgos

> Columna **Decisión**: `por-triagear` por defecto. El dev/equipo marca `abarcar` (→ promover a ticket/session), `descartar` (con razón) o `diferir`. Cada hallazgo trae `archivo:línea` (DET-2: source_ref).

> **Triage 2026-06-05** — Promovidos a **ticket-056** (quick wins + type-safety, alcance **solo sprint-introducido**): **A5, A3, A4, M7, M2, B2, B3, B4, B9, M13**. Criterio: el fix NO toca consumidores pre-existentes (verificado por git blame). **A1** → `abarcar` parcial: solo el **guard** en `prepareVersionData` (rechazar `asNewVersion` sobre RT); la unificación del path RT con `$transaction` se registra como candidato a **RULE-core** (ver T1/L1) y NO se aborda ahora — git blame confirma que el path RT es **pre-existente** (marzo 2026), latente por Q1. Excluidos del cupo actual, siguen `por-triagear`: la **dedup transversal** (M1, M4, B8, B1, M8 — alcanzan código pre-sprint, requieren análisis de impacto colateral), **Bundle 3** (A2/T2/M5/M6 escalabilidad backend) y **Bundle 5** (M10/M11/A6/M12/B5 bugs de seed del mod). **BR-1** sigue fuera (no es código; TICKET-054).

### 🔴 ALTA (6) — atacar antes de cerrar SP3 o en follow-up inmediato

| ID | Repo | Archivo:línea | Hallazgo | Recomendación | Decisión |
|----|------|---------------|----------|---------------|----------|
| A1 | object-manager | `instance.resolver.js:2507-2548` | **(verificado)** Path RecordType de `createInstance` hace 4 writes (base/baseExt/rt/ext) sobre `prisma` y retorna en L2548, **antes** del `$transaction` Serializable (L3114) que solo cubre el path no-RT. Hoy: todo clone de un RT (ej. Modalidad) es no-atómico (fallo intermedio → row base huérfano). Latente: si un objeto versionable fuera RT, `asNewVersion` correría fuera de la atomicidad prometida (REQ-05). Sin guard que lo impida. | Envolver el bloque RT-create (L2501-2535) en su propio `$transaction` cuando hay múltiples writes; añadir guard en `prepareVersionData` que rechace `asNewVersion` sobre RT hasta unificar el path | **abarcar** (solo guard → ticket-056) · unificación → RULE-core/T1 |
| A2 | object-manager | `version-from-source.js:74-102` | `maxVersionInLineage` hace O(N) queries secuenciales (BFS con `await` por nodo) **dentro** del `$transaction` Serializable. A 20-30 versiones de linaje la tx se alarga y serializa a writers concurrentes → riesgo timeout/contención | Reemplazar por 2-3 queries batched (`findMany({ where: { id: { in: [...] } } })` por capa). Cubre también `getVersionChain` (mismo patrón) | por-triagear |
| A3 | layout | `useRowActionHandler.ts:37` | `EnhancedRowAction.redirectTo` es `'edit'\|'view'`, omite `'none'` que sí existe en `RowAction.redirectTo` (`recordlist.ts:223`) y se evalúa en `useCreateRowAction` (L134). El compilador nunca deja pasar `'none'` → TS pierde la garantía | Añadir `'none'` a la unión o eliminar la interfaz duplicada y usar `RowAction` directo | **abarcar** → ticket-056 |
| A4 | layout | `useRowActionHandler.ts:124,256` | `$t: Function` (any funcional) en dos firmas — desactiva verificación de aridad/retorno. La firma precisa ya existe (`CreateRowActionDeps.$t`) | `$t: (key: string, params?: Record<string, unknown>) => string` | **abarcar** → ticket-056 |
| A5 | layout | `RecordListElement.vue:35,67,79` | Tres `console.log` de debug sin guard (módulo + setup) → N×3 líneas de ruido por instancia, en producción | Eliminar o envolver en `if (import.meta.env.DEV)` | **abarcar** → ticket-056 |
| A6 | curriculum-design | `seed/_data-activity-migration.js:39` | `catch {}` captura cualquier error (conexión, tabla ausente, permiso) y retorna `{ skipped: true }` como no-op exitoso → migración marcada "ejecutada" sin correr | Capturar solo el error esperado (`err?.code==='P2009'`/mensaje NOT NULL); si es código muerto post-UPONE-1220, declararlo explícito | por-triagear |

### 🟡 MEDIA (15) — deuda técnica

| ID | Repo | Archivo:línea | Hallazgo | Recomendación | Decisión |
|----|------|---------------|----------|---------------|----------|
| M1 | layout | `useRowActionHandler.ts:56` · `useFieldConditions.ts:38` · `resolveModalTitle.ts:51` · `useSearch.ts` | `getNestedValue` reimplementado idéntico en 4-5 sitios | Extraer a `src/utils/getNestedValue.ts` | por-triagear |
| M2 | layout | `useRowActionHandler.ts:323-349` | `createDownloadTemplateHandler`/`createImportTemplateHandler` copia-pega | Extraer función privada compartida | **abarcar** → ticket-056 |
| M3 | object-manager | `instance.resolver.js:2408-2431` | Prefill RT inline duplica `applyPrefillFromSource` (la variante inline no está testeada) | Extender el helper con override de `pkField` | por-triagear |
| M4 | layout | `RecordList.vue:228,252` | Pluralización vía `.split('|')` repetida en 4 sitios | Helper `splitPlural` o `$tc` nativo de vue-i18n | por-triagear |
| M5 | object-manager | `scoped-uniqueness.js:53-70` | 2 `findMany` de `core_FieldDefinition` + N `findFirst` por llamada; se multiplica en bulk-create | Batch en un `OR` y/o cachear (config estable) | por-triagear |
| M6 | object-manager | `instance.resolver.js:3315-3319` | updateInstance RT: 3 `findFirst` del mismo objeto base + 2 `findUnique` redundantes | Consolidar lecturas; pasar `select` a `enforceScopedUniqueness` | por-triagear |
| M7 | layout | `useCreateRowAction.ts:38,40,42,68` | `apolloClient/objectType/record/rowId: any` con tipo conocido disponible | `ApolloClient`, `string\|Ref<string>`, `Record<string, unknown>` | **abarcar** → ticket-056 |
| M8 | layout | `CompositeSectionTreeElement.vue:67` | `500` hardcodeado en mensaje i18n cuando `SECTION_LIST_LIMIT` ya existe exportada | Importar la constante | por-triagear |
| M9 | layout | `useFriendlyErrors.ts:388` | `getCurrentInstance()` para obtener `$t` (queda null tras `await`/fuera de setup) | Recibir `$t` como parámetro, como `useCreateRowAction` | por-triagear |
| M10 | curriculum-design | `seed/_data-aiep.js:107` | `workflowStatus.findFirst({ allowsVersioning: true })` sin `institutionId` → puede tomar PUB de otro tenant en BD compartida | Mover tras resolver `institution` y filtrar por `institutionId` | por-triagear |
| M11 | curriculum-design | `config/layouts/default_Activity_view.json:393` | Filtro del tab Versiones solo por `code`, sin `institutionId` (riesgo cross-tenant si el motor no inyecta tenant) | Verificar inyección implícita; si no, añadir filtro `institutionId` | por-triagear |
| M12 | curriculum-design | `seed/_data-workflow-objects.js:206` | Spread condicional hace el `update` no idempotente sobre `initialStatusId` (re-seed con código cambiado no actualiza) | `update: { ..., initialStatusId: initialStatusId ?? null }` | por-triagear |
| M13 | object-manager | `version-from-source.js` (archivo) | Indentación con **tabs** mientras todo el repo usa espacios | Correr el formateador (prettier) | **abarcar** → ticket-056 |
| M14 | object-manager | `instance.resolver.js:3000-3109` | Cuerpo de `finalizeCreate` mal indentado (nivel de la declaración) en closure de ~110 líneas | Indentar el cuerpo un nivel | por-triagear |
| M15 | curriculum-design | `logic/helpers/getInitialStatus.js` | `getInitialStatusOrThrow` exportado **sin consumidor** este sprint (forward para HU-3/TICKET-039) | Aceptable si HU-3 planificada; marcar `// TODO(UPONE-HU3)` | por-triagear |

### 🟢 BAJA (11) — nits

| ID | Repo | Archivo:línea | Hallazgo | Recomendación | Decisión |
|----|------|---------------|----------|---------------|----------|
| B1 | object-manager | `index.js:71` | Regex de `P2002` frágil ante cambios de formato de Prisma | `/\(([^)]+)\)\s*$/` y limpiar backticks | por-triagear |
| B2 | layout | `useCreateRowAction.ts:59` | `unwrapRef` usa duck-typing (`'value' in value`) en vez de `isRef` | `import { isRef } from 'vue'` | **abarcar** → ticket-056 |
| B3 | layout | `humanizeObjectName.ts:33` | Flag `i` innecesario sobre prefijos siempre-lowercase (`up1`/`ext`) | Quitar el flag `i` | **abarcar** → ticket-056 |
| B4 | layout | `useRowActionHandler.ts:307` | `catch {}` en query RT sin log → falla de config silenciada | Añadir `console.warn` | **abarcar** → ticket-056 |
| B5 | curriculum-design | `logic/auditCapture.resolver.js:555` | `catch {}` codifica error de BD como "origen no existe" (mensaje engañoso) | Mensaje distinto en el catch (posible error de BD) | por-triagear |
| B6 | curriculum-design | `logic/helpers/getInitialStatus.js:54` | Code de error embebido en mensaje string en vez de `Error.code` estructurado | `Object.assign(new Error(msg), { code })` | por-triagear |
| B7 | object-manager | `deep-clone-polymorphic.js:195` | `CLIENT_CODE` leído al module-load; el resto lo lee en tiempo de llamada (rompe tests que parchean env) | Leer en tiempo de llamada o helper `getClientCode()` | por-triagear |
| B8 | layout | `recordlist.ts` (28,37) | `FieldCondition`/`ConditionGroup` definidos dos veces (también en `useFieldConditions.ts`) | Tipo canónico único e importar | por-triagear |
| B9 | object-manager | `validate-polymorphic-children-derived.js:135` | Variable `prefix` sombreada/sin uso en el `forEach` | Eliminar la declaración | **abarcar** → ticket-056 |
| B10 | layout | `CompositeSectionView.ts:22` | `FOCUSABLE_SELECTOR` hardcodeado (a11y reutilizable) | Extraer a util si se reusa | por-triagear |
| B11 | curriculum-design | `objects/activity.json:27` | `requiredCapability` bajo `versioning`; otros objetos lo ponen bajo `prefillFrom` (inconsistencia declarativa) | Confirmar qué bloque lee el motor para el gate; unificar/documentar | por-triagear |

## Temas transversales

| # | Tema | Hallazgos relacionados | Nota |
|---|------|------------------------|------|
| T1 | **Atomicidad multi-write del path RT** | A1 | Riesgo arquitectónico de fondo: clone/versionado de RTs hace 4+ writes sin transacción. Vale unificar el path RT con `finalizeCreate`/`$transaction` en vez de dos caminos divergentes con early-return |
| T2 | **Recorrido de linaje O(N) secuencial** | A2 | Aparece en 3 lugares (`maxVersionInLineage`, `getVersionChain`, forward-BFS). Sin tope al largo del linaje. Batchear cubre los tres |
| T3 | **Duplicación extendida en layout** | M1, M4 | `getNestedValue` y la pluralización por split son la duplicación más repetida (4-5 copias cada una) |
| T4 | **`cloneChildProjections` sin tests unitarios** | — | Función nueva (~3-4 queries por hijo), lógica de detección RT compleja, a diferencia del resto de helpers del sprint |

## Lo que está bien hecho

- Helpers puros y testeables (`prepareVersionData`, `enforceScopedUniqueness`, `deriveCreatedVia`).
- `validate-polymorphic-children-derived.js` — shape + cross-checks en funciones puras con degradación graceful; referencia de calidad del sprint.
- Migración de unicidad de hardcoded (CurricularSection+{name,code}) a config-driven (`uniqueScopedBy` leído de `FieldDefinition`).
- CompositeSectionTree: WAI-ARIA correcto, cleanup de Sortable en `onBeforeUnmount`.
- `$transaction` Serializable + guard de ciclo en BFS para `asNewVersion` (path no-RT).

## Blast radius — análisis de impacto colateral

> El sprint tocó superficies COMPARTIDAS (resolvers CRUD genéricos, codegen, composables de layout) usadas por funcionalidades que NO son versionado/clonado. Esta sección analiza a quién más puede afectar lo nuevo. Método: 3 agentes (sonnet, read-only) trazando consumidores + verificación empírica en DB (docker `pg`, 17 tenants). Working tree de los 3 repos intacto tras el análisis.

### Modelo de tenancy (contexto que acota el riesgo)

**Per-base-de-datos**: cada tenant es una DB separada (`uplanner_upu`, `uplanner_ucasmt`, `uplanner_demo01`, …) resuelta por `tenantManager.js` vía `DATABASE_URL_<TENANT>`. **Fuga cross-tenant es estructuralmente imposible.** `institutionId` es un scope **intra-tenant** (una misma DB de tenant puede tener varias instituciones, ej. UPU). No hay inyección automática de `institutionId` en queries: existe `getBusinessContextFilter` (por `contextPath`) aplicado a todo `listInstances`, pero no cubre `institutionId` como discriminador directo y los usuarios con `system` access lo bypassan.

### Hallazgos de impacto colateral

| ID | Riesgo | Superficie | Efecto sobre lo EXISTENTE (no clone/version) | Estado empírico | Acción |
|----|--------|-----------|----------------------------------------------|-----------------|--------|
| BR-1 | **ALTO** | `enforceScopedUniqueness` config-driven + sync por tenant | **Enforcement asimétrico entre tenants**: el mismo código rechaza duplicados en unos tenants y en otros no, según si `core_FieldDefinition.uniqueScopedBy` fue poblado por el codegen de ese tenant. Comportamiento divergente del invariante de integridad por cliente. | **Confirmado por SQL**: ON en UPU(2) y demo01(2); **OFF en basemodel(0), UCASMT(0), UCENG(0), UCPLN(0)** — 3 clientes reales sin enforcement | Re-codegen de los tenants OFF (TICKET-054 B1). **Data-safe**: BR-2 confirma 0 duplicados preexistentes en esos tenants |
| BR-2 | **ALTO → no activo** | `createInstance`/`updateInstance` path RT (`543eb8b`, `d59cac4`) | `enforceScopedUniqueness` corre en create **Y update de TODO RT** (no solo clone). Un duplicado legacy en el scope bloquearía un update que no toca el campo único, o un create batch (import/n8n) con repetidos que antes pasaba. | **Mitigado empíricamente**: SQL `GROUP BY ownerId,recordType,name/code HAVING count>1` = **0 grupos en TODOS los tenants** (UPU, demo01, UCASMT, UCENG, UCPLN). El escenario de regresión no está activo en datos actuales | Vigilar flujos de import masivo/n8n que crearan RT con name/code repetido (antes tolerado). Sin acción de datos requerida |
| BR-3 | **MEDIO** | `RecordListElement.vue:99-111` — handler `navigate-to-relation` en listas embebidas | Una lista embebida (Vueform) DENTRO de un modal ahora ejecuta `router.push` directo; `ModalStackManager.vue:931` ya maneja el mismo evento → posible **doble navegación** (modal abre + página navega). Patrón existente en vistas de Activity con record-lists en tabs. | No verificado en UI | **Verificación UI**: RecordDetail con tabs de record-list embebida → click en link de relación. Confirmar que no dispara navegación de página con modal abierto |
| BR-4 | **MEDIO** | `ModalStackManager.vue:723` — `humanizeObjectName` en títulos | TODO modal abierto sin `objectLabel`/`title` explícito ahora pasa el `objectName` por `humanizeObjectName` → cambio **visual** del título en modales de edición de relaciones de toda la plataforma (camelCase/`up1_*`). No funcional. | No verificado; edge-cases posibles (`"base"`, nombres de 2 segmentos) | Verificación visual + cubrir edge-cases en `humanizeObjectName.spec.ts` |
| BR-5 | **BAJO** | `formatError` → `code: UNIQUE_VIOLATION` (`8f5b1a1`, `bba225b`) | Cambió la forma del error P2002 de toda mutación. | Consumidores en código OK: layout usa `extensions.code` + regex que matchea ambos formatos. **Sin consumidores en flow/n8n** que parseen el nombre de índice Prisma | Aditivo/compatible. Sin acción |
| BR-6 | **BAJO** | `useFieldConditions.ts:66,69` — `==`→`===` | Cambio semántico en el evaluador de condiciones de visibilidad de TODA la plataforma. | Corpus auditado: todas las condiciones comparan **tipos homogéneos** (bool vs bool, string vs string). Ningún caso de coerción que `==` resolvería distinto. Suite layout 926 tests verde | Riesgo teórico. Sin acción (mejora correcta) |
| BR-7 | **BAJO** | `finalizeCreate`/`$transaction` + `deriveCreatedVia` | Create NORMAL (no-RT, `asNewVersion=false`) corre `finalizeCreate(prisma)` **byte-idéntico** al previo. `deriveCreatedVia` inyecta `_createdVia`/`_versionSourceId` en todo create, pero los consumidores (auditCapture) los leen condicionalmente. | Refactor a closure sin diferencia observable; `data` es JSON en el SDL (no rompe schema) | Correr suite de creates sin `asNewVersion`. Sin acción de datos |

### Dudas resueltas (condicionaban severidad)

| # | Pregunta | Resultado | Evidencia |
|---|----------|-----------|-----------|
| Q1 | ¿Algún objeto **versionable** es un RT hoy? | **NO** — el único objeto con bloque `versioning` es `Activity`, un objeto **base** (`isRecordType: None`, no `rt__`). → A1 worst-case (atomicidad de `asNewVersion` en RT) es **latente**; lo ACTIVO de A1 es el clone de RTs (Modalidad) como multi-write no-atómico | `objects/business/Base/activity.json` |
| Q2 | ¿El motor inyecta `institutionId` automáticamente? | **NO** (ver Modelo de tenancy). Tenancy per-DB → cross-tenant imposible; `institutionId` intra-tenant sin scope automático | `tenantManager.js`, `businessContextFilter.js:84-211`, `instance.resolver.js:1261` |
| M10 | seed `workflowStatus.findFirst` sin `institutionId` | **Bug real (intra-tenant)** — L107 toma cualquier status `allowsVersioning` de la DB; `WorkflowStatus` tiene `institutionId` e `institution.id` ya está en scope (L142). En tenant multi-institución toma el de otra institución | `mods/curriculum-design/seed/_data-aiep.js:107,142` |
| M11 | tab Versiones sin `institutionId` | **Riesgo acotado** — `Activity` NO tiene `institutionId` (scope indirecto vía `executionUnitId→OrgUnit`). Fuga solo intra-tenant si 2 instituciones comparten `code` de programa en la misma DB. No es cross-tenant | `default_Activity_view.json:393` |

## Próximo paso (triage)

Este ticket es el registro único. Para "abarcar" ítems: el dev marca la columna **Decisión** y los `abarcar` se promueven a tickets/sessions propios (cada uno con su `external` Jira por DET-19). Sugerencia de orden: resolver Q1/Q2 primero (desambigua A1, M10, M11), luego ALTA, luego MEDIA por tema (duplicación, escalabilidad backend), BAJA en barrido oportunista.

> **Ronda 1 de triage completada (2026-06-05)** — ver `## Summary`. El registro queda como fuente de los ítems aún `por-triagear`; promociones futuras lo referencian (o lo reabren) sin perder trazabilidad.

## Summary

### What was requested
Revisión general de calidad de código de lo implementado en SP3 (escalabilidad, claridad, huérfanos, magic numbers) + registro de hallazgos para triage, sin ejecución inmediata.

### What was done
- Auditoría de ~7.760 líneas en 3 repos (object-manager, layout, mods/curriculum-design): **32 hallazgos** (6A/15M/11B) + **7 de blast radius** + dudas resueltas (Q1/Q2/M10/M11), con verificación empírica en código y DB multi-tenant.
- **Ronda 1 de triage (2026-06-05)**: promovidos **11 ítems** a **TICKET-056** (improvement, external UPONE-1219) — quick wins + type-safety **sprint-introducidos** + el **guard de A1** (verificado por git blame: el path RT es pre-existente, marzo 2026; solo se promueve el guard, no la unificación).
- Resto **diferido / `por-triagear`** (documentado en este registro): dedup transversal (M1/M4/B8/B1/M8 — tocan código pre-sprint), Bundle 3 escalabilidad backend (A2/T2/M5/M6), Bundle 5 bugs de seed del mod (M10/M11/A6/M12/B5). BR-1 fuera (no es código; TICKET-054).

### What was discovered
- Decisions: triage round 1 (`decisions_log`) — criterio "promover solo fix sobre código sprint-introducido".
- Learns refinados: L1 → TICKET-056 B1 (RULE-core atomicidad); L2 → TICKET-054 + memoria scoped-uniqueness; L3 → memoria de feedback audit-scope/blast-radius.

### Cierre
Explore/registro sin spec ni execute. Triage round 1 entregado; accionables promovidos. Se cierra como registro de auditoría; los ítems `por-triagear` permanecen documentados para promoción futura. Teach-close `n/a` (explore exento, DET-22).

## Learns

| # | Learn | Detected by | Status | Promoted to |
|---|-------|-------------|--------|-------------|
| L1 | T1/T2 son candidatos a RULE-core de plataforma: atomicidad multi-write del path RT (todo clone de RT hace 4+ writes sin transacción) y tope/batching del recorrido de linaje (O(N) queries en tx Serializable). | auditoría TICKET-055 | refined | T1 (atomicidad) → TICKET-056 backlog B1 (candidato RULE-core). T2 (batching linaje) → sigue `por-triagear` (Bundle 3, no promovido) |
| L2 | **El enforcement config-driven produce comportamiento ASIMÉTRICO entre tenants** cuando depende de un dato (`uniqueScopedBy` en `core_FieldDefinition`) poblado por el codegen per-tenant. Confirmado por SQL: 2 de 6 tenants lo tienen; 3 clientes reales (UCASMT/UCENG/UCPLN) corren con el invariante apagado en silencio. Regla operativa: un invariante config-driven debe verificarse POR TENANT, no asumir que "el código está mergeado" = "aplica en todos lados". [[reference_up1_scoped_uniqueness_configdriven_failsilent]] | blast radius TICKET-055 (SQL multi-tenant) | refined | data fix en TICKET-054 (re-codegen tenants OFF); memoria [[reference_up1_scoped_uniqueness_configdriven_failsilent]] |
| L3 | **Cambiar el path CRUD genérico (createInstance/updateInstance RT) para una feature acotada (clone) cambia el comportamiento de TODO objeto de ese tipo.** `enforceScopedUniqueness` se agregó para clone pero corre en create+update de todo RT. Verificar siempre: ¿el cambio vive en un branch que solo toca la feature, o en el path común? Si es común, el blast radius incluye datos legacy (acá: 0 duplicados → safe, pero hubo que confirmarlo con SQL, no asumirlo). | blast radius TICKET-055 | refined | memoria de feedback `feedback-audit-scope-our-changes-blast-radius` (auditar sobre nuestros cambios, medir blast radius, no tocar código ajeno) |

## Teaching — Intake

**Status**: skipped
**Razon**: el ticket REGISTRA una auditoría ya realizada (modo conversacional, autopilot false). No hay dominio nuevo que enseñar: el material analítico (32 hallazgos con archivo:línea, racional y recomendación + temas transversales) vive inline en el cuerpo del ticket. No se generó teach-intake.html aparte.
