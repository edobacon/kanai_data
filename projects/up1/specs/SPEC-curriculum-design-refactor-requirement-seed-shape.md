---
id: SPEC-curriculum-design-refactor-requirement-seed-shape
project: up1
ticket: TICKET-135
status: draft
---

# Refactor del seed de requisitos EST200 a la forma reproducible por el editor

# Refactor del seed de requisitos EST200 a la forma reproducible por el editor

## Executive summary — lo que estas aprobando

> *Esta seccion esta diseñada para revision rapida. Todo el detalle tecnico vive en las secciones siguientes (Requirements, Refactor map, Tasks). Si solo lees el Executive summary y te basta para decidir, ese es el objetivo.*

**Que se quiere**: el ejemplo de requisitos que el sistema siembra (arbol "EST200") tiene hoy una forma que el editor visual NO puede crear desde cero: un `Group[AND]` en la raiz con un `Group[OR]` anidado y dos condiciones colgando de la raiz (globales). El disenador curricular ve un ejemplo que no puede reproducir ni completar. Este refactor reestructura ese dato de ejemplo a la forma canonica que produce el alta del editor (`Group[OR]` contenedor en la raiz + un `Group[AND]` por via), sin tocar el esquema del objeto, el motor de evaluacion de avance, ni la capacidad del editor entregada en UPONE-1378. El resultado: el ejemplo sembrado es uno que el usuario podria haber creado el mismo.

**Aclaracion de "zero behavior change"** (regla cardinal del refactor): lo que se preserva sin cambio es el **comportamiento de plataforma** — esquema del objeto y RecordTypes, motor de evaluacion, capacidad del editor (busqueda de contenedor / derivacion de vias), idempotencia del seed y el **contrato de retorno del loader** que consumen `seed.js` y `seed-entry.test.ts`. Lo que cambia intencionalmente es la **forma del dato de ejemplo** sembrado (su representacion en `_data-requirement.js`). No es funcionalidad nueva ni cambio de esquema: es reorganizar un ejemplo para que sea consistente con la capacidad real del sistema.

**Decisiones criticas que necesitan tu OK**:

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | Migrar el guard de idempotencia de "global por label" a "por owner" (resolver la Activity ANTES del guard) | Contradice `RULE-curriculum-design-022` como esta escrita hoy. El cambio de contexto lo justifica (ver DEC-LOCAL-01), pero la regla debe actualizarse en el mismo ticket para no quedar stale |
| 2 | Sembrar 2 vias (no 1, no 3) | 2 vias es el minimo que muestra el contenedor OR (`collapseSingleVia` lo oculta con una sola) y ejercita la duplicacion de las 2 condiciones globales. Coincide con la "Forma objetivo" del detalle |
| 3 | El electivo K-de-N de reemplazo va DENTRO de la via 2 (profundidad 4) | Alternativa descartada: una 3a via dedicada. Ponerlo en via 2 mantiene via 1 como el ejemplo AND simple del diagrama y demuestra el anidamiento maximo reproducible (via AND > pool OR > hojas) |
| 4 | La prueba de forma EXTIENDE `seed-counts.test.ts` (no un archivo nuevo) | Los helpers `makePrismaMock`/`createsOf` son locales a ese archivo (no exportados). Un archivo nuevo obligaria a duplicarlos o a extraerlos (refactor de mayor blast radius). UPONE-1619 (que tambien toca ese archivo) ya esta mergeado a develop: partir de esa version |

**Riesgos principales y como los mitigamos**:

- **El guard nuevo por owner + re-seed duplica el arbol si no se resuelve la Activity antes** → S2 cambia guard y raiz en el MISMO paso; el gate de S2 corre la prueba de re-seed. Ademas: el guard por owner es seguro AHORA porque el owner es determinista por code (`EST200_ACTIVITY_CODE`), que es justo la precondicion que exigia RULE-022; lo que cambio es que el label de la raiz pasa a ser generico y compartible, volviendo inseguro el guard por-label.
- **El mock stateful resuelve la Activity ancla a un id NUEVO en cada corrida** (`idCounter++`) → una prueba de re-seed con dos corridas planas daria un falso "duplica". La prueba de idempotencia debe stubear `Activity.findFirst` con id estable. Documentado en el contract de la task y en Technical reference.
- **Retirar el bloque electivo deja referencias muertas** en `seed.js:171` y `seed-entry.test.ts:121` → DET-40 replacement-audit enumerado 1:1 (ver seccion); S3 propaga a ambos consumidores en el mismo paso.
- **Mover una condicion global bajo un OR cambia la semantica** (una condicion en una sola via deja de exigirse si se cumple la otra) → se DUPLICAN las 2 globales en cada via (REQ-REFACTOR-02).

**Que NO se hace en este ticket** (limites explicitos del scope):

- No se cambia el esquema del objeto `requirement` ni sus RecordTypes (ya declaran todos los campos).
- No se toca el motor de evaluacion de avance del estudiante.
- No se toca `modsComponents/RequirementEditor/*` ni `modsComponents/ReglaUnificadaView/*` (capacidad de UPONE-1378, con cobertura propia).
- No se habilita crear condiciones globales en el editor, ni edicion completa de una hoja, ni el label como key i18n (registrados como limites del editor / follow-ups, fuera de alcance).
- No se migran de forma destructiva las bases que ya tienen el arbol viejo (requieren re-seed limpio; en UPU se rearma la base).

**Tamano estimado**: 5 sessions ejecutables, aproximadamente 4-6h efectivas (S1-S4) + ~0.25h (S5). La mas riesgosa es **S2** (reestructurar la raiz + migrar el guard en el mismo paso: si se desacoplan, el re-seed duplica).

**Extension post-aprobacion (2026-08-26, DEC-LOCAL-05)**: se agrego **S5 / REQ-I18N-01** — completar el i18n del combinador AND/OR del RT `Group` en en/pt (hoy solo existe el locale `es`). Es un cambio behavior-visible acotado a la capa de display, independiente del refactor del seed, incorporado por decision del dev (opcion B). Reabre el scope aprobado el 2026-08-18, por lo que **este spec requiere re-judge (DET-38)** con S5 incluida.

**Como vas a saber que funciona**:

- Abro en UPU el requisito sembrado y uno creado a mano desde el editor: se ven iguales (badges, nombres de via, jerarquia) — la diferencia que motivo el ticket desaparece.
- Sobre el arbol sembrado, agrego una condicion a una via y agrego una via nueva: reusa el contenedor de la raiz, no crea uno duplicado.
- Corro el seed dos veces sobre base limpia: no duplica el arbol ni deja huerfanos.
- Corro la prueba de forma: falla si alguien altera la forma del arbol (combinador por grupo, jerarquia por padre, campos de las hojas).

---

## Purpose

Reestructurar el dato de ejemplo del arbol de requisitos EST200 en `mods/curriculum-design/seed/_data-requirement.js` para que su forma sea reproducible por el alta del editor visual (UPONE-1378). El comportamiento de plataforma (esquema, motor de evaluacion, capacidad del editor, idempotencia, contrato del loader) NO cambia; cambia la representacion del ejemplo sembrado. Objetivo tecnico: eliminar la incoherencia entre lo que el sistema propone como ejemplo y lo que el sistema permite crear.

## Requirements

Los REQ se dividen en tres familias: **REQ-PRESERVE-XX** (comportamiento de plataforma que NO debe cambiar — la vara del "zero behavior change"), **REQ-REFACTOR-XX** (la reestructuracion del dato de ejemplo, que SI cambia de forma, intencionalmente) y **REQ-I18N-XX** (completitud i18n en la capa de display, agregada post-aprobacion 2026-08-26 por decision del dev — ver DEC-LOCAL-05; ejecutada en S5, independiente del refactor del seed).

