---
id: DOC-kb-sp10-UPONE-1756-detalle
project: up1
type: doc
module: curriculum-mapping
tags:
  - sp10
  - curriculum-mapping
  - detalle
  - UPONE-1756
  - tributacion-competencias
  - competency-alignment
  - aduana-todo-mod-only
  - re-scope
---

# UPONE-1756 Detalle (Curriculum Mapping: tributacion)

> **Estado (actualizado 2026-09-01):** este documento es el analisis del feature completo, previo al split. El feature YA se dividio en 5 tickets finalizados, que son la fuente de verdad: para el sprint, `UPONE-1756-alcance-sp10` (13 SP, CRUD por competencia end-to-end) + `UPONE-1756-alcance-sp10-delta` (8 SP, campos forward-compatible + renames) = **CRUD completo, 21 SP en 2 tickets**; para el follow-up, `UPONE-1756-followup` (13) + `UPONE-1756-followup-delta` (10, indicadores + versionado) + `UPONE-1756-followup-delta-2` (8, outcomeAlignment F6 + retiro R-7). Donde este documento contradiga a esos tickets, mandan los tickets.

> **Referencia externa:** UPONE-1756 · **Tipo:** implement (Jira: Tarea) · **Prioridad:** Mayor · **Epica:** UPONE-1452 (Curriculum Mapping) · **Asignado:** Eduardo Bacon · **Story Points:** ~34 (excede un ticket; ver Estimacion y Decisiones abiertas)
>
> Contrato del ticket (que conseguir). El detalle tecnico code-grounded (el como, con rutas y evidencia) vive en el explicativo del mismo sprint: `UPONE-1756-explicativo`; la guia de implementacion, en `UPONE-1756-pre-intake`.

## Fuente canonica (PO)

La descripcion en Jira no trae texto: es un enlace a la maqueta de sp10 (Curriculum Mapping, v29). El alcance lo fija el titulo del ticket:

> Curriculum Mapping | Tributacion.

## Historia de usuario

Como responsable curricular, quiero registrar contra que competencias tributa cada asignatura de un plan, en que nivel de desarrollo y con que tipo de contribucion, para saber en que punto del plan se desarrolla y se evalua cada competencia y para sostener la medicion del logro.

## Objetivo

Construir la logica de tributacion asignatura-competencia: el objeto de la tributacion al dia, la informacion que la competencia debe declarar para poder validarla, la escritura gobernada (resolver), los indicadores de cobertura con sus denominadores, los permisos, y la pantalla que se opera desde el registro del plan.

## Contexto (para dimensionar)

- **El feature es grande: la estimacion da ~34 SP, que excede un ticket.** Se propone partirlo en fases (F1..F6); ver Estimacion y Decisiones abiertas. F1 es dependencia dura de todo lo demas.
- El objeto de la tributacion (`CompetencyAlignment`) ya existe y es casi correcto; lo que falta es la escritura gobernada (no hay resolver) y, sobre todo, la informacion en la competencia contra la cual validar (`isHolistic` reusado para R-3, niveles declarados).
- **La pantalla se opera desde el registro del plan, que vive en Curriculum Design, pero el objeto y el permiso son de Curriculum Mapping.** El principio: la pantalla no otorga permiso; gobierna el dueno del objeto.
- **Correccion verificada al explicativo (seccion 10):** el explicativo dejaba como "dependencia a levantar" que Curriculum Design pudiera consultar una capability de Curriculum Mapping al renderizar. **Ya esta resuelto en la plataforma:** los permisos del usuario se entregan como lista plana sin filtrar por mod, `layout` expone `hasCapability(string)`, y un tab se gatea con `requiredCapability`; hay precedente en produccion (el propio `default_Curriculum_view.json` gatea un tab con `core_datalog:view`). No hay dependencia de plataforma.
- **Decision de modelo (resuelta):** R-3 se evalua reusando `isHolistic`, que ya existe en los RecordTypes `Competency`/`SubCompetency` ("se evalua como una unidad, sin abrirla en partes"): `sinHijos OR isHolistic`, con "sin hijos" derivado del arbol (no de la bandera), mas invariante de escritura (un nodo `isHolistic=false` con cero hijos es invalido). El rename `isHolistic` -> `isDirectlyMeasured` es cosmetico y va en `UPONE-1756-alcance-sp10-delta`.
- **Frescura:** `curriculum-mapping` en `develop` @ `584499e` (limpio; el explicativo se preparo sobre ese commit). `curriculum-design` @ `8a151e7`. `capabilities.json` ya trae `competencynode:adopt`/`exempt` (de UPONE-1689), base mas nueva que la que asume el explicativo.

