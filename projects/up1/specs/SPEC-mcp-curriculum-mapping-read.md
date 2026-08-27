---
id: SPEC-mcp-curriculum-mapping-read
project: up1
ticket: TICKET-137
status: approved
---

# MCP · Curriculum Mapping (lectura del subconjunto estable)

# MCP · Curriculum Mapping (lectura del subconjunto estable)

## Executive summary: lo que estas aprobando

> *Esta seccion es para revision rapida. El detalle vive en Requirements, Artifacts y Tasks.*

**Que se quiere**: exponer el dominio de mapeo curricular en el MCP oficial de uP1 (`uplanner/mcp`, el servidor nuevo), **solo lectura** del subconjunto estable: esquemas de niveles (LevelScheme), esquemas de cobertura (CoverageScheme) y la **matriz raiz** de competencia (CompetencyNode, `rt__Matrix__competencynode`, datos generales de UPONE-1537). Un usuario consulta esos objetos desde el asistente con sus permisos reales, sin entrar a la interfaz. La escritura queda fuera a proposito.

**Decisiones que necesitan tu OK** (racional en Decisions):

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | El pack vive en el **repo del mod** (`curriculum-mapping.git/ai/index.js`) y se materializa con `npm run sync`, no en el repo del MCP | Asi lo hace el MCP nuevo (descubre packs desde los repos de mod; ver curriculum-design). Es una **desviacion del request** (que decia "en el repo del MCP"), registrada y justificada en DEC-LOCAL-01. |
| 2 | La frontera de escritura es **RBAC**, no un bloqueo por contrato | El MCP nuevo no gatea la escritura generica por objectType (`src/index.js:42`) y este ticket no agrega ese enforcement: sin la capability de escritura el usuario no muta. Limite conocido, documentado. |
| 3 | Exponer **solo la matriz raiz** (`rt__Matrix__competencynode`) | Evita tocar el contrato que UPONE-1633 completa en SP9 (competencias, subcompetencias, adopcion). |

**Riesgos y mitigacion**:
- **UPONE-1633 cambia la matriz**: exponemos solo la raiz estable de 1537; competencias/subcompetencias/adopcion van a `notExposed`. Riesgo bajo.
- **Verde de tests puros no prueba runtime**: S2 es gate fuerte de verificacion real contra la plataforma (DET-36).
- **Roles curriculares cambian (UPONE-1615)**: coordinar el orden de la verificacion; S2 corre contra el modelo vigente.

**Que NO se hace**: escritura de cualquier objeto; competencias/subcompetencias/adopcion (UPONE-1633); rubricas (RubricDescriptor/RubricDimension); alineamiento (CompetencyAlignment); harness E2E del MCP.

**Como sabes que funciona**: desde el asistente, con usuario autenticado, consultas los tres objetos y devuelven datos reales del tenant; filtras la matriz por `rt__Matrix__competencynode`; un rol sin la capability recibe PERMISSION_DENIED.

---

## Purpose

Habilitar el dominio curriculum-mapping en el MCP oficial de uP1 (`@uplanner/mcp`, repo `uplanner/mcp.git`, checkout `~/Workspace/uplanner/up1/mcp`, rama `develop`) para **lectura gobernada** del subconjunto estable: LevelScheme, CoverageScheme y la matriz raiz de CompetencyNode. Actor: el usuario que opera up1 conversacionalmente. Valor: consultar el mapeo curricular desde el asistente con los permisos del usuario real como frontera, sin construir codigo de operacion: el pack declara `objects` + `contracts` y las tools genericas del MCP (`up1_query_records`/`up1_get_object`) cubren la lectura. El pack vive en el repo del mod (`curriculum-mapping.git/ai/`) y se materializa con `npm run sync`. **NO** es el MCP viejo `up1-mcp`/Elric (stdio, TypeScript, `~/Workspace/uplanner/mcp`): ese quedo deprecado.

## Requirements

### REQ-01: El dominio curriculum-mapping DEBE habilitarse en el MCP creando el pack en el repositorio del mod (`curriculum-mapping.git/ai/index.js`, JavaScript) con `objects`, `contracts`, `routingHints`, `about`, `domainDoc` y `notExposed`, y materializandolo en el MCP con `npm run sync --workspace=mcp`, que genera `src/mods/curriculum-mapping/` (directorio gitignored). NO se edita ningun manifiesto ni lista `MODS`: el MCP descubre los packs por carpeta via `discoverModPacks` en `src/mods/index.js`.

**Fuente**: learns raw TICKET-137 (MCP nuevo, uplanner/mcp rama develop): src/mods/index.js (discoverModPacks); pack de referencia en repo de mod + `npm run sync --workspace=mcp`

<details><summary>Scenarios de validacion</summary>

#### Scenario: Tras crear `ai/index.js` en curriculum-mapping.git y correr `npm run sync --workspace=mcp`, existe `src/mods/curriculum-mapping/` generado y el pack queda descubierto por discoverModPacks.

#### Scenario: `about` lista curriculum-mapping entre los dominios activos con su routing y domainDoc.

#### Scenario: `git status` del repo del MCP no muestra cambios en `src/mods/index.js` ni archivos nuevos versionados bajo `src/mods/curriculum-mapping/` (gitignored).

#### Scenario: Si el pack no se sincroniza (sin correr sync), curriculum-mapping no aparece en `about` y sus objetos no son alcanzables.

</details>
### REQ-02: El pack DEBE declarar los ObjectContract de lectura en `contracts.js` del propio pack, registrados via `pack.contracts` (no en un registry editado a mano), para exactamente tres objetos: LevelScheme (recordType `rt__Scheme__levelscheme`), CoverageScheme (sin recordType) y CompetencyNode limitado a `rt__Matrix__competencynode` (matriz raiz, datos generales de UPONE-1537). La presentacion DEBE ser en lenguaje de negocio, con referencias y enums resueltos por nombre y no por id.

**Fuente**: learns raw TICKET-137: contratos via `contracts.js` del pack + `pack.contracts`; recordTypes reales rt__Scheme__levelscheme / rt__Matrix__competencynode; UPONE-1537 Finalizada

<details><summary>Scenarios de validacion</summary>

#### Scenario: La lectura de LevelScheme, CoverageScheme y la matriz raiz devuelve campos con etiquetas de negocio y referencias/enums resueltos por nombre, sin ids crudos.

#### Scenario: El contrato de CompetencyNode cubre unicamente `rt__Matrix__competencynode`; no declara Competency ni SubCompetency.

