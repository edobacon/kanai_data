---
id: DOC-kb-sp10-UPONE-1769-detalle
project: up1
type: doc
module: curriculum-mapping
tags:
  - sp10
  - curriculum-mapping
  - detalle
  - UPONE-1769
  - cableado-modelo
  - rename
---

# UPONE-1769-detalle

> **Referencia externa:** UPONE-1769 · **Tipo:** Historia · **Prioridad:** Critica · **Epica:** UPONE-1452 (Curriculum Mapping) · **Asignado:** Eduardo Bacon · **Story Points:** 8 (publicado; ver Estimacion: el re-scope sugiere ~3)
>
> **Estado (2026-09-01):** parte del alcance de este ticket (todos los renames) ya la ejecuta UPONE-1753 en el PR #23 (abierto). El estado y las dependencias con otros tickets estan en `UPONE-1769-pre-intake` (snapshot a re-validar antes de ejecutar). Este contrato deja el que-conseguir y encausa el solapamiento por Decisiones abiertas, sin reescribir la descripcion del PO.

## Fuente canonica (PO)

> Deja el esquema preparado para todo el follow-up, de modo que lo que venga despues sea puramente aditivo y no vuelva a tocar el modelo. Incluye el rename que alinea el codigo con el vocabulario del modelo v6.
>
> **Que entra.** Campos aditivos y nullable, forward-compatible: contributionPercentage en CompetencyAlignment; indices del grupo de peso; developmentSchemeId y achievementBasis en el RecordType Matrix; isRepresentative en CompetencyNodeDevelopmentLevel. Renames destructivos: coverageLevelId -> developmentLevelId, barriendo guard RC6 y tests; objeto CoverageScheme -> DevelopmentScheme, actualizando objects, lang, layouts, capabilities y tests. Coordinacion con UPONE-1753 para evitar el doble renombre.
>
> **Que NO entra.** La logica que consume esos campos (pesos e indicadores) va en follow-up; cambios de interfaz o de comportamiento.

## Historia de usuario

Como equipo de Curriculum Mapping, quiero dejar el esquema del modelo de tributacion completo y con el vocabulario del modelo v6, para que el follow-up sea puramente aditivo y no vuelva a tocar el modelo ni a renombrar.

## Objetivo

Dejar el modelo de tributacion cableado y con los nombres nuevos, de modo que los tickets siguientes (pesos, indicadores, versionado) consuman campos ya definidos sin volver a migrar schema.

## Contexto (para dimensionar)

- **Los renames ya los ejecuta UPONE-1753** en el PR #23 (abierto): objeto `CoverageScheme -> DevelopmentLevel`, `LevelScheme -> PerformanceScale`, campo `coverageLevelId -> developmentLevelId` en CompetencyAlignment, barrido del guard RC6, y `levelSchemeId -> performanceScaleId` en Matrix. Verificado en el diff del PR. Ver Decisiones abiertas (re-scope) y `UPONE-1769-pre-intake`.
- **Correccion de nombre:** el codigo real es `DevelopmentLevel` (no `DevelopmentScheme`) y `PerformanceScale`. La descripcion del PO y el detalle tecnico usan el nombre viejo.
- **Lo que queda para 1769 (aditivo):** `contributionPercentage` + `planId` + indice de grupo en CompetencyAlignment; FK del catalogo de desarrollo en Matrix (naming a coordinar con 1753); `achievementBasis` en Matrix; `isRepresentative` en `CompetencyNodeDevelopmentLevel` (objeto que crea UPONE-1756, aun inexistente).
- Verificado sobre `curriculum-mapping@develop` y el PR #23.

## Alcance

**Dentro (segun el PO; ver el re-scope propuesto en Decisiones abiertas):**

1. Campos aditivos, nullable, forward-compatible: `contributionPercentage` + `planId` + indice de grupo `(planId, competencyNodeId, developmentLevelId)` en CompetencyAlignment; FK del catalogo de desarrollo y `achievementBasis` en el RecordType Matrix; `isRepresentative` en `CompetencyNodeDevelopmentLevel`.
2. Renames destructivos (`coverageLevelId -> developmentLevelId` con barrido de RC6; objeto de cobertura a desarrollo). **Nota: verificado que estos renames ya viven en el PR #23 de UPONE-1753; ver Decisiones abiertas.**

**Fuera:**

- La logica que consume los campos (pesos, indicadores, versionado): follow-up.
- Cambios de interfaz o de comportamiento.