## Alcance

**Dentro (todo el feature; ver el corte por fases en Estimacion):**

1. Poner al dia `CompetencyAlignment` (renombre de `coverageLevelId` a `developmentLevelId`, `contributionPercentage`, `planId`, requeridos condicionales, indice del grupo de peso).
2. Que la competencia declare lo necesario: si se mide o consolida, sus niveles de desarrollo (`CompetencyNodeDevelopmentLevel`), y `developmentSchemeId`/`achievementBasis` en la matriz.
3. La escritura gobernada: resolver de upsert de conjunto por (plan, matriz), con las reglas R-1..R-12 y el reparto del peso del eje 1.
4. La lectura del plan: pestana con indicadores (con sus dos denominadores) y el detalle en solo lectura.
5. El editor: las dos formas (grilla y malla), la via masiva y el guardado global.
6. Permisos `competencyalignment:*` cableados a los roles curriculares existentes.

**Fuera:**

- `outcomeAlignment` (refinamiento a nivel de resultados de aprendizaje) y R-7 con su resguardo: es la fase F6, se opera desde el Programa de Asignatura.
- El campo `contributesToGraduationProfile`: retirado del modelo, no se implementa (su caso lo resuelve `achievementBasis = RepresentativeLevel`).
- Modelar las plantillas de perfil como objeto: son solo interfaz.

## Criterios de aceptacion (checkeables)

- [ ] Solo se pueden tributar competencias de matrices con adopcion vigente para el plan (R-1).
- [ ] El par (asignatura, competencia) es unico; el selector muestra los existentes marcados, no permite duplicar (R-2).
- [ ] Un nodo que consolida no es destino de tributacion (R-3); un nivel de desarrollo debe ser de los que la competencia declaro (R-4).
- [ ] El tipo de contribucion es obligatorio y nace en `Develops`; solo `Evaluates`/`Both` participan del peso (R-5, R-6).
- [ ] Mover una tributacion de nivel actualiza la fila, no crea otra (R-10).
- [ ] Al versionar el plan, la tributacion no se replica sola: se elige replicar o empezar limpio; sin permiso, se replica (R-8).
- [ ] La suma de pesos de cada grupo se valida al publicar el plan, por grupo y su eje (no por matriz), no en cada guardado.
- [ ] Los indicadores de cobertura cuentan por celda declarada (nivel), no por competencia, y declaran su denominador segun la vista.
- [ ] La pestana de Tributacion y sus controles aparecen solo con la capability `competencyalignment:*` correspondiente, aunque la pantalla viva en Curriculum Design.
- [ ] Una fila que contradice el diseno se muestra marcada, no se borra sola (R-12).

## Definition of Done (checkeable)

Aplica el estandar DoR/DoD del equipo (regla del proyecto; `estandar-DoR-DoD` del sprint). Ademas, especifico:

- [ ] Escritura gobernada: ninguna via (UI, importacion, API, MCP) puede violar R-1..R-5 y R-10; el resolver revalida lo que la UI ya evita.
- [ ] Guardado transaccional: upsert de conjunto por (plan, matriz), no altas/bajas individuales.
- [ ] Migracion de `CompetencyAlignment` sin drift; el renombre no deja el guard de uso (RC6) roto (ver Decisiones abiertas).
- [ ] RBAC efectivo por rol verificado en runtime; la pestana no aparece sin la capability, no aparece vacia.
- [ ] i18n es/en/pt con paridad; tenant isolation en todas las queries.
- [ ] Tests unit de las reglas y del reparto de peso; smoke del recorrido de tributacion y del versionado del plan.
- [ ] Artefactos de sync/seed no commiteados.

