---
id: SPEC-core-implement-nav-view-label-key
project: up1
ticket: TICKET-132
status: draft
---

# Core · Nav · Nombre de vista declarable por aplicacion (labelKey)

# Core · Nav · Nombre de vista declarable por aplicacion (labelKey)

## Executive summary — lo que estas aprobando

> *Esta seccion esta diseñada para revision rapida. Todo el detalle tecnico vive en las secciones siguientes (Requirements, Artifacts, Tasks). Si solo lees el Executive summary y te basta para decidir, ese es el objetivo.*

**Que se quiere**: hoy el nombre de una vista del menu se indexa por objeto (`object.<Objeto>`), asi que dos apps que declaran el mismo objeto Base comparten forzosamente el mismo texto. Curriculum Design necesita llamar a `Activity`/`Offering` "Programa de asignatura"/"Silabos", pero Engagement las llama "Actividad"/"Ofertas" y no hay un nombre que arbitrar: son dos lecturas correctas que deben convivir. Este ticket agrega una capacidad opt-in de plataforma: cada app puede declarar en su propia entrada de navegacion la clave de traduccion (`labelKey`) del nombre a mostrar, que gana sobre la clave global por objeto y aplica solo a su app. Es aditivo, compatible hacia atras (quien no lo declara ve exactamente lo de hoy), y ya fue validado en runtime por un spike. Desbloquea la parte de UPONE-1616 que hoy no es ejecutable.

**Decisiones criticas que necesitan tu OK**:

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | Campo = clave de traduccion (`labelKey`), NO texto literal | Traducible en los 3 idiomas; evita meter texto de UI en configuracion (choca con la cascada i18n de la plataforma). Alternativa B (literal) descartada salvo que core la pida |
| 2 | Cascada de fallback: `labelKey` → `object.<Objeto>` → nombre tecnico | Hoy una clave inexistente cae directo al nombre tecnico de la tabla (peor que no declarar). La cascada lo evita |
| 3 | En el JSON schema del objeto de app: declarar la variante objeto `{object, layouts, labelKey}` en `defaultObjects` (hoy ausente) y sumar `labelKey` a la variante de `navByRole`, **manteniendo `additionalProperties: false`** (declaracion explicita, no apertura) | Es el eslabon H9: el schema va por detras del resolver. Mantener el schema estricto conserva el contrato que atrapa typos; abrir `additionalProperties` los toleraria en silencio. Divergencia deliberada de la sugerencia inicial "abrir additionalProperties" — ver DEC-LOCAL-01 |
| 4 | Editar las **fuentes** en `suite`; las copias de `object-manager` se regeneran por sync, nunca a mano | El tipo GraphQL en OM es archivo generado; editarlo a mano destruiria regeneraciones ajenas (CLAUDE.md Critical Rules) |

**Riesgos principales y como los mitigamos**:

- **El dato se descarta en silencio si falta un eslabon** (el spike descubrio que el tipo GraphQL y la seleccion de campos del cliente son obligatorios; sin ellos el sintoma es identico a "no funciona") → secuencia server-first: parchar servidor (eslabones 4-5), **confirmar por introspeccion de la API que el campo viaja** antes de tocar el cliente. Corta el diagnostico ciego a la mitad.
- **Efecto cruzado entre apps** (que una app pise el nombre de otra) → es justo el criterio de aceptacion central; se verifica en runtime con **dos apps del mismo tenant** (una declara, la otra no cambia), no mirando una sola. La propiedad que lo garantiza: la clave la declara cada mod en su propio namespace i18n (`{workspace}/{stem}`).
- **Drift tras sync** (las copias de OM quedan desalineadas de las fuentes) → correr sync y `drift:check`, comparar copias vs fuentes; no commitear artefactos de sync editados a mano.

**Que NO se hace en este ticket** (limites explicitos del scope):

- Unificar los dos sistemas de etiquetado (menu vs etiqueta de negocio del objeto, UPONE-1504) — exige modelo de datos nuevo y cambia consumidores existentes; direccion aparte (Opcion C del pre-intake).
- Dar dimension de aplicacion al contexto de i18n global (Opcion D) — afecta todos los textos, riesgo desproporcionado.
- Que la pestaña del navegador refleje la vista activa; el orden de las vistas (ya es capacidad existente).
- Aceptar texto literal ademas de clave (queda como decision abierta a validar por core).

**Tamano estimado**: 3 sessions ejecutables (S1 servidor, S2 cliente, S3 verificacion+docs), aproximadamente 4-6h efectivas. La mas riesgosa es S3 (verificacion runtime con dos apps + sync sin drift): es donde se prueba la propiedad central (no efecto cruzado) y donde H3/H7 pasan de "leidas en codigo" a "ejecutadas".

**Como vas a saber que funciona** (criterios observables):

- Abro el menu de Curriculum Design y veo "Programa de asignatura"/"Silabos"; abro el de Engagement en el mismo tenant y sigue mostrando "Actividad"/"Ofertas" — sin cambios.
- Una app que no declara `labelKey` muestra exactamente los nombres de hoy.
- Declaro una `labelKey` que no existe en el catalogo y el menu cae a la clave global del objeto, no al nombre tecnico de la tabla.
- Corro `npm run sync` y `drift:check` y no hay drift; las copias de OM quedan regeneradas con el campo.