### REQ-PRESERVE-01: Esquema del objeto de requisitos sin cambios

> **Que cambia**: nada en el esquema — el objeto de requisitos y sus RecordTypes quedan exactamente igual; el refactor toca datos de ejemplo, tests y docs/KB, mas los locales i18n de S5 (`lang/en` y `lang/pt`, REQ-I18N-01, cambio behavior-visible acotado a display) — nunca `objects/*.json` ni `prisma/schema.prisma`.
> **Por que**: acota el blast radius y confirma que no hay `codegen` ni migracion en juego (evita drift de schema en el sync).

El sistema MUST no modificar el esquema de `requirement` ni de sus RecordTypes (`Group`, `RecordState`, `MetricThreshold`). No hay `npm run codegen` ni migracion en scope.

**Actor**: system
**Layers**: database

<details><summary>Scenarios de validacion</summary>

#### Scenario: sin cambio de schema
- **GIVEN** el objeto `requirement.json` y sus RT del mod
- **WHEN** se ejecuta el refactor completo
- **THEN** `git status` no reporta cambios en `objects/` ni en `prisma/schema.prisma`
- **AND** no se corre `codegen` ni `prisma migrate`

</details>

#### Acceptance
**El usuario puede verificar que funciona**: el refactor del seed NO cambia schema — `git diff` no toca campos/tipos/RecordTypes en `objects/*.json` ni `prisma/schema.prisma`. (Post-review UPONE-1541 se edito SOLO la **descripcion** del campo `label` en `objects/requirement.json` —el ejemplo citaba el bloque electivo retirado—, sin cambio de schema; y el diff incluye ademas `tests/`, `lang/` y `modsComponents/ReglaUnificadaView/` por el fix de render i18n de TICKET-142, mismo Jira.)

### REQ-PRESERVE-02: Motor de evaluacion y capacidad del editor sin cambios

> **Que cambia**: la capacidad del editor entregada en UPONE-1378 (buscar el contenedor de vias, reparentar al crear, derivar/renderizar vias) sigue intacta; el arbol sembrado aplanado se extiende igual que uno creado a mano.
> **Por que**: el refactor solo cambia el DATO de ejemplo; tocar esos componentes seria otro ticket y arriesgaria una regresion de una capacidad con cobertura propia.

El sistema MUST no tocar el motor de evaluacion de avance ni la capacidad del editor de UPONE-1378: busqueda del contenedor de vias (`requirementEditor.logic.ts:69-77` `findViaContainer`), reparent al crear (`requirementCreate.logic.ts:64-83` `ensureOrContainer`/`resolveTargetGroup`) y derivacion de vias / render (`ReglaUnificadaView/RequirementTreeNode.ts`).

**Actor**: system
**Layers**: frontend

<details><summary>Scenarios de validacion</summary>

#### Scenario: componentes del editor intactos
- **GIVEN** `modsComponents/RequirementEditor/*` y `modsComponents/ReglaUnificadaView/*`
- **WHEN** se ejecuta el refactor
- **THEN** `git status` no reporta cambios en esas rutas
- **AND** la suite existente de esos componentes sigue verde

#### Scenario: el arbol sembrado se extiende sin duplicar contenedor
- **GIVEN** el arbol EST200 aplanado sembrado en UPU
- **WHEN** el usuario agrega una condicion a una via existente, y luego agrega una via nueva
- **THEN** la condicion cuelga bajo esa via
- **AND** "nueva via" reusa el `Group[OR]` de la raiz en vez de crear otro

</details>

#### Acceptance
**El usuario puede verificar que funciona**: en UPU, sobre el arbol sembrado, "nueva via" no crea un contenedor OR duplicado (verificacion runtime — DET-36).

### REQ-PRESERVE-03: Contrato de retorno del loader coherente para sus consumidores

> **Que cambia**: al retirar el bloque electivo del Plan, el objeto que devuelve `loadRequirement` deja de exponer un paso que ya no existe, y sus dos consumidores (la linea de log del orquestador y el mock del test de entrada) quedan coherentes.
> **Por que**: hoy `results.electiveBlock` lo lee `seed.js:171` para el log y lo mockea `seed-entry.test.ts:121`; retirarlo sin tocarlos deja un log que reporta un paso muerto y un test que afirma un contrato inexistente.

El sistema MUST propagar el retiro del bloque electivo a TODOS sus consumidores, sin dejar referencias muertas a la clave retirada (DET-40, DET-16).

**Actor**: system
**Layers**: backend, test

<details><summary>Scenarios de validacion</summary>

#### Scenario: log del orquestador coherente
- **GIVEN** `seed/seed.js:170-172` que hoy imprime `bloque electivo ${...existed?'existed':'created'}`
- **WHEN** se retira `results.electiveBlock`
- **THEN** la linea de log no referencia una clave inexistente (se ajusta o se elimina la porcion del log)
- **AND** el resumen del paso Requirement sigue imprimiendo el estado del arbol EST200

#### Scenario: test de entrada coherente
- **GIVEN** `tests/integration/seed-entry.test.ts:121` que mockea `electiveBlock: { existed:false, id:'b1' }`
- **WHEN** el shape de retorno del loader cambia
- **THEN** el mock refleja la forma nueva (sin `electiveBlock`, o con el shape real que devuelva el loader)
- **AND** `seed-entry.test.ts` pasa

</details>

#### Acceptance
**El usuario puede verificar que funciona**: `grep -rn electiveBlock mods/curriculum-design/{seed,tests}` no deja lecturas de una clave que el loader ya no produce.

### REQ-PRESERVE-04: Idempotencia del seed preservada

> **Que cambia**: correr el seed dos veces sigue sin duplicar el arbol ni dejar nodos huerfanos, aun cuando la raiz pasa a ser el contenedor de vias con label generico.
> **Por que**: el guard actual busca por el label global de la raiz autorada (`Requisitos EST200`); al aplanar, la raiz pierde ese label y pasa a uno generico y compartible, asi que el guard por-label buscaria una raiz que ya nadie siembra y replantaria en cada corrida.

El sistema MUST mantener el seed idempotente: una segunda corrida NO incrementa el conteo de nodos del arbol ni deja huerfanos. El guard pasa a ser **por owner** (`[ownerType:'activity', ownerId:<activity.id>, parentId:null]`), lo que obliga a resolver la Activity ancla ANTES del guard.

**Actor**: system
**Layers**: backend

<details><summary>Scenarios de validacion</summary>

#### Scenario: re-seed no duplica
- **GIVEN** una base limpia y el seed del arbol aplanado
- **WHEN** se corre `loadRequirement` dos veces (con la Activity ancla resuelta al MISMO id)
- **THEN** la segunda corrida no crea ningun nodo nuevo del arbol EST200
- **AND** no quedan nodos huerfanos

#### Scenario: guard seguro bajo label generico
- **GIVEN** dos activities distintas con arbol de requisitos, ambas con raiz de label generico ("Cualquiera de las vias")
- **WHEN** se corre el seed
- **THEN** el guard por owner distingue la raiz de EST200 de la raiz de otro arbol (no hay falso match)

</details>

#### Acceptance
**El usuario puede verificar que funciona**: `reset-mods` dos veces en UPU y `SELECT ownerId, count(*) ... GROUP BY ownerId` no muestra el arbol EST200 duplicado.

### REQ-REFACTOR-01: Aplanar el arbol EST200 a la forma canonica del alta