## Criterios de aceptacion (checkeables)

- [ ] Los campos aditivos existen y migran sin drift; el CRUD de UPONE-1756 sigue verde.
- [ ] Los campos nacen con los nombres nuevos ya vigentes (`developmentLevelId`, catalogo `DevelopmentLevel`, `PerformanceScale`), sin re-ejecutar el rename que ya hace UPONE-1753.
- [ ] El FK del catalogo de desarrollo en Matrix apunta a la raiz `Scheme` de `DevelopmentLevel` y no colisiona con `developmentLevelId`.
- [ ] No queda ninguna referencia al nombre viejo introducida por este ticket (los renames los cierra 1753).
- [ ] `isRepresentative` queda declarado en `CompetencyNodeDevelopmentLevel` (una vez que UPONE-1756 lo cree).

## Definition of Done (checkeable)

Aplica el estandar DoR/DoD del equipo (regla del proyecto, `get_rules`). Ademas:

- [ ] Migracion sin drift; `sync` corrido sin editar archivos sincronizados; artefactos de sync/seed no commiteados.
- [ ] Codegen sin drift.
- [ ] **Conexion con MCP a nivel de servicios (criterio transversal del sprint):** los campos y su gobierno quedan del lado del backend; este ticket es schema, no agrega logica de cliente.
- [ ] Coordinado con UPONE-1753: no se re-ejecuta ningun rename ya hecho en el PR #23.

## Factores transversales (checkeables)

- [ ] Logica server-side / MCP-ready: **aplica** (los campos se gobiernan en el resolver cuando la logica entre en el follow-up; este ticket no los consume en cliente).
- [ ] Permisos (RBAC): N/A (no agrega capabilities; el rename de capabilities lo hace 1753).
- [ ] Capa de lenguaje (i18n): N/A en este ticket (el i18n del rename lo hace 1753; los campos aditivos no exponen texto).
- [ ] Historial / auditoria: N/A (campos de schema, sin cambio de mecanismo).
- [ ] Convenciones de mod: **aplica** (declaracion de schema por JSON de objeto/RecordType, sin field resolvers).

## Frontera core/mod (Aduana)

**`todo-mod-only`** (reducido a campos aditivos). Los campos aditivos son declaraciones de schema propias del mod que el codegen del core ya soporta (analogo a `isHolistic`/`rollupWeight` en `rt__Competency__competencynode`). La unica pieza core-worthy del feature era el **rename del objeto** (el sync de object-manager no tiene ruta para renombrar el nombre/tabla de un objeto; `docs/guides/pre-push-migrations.md` solo cubre cuarentena, rename de valores de enum y nuevos UNIQUE), y esa pieza la carga **UPONE-1753**, no 1769. Evidencia extendida en `UPONE-1769-aduana`.

| Artefacto | Veredicto | Motivo | Fuente |
|---|---|---|---|
| Campos aditivos (contributionPercentage, planId, FK de Matrix, achievementBasis, isRepresentative, indice de grupo) | mod-only | Declaracion de schema del dominio del mod; el codegen la soporta sin cambios | `objects/CompetencyAlignment.json`, `objects/RecordTypes/rt__Matrix__competencynode.json` |
| Rename del objeto de cobertura a desarrollo | core-worthy, pero **lo ejecuta 1753** | El sync no renombra tablas; requiere camino manual/coordinacion | `object-manager/docs/guides/pre-push-migrations.md` |

**Veredicto global:** `todo-mod-only` para 1769 si se mantiene en campos aditivos (el rename lo hace 1753).

## Dependencias