---

## Purpose

Agregar a la configuracion de navegacion por app (`up1_suite_app`, sistema PLAT-15/UPONE-1513) un campo opcional `labelKey` por entrada de vista, para que el equipo de un mod pueda declarar el nombre traducible de una vista que aplique solo a su app, sin alterar el nombre global del objeto ni el que ve otra app que comparte el mismo objeto Base. Toca core (fuentes en `suite`; copias regeneradas por sync en `object-manager`). Es una Core Extension Change Type 3 (nueva capacidad opcional): aprobacion de core es gate de merge, no de inicio.

## Requirements

### REQ-01: Declarar `labelKey` opt-in en la entrada de vista de la app

> **Que cambia**: en el `app.json` de un mod, una entrada de vista (forma objeto) puede llevar `labelKey: "<clave i18n>"`. El JSON schema del objeto de app lo declara y lo acepta.
> **Por que**: hoy no existe un lugar donde declarar el nombre de una vista por app; el schema del objeto de app ni siquiera declara la variante objeto para vistas compartidas (`defaultObjects`), solo string y dashboards.

El sistema MUST aceptar un campo opcional `labelKey` de tipo string en la variante objeto de una entrada de navegacion, tanto en `defaultObjects` (vistas compartidas) como en `navByRole` (vistas por rol interno). El sistema MUST declarar la variante objeto `{object, layouts?, labelKey?}` en `defaultObjects` (hoy ausente) y sumar `labelKey` a la variante objeto de `navByRole`, manteniendo `additionalProperties: false` (declaracion explicita). El campo MUST ser opt-in: su ausencia deja el comportamiento identico al actual.

**Actor**: equipo de mod (declarante) / system (validacion de schema)
**Layers**: config, database (columna JSON), backend (sync validation)

<details><summary>Scenarios de validacion</summary>

#### Scenario: entrada objeto con labelKey valida contra el schema
- **GIVEN** un `app.json` con `defaultObjects: [{ "object": "Activity", "labelKey": "nav.curriculumDesign.activity" }]`
- **WHEN** corre el sync (`validatePlat15Config` + validacion de schema del objeto)
- **THEN** la configuracion pasa sin rechazo y persiste tal cual en la columna JSON

#### Scenario: entrada sin labelKey (backward compat)
- **GIVEN** un `app.json` con `defaultObjects: ["Activity"]` (string legado) o `[{ "object": "Activity" }]`
- **WHEN** corre el sync
- **THEN** valida igual que hoy; no se exige `labelKey`

#### Scenario: propiedad desconocida sigue rechazada
- **GIVEN** una entrada objeto con una prop no declarada (ej. `labelKy` con typo)
- **WHEN** valida contra el JSON schema
- **THEN** `additionalProperties: false` la rechaza (el contrato estricto atrapa el typo)

</details>

#### Acceptance
**El usuario puede verificar que funciona**: agrega `labelKey` a una entrada de vista de un mod, corre sync, y la config queda persistida sin error.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | labelKey valida | entrada objeto con labelKey | sync | acepta | config persistida con labelKey |
| 2 | string legado | `["Activity"]` | sync | acepta sin regresion | comportamiento actual |
| 3 | typo rechazado | prop `labelKy` | validacion schema | rechaza | error de additionalProperties |

### REQ-02: El campo `labelKey` viaja de extremo a extremo por la API

> **Que cambia**: `labelKey` sobrevive la normalizacion server-side, se declara en el tipo GraphQL `NavTab`, lo pide la query del cliente y lo tiene la interfaz `NavTab`. Deja de descartarse en silencio.
> **Por que**: el spike descubrio que sin declarar el campo en el tipo GraphQL (eslabon 5) y sin pedirlo en la query (eslabon 7) el dato se pierde y el sintoma es identico a "el fix no funciona".

El sistema MUST preservar `labelKey` al normalizar una entrada de nav (`normalizeTab`, que hoy reconstruye campo por campo y descarta claves extra), MUST declarar `labelKey: String` (nullable) en el tipo GraphQL `NavTab`, MUST pedir `labelKey` en la seleccion de campos de la query de apps del cliente, y MUST declarar `labelKey?: string | null` en la interfaz `NavTab` del cliente.

**Actor**: system
**Layers**: backend (resolver, graphql), frontend (query, tipo)

<details><summary>Scenarios de validacion</summary>

#### Scenario: preservacion en la normalizacion
- **GIVEN** una entrada `{ object: "Activity", labelKey: "nav.x" }`
- **WHEN** `normalizeTab` la procesa
- **THEN** el resultado incluye `labelKey: "nav.x"` (junto a kind/object/layouts/dashboards)

#### Scenario: forma string legado preserva contrato
- **GIVEN** una entrada string `"Activity"`
- **WHEN** `normalizeTab` la procesa
- **THEN** `labelKey` resuelve a `null` (no rompe la forma legado)

#### Scenario: el campo llega al cliente
- **GIVEN** una app con una entrada que declara labelKey
- **WHEN** el cliente ejecuta `getAppsFiltered` con la seleccion `navTabs { kind object layouts dashboards labelKey }`
- **THEN** la respuesta trae `labelKey` poblado en el tab correspondiente

