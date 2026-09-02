---
id: DOC-kb-sp10-UPONE-1756-pre-intake
project: up1
type: doc
module: curriculum-mapping
tags:
  - sp10
  - curriculum-mapping
  - pre-intake
  - UPONE-1756
  - tributacion-competencias
---

# UPONE-1756 Pre-intake (guia de implementacion: tributacion)

> **Estado (actualizado 2026-09-01):** analisis tecnico previo al split. El feature YA se dividio en 5 tickets finalizados (fuente de verdad): sprint = `UPONE-1756-alcance-sp10` (13) + `UPONE-1756-alcance-sp10-delta` (8) = CRUD completo, 21 SP; follow-up = `UPONE-1756-followup` (13) + `UPONE-1756-followup-delta` (10) + `UPONE-1756-followup-delta-2` (8). Donde contradiga a esos tickets, mandan los tickets.

> Material del implementador. **No va a Jira.** Alimenta el intake/diseno posterior: entrega el mapa de enfoques, las hipotesis a validar y los riesgos tecnicos, para no investigar desde cero. Contrato del ticket (que conseguir): `UPONE-1756-detalle`. Tablero de evidencia: `UPONE-1756-explicativo`.

## Veredicto y superficie

**Feature grande (~34 SP), a partir en fases.** Veredicto de frontera: `todo-mod-only` (todo vive en `curriculum-mapping`; la pantalla toca layouts de `curriculum-design` pero sin codigo de core y con mecanismos ya existentes). Superficie estimada:

- `objects/`: `CompetencyAlignment.json` (cambia), `CompetencyNode.json` (campos nuevos), `CompetencyNodeDevelopmentLevel.json` (nuevo), RecordTypes de `Matrix`/`Competency`/`SubCompetency`.
- `logic/`: resolver de tributacion **nuevo** (upsert de conjunto por plan+matriz) + helpers de validacion.
- `capabilities.json` + `seed/_data-rbac.js`: `competencyalignment:*` (declarar + cablear).
- `curriculum-design/config/layouts/`: `default_Curriculum_view.json` (tab de lectura, F4) y `default_Curriculum_edit.json` (editor, F5).
- `modsComponents/`: componente de tributacion nuevo (en curriculum-mapping; el registro es plano).
- `lang/{es,en,pt}`, `tests/`.

## Estado actual del codigo

- `objects/CompetencyAlignment.json`: existe con `sourceType`/`sourceId`/`competencyNodeId`/`level`/`coverageLevelId`/`contributionType`; `uniqueConstraints [["sourceType","sourceId","competencyNodeId"]]` (la regla del par unico ya esta); indices `competencyNodeId`, `coverageLevelId`, `(sourceType,sourceId)`. Falta el indice del grupo de peso `(planId, competencyNodeId, developmentLevelId)`.
- `objects/CompetencyNode.json`: arbol desnudo (9 propiedades); **no** tiene `isDirectlyMeasured`, `developmentSchemeId`, `achievementBasis`, ni tabla de niveles. `isHolistic` **si** existe en los RT `Competency`/`SubCompetency`.
- `logic/`: hay 4-5 escrituras gobernadas (matriz, arbol, coverageScheme, levelScheme, matrixAdoption). **No hay resolver de tributacion.**
- `objects/MatrixAdoption.json`: existe (`uniqueConstraints [["competencyNodeId","curriculumId","effectiveFrom"]]`, `curriculumId` sin FK a proposito).
- `capabilities.json`: 20 capabilities; **ninguna `competencyalignment:*`** (el motivo esta escrito en `seed/_data-rbac.js:145-147`). Ya trae `competencynode:adopt/exempt` (de UPONE-1689).
- Cross-mod: la vista del plan (`curriculum-design/config/layouts/default_Curriculum_view.json`) ya es un `RecordDetail` con tabs y ya gatea un tab con `core_datalog:view` (precedente de consulta cross-namespace de capability). `getMyPermissions` devuelve la lista plana sin filtrar por mod; `layout` expone `hasCapability(string)`.

## Separacion hechos / propuesta / inferencia (DET-4)