#### Scenario: Los contratos viven en `contracts.js` del pack; ningun archivo de registro central del MCP fue modificado.

</details>
### REQ-03: Toda operacion de lectura del dominio curriculum-mapping DEBE quedar gobernada por los permisos del usuario real autenticado en el MCP. El camino POSITIVO (usuario CON la capability `objectType:view` del rol activo lee datos reales del tenant) DEBE verificarse con evidencia runtime en S2 y es requisito de cierre. El rechazo por falta de capability (PERMISSION_DENIED) se INFIERE del mecanismo del MCP: `src/tools/capability-gate.js` gatea cada tool por las capabilities del rol activo antes de ejecutar, y RULE-mcp-004 fija los permisos del usuario como frontera; su confirmacion en vivo con un rol negativo se DIFIERE a un follow-up y NO bloquea S2 ni el cierre del ticket (ajuste autorizado por el PO, 2026-08-27). Los nombres de rol y capabilities siguen siendo frontera del MCP: no se reinterpretan ni se mapean dentro del pack.

**Fuente**: Ajuste autorizado por PO 2026-08-27 (pedido de cambio del ticket TICKET-137) + src/tools/capability-gate.js (gate por capabilities del rol activo) + RULE-mcp-004 (permisos del usuario como frontera) + REQ-03 original

<details><summary>Scenarios de validacion</summary>

#### Scenario: Un usuario CON la capability de lectura consulta LevelScheme, CoverageScheme y la matriz raiz y obtiene los registros reales del tenant en lenguaje de negocio; la salida runtime queda como evidencia de S2.

#### Scenario: El rechazo por falta de capability queda documentado como INFERIDO desde `src/tools/capability-gate.js` con la traza del gate citada; el ticket no declara evidencia runtime negativa como cumplida.

#### Scenario: El pack no define, mapea ni reinterpreta nombres de rol ni capabilities: la unica fuente es el rol activo del usuario autenticado que evalua el gate del MCP.

#### Scenario: El gate de S2 cierra con la evidencia positiva y el deferral registrado; ningun criterio de cierre de S2 ni del ticket exige la provision del rol negativo.

</details>
### REQ-04: La lectura de la matriz y de los esquemas DEBE poder acotarse por recordType usando los identificadores reales del backend: `rt__Scheme__levelscheme` para LevelScheme y `rt__Matrix__competencynode` para CompetencyNode. CoverageScheme no tiene recordTypes y se lee en su forma base.

**Fuente**: learns raw TICKET-137 (recordTypes reales verificados en el backend del mod curriculum-mapping)

<details><summary>Scenarios de validacion</summary>

#### Scenario: Consultar CompetencyNode filtrando por `rt__Matrix__competencynode` devuelve solo matrices raiz, sin competencias ni subcompetencias mezcladas.

#### Scenario: Consultar LevelScheme filtrando por `rt__Scheme__levelscheme` devuelve solo esquemas, sin niveles.

#### Scenario: La lectura de CoverageScheme no requiere filtro de recordType y devuelve los registros base del tenant.

</details>
### REQ-05: El alcance de este ticket es SOLO LECTURA y la unica frontera efectiva es RBAC: sin la capability de escritura correspondiente el usuario no muta datos (PERMISSION_DENIED). Ese rechazo se INFIERE del mismo gate de capabilities del MCP (`src/tools/capability-gate.js`) y su confirmacion en vivo con un rol sin capability se DIFIERE a un follow-up, no bloqueante (ajuste del PO 2026-08-27). NO se implementa enforcement por allowlist de objectTypes ni bloqueo por contrato: hoy la escritura generica del MCP nuevo esta abierta y no rehusa por objectType (`src/index.js:42`). Este ticket no agrega ese enforcement; el limite conocido se mantiene declarado y documentado en la frontera de lo diferido, junto con el hecho de que su verificacion en vivo quedo diferida.

**Fuente**: Ajuste autorizado por PO 2026-08-27 (pedido de cambio del ticket TICKET-137) + src/index.js:42 (escritura generica sin rehuse por objectType) + src/tools/capability-gate.js + REQ-05 original

<details><summary>Scenarios de validacion</summary>

#### Scenario: El pack no agrega ningun mecanismo de allowlist ni bloqueo de escritura; el codigo del ticket no toca el camino generico de mutacion del MCP.

#### Scenario: La doc de frontera declara el rechazo de escritura por falta de capability como inferido del gate, con la referencia al gate, y marca su confirmacion en vivo como diferida.

#### Scenario: El limite conocido (escritura generica abierta, gobernada solo por RBAC) sigue escrito en la frontera de lo diferido del pack y en el KB de Kanai.

</details>
### REQ-06: El catalogo del MCP es el `about` DINAMICO construido por `buildModsDoc` desde los packs activos: el ticket DEBE verificar que curriculum-mapping aparece ahi con su routing y su domainDoc. NO existen `docs/TOOLS.md`, `manifest.json`, `docs/CAPABILITIES.md` ni `docs/ROADMAP.md` en el MCP nuevo; no se actualiza ninguno. La documentacion complementaria es: entrada de doc de agente en `.ai/` si aplica al repo del mod, y actualizacion del KB de Kanai (specs `mcp/*`), incluyendo la frontera de lo diferido.

**Fuente**: learns raw TICKET-137: el MCP nuevo no tiene docs/TOOLS.md ni manifest.json ni docs/CAPABILITIES.md ni docs/ROADMAP.md; catalogo = `about` dinamico via buildModsDoc

<details><summary>Scenarios de validacion</summary>

#### Scenario: `about` incluye curriculum-mapping con routing hints y domainDoc legibles en lenguaje de negocio.

#### Scenario: No se crea ni edita ningun archivo docs/TOOLS.md, manifest.json, docs/CAPABILITIES.md ni docs/ROADMAP.md en el repo del MCP.

#### Scenario: El KB de Kanai (specs mcp/*) queda actualizado con el dominio expuesto y la frontera de lo diferido.

</details>
### REQ-07: Los tests de contrato DEBEN escribirse como archivos `test/*.mjs` ejecutados con el test runner NATIVO de node (`node test/*.mjs`), que es el estandar del MCP nuevo; NO se usa vitest. Ademas DEBE correrse la regresion de los dominios ya expuestos (academic-scheduling y curriculum-design) y quedar verde.

**Fuente**: learns raw TICKET-137: el MCP nuevo corre `node test/*.mjs` con el runner nativo; dominios ya expuestos = academic-scheduling, curriculum-design

<details><summary>Scenarios de validacion</summary>