#### Scenario: introspeccion confirma el campo en el servidor
- **GIVEN** el schema regenerado
- **WHEN** se introspecciona el tipo `NavTab`
- **THEN** `labelKey` figura como campo del tipo (diagnostico server-first antes de tocar el cliente)

</details>

#### Acceptance
**El usuario puede verificar que funciona**: introspecciona `NavTab` en la API y ve `labelKey`; en devtools ve el campo poblado en la respuesta de `getAppsFiltered`.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | preserva labelKey | entrada objeto con labelKey | normalizeTab | preserva | `labelKey` en el shape resuelto |
| 2 | string legado | entrada string | normalizeTab | no rompe | `labelKey: null` |
| 3 | campo introspectable | schema regenerado | introspeccion | presente | `NavTab.labelKey: String` |

### REQ-03: La resolucion de etiqueta prefiere `labelKey` con cascada de fallback

> **Que cambia**: al construir el label del grupo de nav, si el tab declara `labelKey` se usa esa clave; si no (o si la clave no traduce), cae a `object.<Objeto>`; y solo si esa tampoco existe, al nombre tecnico.
> **Por que**: hoy el label se resuelve fijo como `object.<Objeto>` con fallback directo al nombre tecnico; no hay forma de preferir una clave por app, y una clave inexistente cae al nombre tecnico de la tabla.

El sistema MUST construir un mapa `labelKey` por tab (keyeado por nav group key en minusculas, siguiendo el precedente del mapa de allow-list de layouts) desde los `navTabs` resueltos, y al resolver el label de cada grupo objeto MUST preferir la `labelKey` del tab cuando este declarada y traduzca, cayendo en cascada a `object.<Objeto>` y luego al nombre tecnico. El tab de dashboards MUST quedar excluido de esta preferencia (REQ-06).

**Actor**: system / user (ve el nombre)
**Layers**: frontend

<details><summary>Scenarios de validacion</summary>

#### Scenario: labelKey gana sobre la clave global
- **GIVEN** un tab `{ object: "Activity", labelKey: "nav.cd.activity" }` y `nav.cd.activity` traduce a "Programa de asignatura"
- **WHEN** se resuelve el label del grupo
- **THEN** el label es "Programa de asignatura" (no `object.Activity`)

#### Scenario: sin labelKey, comportamiento actual
- **GIVEN** un tab `{ object: "Activity" }` sin labelKey
- **WHEN** se resuelve el label
- **THEN** usa `object.Activity` con fallback al nombre tecnico (identico a hoy)

#### Scenario: labelKey inexistente cae a la clave global, no al nombre tecnico
- **GIVEN** un tab con `labelKey: "nav.noexiste"` que no traduce, pero `object.Activity` si traduce
- **WHEN** se resuelve el label
- **THEN** el label es la traduccion de `object.Activity` (cascada), NO "Activity" tecnico

</details>

#### Acceptance
**El usuario puede verificar que funciona**: declara una labelKey valida y ve el nombre en el menu; declara una invalida y ve el nombre global del objeto (no el tecnico).

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | preferencia | tab con labelKey que traduce | resolver label | prefiere | texto de labelKey |
| 2 | sin labelKey | tab sin labelKey | resolver label | actual | `object.<Objeto>` con fallback |
| 3 | fallback en cascada | labelKey inexistente, global existe | resolver label | cascada | texto de `object.<Objeto>` |

### REQ-04: Aislamiento por app — sin efecto cruzado, compatible hacia atras

> **Que cambia**: dos apps que declaran el mismo objeto pueden mostrar nombres distintos y ninguna afecta a la otra; una app que no declara nada ve exactamente lo de hoy.
> **Por que**: es el criterio central del caso. La propiedad que lo garantiza es que la clave la declara cada mod en su propio namespace i18n, y la preferencia se aplica por tab, no por objeto global.

El sistema MUST resolver el nombre de vista por entrada de nav de cada app de forma independiente: la `labelKey` declarada por una app MUST NOT alterar el nombre que ve otra app que declara el mismo objeto, ni el nombre global del objeto. Una app que no declara `labelKey` MUST mantener el comportamiento identico al actual.

**Actor**: user (de cada app)
**Layers**: frontend, config (namespace i18n por mod)

<details><summary>Scenarios de validacion</summary>

#### Scenario: dos apps, mismo objeto, nombres distintos
- **GIVEN** Curriculum Design declara `labelKey` para `Activity`/`Offering` y Engagement no, en el mismo tenant
- **WHEN** el usuario abre cada menu
- **THEN** Curriculum Design muestra los nombres declarados y Engagement muestra los suyos, sin cambios cruzados

#### Scenario: app sin labelKey, sin regresion
- **GIVEN** una app cuyo `defaultObjects`/`navByRole` no declara ninguna `labelKey`
- **WHEN** el usuario abre su menu
- **THEN** ve exactamente los nombres de hoy

</details>

#### Acceptance
**El usuario puede verificar que funciona**: compara los dos menus (declarante y no declarante) en el mismo tenant y confirma que solo cambio el que declaro.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | no efecto cruzado | dos apps, mismo objeto, una declara | abrir ambos menus | aisladas | cada una su nombre |
| 2 | no regresion | app sin labelKey | abrir menu | actual | nombres de hoy |

### REQ-05: Funciona igual en vistas por rol interno (`navByRole`)