> **Que cambia**: la raiz del arbol sembrado deja de ser un `Group[AND]` con un `Group[OR]` anidado; pasa a ser el `Group[OR]` contenedor de vias directamente en la raiz, con un `Group[AND]` por via debajo.
> **Por que**: el alta del editor crea SIEMPRE el contenedor OR en la raiz (`parentId:null`) y reparenta hacia abajo; no hay camino que cree un `Group` por encima. La forma vieja no es creable por el usuario.

El sistema MUST sembrar el arbol EST200 con la forma que produce el alta: `Group[OR]` en la raiz (`parentId:null`), un `Group[AND]` por via como hijo, y las hojas debajo de cada via. Profundidad maxima 3 para condiciones simples, 4 con pool electivo (dentro del techo del alta).

**Actor**: system
**Layers**: backend

<details><summary>Scenarios de validacion</summary>

#### Scenario: raiz es el contenedor de vias
- **GIVEN** el loader corrido con la Activity y prerequisitos resueltos
- **WHEN** se inspeccionan los `create` de `rt__Group__requirement`
- **THEN** el nodo raiz (`parentId:null`) tiene `combinator:'OR'`
- **AND** cada via es un `Group` con `combinator:'AND'` cuyo `parentId` es la raiz OR
- **AND** ninguna hoja cuelga directo de la raiz (todas bajo una via)

</details>

#### Acceptance
**El usuario puede verificar que funciona**: la prueba de forma asserta raiz OR + vias AND + cero hojas globales.

### REQ-REFACTOR-02: Duplicar las condiciones globales en cada via

> **Que cambia**: las dos condiciones que hoy cuelgan de la raiz como globales (umbral de creditos >= 60 y el advisory "Cursar Fundamentos") se siembran duplicadas dentro de cada via.
> **Por que**: bajo un OR, una condicion que vive en una sola via deja de exigirse cuando se cumple la otra via. Duplicarlas preserva la semantica de "siempre exigidas".

El sistema MUST duplicar en cada via las condiciones que hoy son globales, para que se sigan exigiendo bajo el OR.

**Actor**: system
**Layers**: backend

<details><summary>Scenarios de validacion</summary>

#### Scenario: las globales aparecen en todas las vias
- **GIVEN** el arbol aplanado con 2 vias
- **WHEN** se inspeccionan las hojas por via
- **THEN** el `MetricThreshold` (creditos >= 60) aparece dentro de cada via
- **AND** el `RecordState` advisory ("Cursar Fundamentos", `isHardRule:false`) aparece dentro de cada via

</details>

#### Acceptance
**El usuario puede verificar que funciona**: la prueba de forma cuenta la condicion de creditos y el advisory una vez por via.

### REQ-REFACTOR-03: Labels alineados a los literales de la UI + timing explicito en hojas de via

> **Que cambia**: los labels del seed se alinean a los literales que el alta persiste por defecto para cada tipo de nodo (ninguno autorado a mano), y las hojas de curso declaran su `timing`.
> **Por que**: el usuario ve badges y nombres distintos a los que crearia la UI; el selector de condicion setea `mustBe` + `timing` juntos siempre, asi que una hoja `Approved` sin `timing` no es alcanzable como hoja de via.

El sistema MUST persistir cada label como el literal que el alta aplica por defecto para ese rol de nodo (contenedor de vias, grupo de via, hoja de curso, metrica) y MUST declarar `timing` explicito en cada hoja de curso de via, con los valores que produce el selector (`approvedBefore` / `takeEither` / `takeConcurrent`).

**Actor**: system
**Layers**: backend

<details><summary>Scenarios de validacion</summary>

#### Scenario: labels no autorados
- **GIVEN** el arbol aplanado
- **WHEN** se inspeccionan los labels de contenedores y hojas
- **THEN** el contenedor de vias usa el literal por defecto de la UI ("Cualquiera de las vias")
- **AND** las hojas de curso usan "{name} ({code})" derivado de la Activity
- **AND** ninguna hoja de via queda con `mustBe:'Approved'` sin `timing`

#### Scenario: label de la metrica es el literal real de la UI
- **GIVEN** la hoja `MetricThreshold`
- **WHEN** se inspecciona su label
- **THEN** persiste el literal real que deriva la UI (aunque se lea "raro"), sin autorar — el label mejorable queda como follow-up de la UI

</details>

#### Acceptance
**El usuario puede verificar que funciona**: en UPU, badges y nombres del arbol sembrado coinciden con los de un arbol creado a mano.

### REQ-REFACTOR-04: Migrar el guard de idempotencia a "por owner"

> **Que cambia**: el guard de existencia deja de buscar por el label global de la raiz y pasa a buscar por owner; para eso, la Activity ancla se resuelve ANTES del guard (hoy es al reves).
> **Por que**: al aplanar, la raiz pasa a tener un label generico compartible entre arboles; un guard por-label global buscaria una raiz que ya nadie siembra (re-siembra) o haria falso match con otro arbol.

El sistema MUST resolver la Activity ancla (`EST200_ACTIVITY_CODE`) antes del guard, y el guard MUST buscar por `[ownerType:'activity', ownerId:activity.id, parentId:null]`. Si la Activity no resuelve, el arbol hace skip (sin guard posible).

**Actor**: system
**Layers**: backend

<details><summary>Scenarios de validacion</summary>

#### Scenario: guard por owner con Activity resuelta primero
- **GIVEN** el loader con la Activity ancla resuelta
- **WHEN** corre el guard
- **THEN** el guard busca por `ownerId` de esa Activity y `parentId:null` (no por label)
- **AND** si el arbol ya existe para ese owner, hace skip (`existed:true`) sin recrear

#### Scenario: Activity ancla no resuelve
- **GIVEN** una base donde `EST200_ACTIVITY_CODE` no existe
- **WHEN** corre el loader
- **THEN** el arbol hace skip con warning, sin ejecutar el guard sobre un owner nulo

</details>

#### Acceptance
**El usuario puede verificar que funciona**: la prueba de forma verifica que el guard consulta por owner; re-seed en UPU no duplica.

### REQ-REFACTOR-05: Retirar el bloque electivo del Plan y sembrar un electivo K-de-N reproducible dentro de una via

> **Que cambia**: el bloque "Electivo de Especializacion" sembrado sobre un Plan (owner `curriculum`) se retira, y en su lugar se siembra un pool electivo K-de-N dentro de una via del arbol EST200 (owner `activity`), reproducible desde el editor.
> **Por que**: el bloque del Plan usa campos que ninguna pantalla captura (`effect:'ProgressGate'`, `creditsRequired:24`) y sobre un owner sin superficie de UI: es el caso extremo del problema (dato ni reproducible ni visible). El caso K-de-N si es valioso y SI es creable dentro de una via.

El sistema MUST retirar del seed el bloque electivo sobre el Plan y MUST sembrar en su lugar un pool `Group[OR]` con `minToSatisfy` dentro de una via, con hojas `RecordState` de curso (`mustBe:'Approved'` sin `timing`, que es lo que produce el alta para hojas de pool). El pool DEBE tener N >= K hojas (no vacuo).

**Actor**: system
**Layers**: backend

<details><summary>Scenarios de validacion</summary>

#### Scenario: bloque del Plan retirado
- **GIVEN** el loader corrido
- **WHEN** se inspeccionan los `create`
- **THEN** no hay ningun `Group` con owner `curriculum` ni con `effect:'ProgressGate'` / `creditsRequired`
- **AND** no se resuelve ni se itera el Plan `ELECTIVE_PLAN_CODE` para requisitos

#### Scenario: electivo K-de-N reproducible dentro de una via
- **GIVEN** el arbol aplanado
- **WHEN** se inspecciona la via que hospeda el pool
- **THEN** hay un `Group[OR]` con `minToSatisfy` cuyo `parentId` es el `Group[AND]` de esa via
- **AND** el pool tiene N >= `minToSatisfy` hojas `RecordState` (`mustBe:'Approved'`, sin `timing`)
- **AND** el pool NO usa `creditsRequired` ni `effect:'ProgressGate'`