#### Scenario: Los tests nuevos viven en `test/` como `.mjs` y pasan con el runner nativo de node, sin dependencia de vitest.

#### Scenario: La suite completa del MCP, incluyendo los tests de academic-scheduling y curriculum-design, queda verde tras agregar el pack.

#### Scenario: Un contrato con recordType mal declarado hace fallar el test de contrato correspondiente.

</details>
### REQ-08: La verificacion de cierre de este ticket DEBE incluir evidencia runtime real del camino POSITIVO contra la plataforma con usuario autenticado (OTP): consulta de los tres objetos (LevelScheme, CoverageScheme y la matriz raiz) devolviendo datos reales del tenant, acotada por recordType donde aplica, con referencias y enums resueltos por nombre. La evidencia debe ser runtime (salida real de la operacion, no referencia a un archivo de test); los tests de logica pura del MCP no la sustituyen. El escenario NEGATIVO (rechazo por falta de capability con un rol sin la capability) NO es evidencia requerida para cerrar S2 ni el ticket: se infiere del gate del MCP y su confirmacion en vivo se difiere a un follow-up cuando el rol negativo este disponible (ajuste del PO 2026-08-27).

**Fuente**: Ajuste autorizado por PO 2026-08-27 (pedido de cambio del ticket TICKET-137) + REQ-08 original + src/tools/capability-gate.js

<details><summary>Scenarios de validacion</summary>

#### Scenario: La consulta autenticada de los tres objetos devuelve registros reales del tenant y su salida runtime queda capturada como evidencia de cierre.

#### Scenario: La lectura de CompetencyNode acotada a `rt__Matrix__competencynode` no devuelve nodos de competencia ni subcompetencia en la corrida runtime real.

#### Scenario: El checklist de cierre de S2 no incluye evidencia runtime negativa; el escenario de rechazo aparece marcado como diferido/inferido con su follow-up asociado.

</details>
### REQ-09: El pack DEBE declarar en `notExposed` de forma explicita la frontera de lo diferido: toda escritura; las competencias y subcompetencias (`rt__Competency__competencynode` y `rt__SubCompetency__competencynode`) y la adopcion (Facultad/Planes) que construye UPONE-1633 (en curso); las rubricas (RubricDescriptor, RubricDimension); y el alineamiento (CompetencyAlignment). Exponer unicamente la matriz raiz evita tocar el contrato que UPONE-1633 completa.

**Fuente**: learns raw TICKET-137 + coordinacion con UPONE-1633 (partes diferidas de la matriz: arbol de competencias y adopcion)

<details><summary>Scenarios de validacion</summary>

#### Scenario: `notExposed` del pack enumera escritura, rt__Competency__/rt__SubCompetency__, adopcion (Facultad/Planes), RubricDescriptor, RubricDimension y CompetencyAlignment con la razon de exclusion.

#### Scenario: Ninguno de los objetos ni recordTypes listados en `notExposed` aparece en `pack.objects` ni en `contracts.js`.

#### Scenario: La frontera declarada queda reflejada en el `about` dinamico y en el KB de Kanai, de modo que UPONE-1633 puede completar la matriz sin colisionar con el contrato expuesto.

</details>

### REQ-10: El ticket DEBE registrar una decision local que documente el ajuste autorizado por el PO (2026-08-27): el rechazo por falta de capability (lectura y escritura) se INFIERE del gate de capabilities del MCP en lugar de verificarse en vivo, y su confirmacion runtime con un rol negativo se DIFIERE a un follow-up para no bloquear el avance del ticket. La decision DEBE dejar constancia de: quien autoriza (PO), la fecha, el driver (conseguir el rol negativo toma tiempo y bloquearia S2), el mecanismo del que se infiere (`src/tools/capability-gate.js` + RULE-mcp-004), el alcance NO afectado (la lectura sigue igual; el camino positivo sigue siendo evidencia runtime requerida) y el follow-up que recoge la confirmacion en vivo pendiente.

**Fuente**: Pedido de cambio del ticket TICKET-137, ajuste autorizado por el PO 2026-08-27 (ultimo bullet: "Agregar una decision local que registre este ajuste del PO")

<details><summary>Scenarios de validacion</summary>

#### Scenario: Existe la decision local del ticket con autor (PO), fecha 2026-08-27, driver, mecanismo inferido y follow-up asociado, referenciada desde REQ-03, REQ-05 y REQ-08.

#### Scenario: La decision declara explicitamente que el alcance de lectura no cambia: solo cambia como se verifica el rechazo por permisos.

#### Scenario: El gate de cierre del ticket encuentra la verificacion negativa marcada como diferida con la decision como source_ref, y no la reporta como evidencia faltante bloqueante.

</details>

## Artifacts

### ModPack `curriculumMappingPack` (nuevo, en el repo del mod)

Archivo `curriculum-mapping.git/ai/index.js` (JavaScript). Molde: el pack de curriculum-design (`curriculum-design.git/ai/index.js`). Se materializa en el MCP con `npm run sync --workspace=mcp`, que genera `src/mods/curriculum-mapping/` (gitignored). El MCP lo descubre por carpeta (`discoverModPacks` en `src/mods/index.js`): NO se edita ningun manifiesto ni lista MODS.

| Campo | Valor |
|-------|-------|
| `id` | `"curriculum-mapping"` (debe coincidir con el nombre de app para el gate) |
| `label` | `"Mapeo curricular"` |
| `routingHints` | "matriz de competencia", "competencia", "esquema de niveles", "escala de logro", "esquema de cobertura", "cobertura curricular", "tributacion", "acreditacion", "competency matrix", "coverage", "level scheme" |
| `tools` | `[]` (solo lectura; las lecturas van por las tools genericas `up1_query_records`/`up1_get_object`) |
| `objects` | `[{objectType:"LevelScheme"}, {objectType:"CoverageScheme"}, {objectType:"CompetencyNode", recordType:"rt__Matrix__competencynode"}]` |
| `contracts` | `[LEVEL_SCHEME_CONTRACT, COVERAGE_SCHEME_CONTRACT, COMPETENCY_NODE_CONTRACT]` (desde `contracts.js` del propio pack, via `pack.contracts`) |
| `about()` | self-doc del dominio en lenguaje de negocio |
| `domainDoc` | whatIsIt / whatYouCanDo (consultar esquemas y matriz) / limits (solo consulta) |
| `notExposed` | ver REQ-09 (escritura; competencias/subcompetencias/adopcion de 1633; rubricas; alineamiento) |

### Contratos (en `curriculum-mapping.git/ai/contracts.js`)