> **Que cambia**: el campo `labelKey` opera igual cuando la app usa `navByRole` (vistas por rol interno) que cuando usa `defaultObjects` (vistas compartidas).
> **Por que**: ambos sistemas pasan por la misma normalizacion (`normalizeTab`), pero el spike solo probo el compartido; el DoD exige cubrir los dos.

El sistema MUST aplicar la preservacion y la preferencia de `labelKey` de forma identica para las entradas provenientes de `navByRole` y de `defaultObjects`.

**Actor**: user con rol interno del mod
**Layers**: backend (normalizeTab compartido), frontend

<details><summary>Scenarios de validacion</summary>

#### Scenario: labelKey en una entrada por rol interno
- **GIVEN** un `navByRole` con una entrada `{ object: "Activity", labelKey: "nav.cd.activity" }` para un rol
- **WHEN** un usuario de ese rol abre el menu
- **THEN** ve el nombre declarado, igual que en el sistema compartido

</details>

#### Acceptance
**El usuario puede verificar que funciona**: con un usuario de rol interno que use `navByRole`, el nombre declarado aparece en su menu.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | navByRole con labelKey | entrada por rol interno con labelKey | resolver/render | igual que compartido | nombre declarado |

### REQ-06: El tab reservado de dashboards ignora `labelKey`

> **Que cambia**: la entrada especial `{ dashboards: [...] }` conserva su nombre reservado (`object.Dashboards`) aunque el campo exista en el schema.
> **Por que**: el tab de dashboards resuelve su nombre por una clave fija; no debe consumir `labelKey`.

El sistema MUST resolver el nombre del tab de dashboards por su clave fija `object.Dashboards` y MUST NOT aplicarle `labelKey`.

**Actor**: system
**Layers**: frontend, config (schema: variante dashboards sin labelKey)

<details><summary>Scenarios de validacion</summary>

#### Scenario: dashboards conserva su nombre reservado
- **GIVEN** un app con un tab de dashboards
- **WHEN** se resuelve el label
- **THEN** usa `object.Dashboards`, sin importar ninguna labelKey

</details>

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | dashboards ignora labelKey | tab dashboards | resolver label | reservado | `object.Dashboards` |

### REQ-07: La ruta de navegacion hereda el nombre declarado

> **Que cambia**: el breadcrumb muestra el mismo nombre que la vista, sin trabajo adicional.
> **Por que**: el breadcrumb reutiliza el label ya resuelto por el menu; hereda solo.

El sistema MUST mostrar en la ruta de navegacion (breadcrumb) el mismo nombre resuelto para la vista (incluyendo `labelKey` cuando aplique), sin logica adicional.

**Actor**: user
**Layers**: frontend

<details><summary>Scenarios de validacion</summary>

#### Scenario: breadcrumb con el nombre declarado
- **GIVEN** una vista con `labelKey` declarada y resuelta a "Programa de asignatura"
- **WHEN** el usuario navega a esa vista
- **THEN** el breadcrumb muestra "Programa de asignatura"

</details>

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | breadcrumb hereda | vista con labelKey | navegar | hereda | nombre declarado en la ruta |

## Non-functional requirements

| Tipo | Requirement | Metrica | Target |
|------|-------------|---------|--------|
| Security | RBAC: la capacidad no cambia capabilities ni el filtrado de vistas por permiso | capabilities tocadas | 0 (N/A funcional) |
| i18n | Paridad de la clave en los tres idiomas del proyecto | idiomas cubiertos | 3/3 para la clave declarada en el smoke |

> Performance/Scale/Availability: N/A. Es un campo string opcional que viaja en un boot read ya existente; sin queries nuevas ni volumen adicional.

## Artifacts

Esta feature no crea objetos/endpoints/tablas nuevas — extiende un objeto y un tipo existentes. Delta por eslabon (medido por el spike; ver `kb/sp9/UPONE-1645-pre-intake.md` seccion "Estado actual del codigo, eslabon por eslabon"):

### Schema del objeto de app (columna JSON)

Archivo fuente: `object-manager/objects/up1/suite/up1_suite_app.json`

| Ubicacion | Cambio | Detalle |
|-----------|--------|---------|
| `defaultObjects.items.oneOf` | **Agregar** variante objeto | Hoy solo declara `string` y `{dashboards}`. Sumar `{ object: string (required), layouts?: string[], labelKey?: string }` con `additionalProperties: false` |
| `navByRole.additionalProperties.items.oneOf[0]` (variante objeto) | **Agregar** propiedad | Sumar `labelKey?: string` a `{object, layouts}`, manteniendo `additionalProperties: false` |
| `defaultObjects.description` | **Actualizar** | Documentar la variante objeto (hoy la descripcion solo menciona string legado + dashboards — hallazgo colateral del pre-intake) |

### Tipo GraphQL `NavTab`

Archivo fuente: `suite/logic/app.schema.graphql`

| Campo | Tipo | Nullable | Descripcion |
|-------|------|----------|-------------|
| `labelKey` | `String` | si | Clave i18n opcional del nombre de la vista, declarada por la app. Preferida sobre `object.<Objeto>` al resolver el label. Null para tabs sin declaracion y para el tab de dashboards |

### Interfaz `NavTab` (cliente)

Archivo fuente: `suite/composables/navTabs.ts`