</details>

#### Acceptance
**El usuario puede verificar que funciona**: en UPU, el pool electivo se ve dentro de una via y es editable/extensible desde el editor.

### REQ-REFACTOR-06: Prueba de forma que corre el loader real

> **Que cambia**: se agrega una prueba de integracion que invoca el loader real (`loadRequirement`) y asserta la forma resultante del arbol (combinador por grupo, jerarquia por padre, campos de las hojas), de modo que un cambio futuro que la altere falle.
> **Por que**: hoy ningun test corre el loader verificando la FORMA; cuatro specs replican la forma como fixture, pero ninguna ejercita el loader. Reestructurar el arbol no rompe ningun conteo existente, asi que sin esta prueba el cambio queda sin red.

El sistema MUST tener una prueba de integracion que corra `loadRequirement` con el mock de Prisma y asserte: raiz OR, cada via AND bajo la raiz, cero hojas globales, las globales duplicadas por via, `timing` explicito en hojas de via, y el pool electivo K-de-N dentro de una via. La prueba MUST escribirse primero contra el seed ACTUAL (roja/espejo del comportamiento vigente) y luego actualizarse a la forma nueva.

**Actor**: system
**Layers**: test

<details><summary>Scenarios de validacion</summary>

#### Scenario: la prueba congela la forma
- **GIVEN** la prueba de forma extendida en `seed-counts.test.ts`
- **WHEN** alguien altera la forma del arbol en `_data-requirement.js`
- **THEN** la prueba falla (no es tautologica; su sujeto es la forma del dato del seed)

</details>

#### Acceptance
**El usuario puede verificar que funciona**: `npm test` del mod incluye el describe de forma; mutando la forma del arbol, la prueba pasa a roja.

### REQ-I18N-01: Completar i18n del combinador AND/OR del RT Group en en/pt

> **Que cambia**: la ficha generica del RecordType `Group` (`rt__Group__requirement`) muestra el enum del combinador (`AND`/`OR`) y los labels de columna traducidos tambien en `en` y `pt`, no solo en `es`.
> **Por que**: hoy `lang/es/rt__Group__requirement.i18n.json` es el unico locale del RT; en `en`/`pt` el archivo no existe y i18next cae a fallback (clave cruda o idioma por defecto), un gap de completitud i18n en la capa de display.
>
> **Alcance y origen (DET-4/DET-32)**: agregado post-aprobacion (2026-08-26) por decision del dev (opcion B, DEC-LOCAL-05). NO forma parte del refactor del seed ni del "zero behavior change" de la plataforma: es un cambio behavior-visible acotado a la capa de i18n del display. Independiente de S1-S4 (no comparte archivos). Necesidad (DET-32): `build` — no existe el locale en/pt; reuso descartado porque el fallback no traduce el enum.

El sistema MUST proveer `lang/en/rt__Group__requirement.i18n.json` y `lang/pt/rt__Group__requirement.i18n.json` con **paridad de keys** respecto a `lang/es` (`column.{combinator,minToSatisfy,creditsRequired}` + `enums.combinator.{AND,OR}`), y el bundle i18n MUST tomarlos tras `npm run sync`.

**Actor**: system
**Layers**: frontend

<details><summary>Scenarios de validacion</summary>

#### Scenario: paridad de keys en los 3 locales
- **GIVEN** `lang/{es,en,pt}/rt__Group__requirement.i18n.json`
- **WHEN** se comparan sus arboles de keys
- **THEN** `es == en == pt` (mismo conjunto de keys, sin faltantes)
- **AND** cada archivo parsea como JSON valido

#### Scenario: el enum combinator resuelve en en/pt
- **GIVEN** UPU con locale `en` o `pt`
- **WHEN** se muestra el combinador de un `Group` de requisitos en la ficha generica del RT
- **THEN** se ve el texto traducido (`All (AND)`/`Any (OR)` en en; `Todos (E)`/`Algum (OU)` en pt)
- **AND** no cae a fallback (clave cruda ni texto en es)

</details>

#### Acceptance
**El usuario puede verificar que funciona**: los 3 locales parsean y tienen paridad de keys; en UPU con locale en/pt el combinador del `Group` se ve traducido (no fallback).

## Refactor map

### Files

| Action | Before | After | Reason |
|--------|--------|-------|--------|
| edit (data) | `seed/_data-requirement.js:53-147` (arbol EST200: raiz AND + OR anidado + hojas globales + guard por label) | mismo archivo: raiz OR + `Group[AND]` por via + globales duplicadas + labels UI + `timing` explicito + guard por owner (Activity resuelta antes) | Forma reproducible por el alta + idempotencia bajo label generico |
| remove (data) | `seed/_data-requirement.js:149-202` (bloque electivo sobre Plan, owner `curriculum`, `ProgressGate`/`creditsRequired`) | pool `Group[OR, minToSatisfy]` reproducible dentro de una via del arbol EST200 | Bloque del Plan no reproducible ni visible; se preserva el caso K-de-N alcanzable |
| edit (return) | `results.electiveBlock` (`:43`, `:201`) | shape sin `electiveBlock` (o `null`) coherente con los consumidores | Propagacion del retiro (DET-40/DET-16) |
| edit (consumer) | `seed/seed.js:170-172` (log lee `requirement.electiveBlock`) | log sin referencia a la clave retirada | Sin log de un paso muerto |
| edit (consumer/test) | `tests/integration/seed-entry.test.ts:121` (mock con `electiveBlock`) | mock refleja el shape nuevo | Sin test que afirme contrato muerto |
| extend (test) | `tests/integration/seed-counts.test.ts` (describe `los casos sembrados referencian entidades que existen (loadRequirement)`, `:478-528`; refs actualizadas post-UPONE-1619 S4/S6 ya mergeado a develop) | + describe "forma del arbol de requisitos" que corre el loader y asserta la forma | Red de regresion sobre la forma (REQ-REFACTOR-06) |
| edit (docs) | `docs/reference/seed-counts.md` + limites del editor no documentados | doc actualizada + limites de alta/edicion y motivo del retiro del bloque electivo registrados | DET-37 dim1 (cambio observable en dato de ejemplo) |
| edit (KB) | `RULE-curriculum-design-022` (guard GLOBAL por label) | rule actualizada: guard por owner cuando el label de raiz es generico y el owner es determinista | DET-37 dim2 (la regla contradice el nuevo guard) |
| add (i18n) | (no existe) `lang/en/rt__Group__requirement.i18n.json` | archivo nuevo espejando `es` (column labels + `enums.combinator.AND/OR`) | REQ-I18N-01 (S5): completar locale en del RT Group |
| add (i18n) | (no existe) `lang/pt/rt__Group__requirement.i18n.json` | archivo nuevo espejando `es` | REQ-I18N-01 (S5): completar locale pt del RT Group |

### Exports affected

| Export | Current location | New location | Consumers count |
|--------|-----------------|--------------|-----------------|
| `loadRequirement` (firma y modelo de retorno `results`) | `seed/_data-requirement.js:29` | mismo (sin `electiveBlock` en `results`) | 3 (`seed.js:164,171`; `seed-counts.test.ts`; `seed-entry.test.ts`) |

> La firma `loadRequirement(prisma, tenantId)` NO cambia. Cambia solo la forma del `results` devuelto (retiro de `electiveBlock`). Ese es el unico contrato publico tocado.

### Consumer updates required