Un `ObjectContract` de lectura por objeto, en lenguaje de negocio, con enums y referencias resueltos por nombre:

| Contrato | objectType | recordType | notas |
|----------|-----------|-----------|-------|
| LEVEL_SCHEME_CONTRACT | LevelScheme | `rt__Scheme__levelscheme` | esquema de niveles; el detalle de niveles (`rt__Level__`) no se expone aparte |
| COVERAGE_SCHEME_CONTRACT | CoverageScheme | (base, sin RT) | escala ordinal de cobertura |
| COMPETENCY_NODE_CONTRACT | CompetencyNode | `rt__Matrix__competencynode` | solo la matriz raiz (datos generales de 1537) |

No se declara `blockGenericMutation` (no existe en el MCP nuevo) ni recordTypes de `notExposed` (Competency/SubCompetency/Level) en `objects` ni en `contracts.js` (REQ-09).

## Tasks

### Session 1 - Crear el pack read-only en el repo del mod [tipo: auto] [tier: T2]

| # | Task | source_ref | Files | Validation | Rollback |
|---|------|-----------|-------|------------|----------|
| S1.T1 | Crear el pack `curriculum-mapping.git/ai/index.js` (JS): objects (3), contracts (de contracts.js), routingHints, about, domainDoc, notExposed. Molde: curriculum-design.git/ai/index.js. NO editar `src/mods/index.js`. | REQ-01 | `curriculum-mapping.git/ai/index.js` | pack valido, descubierto por discoverModPacks | git revert |
| S1.T2 | Declarar en `curriculum-mapping.git/ai/contracts.js` los 3 ObjectContract de lectura por nombre (LevelScheme rt__Scheme__levelscheme; CoverageScheme base; CompetencyNode solo rt__Matrix__competencynode). | REQ-02, REQ-04, REQ-09 | `ai/contracts.js` | pack.contracts registra los 3; recordTypes acotados | git revert |
| S1.T3 | `npm run sync --workspace=mcp` y verificar: pack activo, 3 objetos consultables por genericas, cm en el about dinamico. | REQ-01, REQ-06 | (sync) | cm en about con routing + domainDoc | re-run sync |
| **S1.GATE** | Gate S1 (T2): persistir, quality review, continue/iterate | - | ticket | pack descubierto; about lista cm | (no aplica) |

### Session 2 - Verificacion runtime (camino positivo) + permisos [tipo: ⚑ fuerte] [tier: T3]

| # | Task | source_ref | Files | Validation | Rollback |
|---|------|-----------|-------|------------|----------|
| S2.T1 | Evidencia runtime del **camino positivo** (criterio de cierre): con usuario autenticado (OTP) y un rol CON la capability, consultar LevelScheme, CoverageScheme y CompetencyNode (rt__Matrix__competencynode) con datos reales del tenant, presentacion por nombre y filtrado por recordType. | REQ-02, REQ-03, REQ-04, REQ-08 | (verificacion runtime) | salida real de las 3 consultas | (no aplica) |
| S2.T2 | **[DIFERIDA]** Confirmacion en vivo del rechazo por falta de capability (lectura y escritura) con un rol negativo. El comportamiento se **infiere** del gate (`src/tools/capability-gate.js` + RULE-mcp-004); se ejecuta cuando el rol este disponible en UPU. NO bloquea S2 ni el cierre. | REQ-03, REQ-05, REQ-08 | (diferido) evidencia runtime del rechazo cuando exista el rol | restaurar/eliminar el rol |
| S2.T3 | Registrar DEC-LOCAL-05 (ajuste del PO: inferir el rechazo + diferir su confirmacion en vivo); documentar el diferido en el `notExposed` del pack y en el KB de Kanai; abrir el follow-up de la confirmacion runtime pendiente. | REQ-10 | KB Kanai, notExposed del pack | decision + follow-up registrados | (no aplica) |
| **S2.GATE** | Gate S2 (T3, ⚑ fuerte): cierra con la evidencia runtime del **camino positivo** (S2.T1) + el rechazo por permisos **inferido** del gate + el deferral documentado (S2.T2/T3). NO exige el rol negativo. | - | ticket | evidencia positiva runtime + inferencia + deferral documentado | (no aplica) |

### Session 3 - Tests + doc + frontera [tipo: auto] [tier: T1]

| # | Task | source_ref | Files | Validation | Rollback |
|---|------|-----------|-------|------------|----------|
| S3.T1 | Tests de contrato como `test/*.mjs` (runner nativo, sin vitest; logica pura con dobles): recordTypes permitidos, enums/refs por nombre, notExposed segun REQ-09. Precondicion de la suite: `npm run sync --workspace=mcp`. | REQ-07, REQ-09 | `test/*.mjs` | `node test/*.mjs` verde | git revert |
| S3.T2 | Regresion de los dominios expuestos (academic-scheduling, curriculum-design) con el runner nativo; verde; registrar antes/despues. | REQ-07 | (suites) | suite verde; delta 0 | (no aplica) |
| S3.T3 | Docs (DET-37 dim1): verificar cm en el about dinamico; entrada `.ai/` del mod si aplica; actualizar KB de Kanai con el dominio y la frontera de lo diferido. NO se tocan docs/TOOLS.md/manifest.json. | REQ-06 | `.ai/`, KB Kanai | about verificado; KB actualizado | git revert |
| **S3.GATE** | Gate S3 (T1): persistir, continue/close | - | ticket | tests verdes; about + KB actualizados | (no aplica) |

## Constraints