| Campo | Tipo | Detalle |
|-------|------|---------|
| `labelKey` | `string \| null` (opcional) | Espeja el campo del tipo GraphQL |

### Logica de resolucion (cliente)

Archivo fuente: `suite/composables/useObjectManager.ts`

| Pieza | Cambio | Precedente |
|-------|--------|------------|
| Query de apps (`navTabs { ... }`) | Agregar `labelKey` a la seleccion (lineas 104-109) | — |
| Mapa `labelKey` por tab | Construir `Map<groupKeyLower, string>` desde `navTabs`, igual que `layoutRestrictions` (lineas 534-544) | `layoutRestrictions` (allow-list de layouts por tab) |
| Resolucion del label (lineas 625-633) | Preferir `labelKey` del mapa antes de `object.<Objeto>`; excluir dashboards | `translateWithFallback` existente |

## Tasks

> Numeracion de sessions: el ticket no tiene `### Session N` previas (intake conversacional). El plan empieza en **S1**. Secuencia server-first (el pre-intake recomienda validar que el campo viaja por la API antes de tocar el cliente).

### Session 1 — Servidor: propagar labelKey (schema + normalizacion + tipo GraphQL) [tipo: ⚑ fuerte] [tier: T2]

parallel_groups: [[S1.T1, S1.T3]]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Declarar la variante objeto `{object, layouts?, labelKey?}` en `defaultObjects` y sumar `labelKey` a la variante objeto de `navByRole`, con `additionalProperties: false`; actualizar la `description` de `defaultObjects` | REQ-01 | developer | — | object-manager/objects/up1/suite/up1_suite_app.json | manual: validar un app.json de prueba contra el schema (acepta con/sin labelKey; rechaza typo) | git revert | DET-1, DET-2, DET-8, DET-16 | done | 1 |
| S1.T2 | Preservar `labelKey` en `normalizeTab` (preservar en la variante objeto; null en string legado y en dashboards) | REQ-02, REQ-06 | developer | — | suite/logic/app.resolver.js | vitest unit de S1.T4 | git revert | DET-5, DET-8, DET-10, DET-11 | done | 1 |
| S1.T3 | Declarar `labelKey: String` (nullable) en el tipo `NavTab` del schema GraphQL fuente | REQ-02 | developer | — | suite/logic/app.schema.graphql | introspeccion del tipo tras regenerar (S1.T5) | git revert | DET-5, DET-8, DET-16 | done | 1 |
| S1.T4 | Unit de preservacion en la normalizacion: variante objeto preserva labelKey; string legado da null; dashboards ignora | REQ-02, REQ-06 | developer | S1.T2 | suite/tests/unit/ (app.resolver o navTabs) | vitest run verde | git revert | DET-4, DET-7, DET-13 | done | 1 |
| S1.T5 | Verificar por introspeccion de la API que `NavTab.labelKey` viaja (diagnostico server-first antes del cliente) | REQ-02 | developer | S1.T1, S1.T2, S1.T3 | (introspeccion API local) | introspeccion muestra el campo | (no aplica) | DET-5, DET-13 | done | 1 |
| **S1.GATE** | **Gate de sync Session 1 (tier: T2)** — persistir en `## Sessions`, correr validacion, decidir continue/iterate/escalate/standby | — | reviewer | S1.T1, S1.T2, S1.T3, S1.T4, S1.T5 | ticket | gate persistido + decision + campo introspectable + unit verde | (no aplica) | DET-20, DET-23 | done | 1 |

### Session 2 — Cliente: consumir y preferir labelKey [tipo: auto] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S2.T1 | Sumar `labelKey` opcional (string o null) a la interfaz `NavTab` del cliente | REQ-02 | developer | S1.GATE | suite/composables/navTabs.ts | typecheck del workspace | git revert | DET-5, DET-8 | done | 2 |
| S2.T2 | Pedir `labelKey` en la seleccion de campos de la query de apps | REQ-02 | developer | S1.GATE | suite/composables/useObjectManager.ts | manual: devtools muestra el campo poblado | git revert | DET-5, DET-8 | done | 2 |
| S2.T3 | Construir mapa `labelKey` por tab (patron `layoutRestrictions`) y preferirlo en la resolucion del label con cascada `labelKey → object.<Objeto> → tecnico`; excluir dashboards | REQ-03, REQ-04, REQ-06 | developer | S2.T2 | suite/composables/useObjectManager.ts | vitest unit de S2.T4 | git revert | DET-5, DET-8, DET-10, DET-11 | done | 2 |
| S2.T4 | Unit de preferencia (labelKey gana), fallback en cascada (clave inexistente cae a global, no a tecnico), aislamiento por tab y dashboards ignora | REQ-03, REQ-04, REQ-06 | developer | S2.T3 | suite/tests/unit/navTabs.test.ts (o composable) | vitest run verde | git revert | DET-4, DET-7, DET-13 | done | 2 |
| **S2.GATE** | **Gate de sync Session 2 (tier: T2)** — persistir, typecheck + suite de navegacion (16 tests) sin regresion, decidir continue/iterate | — | reviewer | S2.T1, S2.T2, S2.T3, S2.T4 | ticket | gate persistido + typecheck verde + 16 tests sin regresion | (no aplica) | DET-20, DET-23 | done | 2 |