| Consumer file | Current use | New use |
|---------------|-------------|---------|
| `seed/seed.js:170-172` | `requirement.electiveBlock ? (existed?'existed':'created') : 'skip'` en el log | linea de log sin la porcion `bloque electivo ...` |
| `tests/integration/seed-entry.test.ts:121` | `mockLoadRequirement...({ est200:..., electiveBlock:{...}, skipped:[] })` | mock sin `electiveBlock` (shape real del loader nuevo) |
| `tests/integration/seed-counts.test.ts` | asserta solo targets reales | + asserts de forma (nuevo describe) |

## DET-40 — Auditoria de reemplazo (bloque electivo del Plan → pool K-de-N en via)

Enumeracion 1:1 de lo que hacia el camino viejo (`_data-requirement.js:149-202`) y verificacion de que el camino nuevo lo replica o lo retira intencionalmente:

| # | Comportamiento del camino viejo | Evidencia | Replica el nuevo? | Nota |
|---|--------------------------------|-----------|-------------------|------|
| 1 | Resuelve el Plan por `ELECTIVE_PLAN_CODE` (owner `curriculum`) | `:159` | **NO — retirado intencional** | Owner `curriculum` sin superficie de UI; el electivo pasa a owner `activity` dentro del arbol EST200 |
| 2 | `Group[OR]` con `minToSatisfy=k` (K-de-N) | `:187` | **SI** | El pool en via replica el `Group[OR]` con `minToSatisfy` |
| 3 | `creditsRequired: 24` en el Group | `:187` | **NO — retirado intencional** | Campo que ninguna pantalla captura; el alta no lo produce |
| 4 | `effect: 'ProgressGate'` | `:184` | **NO — retirado intencional** | El alta fija `EligibilityToEnroll`; `ProgressGate` no es reproducible |
| 5 | Hojas `RecordState` de curso, `mustBe:'Approved'` SIN `timing` | `:193-194` | **SI** | Las hojas de pool en el alta usan presets Course (sin selector), asi que van sin `timing` a proposito |
| 6 | Resuelve N cursos Course (`take:6`, `orderBy id`) y exige N >= 2 (pool no vacuo), `k = min(4, N)` | `:163`, `:167-171` | **SI (adaptado)** | El pool en via mantiene N >= K y hojas reales resueltas por code/id; se preserva el invariante "pool no vacuo" |
| 7 | Guard por Plan `[curriculum, plan.id, label]`; skip si existe | `:176-183` | **SUBSUMIDO** | Al vivir dentro del arbol EST200, la idempotencia la cubre el guard por owner del arbol (REQ-REFACTOR-04); no hay guard separado por Plan |
| 8 | Devuelve `results.electiveBlock = {existed, id, created, existedCount}` | `:201` | **NO — retirado**, propagado a consumidores | REQ-PRESERVE-03 (log `seed.js:171` + mock `seed-entry.test.ts:121`) |
| 9 | Loguea el paso via `seed.js:171` (`existed`/`created`/`skip`) | `seed.js:170-172` | **Ajustado** | La linea de log deja de referenciar la clave retirada |

**Veredicto DET-40: covered.** Los comportamientos del camino viejo que sobreviven (K-de-N con `minToSatisfy`, hojas Approved sin timing, invariante pool-no-vacuo) se replican dentro de la via; los que se retiran (owner `curriculum`, `creditsRequired`, `ProgressGate`, la clave `electiveBlock` del retorno) son intencionales y estan documentados como no reproducibles, con su propagacion a los 2 consumidores enumerada. Cada retiro tiene su assert negativo en la prueba de forma (REQ-REFACTOR-05 scenario "bloque del Plan retirado") o su cobertura en la suite de consumidores (REQ-PRESERVE-03).

## Tasks

> **Numeracion de sessions (DET-20)**: el ticket no tiene `### Session N` previa (solo `### Plan de sessions`, que es preplanificacion, no una session ejecutada). `max(### Session N) = 0` → el plan arranca en **S1**.

### Session 1 — Prueba de forma roja contra el seed ACTUAL (baseline) [tipo: ⚑ fuerte] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Snapshot: correr la suite completa del mod y registrar el baseline (`X/X passing`) en `## Regression baseline` del ticket | REQ-PRESERVE-02 | developer | — | `mods/curriculum-design/tests/` | `npm test --workspace=@uplanner/...` corrido, conteo guardado | (no aplica) | DET-7, DET-13 | done | 1 |
| S1.T2 | Extender `seed-counts.test.ts` con describe "forma del arbol" que corre `loadRequirement` y asserta la forma VIGENTE (raiz AND, OR anidado, globales bajo raiz, bloque electivo sobre Plan). Reusa `makePrismaMock`/`createsOf` | REQ-REFACTOR-06 | developer | S1.T1 | `mods/curriculum-design/tests/integration/seed-counts.test.ts` | describe verde con el seed actual (espejo del comportamiento vigente) | git revert | DET-7, RULE-curriculum-design-022 | done | 1 |
| **S1.GATE** | **Gate de sync Session 1 (tier: T2)** — persistir en `## Sessions`, correr vitest + coverage delta, decidir continue/iterate | — | reviewer | S1.T1, S1.T2 | ticket | gate persistido + baseline registrado | (no aplica — cierre) | DET-20, DET-23 | done | 1 |

### Session 2 — Aplanar el arbol + migrar el guard en el MISMO paso [tipo: ⚑ fuerte] [tier: T2]

parallel_groups: []

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S2.T1 | Reordenar: resolver la Activity ancla (`EST200_ACTIVITY_CODE`) ANTES del guard; cambiar el guard a `[ownerType:'activity', ownerId:activity.id, parentId:null]` | REQ-REFACTOR-04, REQ-PRESERVE-04 | developer | S1.GATE | `mods/curriculum-design/seed/_data-requirement.js:53-65` | vitest del mod pasa; el guard consulta por owner | git revert | DET-5, DET-8, DET-16, RULE-curriculum-design-022 | done | 2 |
| S2.T2 | Aplanar la estructura: raiz `Group[OR]` (`parentId:null`) + 2 `Group[AND]` por via; mover las 2 hojas de curso de la via 1 (Calculo I, Algebra) bajo su AND; via 2 con Calculo II; duplicar las 2 globales (creditos, advisory) en cada via; labels alineados a literales UI; `timing` explicito en hojas de curso de via | REQ-REFACTOR-01, REQ-REFACTOR-02, REQ-REFACTOR-03 | developer | S2.T1 | `mods/curriculum-design/seed/_data-requirement.js:95-147` | vitest del mod pasa | git revert | DET-5, DET-8, DET-16 | done | 2 |
| S2.T3 | Actualizar la prueba de forma para assertar la forma NUEVA (raiz OR, vias AND, cero hojas globales, globales duplicadas por via, timing explicito) | REQ-REFACTOR-06 | developer | S2.T2 | `mods/curriculum-design/tests/integration/seed-counts.test.ts` | describe de forma verde con la forma nueva | git revert | DET-7 | done | 2 |
| S2.T4 | Prueba de re-seed idempotente: stubear `Activity.findFirst` con id ESTABLE y correr `loadRequirement` dos veces sobre el mismo mock stateful; assertar 0 `create` de Group/RecordState en la 2a corrida (ver Technical reference — el mock resuelve la ancla a id nuevo por corrida) | REQ-PRESERVE-04 | developer | S2.T2 | `mods/curriculum-design/tests/integration/seed-counts.test.ts` | test de re-seed verde | git revert | DET-7, RULE-curriculum-design-022 | done | 2 |
| **S2.GATE** | **Gate de sync Session 2 (tier: T2)** — persistir, vitest + coverage delta, decidir continue/iterate | — | reviewer | S2.T1, S2.T2, S2.T3, S2.T4 | ticket | gate persistido; re-seed no duplica | (no aplica — cierre) | DET-20, DET-23 | done | 2 |