| Estado | Item |
|---|---|
| **Verificado** (file:line) | `CompetencyAlignment` casi correcto; no hay resolver de tributacion; `isHolistic` existe; el mecanismo cross-mod de capability existe (precedente `core_datalog:view`); el rename de `coverageLevelId` rompe el guard RC6 (`schemeUsage.js:67`); el versionado real de un plan usa el flujo `asNewVersion`+`sourceId` con `inheritRecordTypeExtensionOnVersion` + `copyRecordTypeExtension` en `curriculum-design`, que hoy copia extensiones de RecordType y **no** toca tributacion (`_cloneMap` **no existe** en el codigo; ver correccion en E4 mas abajo) |
| **Propuesta del analisis** | denormalizar `planId`; componente en `curriculum-mapping/modsComponents/` (decidido, ver E5); reusar `isHolistic` en vez de `isDirectlyMeasured` (decidido, ver E1); construir la replica de tributacion al versionar el plan enganchada al flujo real `asNewVersion`/`copyRecordTypeExtension` (ver E4) |
| **Inferencia sin respaldo** (a confirmar) | que en la instancia real `nm_percentage` no tenga datos que migrar; que ningun otro mod ya declare un evento sobre `Curriculum`/`planEntry` (registro global) |

## Analisis de enfoques (posibilidades)

**E1. Marcar "la competencia se mide" (R-3). [DECIDIDO]**
- Se reusa `isHolistic` (existe a nivel de RecordType). R-3 = `sinHijos OR isHolistic`, con "sin hijos" calculado del arbol, mas el invariante: `isHolistic=false` sin hijos es invalido. El rename cosmetico a `isDirectlyMeasured`, si se hace, va al ticket delta; no es parte de este alcance.
- Historial del analisis (contexto, ya resuelto):
  - **A. Reusar `isHolistic`** existente. Pro: sin campo nuevo, sin deuda semantica; ya lo escribe `upsertCompetencyTreeValidated`. Contra: hubo que confirmar que su semantica ("se evalua como unidad") cubre exactamente "es destino de tributacion" — confirmado.
  - **B. Campo nuevo `isDirectlyMeasured`.** Pro: explicito. Contra: dos booleanos casi sinonimos. Descartado como campo funcional; queda solo como posible rename cosmetico (delta).
  - **C. Derivar de "tiene hijos"** (un nodo rama consolida). Se incorporo como parte de la condicion final (`sinHijos OR isHolistic`), no como alternativa excluyente.

**E2. El plan en la tributacion.**
- **A. Denormalizar `planId`** y mantenerlo consistente en el resolver. Pro: cada lectura del mapa, grupo de peso e indicador evita un viaje por API. Contra: consistencia a cargo del resolver.
- **B. Join cross-mod por `sourceId -> planEntry.planId`.** Contra: es una segunda query por API (no hay FK), en el camino mas caliente.
- _Recomendacion: A._

**E3. Renombre `coverageLevelId -> developmentLevelId` (y `CoverageScheme -> DevelopmentScheme`).**
- **A. Rename con migracion**, barriendo el guard RC6 y sus tests en la misma pasada. Coordinar con 1753 (que ya renombra el objeto).
- **B. Campo nuevo + deprecacion del viejo.** Pro: reversible. Contra: convivencia de dos campos.
- _Recomendacion: A, coordinado con 1753 para no renombrar dos veces. Si 1753 va antes, este ticket ya encuentra `DevelopmentScheme`._

**E4. R-8 (replicar al versionar el plan). [A CONSTRUIR - codigo nuevo]**
- **Correccion:** `_cloneMap` **no existe** en el codigo. La cita previa a `object-manager/src/graphql/resolvers/instance.resolver.js:4760-4771` era falsa.
- El versionado real de un `Curriculum` usa el flujo `asNewVersion`+`sourceId`, con `inheritRecordTypeExtensionOnVersion` + `copyRecordTypeExtension` en `curriculum-design` (`logic/sectionValidation.resolver.js`, `logic/helpers/recordTypeExtension.js`). Hoy ese flujo copia extensiones de RecordType y **no** toca tributacion.
- La replica de tributacion al versionar el plan es **codigo nuevo a construir**, enganchado a ese mecanismo real (no a un `_cloneMap` inexistente).