### Session 3 — Verificacion runtime + no regresion + docs [tipo: ⚑ fuerte] [tier: T3]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S3.T1 | Correr sync y `drift:check`; comparar las copias regeneradas de OM (`resolvers/up1/suite/app.resolver.js`, `typeDefs/up1.js`) vs las fuentes; confirmar que el campo viaja y que no hay drift (cierra H3/H7) | REQ-02 | developer | S2.GATE | (sync outputs, no editar a mano) | `npm run sync` + `npm run drift:check` sin drift | re-correr sync desde fuentes limpias | DET-5, DET-11, DET-13 | done | 3 |
| S3.T2 | Declarar `labelKey` en un mod (curriculum-design) y smoke en dos apps del mismo tenant: Curriculum Design muestra los nombres declarados, Engagement sin cambios; navegar a una vista con `labelKey` y confirmar que el breadcrumb hereda el nombre declarado (REQ-07). Evidencia runtime (screenshot de los dos menus + del breadcrumb) | REQ-04, REQ-07 | developer | S3.T1 | mods/curriculum-design/config/app.json (+ lang del mod), screenshots del ticket | smoke runtime con evidencia del menu y del breadcrumb (DET-36) | quitar la labelKey del mod + re-sync | DET-5, DET-13, DET-16 | done | 3 |
| S3.T3 | Cubrir vistas por rol interno (`navByRole`) con test y/o smoke: el campo opera igual que en compartidas (H5); verificar clave inexistente en runtime (H6) | REQ-05, REQ-03 | developer | S3.T1 | suite/tests/unit/ (navByRole), smoke | vitest verde + evidencia runtime del fallback | git revert (test) | DET-5, DET-7, DET-13 | done | 3 |
| S3.T4 | Documentar la capacidad: descripcion del campo en el schema (`up1_suite_app.json`) + doc de plataforma donde los mods la descubran (suite/docs o object-manager/docs de nav PLAT-15) | REQ-01 | developer | S3.T2 | object-manager/objects/up1/suite/up1_suite_app.json, suite/docs/ (o object-manager/docs/) | manual: doc revisada, describe labelKey + cascada + opt-in | git revert | DET-16 | done | 3 |
| **S3.GATE** | **Gate de sync Session 3 (tier: T3)** — persistir, evidencia runtime de los dos menus (no efecto cruzado), sin drift, doc actualizada; decidir cierre | — | reviewer | S3.T1, S3.T2, S3.T3, S3.T4 | ticket | gate persistido + evidencia runtime + sin drift + doc | (no aplica) | DET-20, DET-23, DET-36 | done | 3 |

### Task contract (detalle de las tasks no triviales)

```
Task S1.T1: declarar labelKey en el schema del objeto de app
- source_ref: REQ-01
- agent: developer
- files: object-manager/objects/up1/suite/up1_suite_app.json
- precondition: schema actual leido (defaultObjects.items.oneOf = [string, {dashboards}]; navByRole variante objeto con additionalProperties:false)
- expected_output: defaultObjects acepta {object, layouts?, labelKey?}; navByRole variante objeto acepta labelKey?; ambas con additionalProperties:false; description de defaultObjects actualizada
- validation: validar un app.json de prueba (con labelKey / sin labelKey / con typo) contra el schema
- rollback: git revert
- rules: [DET-1, DET-2, DET-8, DET-16]
```

```
Task S1.T2: preservar labelKey en normalizeTab
- source_ref: REQ-02, REQ-06
- agent: developer
- files: suite/logic/app.resolver.js (funcion normalizeTab, lineas 29-47)
- precondition: normalizeTab reconstruye {kind, object, layouts, dashboards} y descarta labelKey
- expected_output: la variante objeto incluye labelKey (o null); string legado -> labelKey null; dashboards -> labelKey null (no aplica)
- validation: vitest unit (S1.T4)
- rollback: git revert
- rules: [DET-5, DET-8, DET-10, DET-11]
```

```
Task S2.T3: preferir labelKey en la resolucion del label con cascada
- source_ref: REQ-03, REQ-04, REQ-06
- agent: developer
- files: suite/composables/useObjectManager.ts (mapa por tab ~lineas 534-544; resolucion label lineas 625-633)
- precondition: existe el precedente layoutRestrictions (Map keyeado por toNavGroupKey en minusculas); label hoy se resuelve fijo object.<Objeto> con fallback a nombre tecnico
- expected_output: mapa labelKey por tab; al resolver el label del grupo objeto, preferir labelKey si declarada y traduce; cascada a object.<Objeto> y luego tecnico; dashboards excluido (conserva object.Dashboards)
- validation: vitest unit (S2.T4)
- rollback: git revert
- rules: [DET-5, DET-8, DET-10, DET-11]
```

```
Task S3.T2: smoke runtime dos apps mismo tenant (criterio central) + breadcrumb heredado
- source_ref: REQ-04, REQ-07
- agent: developer
- files: mods/curriculum-design/config/app.json (+ lang del mod); screenshots del ticket
- precondition: sync corrido (S3.T1); dos apps que comparten Activity/Offering en el tenant de pruebas
- expected_output: menu de Curriculum Design con nombres declarados; menu de Engagement sin cambios; al navegar a una vista con labelKey, el breadcrumb hereda el nombre declarado (REQ-07); evidencia (captura de ambos menus + del breadcrumb)
- validation: smoke runtime con evidencia del menu y del breadcrumb (DET-36)
- rollback: quitar labelKey del mod + re-sync
- rules: [DET-5, DET-13, DET-16]
```