### Session 3 — Retiro del bloque electivo + electivo K-de-N en via + propagacion (DET-40) [tipo: ⚑ fuerte] [tier: T2]

parallel_groups: []

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S3.T1 | Retirar el bloque electivo sobre el Plan (`:149-202`) y su clave `results.electiveBlock` (`:43`,`:201`); sembrar en su lugar un pool `Group[OR, minToSatisfy]` con hojas Course (Approved, sin timing) dentro de la via 2 (profundidad 4); mantener N >= K | REQ-REFACTOR-05 | developer | S2.GATE | `mods/curriculum-design/seed/_data-requirement.js` | vitest del mod pasa; pool en via, sin owner curriculum | git revert | DET-8, DET-16, DET-40 | done | 3 |
| S3.T2 | Propagar el retiro a los 2 consumidores: ajustar el log `seed.js:170-172` (sin `bloque electivo`) y el mock `seed-entry.test.ts:121` (shape sin `electiveBlock`) | REQ-PRESERVE-03 | developer | S3.T1 | `mods/curriculum-design/seed/seed.js:170-172`, `mods/curriculum-design/tests/integration/seed-entry.test.ts:121` | `seed-entry.test.ts` verde; `grep electiveBlock` sin lecturas muertas | git revert | DET-16, DET-40 | done | 3 |
| S3.T3 | Extender la prueba de forma: assertar bloque del Plan retirado (cero Group owner curriculum) y pool K-de-N dentro de la via 2 (minToSatisfy, N hojas, sin creditsRequired/ProgressGate) | REQ-REFACTOR-05, REQ-REFACTOR-06 | developer | S3.T1 | `mods/curriculum-design/tests/integration/seed-counts.test.ts` | describe de forma verde con los asserts negativos y del pool | git revert | DET-7, DET-40 | done | 3 |
| **S3.GATE** | **Gate de sync Session 3 (tier: T2)** — persistir, suite del mod verde, decidir continue/iterate | — | reviewer | S3.T1, S3.T2, S3.T3 | ticket | gate persistido; suite del mod verde; sin refs muertas | (no aplica — cierre) | DET-20, DET-23, DET-40 | done | 3 |

### Session 4 — Regresion + docs + KB + verificacion runtime UPU (DET-36) [tipo: ⚑ fuerte] [tier: T3]

parallel_groups: [[S4.T2, S4.T3]]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S4.T1 | Regresion completa: suite del mod verde vs baseline de S1; correr sync (`npm run sync`) sin editar archivos sincronizados; re-seed limpio en UPU sin duplicar ni huerfanos | REQ-PRESERVE-01, REQ-PRESERVE-02 | developer | S3.GATE | `mods/curriculum-design/` | suite verde (delta vs baseline = solo asserts de forma nuevos); re-seed idempotente | (no aplica) | DET-5, DET-7, DET-13 | done | 4 |
| S4.T2 | Docs (DET-37 dim1): actualizar `docs/reference/seed-counts.md` con la forma del arbol; registrar limites de alta/edicion del editor y el motivo del retiro del bloque electivo. Coordinar con UPONE-1619 el orden del archivo compartido | REQ-REFACTOR-05 | developer | S3.GATE | `mods/curriculum-design/docs/reference/seed-counts.md` | doc coherente con el seed nuevo; sin doc stale | git revert | DET-16, DET-37 | done | 4 |
| S4.T3 | KB (DET-37 dim2): actualizar `RULE-curriculum-design-022` (guard por owner cuando el label de raiz es generico y el owner es determinista) y registrar `DEC-LOCAL-01` como decision que actualiza el contexto de la regla | REQ-PRESERVE-04 | developer | S3.GATE | `deckard/projects/up1/rules/curriculum-design/RULE-curriculum-design-022.md` | rule coherente con el guard nuevo | git revert | DET-16, DET-37, RULE-curriculum-design-022 | done | 4 |
| S4.T4 | Verificacion runtime UPU (DET-36, H6): abrir el requisito sembrado y uno creado a mano; contrastar badges/nombres/jerarquia (la diferencia desaparece); extender el arbol sembrado (agregar condicion a via + agregar via nueva) sin duplicar contenedor. Evidencia runtime real (screenshot/DOM) | REQ-PRESERVE-02, REQ-REFACTOR-01 | reviewer | S4.T1 | UPU (runtime) | evidencia runtime registrada (screenshot/DOM con marca de corrida) | (no aplica) | DET-36, DET-13 | done | 4 |
| **S4.GATE** | **Gate de sync Session 4 (tier: T3)** — persistir, regresion completa + smoke UI, decidir continue/close-ready | — | reviewer | S4.T1, S4.T2, S4.T3, S4.T4 | ticket | gate persistido; acceptance verde; evidencia runtime | (no aplica — cierre) | DET-20, DET-23, DET-36 | done | 4 |

### Session 5 — Completar i18n del combinador AND/OR en la ficha generica del RT Group (en/pt) [tipo: auto] [tier: T1]

> **Extension de scope post-aprobacion (2026-08-26, opcion B, DEC-LOCAL-05).** Respaldada por REQ-I18N-01. No forma parte del refactor del seed (REQ-PRESERVE/REFACTOR); corrige un gap de completitud i18n en la capa de display. Independiente de S1-S4 (no comparte archivos), puede ejecutarse antes o despues. Es un cambio behavior-visible acotado (en/pt dejan de caer a fallback), fuera del "zero behavior change" de la plataforma pero contemplado en la aceptacion actualizada de REQ-PRESERVE-01 (el diff ahora incluye `lang/`).
>
> **Estado de ejecucion (reconciliacion tras re-judge 2026-08-26):** los 2 archivos i18n ya existen en el working tree (creados durante la review que origino esta extension, aun **untracked sobre `develop`**). Las tasks S5.T1/S5.T2 se mantienen `pending` hasta que el spec quede approved y S5.GATE materialice la validacion (paridad + sync + smoke) y el **commit en feature branch** (DET-30/DET-27). No se marcan `done` fuera de una session aprobada (DET-38/DET-29).
>
> **DET-37 dim1 (docs):** N/A — completitud de i18n (traduccion de un enum ya existente), sin superficie de doc de plataforma que actualizar. **Test de paridad:** decision consciente T1 — la paridad es/en/pt se valida en S5.GATE por inspeccion + smoke DET-36; no se agrega assert automatizado dado el tamano (si el RT crece, considerar un test de paridad de locales).

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S5.T1 | Crear `lang/en/rt__Group__requirement.i18n.json` espejando `es` (column labels + `enums.combinator.AND/OR`). Archivo ya presente en working tree (untracked); validar y llevar a la feature branch | REQ-I18N-01 | developer | — | `mods/curriculum-design/lang/en/rt__Group__requirement.i18n.json` | JSON parsea; paridad de keys con es | git rm archivo nuevo | DET-16, DET-37 | done | 5 |
| S5.T2 | Crear `lang/pt/rt__Group__requirement.i18n.json` espejando `es`. Archivo ya presente en working tree (untracked); validar y llevar a la feature branch | REQ-I18N-01 | developer | — | `mods/curriculum-design/lang/pt/rt__Group__requirement.i18n.json` | JSON parsea; paridad de keys con es | git rm archivo nuevo | DET-16, DET-37 | done | 5 |
| S5.T3 | Correr `npm run sync` del mod y confirmar que el bundle i18n toma los locales nuevos (sin editar a mano archivos sincronizados); smoke en UPU con locale en/pt: el combinador del Group resuelve traducido (DET-36) | REQ-I18N-01 | developer | S5.T1, S5.T2 | `mods/curriculum-design/` (bundle i18n) | sync corrido sin drift; evidencia runtime (screenshot/DOM) del combinador traducido en en/pt | (no aplica) | DET-36, DET-37 | done | 5 |
| **S5.GATE** | **Gate Session 5 (tier: T1)** — validar paridad de keys es/en/pt + sync limpio + smoke; **commit en feature branch** (rama actual `develop` es protegida, DET-30) con subject `UPONE-1541-S5`; decidir close | — | reviewer | S5.T1, S5.T2, S5.T3 | ticket | paridad verificada (es==en==pt); sync sin drift; commit en branch no protegida (DET-27/DET-30) | (no aplica — cierre) | DET-20, DET-23, DET-27, DET-30 | done | 5 |