- **Arquitectura del MCP nuevo**: los packs se descubren por carpeta (`discoverModPacks`, `src/mods/index.js`), en JavaScript; el motor declarativo es `src/tools/register-declarative-tools.js`; el catalogo es el `about` dinamico (`buildModsDoc`); los tests son `test/*.mjs` con el runner nativo de node. Molde de referencia: el pack de curriculum-design (`curriculum-design.git/ai/`).
- **Frontera del request**: el pack vive en el repo del mod (`curriculum-mapping.git/ai/`), no en el repo del MCP como decia el request. Desviacion registrada y justificada en DEC-LOCAL-01 (el request no se reescribe).
- **KB-first (DET-11)**: no habia rules/bugs/specs de curriculum-mapping para el MCP; los del MCP viejo (`up1-mcp`) fueron deprecados/anotados (ver DEC-058 y learns de este ticket).

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| Backend curriculum-mapping (UPONE-1454/1455/1537, Finalizadas) | internal (up1) | LevelScheme, CoverageScheme, CompetencyNode (matriz raiz) desplegados en UPU con datos | Bajo: esquemas estables; la matriz tiene partes diferidas (1633) fuera de alcance |
| Plataforma real + usuario autenticado (OAuth/Clerk) | internal (up1) | S2 requiere consultar contra una instancia real con un rol CON la capability de lectura del dominio | Medio: sin instancia/usuario, S2 no cierra (bloqueo honesto) |
| Rol de prueba SIN la capability (rol negativo) | internal (up1) | DIFERIDO (OK del PO 2026-08-27, DEC-LOCAL-05): el rechazo por permisos se infiere del gate del MCP; su confirmacion en vivo (S2.T2) se ejecuta cuando el rol este disponible. NO bloquea el cierre. | Bajo (diferido) |
| RBAC del dominio (UPONE-1615, hermano SP9) | internal (up1) | Las capabilities de los roles curriculares definen que lee el MCP | Medio: si 1615 cambia los roles, coordinar el ORDEN de la verificacion |
| Acuerdo de sincronizacion MCP del sprint (UPONE-1619) | coordinacion | 1619 comparte el acuerdo de sync con el MCP; si introduce objetos nuevos en su dominio, su cobertura MCP corre por su cuenta. Para cm no bloquea | Bajo |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| UPONE-1633 cambia la matriz tras publicar el contrato | low | Retrabajo del contrato de CompetencyNode | Se expone solo la matriz raiz estable de 1537; competencias/subcompetencias/adopcion en `notExposed` |
| Verde de tests puros no representa el camino real | high | Falso "hecho" | S2 gate ⚑ fuerte con evidencia runtime real (DET-36) |
| Roles curriculares cambian en el sprint (1615) | medium | El criterio "rol sin capability rechazado" se prueba contra un modelo movil | Coordinar orden de verificacion; S2 corre contra el modelo vigente |
| Escritura generica abierta (frontera solo RBAC) | low | El MCP podria mutar si el rol tuviera la capability | REQ-05: es limite conocido; sin la capability de escritura no muta. No se agrega enforcement por objectType en este ticket |

## Open questions

- [x] **Rol negativo / rechazo por permisos** (resuelto, DEC-LOCAL-05): inferido del gate del MCP; su confirmacion en vivo se difiere (S2.T2), no bloquea. OK del PO 2026-08-27.

- [x] **Subconjunto de CompetencyNode** (resuelto): solo la matriz raiz (`rt__Matrix__competencynode`, UPONE-1537). Competencias/subcompetencias/adopcion (UPONE-1633) en `notExposed`.
- [x] **Empaquetado** (resuelto, DEC-LOCAL-01): pack en `curriculum-mapping.git/ai/`, materializado por `npm run sync`.
- [x] **Desviacion del request (pack en el repo del mod)** (resuelto): **OK del PO 2026-08-27** - es el formato del MCP nuevo (descubrimiento por carpeta), con precedente en curriculum-design. Ver DEC-LOCAL-01 y DEC-LOCAL-04.
- [x] **Ejecucion en SP9** (resuelto): **confirmado por el PO 2026-08-27** (1530 entra en SP9, con acceso a UPU y administracion de permisos disponible para cerrar S2). Ver DEC-LOCAL-04.

## Decisions

### DEC-LOCAL-01: El pack vive en el repo del mod, no en el repo del MCP
- **Contexto**: el request dice "la implementacion es en el repositorio del MCP; no modifica el mod de up1". El MCP nuevo, en cambio, descubre los packs desde los repos de mod (asi se hizo curriculum-design: `curriculum-design.git/ai/`).
- **Decision**: el pack de curriculum-mapping vive en `curriculum-mapping.git/ai/index.js` (+`contracts.js`) y se materializa en el MCP con `npm run sync`. Es una **desviacion consciente del request** (que reflejaba el modelo del MCP viejo), registrada aqui sin reescribir el request (DET-3).
- **Alternativas**: escribir el pack en el repo del MCP (modelo viejo, ya no aplica: `src/mods/<mod>/` es generado por sync y esta gitignored).
- **Consecuencias**: consistente con el resto de los mods; el repo del MCP no se toca a mano.

### DEC-LOCAL-02: La frontera de escritura es RBAC (no bloqueo por contrato)
- **Contexto**: el alcance es lectura; el MCP nuevo no gatea la escritura generica por objectType (`src/index.js:42`).
- **Decision**: la unica frontera es RBAC: sin la capability de escritura el usuario no muta (PERMISSION_DENIED). NO se implementa `blockGenericMutation` ni allowlist de escritura (no existen en el MCP nuevo y este ticket no los agrega). Se declara como limite conocido.
- **Alternativas**: implementar enforcement por allowlist de tipos (sube el alcance, excede el subconjunto estable de lectura).
- **Consecuencias**: alcance acotado y honesto; un ticket de escritura futuro podra agregar tools de dominio gobernadas.

### DEC-LOCAL-03: Un contrato por objectType, recordType acotado
- **Contexto**: CompetencyNode y LevelScheme reparten recordTypes.
- **Decision**: un `ObjectContract` por objeto en `contracts.js` del pack, con el recordType acotado al expuesto (Matrix para CompetencyNode, Scheme para LevelScheme); el corte por recordType en lectura es un filtro de query.
- **Consecuencias**: minimo y suficiente para leer; el filtrado por recordType queda en `up1_query_records` (REQ-04).

### DEC-LOCAL-04: OK del PO a la desviacion del request + confirmacion SP9 (2026-08-27)
- **Desviacion del request**: el pack vive en el repo del mod (`curriculum-mapping.git/ai/`), no en el del MCP como decia el request. **OK del PO 2026-08-27**: es el formato del MCP nuevo (los packs se descubren desde los repos de mod), con precedente en curriculum-design; el `ai/` es metadata declarativa de agente, aditiva, no cambia el backend del mod. El request no se reescribe (DET-3); esta decision lo autoriza.
- **SP9**: **confirmado por el PO 2026-08-27** que 1530 se ejecuta en SP9, con acceso a UPU y administracion de permisos disponible para cerrar la verificacion fuerte (S2).

