---
id: TICKET-137
project: up1
type: ticket
status: closed
work_type: implement
external: UPONE-1530
module: curriculum-mapping
autopilot: manual
---

# Curriculum Mapping · MCP sync

## Request

Exponer el dominio de curriculum mapping en el servidor MCP con operaciones consultables y gobernadas, respetando los permisos del usuario real y los protocolos del MCP. Alcance completo (subconjunto estable, lectura): habilitar el dominio de curriculum mapping en el servidor MCP; exponer los objetos estables (esquemas de niveles, escalas de cobertura, matriz en lectura); operaciones consultables y gobernadas con verificación de permisos; pruebas según el patrón del MCP (lógica pura con dobles); y actualización del catálogo y la documentación de operaciones. La implementación es en el repositorio del MCP (producto aparte); no modifica el mod de up1 ni los workspaces core. Dependencias: UPONE-1454, UPONE-1455, UPONE-1537 Finalizados. Coordinar con UPONE-1633 (construye las partes diferidas de la matriz en SP9; no cambiar el contrato del objeto expuesto), UPONE-1619 (acuerdo de sincronización MCP del sprint) y UPONE-1615 (los nombres de rol son frontera del MCP). Ticket condicional a confirmar ejecución en SP9.

## Classification

| Campo | Valor |
|-------|-------|
| Tipo de trabajo | implement |
| Tipo de cambio | — |
| Modulo principal | curriculum-mapping |
| Modulos afectados | — |

## Triage

> Alcance resuelto (pre-intake 2026-08-18): **solo lectura del subconjunto estable** — esquema de
> niveles (LevelScheme), esquema de cobertura (CoverageScheme) y la matriz de competencia en lectura
> (CompetencyNode). Sin operaciones de escritura en el mod. El testing automatizado E2E se separa a
> `kb/sp9/FOLLOWUP-mcp-testing-automatizado.md`.

### Hipotesis

> **SUPERSEDED (2026-08-27):** H1-H8 se confirmaron contra el MCP VIEJO `up1-mcp`/Elric (TypeScript, stdio, `~/Workspace/uplanner/mcp`). Sus conclusiones de dominio siguen valiendo (permisos como frontera, filtrar por recordType, lectura por genericas), pero sus refs file:line apuntan al codigo viejo. Refs vigentes: los REQs y learns del ticket (target `@uplanner/mcp`).