**E5. Donde vive el componente. [DECIDIDO]**
- `curriculum-mapping/modsComponents/` (dueno del objeto, regla de plataforma); el render ocurre en la vista del plan (`curriculum-design`), que lo referencia via el registro plano de componentes.

## Consideraciones de implementacion

- **Upsert de conjunto transaccional:** el guardado envia el mapa completo del plan para una matriz; el resolver hace un upsert de conjunto por (plan, matriz), no altas/bajas individuales. Renormalizar el peso sobre las filas con evidencia.
- **Tabla de union `CompetencyNodeDevelopmentLevel`:** escribirla por Prisma directo dentro de la mutation gobernada (precedente `CompetencyNodeOwnerUnit`/`ScopeUnit`), no CRUD generico.
- **Guard RC6:** `isCoverageSchemeInUse` filtra por la relacion `coveragelevel`; el rename lo rompe. Barrer `logic/helpers/schemeUsage.js:67`, `coverageScheme-upsert.resolver.js:276` y los dos tests.
- **Registro de eventos global** `(objectType, operation)`: si se declara un evento sobre `Curriculum`/`planEntry`, el primero fija el `includeFields` para todos; `curriculum-design/events/` no existe hoy. Coordinar.
- **Tenant isolation** en todas las queries; el client per-tenant no lleva `tenantId`.
- **Riesgo tecnico:** el camino cross-mod (vista del plan consultando la capability de mapping) esta soportado pero no ejercitado para este caso; smoke temprano.

## Hipotesis a validar (para el intake)

- **H1:** un tab de `default_Curriculum_view.json` gateado con `competencyalignment:view` se oculta para un usuario sin esa capability, aunque tenga acceso a Curriculum Design. _Validacion: smoke con dos roles._
- **H2:** `isHolistic` alcanza para R-3 (destino de tributacion). _Validacion: revisar su uso actual y un caso de nodo que consolida._
- **H3 (corregida):** ~~el evento `:create` del `Curriculum` versionado entrega `_cloneMap` consumible desde curriculum-mapping~~ — descartada, `_cloneMap` no existe. Reemplazada por: la replica de tributacion al versionar el plan requiere codigo nuevo enganchado al flujo real `asNewVersion`/`copyRecordTypeExtension` (ver E4). _Validacion: disparar un versionado real y confirmar que datos entrega ese flujo para construir el enganche._
- **H4:** el rename de `coverageLevelId` con migracion deja RC6 verde. _Validacion: correr la suite de `schemeUsage` tras el rename._
- **H5:** en la instancia real no hay valores de peso que migrar. _Validacion: consultar la instancia._

## Decisiones tecnicas abiertas (las resuelve el dev/intake)

- E2, E3 y E4 de arriba (E1 y E5 ya resueltos, ver arriba), y: persistir vs derivar el estado automatico/manual del grupo de peso; el indice del grupo.

## Reglas / patrones y su fuente

- Escritura gobernada `*Validated`, sin CRUD generico ni Prisma directo en runtime salvo tabla de union en la mutation. _`CLAUDE.md` del mod._
- Lectura cross-mod por id pelado sin FK, declarar la dependencia no la FK. _`up1/CLAUDE.md:300`; `MatrixAdoption.json:27`._
- Consulta de capability cross-mod: `requiredCapability` + `hasCapability`. _`default_Curriculum_view.json:52-53`._
- Versionado de un plan: flujo `asNewVersion`+`sourceId` con `inheritRecordTypeExtensionOnVersion` + `copyRecordTypeExtension` (hoy solo para extensiones de RecordType, no para tributacion). _`curriculum-design/logic/sectionValidation.resolver.js`; `curriculum-design/logic/helpers/recordTypeExtension.js`._

## Archivos candidatos (tentativo, no mandato)

- `objects/CompetencyAlignment.json`, `CompetencyNode.json`, `CompetencyNodeDevelopmentLevel.json` (nuevo), `RecordTypes/rt__*__competencynode.json`.
- `logic/competencyAlignment-*.resolver.js` (nuevo) + `logic/helpers/`.
- `capabilities.json`, `seed/_data-rbac.js`.
- `curriculum-design/config/layouts/default_Curriculum_{view,edit}.json`.
- `modsComponents/<ComponenteTributacion>/`.
- `lang/{es,en,pt}`, `tests/unit`, `tests/integration`.