## Tests minimos (checkeables; ampliables en ejecucion)

- [ ] Tributar una asignatura a una competencia medible de una matriz adoptada: persiste; a una no adoptada: bloqueado.
- [ ] Tributar a un nodo que consolida: bloqueado con su motivo.
- [ ] Nivel fuera de los declarados por la competencia: bloqueado.
- [ ] Pasar una fila a `Evaluates` entra al grupo de peso; el reparto automatico se recompone; volver a `Develops` devuelve el peso a null.
- [ ] Publicar el plan con un grupo que no suma 100 (y no se exime por `Max`): bloqueado.
- [ ] Un usuario con acceso a Curriculum Design y sin `competencyalignment:view`: no ve la pestana.
- [ ] Versionar el plan replicando: las filas remapean al `planEntry` equivalente; las que no tienen destino se descartan y se reporta cuantas.
- [ ] Indicador de desarrollo tributado: cuenta por celda declarada, no por competencia.

## Factores transversales (checkeables)

- [ ] Permisos (RBAC): **aplica.** `competencyalignment:*` cableadas a los 4 roles curriculares (sin roles nuevos); consulta cross-mod desde la vista del plan.
- [ ] Historial / auditoria (DataLog): evaluar `enableDataLog` sobre `CompetencyAlignment`.
- [ ] Capa de lenguaje (i18n): **aplica** (pestana, detalle, mensajes) es/en/pt.
- [ ] Accesibilidad (WCAG): aplica a la grilla y al panel de detalle.
- [ ] Storybook: evaluar para el componente de tributacion nuevo.
- [ ] Documentacion: **aplica** (feature nuevo, reglas de negocio y frontera cross-mod).
- [ ] Convenciones de mod: **aplica.** Escritura gobernada `*Validated`, tenant isolation, RT `rt__`, sin field resolvers en mods, tabla de union por Prisma directo dentro de la mutation (precedente `CompetencyNodeOwnerUnit`/`ScopeUnit`). Ver Guia.

## Frontera core/mod (Aduana)

Pasada de Aduana en subagente de contexto limpio, modo analisis, contra el working copy real.

| Artefacto | Veredicto | Motivo | Fuente |
|---|---|---|---|
| Cambios a `CompetencyAlignment.json` (rename, `contributionPercentage`, `planId`, indice) | `mod-only` | Objeto propio del mod. Ojo colateral en el mod: el rename rompe el guard RC6 (`isCoverageSchemeInUse`) y sus tests | `objects/CompetencyAlignment.json:11-19,49-57`; `logic/helpers/schemeUsage.js:67`; `tests/unit/schemeUsage.test.js:74` |
| Requerido condicional por `sourceType` | `mod-only` | La plataforma no tiene `required` condicional declarativo; se enforza en el resolver. Generalizarlo seria Core Extension Type 3, no necesario aqui | evidencia negativa en `object-manager/docs/reference/` |
| Campos nuevos en `CompetencyNode.json` + RecordTypes | `mod-only` | Objeto del mod. Se reusa `isHolistic` existente para R-3 (sin campo nuevo); el rename cosmetico a `isDirectlyMeasured` va en el ticket delta | `objects/CompetencyNode.json:38-119`; `objects/RecordTypes/rt__Competency__competencynode.json:11-17` |
| Objeto nuevo `CompetencyNodeDevelopmentLevel` | `mod-only` | Precedente identico ya construido dos veces en el mod | `objects/CompetencyNodeOwnerUnit.json`; `objects/CompetencyNodeScopeUnit.json` |
| Resolver de tributacion en `logic/` | `mod-only` | Hoy no existe; el CRUD generico no cubre el upsert de conjunto ni las reglas, pero la logica es de negocio del mod | `logic/matrixAdoption.resolver.js` (mismo molde) |
| Capabilities `competencyalignment:*` + cableado | `mod-only` | Catalogo del mod; el cableado solo hace `attachCapabilitiesToRole` sobre los 4 roles existentes | `capabilities.json:14-36`; `seed/_data-rbac.js:145-147` |
| Pantalla operada desde el registro del plan (curriculum-design) | `mod-only` | La vista del plan ya es un `RecordDetail` con tabs; agregar "Tributacion" es un tab mas + un elemento en schema. El registro de `modsComponents` es un namespace plano sin dueno por mod | `mods/curriculum-design/config/layouts/default_Curriculum_view.json:14-56`; `layout/src/modsComponents/component-registry.json` |
| Consulta cross-mod de capability al renderizar | `mod-only` (**mecanismo ya existente**) | Permisos planos sin filtro por mod + `hasCapability(string)` + `requiredCapability` en el tab; precedente en produccion con `core_datalog:view` | `object-manager/src/graphql/resolvers/user.resolver.js:158-211`; `layout/src/composables/useRbacPermissions.ts:35`; precedente `default_Curriculum_view.json:52-53` |