| # | Hipotesis | Status | Evidencia |
|---|-----------|--------|-----------|
| H1 | Declarar el `objectType` en el allowlist del pack + su contrato alcanza para CONSULTAR via CRUD generico, sin operaciones de dominio | ✓ confirmed | **backend/config:** `docs/EXTENDING.md:31-71` (Receta 1 — CRUD por config, cero codigo de op). **backend:** allowlist = union de `pack.objects` en runtime (`src/mods/index.ts:35-39`, `allowedObjectTypes()`). **backend:** el guard del CRUD generico gatea solo allowlist + auth (`src/tools/objects.ts:24-36`); `list_objects`/`get_object`/`query_records` solo exigen `objectType:view` (`src/tools/objects.ts:73,125,162`). Gate: sin el objeto en el allowlist ni el generico lo toca (`objects.ts:28-33`). Es la hipotesis que define el costo del ticket. |
| H2 | Los resolvers gobernados de F1/F2 bastan para escritura sin crear operaciones nuevas en el mod | ~ partial (fuera de alcance) | **backend:** existen resolvers gobernados (`mods/curriculum-mapping/logic/levelScheme-upsert.resolver.js`, `coverageScheme-upsert.resolver.js`, `competencyMatrix-create.resolver.js`, `competencyMatrix-update.resolver.js`). NO se ejercita: alcance decidido = lectura. Escritura via MCP requeriria una tool de dominio (Receta 2, `EXTENDING.md:86-166`) que invoque esas mutations validadas. Diferido a un ticket de escritura futuro. |
| H3 | Objetos sin resolver de escritura propio no se exponen para escritura sin construir esa op en el mod | ✓ confirmed (por ausencia) | **backend:** `CompetencyAlignment.json`, `RubricDescriptor.json`, `RubricDimension.json` existen como schema en `objects/` pero no tienen `*.resolver.js` en `logic/`. Fuera de alcance (lectura). Frontera Aduana: exponerlos para escritura crearia trabajo dentro del mod y cambiaria el veredicto `mod-only`. |
| H4 | Los permisos del usuario real filtran las operaciones de lectura del dominio | ✓ confirmed | **backend (MCP):** `src/auth/permissions.ts:134-144` — `ensure(ctx, objectType, "view")` deriva `objectType:view` y lanza PERMISSION_DENIED si falta; fuente `getMyPermissions` por rol activo (`permissions.ts:34-44`). **config/RBAC (mod):** `levelscheme:view` y `coveragescheme:view` declaradas object-level en `mods/curriculum-mapping/capabilities.json`; `competencynode:view` auto-generada y cableada a roles curriculares en `mods/curriculum-mapping/seed/_data-rbac.js:90,149`. Doble frontera: allowlist (`objects.ts:28-34`) + capability. |
| H5 | Las escrituras via MCP quedan auditadas igual que la UI (DataLog) | ✗ N/A este ticket (lectura) | Hallazgo relevante: los 3 objetos declaran `enableDataLog: false` en su metadata (`LevelScheme.json:6`, `CoverageScheme.json:6`, `CompetencyNode.json:6`). Ni siquiera desde la UI pasan por DataLog. No se ejercita aqui (sin escrituras). Registrar para el ticket de escritura futuro: la auditoria de estos objetos no existe hoy. |
| H6 | UPONE-1633 cambia la forma de los objetos que este ticket expondria (matriz) | open (coordinacion) | No verificable solo por codigo. 1633 construye en SP9 las partes diferidas de la matriz (arbol de competencias / adopcion). **Mitigacion:** el alcance es lectura y la salida se proyecta por `publicFields` (`objects.ts:79,138,165`) — agregar campos/recordTypes es aditivo-safe, no rompe la lectura → retrabajo BAJO. Gap activo: confirmar con el dueno de 1633 antes de fijar el subconjunto. |
| H7 | Paquete nuevo `src/mods/curriculum-mapping/` vs sumar objetos al pack de curriculum-design | open (decision de diseno) | **backend:** Receta 3 (`EXTENDING.md:169-224`) favorece pack nuevo autocontenido (`src/mods/index.ts:17` = 1 linea append-only). `ModObject` soporta discriminador `recordType` (`src/mods/types.ts:21-26`); el registry keyea por `objectType[:recordType]` con guard de unicidad (`src/contracts/registry.ts:62-69`). curriculum-mapping no comparte objectTypes con CD → sin conflicto de clave. Lo resuelve design. |
| H8 | La lectura de la matriz (y de los esquemas) requiere filtrar por `recordType` | ✓ confirmed | **schema:** `CompetencyNode` reparte recordTypes Matrix/Competency/SubCompetency en la tabla base (`CompetencyNode.json:38-43`; `objects/RecordTypes/rt__Matrix|Competency|SubCompetency__competencynode.json`). `list_objects` sobre el base los devuelve mezclados; `query_records` con filtro `recordType EQUALS Matrix` acota (`src/tools/objects.ts:106-131`). LevelScheme/CoverageScheme igual (Scheme/Level). El "como" del filtrado lo define design. |

### Context found

> **SUPERSEDED (2026-08-27):** Este Context found se verifico contra el MCP VIEJO `up1-mcp`/Elric (stdio, TS, `~/Workspace/uplanner/mcp`), deprecado. El target real es `@uplanner/mcp` (JS, `~/Workspace/uplanner/up1/mcp`, rama develop): descubrimiento por carpeta (discoverModPacks), sin `MODS` ni `docs/EXTENDING.md`, tests `node test/*.mjs`, catalogo = about dinamico.

**KB previo (detective-mode, verificado):**
- `kb/sp9/UPONE-1530-detalle.md` — contrato del ticket (historia, alcance dentro/fuera, AC, DoD, estimacion 3 SP, guia de reglas).
- `kb/sp9/UPONE-1530-pre-intake.md` — mapa de enfoques (Opcion A recomendada: subconjunto estable en lectura), hipotesis H1-H6, decisiones resueltas 2026-08-18 (lectura), frontera Aduana N/A.
- `kb/sp9/UPONE-1530-explicativo.html`, `kb/sp9/FOLLOWUP-mcp-testing-automatizado.md` (testing E2E separado del ticket).