- **UPONE-1753 (PR #23, abierto):** ejecuta los renames y fija los nombres nuevos. 1769 nace con esos nombres, asi que **depende de que 1753 mergee**. 1753 esta bloqueado por UPONE-1689 (sin mergear) y por su "decision 1" (seed).
- **UPONE-1756:** crea `CompetencyNodeDevelopmentLevel` (donde va `isRepresentative`). Sin ese objeto, ese campo no se puede agregar.
- **UPONE-1755:** consume `achievementBasis` y los ejes cableados (en el follow-up).
- **Habilita:** el follow-up de tributacion (pesos, indicadores, versionado) sobre campos ya definidos.

## Estimacion

**8 Story Points (publicado).** El peso venia casi todo del rename destructivo (sensibilidad media-alta). Verificado que el rename ya lo ejecuta UPONE-1753 (PR #23): si 1769 se reduce a los campos aditivos (sensibilidad baja), la estimacion baja a **~3 SP**. Ver Decisiones abiertas (re-estimar). **Actualizacion 2026-09-14 (ver Addendum): los tres campos aditivos ya estan en `develop`, o sea 1769 quedo efectivamente ejecutado; la estimacion es historica.**

## Decisiones abiertas

- [ ] **Re-scope (renames ya cubiertos por 1753):** verificado que el objeto de cobertura a desarrollo, el campo `coverageLevelId -> developmentLevelId` y el barrido de RC6 ya viven en el PR #23 de UPONE-1753. Propuesta: **1769 se reduce a los campos aditivos** y no re-ejecuta ningun rename. Confirmar con el PO/lead (no se reescribe la descripcion del PO; se encausa aca).
- [ ] **Naming del FK de Matrix:** el objeto quedo `DevelopmentLevel` (Composite con `recordType` Scheme/Level). El FK de Matrix apunta a la raiz `Scheme` y no puede llamarse `developmentLevelId`. Propuesta `developmentLevelSchemeId`, a acordar con Francisco (dueno de 1753).
- [ ] **Correccion de nombre:** `DevelopmentScheme` (descripcion del PO / detalle tecnico) es en realidad `DevelopmentLevel` en el codigo.
- [ ] **`isRepresentative` depende de UPONE-1756:** el objeto `CompetencyNodeDevelopmentLevel` aun no existe.
- [ ] **Re-estimar:** confirmar 8 vs ~3 SP tras el re-scope.

## Guia de ejecucion: reglas y patrones a considerar

- **[Gate] No re-ejecutar los renames de UPONE-1753** (PR #23): seria el "doble renombre" que ambos tickets piden evitar. _Fuente: PR #23; descripcion de UPONE-1753._
- **[A favor] Campos aditivos, nullable, sin logica que los consuma** (esa va en el follow-up): declaracion de schema por JSON de objeto/RecordType, sin field resolvers. _Fuente: `objects/RecordTypes/rt__Competency__competencynode.json` (patron isHolistic/rollupWeight)._
- **[Advertencia] El rename del nombre de un objeto no lo resuelve el sync:** solo hay ruta para cuarentena, rename de enum y nuevos UNIQUE. _Fuente: `object-manager/docs/guides/pre-push-migrations.md`._ (Lo carga 1753, no 1769.)
- **Transversal:** correr `sync`/`codegen` sin drift, no editar archivos sincronizados. _Fuente: CLAUDE.md del mod._

## Tickets relacionados

| Ticket | Que es | Relacion | Estado |
|---|---|---|---|
| UPONE-1753 | Ajustar menus + rename de terminologia (Escala de desempeno / Niveles de desarrollo) | Ejecuta los renames de 1769; fija los nombres nuevos | Tarea, Backlog; PR #23 abierto (Francisco Navarro) |
| UPONE-1756 | CRUD de tributacion por competencia | Crea `CompetencyNodeDevelopmentLevel` (donde va isRepresentative); consume el modelo cableado | En detalle (KB sp10) |
| UPONE-1755 | Modelo de medicion | Consume achievementBasis y los ejes cableados | En detalle (KB sp10) |
| UPONE-1689 | Adopcion de planes | Bloqueante de 1753 (sin mergear: rama 42f5e37, develop 4fc88f6) | Rama sin mergear |

## Referencias

- Fuente canonica: UPONE-1769 (Jira). Pre-intake / estado: `UPONE-1769-pre-intake`. Aduana: `UPONE-1769-aduana`.
- PR que cubre los renames: https://bitbucket.org/uplanner/curriculum-mapping/pull-requests/23 (UPONE-1753).
- Fuentes del PO: maqueta (`2197e9c9`), detalle tecnico (`28f19a04`), plan de particion (`af80b782`).
- Working copy: `curriculum-mapping@develop` + PR #23.

---

## Addendum (2026-09-09): re-evaluacion del plan contra los cambios reales de 1756

> Anexo, no reemplaza el contrato de arriba. Motivo: revisar el plan de cableado de 1769 contra lo efectivamente construido en 1756 en local. **El plan cambia sustancialmente: la mayor parte del cableado ya esta hecho.**
>
> **CORRECCION 2026-09-14 (ver Addendum-2 al final):** los tres agregados que este addendum daba por PENDIENTE (`contributionPercentage`, indice de grupo compuesto, `isRepresentative`) **ya estan en `develop`**. Leer la tabla de abajo junto con el Addendum-2, que es el estado vigente. Se conserva este texto como registro de la foto del 2026-09-09.

### Que se revisó (evidencia)

- **curriculum-mapping**, rama `feat/UPONE-1756-curriculum-mapping-tributacion-crud-por` @ `812b31a` (working tree limpio; los cambios de 1756 estan commiteados, no sin guardar).
- **develop** de referencia: `origin/develop @ c00be1f` (posterior al watermark `584499e` del analisis de sp9).
- Lectura directa de `objects/CompetencyAlignment.json`, `objects/CompetencyNodeDevelopmentLevel.json`, `objects/RecordTypes/rt__Matrix__competencynode.json` y grep de campos en HEAD.

### Estado item por item del alcance original de 1769

> **Nota (2026-09-14):** las tres filas marcadas PENDIENTE abajo ya pasaron a HECHO. Ver Addendum-2.

| Item planeado en 1769 | Estado real (2026-09-09) | Estado vigente (2026-09-14) | Evidencia |
|---|---|---|---|
| Renames (`CoverageScheme→DevelopmentLevel`, `LevelScheme→PerformanceScale`, `coverageLevelId→developmentLevelId`, barrido RC6) | **HECHO y en develop** | HECHO | En `origin/develop` ya existen `objects/DevelopmentLevel.json`, `objects/PerformanceScale.json`, layouts `default_PerformanceScale_*`, `tests/integration/catalog-rename.test.ts`. Confirma el re-scope: los renames NO son de 1769. |
| `planId` en CompetencyAlignment + índice | **HECHO por 1756** (en la rama, sin mergear) | HECHO (en develop) | `objects/CompetencyAlignment.json`: `planId` (nullable, denormalizado, derivado siempre de `planEntry.planId` por REQ-01) e índice `planId`. |
| `developmentLevelId` (FK del catálogo de desarrollo) en el RecordType Matrix | **HECHO** | HECHO | `rt__Matrix__competencynode.json:20-27` referencia `DevelopmentLevel` (fila Scheme). Ver nota de naming abajo. |
| `achievementBasis` en Matrix | **HECHO** | HECHO | `rt__Matrix__competencynode.json:92,208`; cableado en `validateCompetencyMatrix.js` y `competencyMatrixHistory.js`. (Lo trajo el modelo de medición, 1755.) |
| Objeto `CompetencyNodeDevelopmentLevel` | **EXISTE** (en develop) | HECHO | `objects/CompetencyNodeDevelopmentLevel.json`; referenciado por `alignmentRules.js`, `competencyTree-upsert.resolver.js`, `nodeDevelopmentLevels.js`. |
| `contributionPercentage` en CompetencyAlignment | **PENDIENTE** (2026-09-09) | **HECHO (2026-09-14)** | Existe en `objects/CompetencyAlignment.json:73` (string, nullable). |
| Índice de grupo `(planId, competencyNodeId, developmentLevelId)` | **PENDIENTE** (2026-09-09) | **HECHO (2026-09-14)** | Declarado en `objects/CompetencyAlignment.json:16` (`indexes`). |
| `isRepresentative` en `CompetencyNodeDevelopmentLevel` | **PENDIENTE** (2026-09-09) | **HECHO (2026-09-14)** | Declarado en `objects/CompetencyNodeDevelopmentLevel.json:33` (boolean, nullable). |

### Conclusión: qué debe cambiar en el plan de 1769

> **Superada por el Addendum-2 (2026-09-14).** Al 2026-09-09 el alcance de 1769 se reducia a tres agregados de schema aditivos (`contributionPercentage`, indice de grupo, `isRepresentative`). Hoy los tres estan en `develop`, asi que ese alcance residual **quedo ejecutado**. Se conserva el texto original abajo como registro.

El alcance de 1769 se **reduce a tres agregados de schema aditivos**, todos `todo-mod-only`, sin rename y sin cross-mod:

1. **`contributionPercentage`** en `CompetencyAlignment` (numérico, nullable; el peso del eje 1 que consume el follow-up 1770).
2. **Índice de grupo** `(planId, competencyNodeId, developmentLevelId)` en `CompetencyAlignment`.
3. **`isRepresentative`** (booleano, nullable) en `CompetencyNodeDevelopmentLevel`.

Todo lo demás del contrato original (renames + `planId` + FK/`achievementBasis` de Matrix + creación del objeto CNDL) **ya está hecho** en develop o en la rama de 1756.

### Impacto en estimación, dependencias y decisiones abiertas

- **Estimación:** de los 8 SP publicados (y el ~3 ya propuesto por el re-scope de renames) baja a **~1 SP**: son tres campos/índice declarativos sin lógica. Confirmar con PO/lead.
- **Dependencia dura sobre 1756 (nueva):** la rama de 1756 está **sin mergear**. `planId` y el índice de grupo (que lo usa) solo quedan firmes cuando 1756 mergee. Opción a evaluar: **plegar estos tres agregados dentro de 1756** (que aún no cerró) en lugar de mantener 1769 como ticket propio, dado lo mínimo que quedó. Decisión de PO/lead.
- **Decisión abierta "naming del FK de Matrix" → CERRADA en código:** el campo quedó como **`developmentLevelId`** en `rt__Matrix__competencynode.json`, apuntando a la fila `Scheme` de `DevelopmentLevel`, y **coexiste** con `CompetencyAlignment.developmentLevelId` (que apunta a un `Level`). No se usó `developmentLevelSchemeId`. Actualizar la Decisión abierta correspondiente.
- **Decisión abierta "corrección de nombre `DevelopmentScheme`" → CONFIRMADA:** el código es `DevelopmentLevel`/`PerformanceScale`. Coherente con la nota de no reintroducir `DevelopmentScheme` (decisión N-1 de 1753, PR #23 ya en develop).
- **`isRepresentative`:** su dependencia (objeto CNDL) ya existe; se puede agregar sin esperar nada más.

### Verificación mínima para cuando se ejecute (sea 1769 o dentro de 1756)

- [ ] Los tres agregados migran sin drift; `sync`/`codegen` sin drift; artefactos de sync no commiteados.
- [ ] El CRUD de tributación de 1756 sigue verde tras agregarlos.
- [ ] Ningún rename se re-ejecuta (ya viven en develop).
- [ ] `contributionPercentage` nace nullable y sin lógica que lo consuma (el reparto de pesos es follow-up 1770).

> Watermark de esta re-evaluación: `curriculum-mapping` rama 1756 @ `812b31a`, `origin/develop` @ `c00be1f`.

---

## Addendum-2 (2026-09-14): los tres agregados ya estan en develop

> Correccion del Addendum anterior. Verificado directamente contra `curriculum-mapping@develop` el 2026-09-14 (surgio al detallar UPONE-1770, que consume `contributionPercentage`). Los tres agregados que el Addendum del 2026-09-09 daba por PENDIENTE **ya existen en el codigo**. 1769, en su alcance residual de campos aditivos, quedo **efectivamente ejecutado**.

| Agregado | Estado 2026-09-09 | Estado 2026-09-14 | Evidencia (`curriculum-mapping@develop`) |
|---|---|---|---|
| `contributionPercentage` en `CompetencyAlignment` | PENDIENTE | **HECHO** | `objects/CompetencyAlignment.json:73` (string, nullable) |
| Indice de grupo `(planId, competencyNodeId, developmentLevelId)` | PENDIENTE | **HECHO** | `objects/CompetencyAlignment.json:16` (bloque `indexes`) |
| `isRepresentative` en `CompetencyNodeDevelopmentLevel` | PENDIENTE | **HECHO** | `objects/CompetencyNodeDevelopmentLevel.json:33` (boolean, nullable) |

### Consecuencias

- **Alcance de 1769:** su parte residual (los tres agregados) ya no esta pendiente. No queda schema por cablear del lado de 1769; el follow-up 1770 encuentra el modelo listo.
- **Estimacion:** el "~1 SP" del Addendum es historico. No hay trabajo aditivo restante atribuible a 1769.
- **Para 1770:** la premisa "el peso ya existe en el modelo, falta gobernarlo" es correcta. Lo unico pendiente para gobernar el peso es agregar `contributionPercentage` a `WRITABLE_FIELDS` (`logic/helpers/validateCompetencyAlignment.js`), que es trabajo de 1770, no de 1769. Ver `UPONE-1770-detalle` (en sp11).
- **Decision abierta "plegar dentro de 1756":** ya es irrelevante como trabajo pendiente (los agregados estan); queda solo como nota de por que 1769 casi no tuvo alcance propio.