**Veredicto global: `todo-mod-only`.** Ningun artefacto requiere tocar `object-manager`, `layout` o `suite`. Se corrige el explicativo: la consulta cross-mod de capability no es una dependencia a levantar. No se genera seccion de Dependencias externas core.

## Dependencias

- **Depende de:** UPONE-1755 (modelo de medicion y los tres ejes que la tributacion consume) y UPONE-1753 (nombres nuevos: `developmentLevelId`, `DevelopmentScheme`).
- **Dependencia funcional cross-mod (dentro de up1, sin core):** lee de Curriculum Design `planEntry`, la malla del plan y el versionado del `Curriculum`. Resuelta por patrones ya existentes: lectura por id pelado sin FK (permitido; declarar la dependencia, no la FK), y para el versionado el flujo real es `asNewVersion`+`sourceId` con el hook `inheritRecordTypeExtensionOnVersion` + `copyRecordTypeExtension` (`curriculum-design/logic/sectionValidation.resolver.js` y `logic/helpers/recordTypeExtension.js`), que hoy copia extensiones de RecordType y NO toca tributacion.
  - **Riesgo a vigilar:** el registro de eventos es global por `(objectType, operation)` con warning de "DUPLICATE EVENT ID ... will OVERWRITE". Si curriculum-mapping declara un evento sobre `Curriculum`/`planEntry` y curriculum-design declara otro, uno pisa al otro. Hoy `curriculum-design/events/` no existe. Fuente: `object-manager/src/events/loaders/eventLoader.js:81-89`.
- **Habilita:** la medicion del logro de competencias sobre el plan (fases posteriores del modelo).

## Estimacion

**~34 SP en total, no cabe en un ticket.** Corte propuesto por fases (F1 es dependencia dura del resto):

| Fase | Que | SP |
|---|---|---|
| F1 + F2 | La competencia declara (`isDirectlyMeasured`/consolidacion, niveles, `developmentSchemeId`) + objeto al dia + migracion | 8 |
| F3 | Resolver de upsert de conjunto (R-1..R-5, R-10, reparto de peso) | 8 |
| F4 | Pestana de lectura del plan (indicadores y sus dos denominadores) | 5 |
| F5 | Editor: dos formas, via masiva, guardado global con guardias | 13 |
| F6 | `outcomeAlignment` + R-7 | fuera de alcance |

Calibrar contra UPONE-1689 (entrego 7 mutations de adopcion mas su editor).

## Decisiones resueltas

- **Re-scope: partir 1756 en tickets derivados.** Hecho: son los 5 tickets listados en el banner (`UPONE-1756-alcance-sp10`, `-delta`, `-followup`, `-followup-delta`, `-followup-delta-2`).
- **`isDirectlyMeasured` vs `isHolistic`:** se reusa `isHolistic` existente para R-3 (sin campo nuevo); el rename a `isDirectlyMeasured` es cosmetico y va en `UPONE-1756-alcance-sp10-delta`.
- **Donde vive el componente de tributacion:** `curriculum-mapping/modsComponents/` (dueno del objeto), se renderiza en la vista del plan (curriculum-design). El objeto y el permiso son de curriculum-mapping.
- **Estado automatico/manual del grupo de peso:** se deriva (pesos iguales dentro de tolerancia), no se persiste; no se crea objeto "grupo".