### DEC-LOCAL-05: Inferir el rechazo por permisos y diferir su confirmacion en vivo (OK del PO 2026-08-27)
- **Contexto**: verificar el rechazo por falta de capability (lectura y escritura) exige un rol negativo en UPU que tomara tiempo conseguir y bloquearia el gate fuerte de S2.
- **Decision (OK del PO 2026-08-27)**: el rechazo por permisos se **infiere** del mecanismo del MCP (`src/tools/capability-gate.js` gatea cada tool por las capabilities del rol activo; RULE-mcp-004: permisos del usuario como frontera). Su **confirmacion en vivo** con un rol negativo se **difiere** a un follow-up (S2.T2), no bloqueante.
- **Alcance NO afectado**: la lectura sigue igual; el **camino positivo** (leer datos reales con un rol capable) sigue siendo evidencia runtime **requerida** para cerrar S2 (S2.T1).
- **Follow-up**: confirmar en vivo el rechazo (lectura y escritura) cuando el rol negativo este disponible.

## Technical reference

- **Descubrimiento de packs** (`src/mods/index.js`): `discoverModPacks` lee las carpetas de `src/mods/`; un pack valido exporta un objeto con `tools` (aunque sea `[]`). NO hay lista `MODS` ni manifiesto. El gate de visibilidad (`registerMods` + `getAppsFiltered`): el pack aparece solo si su `id` coincide con una app activa para el tenant y el rol del usuario.
- **Motor declarativo** (`src/tools/register-declarative-tools.js`): convierte las fichas en tools MCP; para lectura no hacen falta tools de mod (las genericas `up1_query_records`/`up1_get_object` leen cualquier objeto permitido por RBAC).
- **Escritura generica abierta** (`src/index.js:42`): documentado como abierto; la frontera efectiva es RBAC. No hay bloqueo por objectType (ver DEC-LOCAL-02).
- **Gate de capability** (`src/tools/capability-gate.js`): habilita/deshabilita tools por capability del rol activo; `PERMISSION_DENIED` si falta.
- **Sync** (`npm run sync --workspace=mcp`, `scripts/sync-mods.js`): copia `mods/<mod>/ai/` a `src/mods/<mod>/` (gitignored) y compila las fichas.
- **Objetos del mod** (`curriculum-mapping/objects/`): `LevelScheme.json` (rt Scheme/Level), `CoverageScheme.json` (base), `CompetencyNode.json` (rt Matrix/Competency/SubCompetency). Los 3 con `enableDataLog: false` (irrelevante en lectura).
- **Molde**: el pack de curriculum-design (`curriculum-design.git/ai/index.js`, `contracts.js`, `tools.js`).
- **Tests**: `test/*.mjs` con el runner nativo de node (no vitest). No existe `docs/EXTENDING.md` en el MCP nuevo.

## Rules discovered

{Se llena durante ejecucion.}

## Bugs found

{Se llena si se descubren problemas.}

## Acceptance checkpoints

- [ ] **Funcional**: los scenarios de REQ-01..REQ-10 pasan. REQ-03/08 con evidencia runtime del **camino positivo** (S2.T1). El **rechazo por permisos** (camino negativo de REQ-03/05/08) se **infiere** del gate del MCP y su confirmacion en vivo se **difiere** (S2.T2, DEC-LOCAL-05): NO es evidencia requerida para cerrar. REQ-10: la decision del ajuste del PO queda registrada.
- [ ] **Tests** (DET-37 dim4): tests de contrato como `test/*.mjs` (runner nativo) + regresion de academic-scheduling y curriculum-design, en VERDE.
- [ ] **NFRs**: N/A (lectura acotada).
- [ ] **Rules**: patron del MCP nuevo respetado (pack por carpeta, contratos en el pack, lectura por genericas, RBAC como frontera).
- [ ] **Integration**: sin regresion en los dominios ya expuestos (academic-scheduling, curriculum-design).
- [ ] **Docs (DET-37 dim1)**: cm verificado en el `about` dinamico; entrada `.ai/` del mod si aplica; KB de Kanai (specs `mcp/*`) actualizado con el dominio, la frontera de lo diferido y el diferido de la confirmacion negativa (DEC-LOCAL-05). NO se actualizan docs/TOOLS.md/manifest.json (no existen).
- [ ] **KB DKC (DET-37 dim2)**: N/A obligatorio (posible learn en execute).
- [ ] **Runtime (DET-36)**: evidencia runtime real del **camino positivo** de lectura capturada en S2 (S2.T1). El **rechazo por permisos** se infiere del gate (`src/tools/capability-gate.js` + RULE-mcp-004); su confirmacion en vivo se difiere a un follow-up (S2.T2, DEC-LOCAL-05) y NO es evidencia requerida para cerrar.

## Archiving

Una spec se archiva cuando deja de ser fuente de verdad. Usar `/dkc-archive-spec SPEC-mcp-curriculum-mapping-read "razon"`. NO borrar manualmente.

## Enmiendas (refine_spec)

### Enmienda 1
**REQs:**