## Constraints

- **work_type = refactor con excepcion behavior-visible declarada (S5)**: el nucleo del ticket (S1-S4) es un refactor "zero behavior change" del seed. La extension S5/REQ-I18N-01 introduce un unico cambio **behavior-visible acotado** (traduccion del enum combinador en en/pt). Se declara explicito aqui para no descalibrar los gates que keyean en `work_type=refactor` (calibracion de review light + foco zero-behavior): esos gates aplican a S1-S4; S5 se juzga como fix de completitud i18n (T1). El request inmutable NO se reescribe (DET-3); la expansion vive en DEC-LOCAL-05 y REQ-I18N-01.
- **RULE-curriculum-design-022**: El seed debe ser idempotente (owner determinista + guard). **Este refactor ACTUALIZA la regla**: hoy prescribe guard GLOBAL por label; el nuevo contexto (label de raiz generico + owner determinista por code) invierte la guia a guard POR OWNER. Ver DEC-LOCAL-01. La regla es `should`; el cambio de contexto lo justifica y se documenta en el mismo ticket (S4.T3).
- **DET-7** (test cases ↔ discovery): la prueba de forma es la regression net; cada assert traza a un REQ-REFACTOR.
- **DET-8** (rollback): cada fase atomica revertible por `git revert`; rollback global = re-seed limpio.
- **DET-16** (propagacion): el retiro del bloque electivo se propaga a sus 2 consumidores + docs + KB.
- **DET-40** (auditoria de reemplazo): bloque electivo del Plan → pool K-de-N en via, enumerado 1:1 (seccion DET-40).
- **Aduana**: veredicto `todo-mod-only` (`kb/sp9/UPONE-1541-aduana.md`); ningun artefacto toca objeto Base, resolver mas alla del CRUD generico, componente de libreria compartida, capability ni evento. No requiere Core Extension.

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| UPONE-1378 | internal | Editor visual y alta con vias (define el techo de forma que este ticket toma como referencia) | Finalizada — sin riesgo |
| UPONE-1619 | internal | Hermano SP9; comparte `tests/integration/seed-counts.test.ts`, `docs/reference/seed-counts.md` y la corrida del seed. **Ya mergeado a develop (S4 2026-08-19, S6 2026-08-20).** | Resuelto — sin conflicto paralelo: 135 se construye sobre la version actual de develop, no en paralelo. Al ejecutar, partir de los archivos compartidos tal como los dejo 1619 (seed-counts.test.ts creado hasta ~646 lineas; docs a "396 secciones / 22 piezas") |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Guard por owner + re-seed duplica si la Activity no se resuelve antes | medium | Arbol duplicado en UPU | S2 cambia guard y raiz en el mismo paso (S2.T1 antes de S2.T2); gate de S2 corre la prueba de re-seed (S2.T4) |
| El mock stateful resuelve la Activity ancla a id nuevo por corrida → falso "duplica" en la prueba de re-seed | high | Test rojo por artefacto del mock, no por bug | S2.T4 stubea `Activity.findFirst` con id estable (Technical reference) |
| Retiro del bloque electivo deja refs muertas | medium | Log de paso inexistente / test de contrato muerto | DET-40 enumerado; S3.T2 propaga a los 2 consumidores; `grep electiveBlock` como check |
| Mover una global bajo OR cambia la semantica | medium | Requisito que deja de exigirse | REQ-REFACTOR-02: duplicar las 2 globales en cada via |
| Refs de linea desalineadas con la version post-UPONE-1619 de los archivos compartidos | low | Task apunta a lineas movidas | Mitigado — 1619 ya mergeado a develop; refs del spec re-derivadas contra esa version (describe loadRequirement `:478-528`). Al ejecutar, re-verificar contra develop antes de editar `seed-counts.test.ts` / `docs/reference/seed-counts.md` |
| `docs/reference/seed-counts.md` queda stale (dim1) | low | Doc contradice el seed | S4.T2 actualiza la doc en la misma session que estabiliza el codigo |

## Open questions

Ninguna abierta. Las tres decisiones de ejecucion que el intake dejo abiertas se resuelven en este spec (ver Decisions: DEC-LOCAL-02/03/04).

## Decisions

### DEC-LOCAL-01: Guard de idempotencia por owner (actualiza RULE-curriculum-design-022)
- **Contexto**: al aplanar, la raiz deja de ser el `Group[AND]` autorado "Requisitos EST200" y pasa a ser el contenedor de vias con label por defecto ("Cualquiera de las vias"), generico y compartible entre arboles.
- **Drivers**: (a) el guard por-label global buscaria una raiz que ya nadie siembra (replanta) o haria falso match con otro arbol; (b) el owner YA es determinista por code (`EST200_ACTIVITY_CODE`), que es la precondicion exacta que RULE-022 exigia para poder guardar por owner de forma segura.
- **Opcion elegida**: guard por `[ownerType:'activity', ownerId:activity.id, parentId:null]`, resolviendo la Activity ANTES del guard.
- **Alternativas**: mantener el guard por label global (descartada: inseguro bajo label generico) — o autorar un label unico en la raiz (descartada: viola "ningun label autorado", REQ-REFACTOR-03).
- **Consecuencias**: gana idempotencia correcta bajo label generico; obliga a resolver la Activity antes (mas trabajo si la Activity no existe, ya cubierto por el skip). **Requiere actualizar RULE-022** (S4.T3): la regla es `should` y su guia de "guard global por label" ya no aplica cuando el label de raiz es generico y el owner es determinista.
- **Session**: design.

### DEC-LOCAL-02: Sembrar 2 vias
- **Contexto**: cuantas vias siembra el ejemplo.
- **Drivers**: mostrar el contenedor OR (con 1 via `collapseSingleVia` lo oculta) y ejercitar la duplicacion de globales.
- **Opcion elegida**: 2 vias (coincide con la "Forma objetivo" del `detalle.md`).
- **Alternativas**: 1 via (no muestra el OR); 3+ vias (no aporta, infla el ejemplo).
- **Consecuencias**: ejemplo minimo suficiente.
- **Session**: design.

### DEC-LOCAL-03: El electivo K-de-N va dentro de la via 2 (profundidad 4)
- **Contexto**: donde ubicar el electivo de reemplazo (item 5 del alcance: "dentro de una via").
- **Drivers**: la "Forma objetivo" del detalle muestra 2 vias sin pool; el scope exige el pool dentro de una via; el alta soporta profundidad 4 solo con pool.
- **Opcion elegida**: pool `Group[OR, minToSatisfy]` como hijo del `Group[AND]` de la via 2 (raiz OR > via2 AND > pool OR > hojas).
- **Alternativas**: 3a via dedicada al pool (descartada: una via que es solo pool + globales es un "camino" artificial; ademas se aparta mas del diagrama de forma objetivo, que fija 2 vias). Via 1 (descartada: se prefiere dejar via 1 como el ejemplo AND simple del diagrama).
- **Consecuencias**: via 1 queda como el ejemplo canonico del diagrama; via 2 demuestra el anidamiento maximo reproducible. Nota: el diagrama del detalle omite el pool, pero el scope item 5 lo manda — el spec reconcilia agregandolo a via 2 dentro de la profundidad reproducible.
- **Session**: design.