## Constraints

- **CLAUDE.md up1 (Critical Rules / Sync Mechanism)**: editar solo las **fuentes** en `suite`; nunca las copias sincronizadas de `object-manager` (`src/graphql/resolvers/up1/suite/app.resolver.js`, `src/graphql/typeDefs/up1.js`). El tipo GraphQL en OM es archivo generado — editarlo a mano destruye regeneraciones ajenas. Fuente: `kb/sp9/UPONE-1645-pre-intake.md` (Nota de proceso descubierta en el spike) y `kb/sp9/UPONE-1645-detalle.md` (Guia de ejecucion, [Gate]).
- **CLAUDE.md up1 (i18n Translation Hierarchy)**: el nombre es una clave i18n; cada mod la declara en su propio namespace (`{workspace}/{stem}`, `suite/scripts/lib/i18n-source-map.mjs:5-8`). Esa es la propiedad que evita la colision entre mods (REQ-04).
- **Core Extension Change Type 3** (`up1/docs/guides/core-mod-boundary-workflow.md`): aprobacion de core es gate de **merge**, no de inicio. Commits/branches/PR usan el id `UPONE-1645` (DET-19).
- **Nota de memoria (checkout real)**: el codigo vive en `/Users/edobacon/Workspace/uplanner/up1` (el path `/Workspace/up1/suite` esta vacio — submodulo no checkouteado). La implementacion debe confirmar sobre que checkout trabaja. Fuente: ticket "Context found".

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| Sync pipeline (`npm run sync`) | internal | Regenera las copias de OM desde las fuentes de suite | Si no se corre, las copias quedan stale y el campo no viaja end-to-end (lo que sufrio el spike) |
| Tenant de pruebas con dos apps compartiendo Activity/Offering | internal | Curriculum Design + Engagement en el mismo tenant | Sin ambas apps no se puede probar el criterio central (no efecto cruzado) |
| Equipo de Engagement | internal (coordinacion) | Testigo natural de la no regresion | — |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| El campo se descarta en silencio por olvidar un eslabon (tipo GraphQL o seleccion del cliente) | medium | El sintoma es identico a "no funciona"; diagnostico ciego | Secuencia server-first + introspeccion de la API (S1.T5) antes de tocar el cliente |
| Efecto cruzado entre apps (una pisa el nombre de otra) | low | Rompe el criterio de aceptacion central | Verificacion runtime con dos apps del mismo tenant (S3.T2); la clave vive en el namespace i18n de cada mod |
| Drift tras sync / copias de OM editadas a mano | medium | Regresion silenciosa; destruye regeneraciones ajenas del typeDefs generado | Editar solo fuentes; correr sync + drift:check; no commitear artefactos de sync (S3.T1) |
| `navByRole` no cubierto (solo se probo compartido en el spike) | medium | H5 sin validar; comportamiento distinto por rol interno | Test + smoke de navByRole (S3.T3) |
| labelKey inexistente cae al nombre tecnico (comportamiento pre-fix) | low | UX peor que no declarar | Cascada de fallback (REQ-03) + test de clave inexistente (S2.T4, S3.T3) |

## Open questions

- [ ] **Aceptar tambien texto literal ademas de clave** — a validar por core en el PR. Recomendacion del equipo: solo clave (labelKey). No bloquea la implementacion del camino recomendado. Fuente: `kb/sp9/UPONE-1645-pre-intake.md` (Decisiones abiertas).
- [ ] **Donde vive la doc de la capacidad** para que los mods la descubran — se resuelve en S3.T4 (propuesta: descripcion en el schema + doc de plataforma de nav PLAT-15). No es bloqueante.
- [ ] **Declarar el campo solo en la variante objeto o tambien documentarlo en el tab de dashboards** (donde debe ignorarse) — resuelto en el diseño: se declara en la variante objeto; dashboards no lo lleva (REQ-06). Se deja registrado por si core prefiere documentarlo explicitamente.

> Ninguna open question bloquea el inicio de execute: todas son de forma/documentacion a validar por core en el PR (gate de merge, no de inicio).

## Decisions

### DEC-LOCAL-01: declaracion explicita de `labelKey` en el schema, manteniendo `additionalProperties: false`
- **Contexto**: el eslabon H9 (ticket Triage): el JSON schema del objeto de app va por detras del resolver. `defaultObjects` no declara la variante objeto (solo string y dashboards) y la variante objeto de `navByRole` tiene `additionalProperties: false`. Declarar `labelKey` exige tocar el schema. La sugerencia inicial del orquestador fue "declarar labelKey + abrir additionalProperties".
- **Drivers**: mantenibilidad, contrato estricto que atrape typos, principio "explicito sobre clever" (CLAUDE.md). El sync (`validatePlat15Config`) ya tolera props extra en runtime, pero el JSON schema es un contrato de validacion/documentacion separado.
- **Opcion elegida**: declarar `labelKey?: string` explicitamente en la variante objeto de `defaultObjects` (que ademas hay que crear) y de `navByRole`, **manteniendo `additionalProperties: false`**.
- **Alternativas**: abrir `additionalProperties: true` (sugerencia inicial) — descartada: toleraria props no declaradas en silencio (ej. un typo `labelKy` pasaria sin error), perdiendo el valor del contrato estricto. La declaracion explicita es mas mantenible y auto-documentada.
- **Consecuencias**: gana un schema preciso que sigue atrapando typos; cuesta declarar la variante objeto en `defaultObjects` (que hoy falta) — trabajo menor y de correccion que el DoD ya pedia (hallazgo colateral del pre-intake sobre la description desactualizada).
- **Session**: S1 (design).