- REQ-01 (edit) `confirmed`: El dominio curriculum-mapping DEBE habilitarse en el MCP creando el pack en el repositorio del mod (`curriculum-mapping.git/ai/index.js`, Ja
- REQ-02 (edit) `confirmed`: El pack DEBE declarar los ObjectContract de lectura en `contracts.js` del propio pack, registrados via `pack.contracts` (no en un registry e
- REQ-04 (edit) `confirmed`: La lectura de la matriz y de los esquemas DEBE poder acotarse por recordType usando los identificadores reales del backend: `rt__Scheme__lev
- REQ-05 (edit) `confirmed`: El alcance de este ticket es SOLO LECTURA y la unica frontera efectiva es RBAC: sin la capability de escritura correspondiente el usuario no
- REQ-06 (edit) `confirmed`: El catalogo del MCP es el `about` DINAMICO construido por `buildModsDoc` desde los packs activos: el ticket DEBE verificar que curriculum-ma
- REQ-07 (edit) `confirmed`: Los tests de contrato DEBEN escribirse como archivos `test/*.mjs` ejecutados con el test runner NATIVO de node (`node test/*.mjs`), que es e
- REQ-09 (add) `confirmed`: El pack DEBE declarar en `notExposed` de forma explicita la frontera de lo diferido: toda escritura; las competencias y subcompetencias (`rt

**Tasks agregadas:**

- S1: Crear el pack del dominio en el repo del mod: `curriculum-mapping.git/ai/index.js` (JavaScript) con `objects` (LevelScheme, CoverageScheme, CompetencyNode limitado a rt__Matrix__competencynode), `routingHints`, `about`, `domainDoc` y `notExposed` (valida: REQ-01, REQ-09; rollback: Borrar `ai/index.js` del repo curriculum-mapping.git (revert del commit); el MCP vuelve a no descubrir el pack)
- S1: Declarar los ObjectContract de lectura en `contracts.js` del pack y registrarlos via `pack.contracts`: presentacion en lenguaje de negocio, referencias y enums resueltos por nombre, recordTypes rt__Scheme__levelscheme y rt__Matrix__competencynode (valida: REQ-02, REQ-04; rollback: Borrar `contracts.js` y la referencia `pack.contracts` en `ai/index.js`)
- S1: Correr `npm run sync --workspace=mcp` para generar `src/mods/curriculum-mapping/` (gitignored) y verificar en `about` que el dominio aparece con routing y domainDoc; confirmar que `src/mods/index.js` no fue editado (valida: REQ-01, REQ-06; rollback: Eliminar el directorio generado `src/mods/curriculum-mapping/` y volver a correr sync sin el pack)
- S3: Escribir los tests de contrato como `test/*.mjs` con el runner nativo de node (sin vitest) para los tres objetos expuestos y sus recordTypes (valida: REQ-07, REQ-02, REQ-04, test; rollback: Borrar los archivos `test/*.mjs` agregados)
- S3: Correr la regresion completa del MCP con el runner nativo, incluyendo los dominios ya expuestos (academic-scheduling y curriculum-design), y registrar el resultado (valida: REQ-07, test; rollback: N/A (solo ejecucion); si la regresion falla por el pack, revertir el commit del pack)
- S3: Verificar el catalogo dinamico (`about` armado por buildModsDoc), agregar la entrada de doc de agente en `.ai/` si aplica y actualizar el KB de Kanai (specs `mcp/*`) con el dominio expuesto y la frontera de lo diferido; documentar el limite conocido de escritura generica gobernada solo por RBAC (valida: REQ-06, REQ-05, REQ-09; rollback: Revertir los cambios de doc en `.ai/` y en el KB de Kanai)

### Enmienda 2
**REQs:**

- REQ-03 (edit) `confirmed`: Toda operacion de lectura del dominio curriculum-mapping DEBE quedar gobernada por los permisos del usuario real autenticado en el MCP: el g
- REQ-08 (edit) `confirmed`: La verificacion de este ticket DEBE incluir evidencia runtime real contra la plataforma con usuario autenticado (OTP): consulta de los tres 
- REQ-05 (edit) `confirmed`: El alcance de este ticket es SOLO LECTURA y la unica frontera efectiva es RBAC: sin la capability de escritura correspondiente el usuario no

**Tasks agregadas:**

- S2: Verificar los permisos del usuario real como unica frontera: con usuario autenticado (OTP) consultar LevelScheme, CoverageScheme y CompetencyNode (acotado a `rt__Matrix__competencynode`) y confirmar que devuelven datos reales del tenant; luego, con un rol sin la capability de lectura correspondiente, confirmar PERMISSION_DENIED (no resultado vacio). Registrar la salida real de cada intento como evidencia runtime. (valida: REQ-03, REQ-08; rollback: No aplica cambios de codigo (solo verificacion). Si la evidencia resulta no reproducible, registrar smoke-not-reproducible con razon auditada y revertir el rol de prueba a su configuracion original de capabilities.)
- S2: Verificar el escenario de escritura de REQ-05: con un usuario sin la capability de escritura sobre CompetencyNode, intentar la mutacion por el camino generico del MCP y confirmar PERMISSION_DENIED. Documentar explicitamente que el rechazo proviene de RBAC y no de un filtro por objectType (la escritura generica sigue abierta, `src/index.js:42`), y dejarlo asentado como limite conocido en la frontera de lo diferido. (valida: REQ-05; rollback: No aplica cambios de codigo (solo verificacion). Si la mutacion de prueba llegara a persistir por tener capability inesperada, revertir el registro afectado al estado previo capturado antes del intento.)

**Task ops:**

- delete S1.T1
- delete S1.T2
- delete S1.T3
- delete S3.T1
- delete S3.T2
- delete S3.T3
- edit S1.T4 { desc="Crear el pack del dominio en el repo del mod: `curriculum-mapping.git/ai/index.js` (JavaScript) declarando `objects` (LevelScheme, CoverageScheme, CompetencyNode), `contracts` (importados de `contracts.js` del propio pack), `routingHints`, `about`, `domainDoc` y `notExposed`. Tomar como molde el pack de curriculum-design (`curriculum-design.git/ai/index.js`). NO se edita `src/mods/index.js` ni ninguna lista `MODS`: el MCP descubre los packs por carpeta via `discoverModPacks`.", rollback="Borrar `curriculum-mapping.git/ai/index.js` (y el directorio `ai/` si quedo vacio) y re-correr `npm run sync --workspace=mcp`; al no existir la carpeta del pack, `discoverModPacks` deja de descubrirlo y el MCP vuelve al estado previo sin cambios en el repo del MCP.", validates=["REQ-01"], isTest=false }
- edit S1.T5 { desc="Declarar en `curriculum-mapping.git/ai/contracts.js` exactamente tres ObjectContract de lectura, en lenguaje de negocio y con referencias/enums resueltos por nombre (no por id): LEVEL_SCHEME_CONTRACT limitado a `rt__Scheme__levelscheme`; COVERAGE_SCHEME_CONTRACT para CoverageScheme (sin recordType, forma base); COMPETENCY_NODE_CONTRACT limitado a `rt__Matrix__competencynode`. No incluir `rt__Level__levelscheme`, `rt__Competency__competencynode` ni `rt__SubCompetency__competencynode` en `pack.objects` ni en `contracts.js` (van en `notExposed`, REQ-09). Los contratos se registran unicamente via `pack.contracts`; no se toca ningun registry del MCP.", rollback="Borrar `curriculum-mapping.git/ai/contracts.js` y quitar su import de `ai/index.js`, luego re-correr `npm run sync --workspace=mcp`. Sin contratos declarados el pack deja de exponer los objetos y no queda residuo en el repo del MCP (el directorio materializado es gitignored).", validates=["REQ-02","REQ-04","REQ-09"], isTest=false }
- edit S1.T6 { desc="Materializar el pack en el MCP con `npm run sync --workspace=mcp` y verificar el descubrimiento: `src/mods/curriculum-mapping/` generado (directorio gitignored), pack activo segun `discoverModPacks` (`src/mods/index.js`), los tres objetos consultables por las tools declarativas (`src/tools/register-declarative-tools.js`) y curriculum-mapping presente en el `about` dinamico que construye `buildModsDoc`. Confirmar que el arbol del repo del MCP no registra archivos nuevos versionados.", rollback="Revertir el commit del pack en `curriculum-mapping.git` y re-correr `npm run sync --workspace=mcp`; el directorio materializado se regenera sin curriculum-mapping. Como es gitignored, basta borrar `src/mods/curriculum-mapping/` para volver al estado previo del MCP.", validates=["REQ-01","REQ-06"], isTest=false }
- edit S3.T4 { desc="Escribir los tests de contrato como archivos `test/*.mjs` ejecutados con el test runner NATIVO de node (`node test/*.mjs`), sin vitest: verificar que los tres contratos declaran solo los recordTypes permitidos (`rt__Scheme__levelscheme`, base de CoverageScheme, `rt__Matrix__competencynode`), que los enums y referencias se presentan por nombre, y que `notExposed` lista la frontera de REQ-09 (escritura, competencias/subcompetencias, adopcion de UPONE-1633, rubricas, alineamiento).", rollback="Borrar los archivos `test/*.mjs` agregados por esta task; son archivos nuevos y su eliminacion no afecta la suite existente.", validates=["REQ-02","REQ-04","REQ-07","REQ-09"], isTest=true }
- edit S3.T5 { desc="Correr la regresion de los dos dominios que hoy expone el MCP nuevo, academic-scheduling y curriculum-design, con el runner nativo de node y dejarla verde. Registrar la salida real (antes/despues) en la tabla de Regression del ticket. No se ejercita ningun dominio retirado.", rollback="No aplica (solo ejecucion de suites, sin cambios de codigo). Si la regresion queda roja por el pack nuevo, revertir el pack segun el rollback de S1.T6 y re-correr para confirmar el verde previo.", validates=["REQ-07"], isTest=true }
- edit S3.T6 { desc="Cerrar la dimension de documentacion (DET-37 dim1) con los artefactos que existen realmente: (1) verificar que curriculum-mapping aparece en el `about` dinamico con su routing y su domainDoc; (2) agregar la entrada de doc de agente en `.ai/` del repo del mod si aplica; (3) actualizar el KB de Kanai (specs `mcp/*`) documentando el dominio expuesto y la frontera de lo diferido (escritura, competencias/subcompetencias y adopcion de UPONE-1633, rubricas, alineamiento, y el limite conocido de escritura generica abierta). No se actualiza `manifest.json`, `docs/TOOLS.md`, `docs/CAPABILITIES.md` ni `docs/ROADMAP.md`: no existen en el MCP nuevo.", rollback="Revertir el commit de documentacion: quitar la entrada `.ai/` agregada y restaurar la version previa de las specs `mcp/*` del KB de Kanai. Cambios solo documentales, sin impacto en runtime.", validates=["REQ-06","REQ-09"], isTest=false }

### Enmienda 3
**REQs:**

- REQ-03 (edit) `confirmed`: Toda operacion de lectura del dominio curriculum-mapping DEBE quedar gobernada por los permisos del usuario real autenticado en el MCP. El c
- REQ-05 (edit) `confirmed`: El alcance de este ticket es SOLO LECTURA y la unica frontera efectiva es RBAC: sin la capability de escritura correspondiente el usuario no
- REQ-08 (edit) `confirmed`: La verificacion de cierre de este ticket DEBE incluir evidencia runtime real del camino POSITIVO contra la plataforma con usuario autenticad
- REQ-10 (add) `confirmed`: El ticket DEBE registrar una decision local que documente el ajuste autorizado por el PO (2026-08-27): el rechazo por falta de capability (l

**Tasks agregadas:**

- S2: Registrar la decision local del ajuste del PO (2026-08-27): inferir el rechazo por permisos del gate de capabilities del MCP y diferir su confirmacion en vivo. Incluir autor, fecha, driver (rol negativo no disponible a tiempo), mecanismo inferido (`src/tools/capability-gate.js` + RULE-mcp-004), alcance no afectado (lectura intacta; camino positivo sigue siendo evidencia runtime requerida) y el follow-up que recoge la confirmacion pendiente. Enlazar la decision desde REQ-03, REQ-05 y REQ-08. (valida: REQ-10; rollback: Borrar el record de decision creado y quitar sus referencias en REQ-03/REQ-05/REQ-08; el ticket vuelve a exigir la verificacion negativa en vivo como bloqueante.)
- S2: Documentar en la frontera de lo diferido del pack y en el KB de Kanai (specs `mcp/*`) que el rechazo por falta de capability (lectura y escritura) queda INFERIDO del gate del MCP, citando la traza del mecanismo, y abrir el follow-up que recoge su confirmacion runtime cuando exista un rol sin la capability. (valida: REQ-03, REQ-05, REQ-08, REQ-10; rollback: Revertir los cambios de documentacion en el pack y en el KB de Kanai, y cerrar/eliminar el follow-up abierto.)
- S2: Capturar la evidencia runtime del camino POSITIVO como criterio de cierre del gate fuerte de S2: consulta autenticada (OTP) de LevelScheme (`rt__Scheme__levelscheme`), CoverageScheme (base) y CompetencyNode acotado a `rt__Matrix__competencynode`, con salida real del tenant y presentacion por nombre; dejar la salida cruda como evidencia y consignar en el gate que el escenario negativo queda diferido/inferido. (valida: REQ-03, REQ-08; rollback: Descartar la evidencia runtime registrada y reabrir el gate de S2 como pendiente de verificacion.)

**Task ops:**

- edit S2.T3 { desc="DIFERIDA (follow-up, no bloqueante — ajuste del PO 2026-08-27): provisionar el rol SIN la capability de lectura del dominio y confirmar en vivo el PERMISSION_DENIED. No se ejecuta en S2 ni bloquea el cierre del ticket; se ejecuta cuando el rol negativo este disponible. Mientras tanto el rechazo queda inferido del gate del MCP (`src/tools/capability-gate.js`).", rollback="Revertir la marca de diferida y volver a exigir la provision del rol negativo como task bloqueante de S2.", validates=["REQ-03","REQ-10"] }
- edit S2.T2 { desc="DIFERIDA (verificacion diferida, no bloqueante — ajuste del PO 2026-08-27): intento de mutacion con un rol sin la capability de escritura para confirmar en vivo el PERMISSION_DENIED de REQ-05. El rechazo se infiere del mismo gate de capabilities (`src/tools/capability-gate.js`); la confirmacion runtime se ejecuta junto al follow-up del rol negativo. El limite conocido (escritura generica abierta, frontera solo RBAC) se mantiene declarado en la frontera de lo diferido.", rollback="Revertir la marca de diferida y volver a exigir el escenario de escritura en vivo como task bloqueante de S2.", validates=["REQ-05","REQ-10"] }