**Codigo MCP (repo `up1-mcp`, `/Users/edobacon/Workspace/uplanner/mcp`, rama main, commit 68c75ef, working tree limpio):**
- `src/mods/index.ts` — manifiesto append-only `MODS` (hoy: curriculum-design, uengagement, layouts), allowlist derivado `allowedObjectTypes()`, ruteo y self-doc. curriculum-mapping NO figura.
- `src/mods/curriculum-design/index.ts` + `graduation-profile.ts` — molde de pack completo (allowlist, contratos, tools, auth, permisos como frontera, preview→commit).
- `src/tools/objects.ts` — CRUD generico config-driven (guard allowlist + auth + `objectType:accion`).
- `src/auth/permissions.ts` — `ensure`/`ensureCapability`, doble frontera RBAC.
- `src/contracts/registry.ts` — `ObjectContract` (soporta `recordType`, `validatedMutations`, `blockGenericMutation`, `enumLabels`, `fieldDocs`).
- `docs/EXTENDING.md` (3 recetas + checklist :332-342), `docs/ROADMAP.md` (sin curriculum-mapping), `docs/TOOLS.md`, `manifest.json`, `docs/CAPABILITIES.md`.

**Backend del dominio (`uplanner/up1/mods/curriculum-mapping`, rama develop):**
- `objects/` — 7 objetos: LevelScheme, CoverageScheme, CompetencyNode (F1/F2, con resolver gobernado), CompetencyAlignment, RubricDescriptor, RubricDimension (schema sin resolver de escritura propio).
- `objects/RecordTypes/` — rt de LevelScheme (Scheme/Level) y CompetencyNode (Matrix/Competency/SubCompetency); CoverageScheme sin rt (todo base).
- `logic/` — resolvers gobernados: levelScheme-upsert, coverageScheme-upsert, competencyMatrix-create/update.
- `capabilities.json` + `seed/_data-rbac.js` — capabilities object-level y su cableado a roles curriculares (tenant UPU).

**KB DKC del modulo:** no hay rules/bugs/specs previos de curriculum-mapping (dominio nuevo en el MCP).

**Precondiciones operativas (3b):**
- Repo MCP disponible y limpio: confirmado (main, 68c75ef).
- Verificacion real: el MCP `up1-mcp` esta accesible en este host (auth email OTP); la verificacion manual contra la plataforma es el estandar actual (integracion E2E declarada pendiente en ROADMAP). — asumido reachable, validar en execute.
- Backend curriculum-mapping desplegado en tenant de prueba (UPU): asumido; validar que el rol de prueba tenga `*:view` en execute.

## Setup

### Environment
| Campo | Valor |
|-------|-------|
| Branch | feature desde develop en `curriculum-mapping.git` (pack `ai/`) + checkout del MCP `~/Workspace/uplanner/up1/mcp` en `develop` para el sync |
| Base branch | develop (mod y MCP) |
| DB state | tenant de prueba UPU con LevelScheme / CoverageScheme / matriz raiz sembrados |
| Services | MCP `@uplanner/mcp` (HTTP+OAuth Clerk) + object-manager (GraphQL) + tenant UPU |
| Test data | esquemas de niveles y cobertura + al menos una matriz raiz en UPU; un rol CON y un rol SIN la capability de lectura del dominio |

## Learns

| # | Learn | Detected by | Session | Status | Promoted to |
|---|-------|-------------|---------|--------|-------------|

## Failed approaches

| # | Approach | Why it failed | Learned |
|---|----------|---------------|---------|

## Sessions

### Plan de sessions (preplanificacion)