### DEC-LOCAL-04: La prueba de forma extiende `seed-counts.test.ts`
- **Contexto**: prueba de forma como archivo nuevo vs extension del test existente.
- **Drivers**: `makePrismaMock`/`createsOf` son helpers LOCALES a `seed-counts.test.ts` (no exportados); el loader ya esta importado ahi.
- **Opcion elegida**: extender `seed-counts.test.ts` con un describe "forma del arbol".
- **Alternativas**: archivo nuevo `requirement-shape.test.ts` (descartada: obligaria a duplicar los helpers o a extraerlos a un shared, un refactor de mayor blast radius). Extraer los helpers a un modulo compartido (descartada por ahora: fuera de alcance, mas riesgo).
- **Consecuencias**: DRY; comparte archivo con UPONE-1619, ya mergeado a develop → construir sobre esa version (describes distintos, sin colision de lineas).
- **Session**: design.

### DEC-LOCAL-05: Integrar el fix i18n del combinador (en/pt) como S5 dentro de TICKET-135
- **Contexto**: durante la review del 2026-08-26 se detecto que `rt__Group__requirement.i18n.json` existia solo en `es`; en/pt caian a fallback para el enum combinador AND/OR y los labels de columna del RT `Group`. El refactor del seed (S1-S4) fue aprobado por dual-judge el 2026-08-18 con scope cerrado sobre el dato del seed; este gap es de la capa de display.
- **Drivers**: (a) el gap es real y vale corregirlo; (b) el dev pidio explicitamente integrarlo en 135 como sesion nueva (opcion B), no como ticket aparte.
- **Opcion elegida**: **B** — agregar REQ-I18N-01 + Session 5 a este spec, actualizando la aceptacion de REQ-PRESERVE-01 (el diff ahora incluye `lang/`), el Refactor map y Acceptance checkpoints, para que la extension quede coherente y no deje REQ sin backing ni checkpoints falsos.
- **Alternativas**: **A** — ticket quick/fix separado (descartada por decision del dev; era la recomendacion del reviewer por disciplina de scope: mantiene 135 como refactor puro "zero behavior change"). Dejar S5 sin REQ ni actualizar PRESERVE-01 (descartada: dejaba la aceptacion de PRESERVE-01 falsa y una sesion sin requirement).
- **Consecuencias**: 135 deja de ser un refactor "zero behavior change" estricto — incorpora un cambio behavior-visible acotado (i18n en/pt), explicitado en REQ-I18N-01 y en la aceptacion de PRESERVE-01. Reabre el scope aprobado por el dual-judge del 2026-08-18 → **requiere re-judge (DET-38)** del spec con S5 incorporada. S5 es independiente de S1-S4 (sin archivos compartidos), asi que no afecta el riesgo de idempotencia ni la coordinacion con UPONE-1619.
- **Session**: design (2026-08-26).

## Technical reference

**Estado actual del seed** (`mods/curriculum-design/seed/_data-requirement.js`):
- Guard actual: `findFirst({ where:{ ownerType:'activity', label:'Requisitos EST200', parentId:null } })` (`:59-61`) — ANTES de resolver la Activity (`:65`).
- Forma vieja: raiz `Group[AND]` (`:97-100`), `Group[OR]` "Via de ingreso" (`:102-105`), `Group[AND]` "Calculo + Algebra" (`:107-110`), hojas curso (`:113-125`), `MetricThreshold` global (`:127-130`), advisory global (`:140-143`).
- Anclas por code: `EST200_ACTIVITY_CODE='C-ESTADISTIC-107'` (`:50`), prerequisitos por code (`:76-81`).
- Bloque electivo del Plan: `:149-202`, owner `curriculum`, `effect:'ProgressGate'`, `minToSatisfy:k`, `creditsRequired:24`; clave `results.electiveBlock` (`:43`,`:201`).

**Mock de test** (`tests/integration/seed-counts.test.ts:96-162`): `makePrismaMock(resolveByCode)` es STATEFUL — `create` recuerda filas y `findFirst` las resuelve replicando el `where` completo (solo scalars, `:110-112`). **Trampa para la prueba de re-seed**: para los modelos en `resolveByCode` (`Activity`), `findFirst` devuelve `{ id: 'mock-Activity-'+(++idCounter), ...where }` (`:126-129`) — un id NUEVO en cada llamada. Correr `loadRequirement` dos veces sobre el mismo mock daria un `ownerId` distinto por corrida y el guard por owner NO haria match → falso "duplica". La prueba de re-seed (S2.T4) debe stubear `Activity.findFirst` para devolver un id estable, o keyear el guard de forma que el mock lo resuelva.

**Consumidores del retorno** (DET-16/DET-40): `seed/seed.js:170-172` (log) y `tests/integration/seed-entry.test.ts:121` (mock).

**KB inyectado (DET-34, `kb/sp9/`)** — cada decision del spec se apoya en:
- `UPONE-1541-detalle.md` — "Forma objetivo" (2 vias, labels a persistir) → REQ-REFACTOR-01/02/03, DEC-LOCAL-02.
- `UPONE-1541-pre-intake.md` — enfoque decidido (aplanar), gotchas del guard y del mock → REQ-REFACTOR-04, DEC-LOCAL-01, Technical reference.
- `UPONE-1541-limites-de-escritura-y-retiros.md` — inventario nodo-por-nodo + 2 consumidores del `electiveBlock` → DET-40, REQ-PRESERVE-03.
- `UPONE-1541-aduana.md` — frontera `todo-mod-only` → Constraints (sin Core Extension).
- `UPONE-1541-explicativo.html` — narrativa del cambio para el dev.

## Acceptance checkpoints

- [ ] **Funcional**: scenarios de cada REQ-REFACTOR y REQ-PRESERVE pasan.
- [ ] **Tests** (DET-37 dim4): prueba de forma (roja en S1, verde con forma nueva en S2/S3) + re-seed idempotente + suite del mod verde.
- [ ] **Rules**: `RULE-curriculum-design-022` actualizada al nuevo contexto (guard por owner); idempotencia verificada por re-seed.
- [ ] **Integration**: no rompe la suite del mod (delta vs baseline = solo asserts de forma nuevos); componentes del editor intactos.
- [ ] **Docs oficiales** (DET-37 dim1): `docs/reference/seed-counts.md` actualizada + limites del editor y motivo del retiro documentados.
- [ ] **KB DKC** (DET-37 dim2): `RULE-curriculum-design-022` actualizada; `DEC-LOCAL-01` registrada.
- [ ] **Docs externas DKC** (DET-37 dim3): N/A (no toca DKC ni convenciones).
- [ ] **Runtime (DET-36)**: evidencia real en UPU — arbol sembrado vs creado a mano coinciden; extension desde el editor sin duplicar contenedor.
- [ ] **i18n (S5, REQ-I18N-01)**: `rt__Group__requirement.i18n.json` presente en es/en/pt con paridad de keys; enum combinator resuelve traducido en en/pt (no fallback); `npm run sync` sin drift.
- [ ] **Sync/artefactos**: `npm run sync` corrido; artefactos de sync/seed NO commiteados.
- [ ] **Planning-completeness**: entry registrada (complete).

## Rules discovered

{Se llena durante ejecucion.}

## Bugs found

{Se llena si se descubren problemas.}

## Archiving

Cuando la spec deje de ser fuente de verdad: `/dkc-archive-spec SPEC-curriculum-design-refactor-requirement-seed-shape "razon"`.