## Decisiones abiertas

- [ ] **`planId`: denormalizar vs join cross-mod** (el join es una segunda query por API, no de base). Recomendacion: denormalizar y mantener consistente en el resolver.
- [ ] **Renombre `coverageLevelId` -> `developmentLevelId`:** rompe el guard RC6 (`schemeUsage.js:67`) y dos tests. ¿Rename con migracion, o campo nuevo y deprecacion del viejo?
- [ ] **`CoverageScheme` -> `DevelopmentScheme`:** rename de objeto con 4 layouts, 3 i18n, un resolver, un helper y 4 tests. ¿Entra aqui, coordina con 1753, o se aisla?
- [ ] **Datos ya migrados:** confirmar contra la instancia real si hay valores que migrar (el explicativo reporto `nm_percentage` en null y el flag institucional en false).
- [ ] **Regla de herencia de niveles (migracion, no versionado):** al migrar matrices existentes para poblar `CompetencyNodeDevelopmentLevel` (objeto que aun no existe), una competencia sin tramos declarados hereda TODOS los niveles del esquema (no el ultimo). No aplica al versionado del plan: el versionado remapea `planEntry` origen->equivalente y conserva `developmentLevelId` tal cual, sin heredar niveles. Ratificar la regla de migracion.
- [ ] **Mecanismo de R-8 (replicar al versionar):** el flujo real es `asNewVersion`+`sourceId` con el hook `inheritRecordTypeExtensionOnVersion` + `copyRecordTypeExtension`, que hoy no toca tributacion; definir como se extiende para replicar `CompetencyAlignment`, y quien declara el evento (registro global).

## Guia de ejecucion: reglas y patrones up1 a considerar

- **[A favor]** Tabla de union escrita por Prisma directo dentro de la mutation gobernada (precedente `CompetencyNodeOwnerUnit`/`ScopeUnit`). _Fuente: `objects/CompetencyNodeOwnerUnit.json`._
- **[A favor]** Consulta cross-mod de capability: `requiredCapability` en el tab del layout + `hasCapability` en el componente. _Fuente: `default_Curriculum_view.json:52-53` (precedente `core_datalog:view`)._
- **[Advertencia]** El renombre de `coverageLevelId` rompe el guard RC6 y sus tests: barrerlo en la misma pasada. _Fuente: `logic/helpers/schemeUsage.js:67`._
- **[Advertencia]** Registro de eventos global por `(objectType, operation)`: coordinar quien declara el evento sobre `Curriculum`/`planEntry`. _Fuente: `object-manager/src/events/loaders/eventLoader.js:81-89`._
- **[Gate]** Validar pesos por grupo y su eje; el 100 es gate de publicacion, no de cada guardado.
- **Transversal:** escritura gobernada `*Validated`, tenant isolation, no field resolvers en mods, correr sync, no commitear artefactos de sync/seed. _Fuente: `CLAUDE.md` del mod._

## Tickets relacionados

| Ticket | Que es | Relacion | Estado |
|---|---|---|---|
| UPONE-1452 | Epic Curriculum Mapping | contenedor | Backlog |
| UPONE-1755 | Pestana de Medicion | dependencia: define el modelo de medicion y los tres ejes que la tributacion consume | Backlog |
| UPONE-1753 | Menus y terminologia | dependencia: nombres nuevos (`developmentLevelId`, `DevelopmentScheme`) | Backlog |
| UPONE-1689 | Matriz de competencia: Adopcion y Competencias | antecedente: `MatrixAdoption`, `competencynode:adopt/exempt`, el shell y las escrituras gobernadas que este ticket sigue | Resuelto |

## Referencias

- Fuente canonica: UPONE-1756 (Jira) y la maqueta de sp10 (Curriculum Mapping v29).
- Detalle tecnico code-grounded: `UPONE-1756-explicativo`; guia de implementacion: `UPONE-1756-pre-intake` (este sprint).
- Working copy verificado: `curriculum-mapping` @ `develop` `584499e`; `curriculum-design` @ `8a151e7`.