> **SUPERSEDED (2026-08-27):** Este esqueleto describe el enfoque del MCP viejo (pack en `src/mods/*.ts`, `MODS`, vitest, docs/*). El plan vigente esta en el spec (`## Tasks`): S1 pack en el repo del mod + sync; S2 verificacion runtime + permisos (incl. rol negativo S2.T3); S3 tests `.mjs` + about/KB. Target: `@uplanner/mcp`.

3 sessions previstas. **Esqueleto producido por `intake-explore`.** El detalle final (tasks asignadas,
gate criteria especificos) lo completa `design-feature` al generar el spec. Cada session puede
subdividirse o colapsarse durante execute si el tamano real difiere. Todo el trabajo vive en el
repositorio del MCP (`up1-mcp`), fuera de up1.

| # | Objetivo | Fase | Tier | Tasks previstas | Gate type | Gate criteria |
|---|----------|------|------|-----------------|-----------|---------------|
| S1 | Habilitar el dominio: pack nuevo `curriculum-mapping` (Receta 3) con allowlist + contratos de LevelScheme/CoverageScheme/CompetencyNode + self-doc, y 1 linea en el manifiesto | 1 | T2 | crear `src/mods/curriculum-mapping/index.ts` (objects, contracts, routingHints, about, domainDoc, notExposed); entradas `ObjectContract` en `src/contracts/registry.ts`; registrar pack en `src/mods/index.ts` (MODS) | auto | build verde (tsc); pack registrado; allowlist incluye los 3 objectTypes; sin conflicto de clave en el registry |
| S2 | Verificacion de lectura real + permisos contra la plataforma (usuario autenticado) | 2 | T3 | auth usuario real (OTP); consultar cada objeto (list + query filtrando `recordType`=Matrix/Scheme); verificar datos reales del tenant; verificar rol sin capability → operacion rechazada (H1/H4/H8 empiricas) | ⚑ fuerte | consulta devuelve registros reales del tenant; objeto no habilitado rechazado; rol sin `*:view` recibe PERMISSION_DENIED; evidencia runtime capturada |
| S3 | Tests de logica pura + catalogo y documentacion + frontera de lo diferido | 3 | T1 | tests de contrato (vitest) de los objetos nuevos; actualizar `docs/TOOLS.md`, `manifest.json`, `docs/CAPABILITIES.md`, `docs/ROADMAP.md`; documentar la frontera de lo que quedo fuera (escritura, matriz diferida, objetos sin resolver) | auto | `npm run build` + `npm test` verdes; checklist EXTENDING `:332-342` cubierto; frontera documentada |

**Notas del esqueleto:**
- Numeracion continua (DET-20): el ticket no tiene sessions registradas previas → el plan arranca en S1.
- S2 es el gate ⚑ fuerte: valida empiricamente H1/H4/H8 contra la plataforma real; los tests del MCP
  (S3) son logica pura con dobles y NO sustituyen esta verificacion (advertencia del pre-intake).
- Dependencia de secuencia (H6): antes de fijar el subconjunto de CompetencyNode a exponer, coordinar
  con el dueno de UPONE-1633 (partes diferidas de la matriz). Riesgo BAJO por ser lectura + aditivo-safe.
- H7 (pack nuevo vs sumar a curriculum-design) la resuelve `design-feature`; el esqueleto asume pack
  nuevo (Receta 3), la opcion mas limpia.

## Testing

### Coverage map

| REQ | Test cases | Type | Status |
|-----|-----------|------|--------|
| REQ-01 | 4 casos | contrato/runtime | pending |
| REQ-02 | 3 casos | contrato/runtime | pending |
| REQ-03 | 4 casos (1 diferido) | contrato/runtime | pending |
| REQ-04 | 3 casos | contrato/runtime | pending |
| REQ-05 | 3 casos (1 diferido) | contrato/runtime | pending |
| REQ-06 | 3 casos | contrato/runtime | pending |
| REQ-07 | 3 casos | contrato/runtime | pending |
| REQ-08 | 3 casos (1 diferido) | contrato/runtime | pending |
| REQ-09 | 3 casos | contrato/runtime | pending |
| REQ-10 | 3 casos | contrato/runtime | pending |

### Test cases

| # | Case | REQ | Type | Precondition | Steps | Expected | Actual | Evidence | Status |
|---|------|-----|------|-------------|-------|----------|--------|----------|--------|
| 1 | REQ-01: Tras crear `ai/index.js` en curriculum-mapping.git y correr `npm run sync --workspace=mcp`, existe `src/mods/cur | REQ-01 | happy | — | — | — | — | — | pending |
| 2 | REQ-01: `about` lista curriculum-mapping entre los dominios activos con su routing y domainDoc. | REQ-01 | happy | — | — | — | — | — | pending |
| 3 | REQ-01: `git status` del repo del MCP no muestra cambios en `src/mods/index.js` ni archivos nuevos versionados bajo `src | REQ-01 | regression | — | — | — | — | — | pending |
| 4 | REQ-01: Si el pack no se sincroniza (sin correr sync), curriculum-mapping no aparece en `about` y sus objetos no son alc | REQ-01 | error | — | — | — | — | — | pending |
| 5 | REQ-02: La lectura de LevelScheme, CoverageScheme y la matriz raiz devuelve campos con etiquetas de negocio y referencia | REQ-02 | happy | — | — | — | — | — | pending |
| 6 | REQ-02: El contrato de CompetencyNode cubre unicamente `rt__Matrix__competencynode`; no declara Competency ni SubCompete | REQ-02 | boundary | — | — | — | — | — | pending |
| 7 | REQ-02: Los contratos viven en `contracts.js` del pack; ningun archivo de registro central del MCP fue modificado. | REQ-02 | regression | — | — | — | — | — | pending |
| 8 | REQ-03: usuario con capability de lectura consulta -> devuelve los esquemas de niveles del tenant en lenguaje de negocio | REQ-03 | happy | — | — | — | — | — | pending |
| 9 | REQ-03: usuario sin capability es rechazado — THEN lanza `PERMISSION_DENIED` con mensaje claro (no datos) | REQ-03 | error | — | — | — | — | — | pending |
| 10 | REQ-03: sin sesion autenticada -> la operacion es rechazada (auth de Clerk/OAuth del MCP nuevo, no publicFields; gate en | REQ-03 | error | — | — | — | — | — | pending |
| 11 | REQ-04: Consultar CompetencyNode filtrando por `rt__Matrix__competencynode` devuelve solo matrices raiz, sin competencia | REQ-04 | happy | — | — | — | — | — | pending |
| 12 | REQ-04: Consultar LevelScheme filtrando por `rt__Scheme__levelscheme` devuelve solo esquemas, sin niveles. | REQ-04 | happy | — | — | — | — | — | pending |
| 13 | REQ-04: La lectura de CoverageScheme no requiere filtro de recordType y devuelve los registros base del tenant. | REQ-04 | edge | — | — | — | — | — | pending |
| 14 | REQ-05: Un usuario sin la capability de escritura sobre los objetos del dominio recibe PERMISSION_DENIED al intentar mut | REQ-05 | happy | — | — | — | — | — | pending |
| 15 | REQ-05: El pack no agrega ningun mecanismo de allowlist de escritura; el codigo del ticket no toca el camino generico de | REQ-05 | boundary | — | — | — | — | — | pending |
| 16 | REQ-05: El limite conocido (escritura generica abierta, gobernada solo por RBAC) queda escrito en la doc de frontera del | REQ-05 | regression | — | — | — | — | — | pending |
| 17 | REQ-06: `about` incluye curriculum-mapping con routing hints y domainDoc legibles en lenguaje de negocio. | REQ-06 | happy | — | — | — | — | — | pending |
| 18 | REQ-06: No se crea ni edita ningun archivo docs/TOOLS.md, manifest.json, docs/CAPABILITIES.md ni docs/ROADMAP.md en el r | REQ-06 | regression | — | — | — | — | — | pending |
| 19 | REQ-06: El KB de Kanai (specs mcp/*) queda actualizado con el dominio expuesto y la frontera de lo diferido. | REQ-06 | happy | — | — | — | — | — | pending |
| 20 | REQ-07: Los tests nuevos viven en `test/` como `.mjs` y pasan con el runner nativo de node, sin dependencia de vitest. | REQ-07 | happy | — | — | — | — | — | pending |
| 21 | REQ-07: La suite completa del MCP, incluyendo los tests de academic-scheduling y curriculum-design, queda verde tras agr | REQ-07 | regression | — | — | — | — | — | pending |
| 22 | REQ-07: Un contrato con recordType mal declarado hace fallar el test de contrato correspondiente. | REQ-07 | edge | — | — | — | — | — | pending |
| 23 | REQ-08: lectura real — THEN devuelven registros reales del tenant | REQ-08 | happy | — | — | — | — | — | pending |
| 24 | REQ-08: rechazo por rol — THEN `PERMISSION_DENIED` | REQ-08 | error | — | — | — | — | — | pending |
| 25 | REQ-08: La lectura de CompetencyNode acotada a `rt__Matrix__competencynode` no devuelve nodos de competencia ni subcompe | REQ-08 | boundary | — | — | — | — | — | pending |
| 26 | REQ-09: `notExposed` del pack enumera escritura, rt__Competency__/rt__SubCompetency__, adopcion (Facultad/Planes), Rubri | REQ-09 | happy | — | — | — | — | — | pending |
| 27 | REQ-09: Ninguno de los objetos ni recordTypes listados en `notExposed` aparece en `pack.objects` ni en `contracts.js`. | REQ-09 | boundary | — | — | — | — | — | pending |
| 28 | REQ-09: La frontera declarada queda reflejada en el `about` dinamico y en el KB de Kanai, de modo que UPONE-1633 puede c | REQ-09 | regression | — | — | — | — | — | pending |

### Test artifacts

_(se completan en execute: los tests de contrato `test/*.mjs` y su cobertura.)_


### Regression

_(se completa en execute: academic-scheduling + curriculum-design con `node test/*.mjs`, antes/despues.)_


## Summary