### DEC-LOCAL-02: campo = clave de traduccion (`labelKey`), no texto literal
- **Contexto**: como declarar el nombre por app.
- **Drivers**: paridad i18n en 3 idiomas (DoD); no meter texto de UI en configuracion.
- **Opcion elegida**: solo clave (`labelKey`), la que uso el spike.
- **Alternativas**: texto literal (Opcion B del pre-intake) — descartada por no ser traducible; se deja como open question a validar por core.
- **Consecuencias**: traducible y consistente con la cascada i18n; suma un segundo lugar donde vive el nombre de una vista (a documentar, S3.T4).
- **Session**: S1 (design). Fuente: `kb/sp9/UPONE-1645-pre-intake.md` (Decisiones resueltas 2026-08-18).

## Acceptance checkpoints

- [x] **Funcional**: scenarios de REQ-01..REQ-07 pasan (unit TC-01..TC-14, TC-18 + runtime TC-15..TC-17)
- [x] **Tests** (DET-37 dim4): unit de preservacion (server) + preferencia/fallback/aislamiento (cliente) + navByRole, escritos y en VERDE; suite de navegacion sin regresion (66→84); typecheck 0 errores
- [x] **NFRs**: paridad de la clave en los 3 idiomas (es/en/pt) declarada y publicada; es verificada en runtime, en/pt por paridad de catalogo + resolucion deterministica (unit) — runtime en/pt no ejercitado (disclosure); RBAC sin cambios
- [x] **Rules**: fuentes editadas en suite, gemelos de OM regenerados por `sync:logic` (no a mano); pendiente: commits con id UPONE-1645 (al confirmar cierre)
- [x] **Integration**: app sin labelKey identica a hoy (no regresion); dos apps del mismo tenant sin efecto cruzado (evidencia runtime: CD nombres declarados, Engagement sin cambios)
- [x] **Docs oficiales del proyecto** (DET-37 dim1): description del campo en el schema (`up1_suite_app.json`) + seccion de la capacidad en `mods/docs/reference/mod-structure.md`
- [x] **KB DKC** (DET-37 dim2): DEC-LOCAL-01/02 registradas en el spec; learns L1/L2 refinados
- [x] **Docs externas DKC** (DET-37 dim3): N/A — el ticket no toca DKC ni convenciones transversales
- [x] **Sin drift** tras sync (`drift:check -- UPU`: NO ERRORS; 165 warnings preexistentes ajenos)
- [x] **Planning-completeness**: entry registrada (mixed)

## Technical reference

Evidencia por eslabon (checkout real `/Users/edobacon/Workspace/uplanner/up1`), verificada durante design:

- **Eslabon 4 — normalizacion**: `suite/logic/app.resolver.js:29-47` (`normalizeTab` reconstruye `{kind, object, layouts, dashboards}` campo por campo y descarta el resto).
- **Eslabon 5 — tipo GraphQL**: `suite/logic/app.schema.graphql:10-15` (`type NavTab { kind, object, layouts, dashboards }` — sin labelKey).
- **Eslabon 6 — interfaz cliente**: `suite/composables/navTabs.ts:15-20` (`interface NavTab`).
- **Eslabon 7 — query cliente**: `suite/composables/useObjectManager.ts:104-109` (seleccion `navTabs { kind object layouts dashboards }`).
- **Eslabon 8 — resolucion label**: `suite/composables/useObjectManager.ts:625-633` (`translateWithFallback('object.<Objeto>', <objectName tecnico>)`).
- **Precedente del mapa por tab**: `suite/composables/useObjectManager.ts:534-544` (`layoutRestrictions`, `Map<string, Set<string>>` keyeado por `toNavGroupKey(t.object)` en minusculas). El mismo molde para `labelKey`.
- **Helper de key**: `suite/composables/navTabs.ts:91` (`toNavGroupKey`).
- **Schema objeto de app**: `object-manager/objects/up1/suite/up1_suite_app.json:61-106` (`defaultObjects` sin variante objeto; `navByRole` variante objeto con `additionalProperties:false`).
- **Copias regeneradas por sync (no editar a mano)**: `object-manager/src/graphql/resolvers/up1/suite/app.resolver.js`, `object-manager/src/graphql/typeDefs/up1.js`.
- **Red de tests de navegacion**: `suite/tests/unit/navTabs.test.ts` (16 tests, verdes en el spike).

## Rules discovered

{Se llena durante ejecucion.}

## Bugs found

{Se llena si se descubren problemas.}

## Archiving

Cuando deje de ser fuente de verdad: `/dkc-archive-spec SPEC-core-implement-nav-view-label-key "razon"`. No borrar manualmente.
