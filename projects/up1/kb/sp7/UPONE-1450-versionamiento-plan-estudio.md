# UPONE-1450 — Versionamiento de plan de estudio

- **Titulo Jira:** Curriculum Design | Plan de estudio | Versionamiento de plan de estudio
- **Tipo:** Historia · **Epica:** [UPONE-1267](https://u-planner.atlassian.net/browse/UPONE-1267) Curriculum Design
- **Dueno:** Eduardo Bacon · **Prioridad:** Mayor · **Estado:** Backlog
- **Modulo (Jira):** **CORE** · **Sprint:** Migracion uAssessment - SP7 (jul 20-31)
- **SP planning:** 3-5 · **SP Jira:** **8** (subido de 5 el 2026-07-21) · **Alcance SP7:** IN · **Maqueta:** no aplica

---

## Descripcion (literal Jira)

> El versionamiento considera que en la nueva version:
> - Replica datos generales del curriculum (curriculum)
> - Replicar datos especificos del recordType
> - Replica datos de secciones curriculares del plan (curricularSection)
> - Replica la malla del plan (planEntry)
>
> Validar que se sigan manteniendo las restricciones de estado en el cual se crea y desde el
> cual se puede versionar, de acuerdo con lo implementado en
> [UPONE-1381](https://u-planner.atlassian.net/browse/UPONE-1381).

---

## Que es

Habilitar que un plan de estudio se versione **arrastrando todo su contenido**: datos generales
del `curriculum`, datos por recordType, secciones curriculares (`curricularSection`) y la malla
(`planEntry` + sus hijos). No es "habilitar desde cero": es cerrar la pieza que se dejo pendiente
a proposito en SP5.

## Antecedentes / linaje (lo investigado en tickets previos)

- **[UPONE-1270](https://u-planner.atlassian.net/browse/UPONE-1270) "Plan de estudio | Clonar y
  versionar"** (3 SP, mod CurriculumDesign, **Finalizada** SP5, Eduardo). Entrego la **capa mod**:
  clon superficial, version encadenada (`previousVersionId`, `version++`, mantiene `code`, nace en
  Draft), unicidad por linaje en el resolver del create y la UI (versionar lleva al detalle).
  **Comentario de cierre (textual):** *"Diferido a follow-up: el clone profundo del Plan (arrastrar
  la malla planEntry). Motivo: planEntry no esta en SP5, y la investigacion revelo que el clone puro
  no es atomico en core (requiere un cambio en object-manager, no solo cableado en layout). Se
  retoma cuando exista planEntry, usando el objeto real como base."* → **1450 es ese diferido.**
- **Malla ya construida** ([UPONE-1344](https://u-planner.atlassian.net/browse/UPONE-1344) a
  [UPONE-1352](https://u-planner.atlassian.net/browse/UPONE-1352), MC-01..MC-09, Finalizadas):
  `planEntry`, `requirement`, `requirementCategory`, electivos, lineas de formacion. Por eso 1450
  entra ahora: ya existe el grafo real a replicar.
- **Motor de versionado core (base de plataforma, hecho)** — epica
  [UPONE-1206](https://u-planner.atlassian.net/browse/UPONE-1206): `asNewVersion` en `createInstance`
  ([1209](https://u-planner.atlassian.net/browse/UPONE-1209)), config de versioning en el JSON del
  objeto ([1210](https://u-planner.atlassian.net/browse/UPONE-1210)), `getVersionChain`
  ([1211](https://u-planner.atlassian.net/browse/UPONE-1211)), snapshots
  ([1184](https://u-planner.atlassian.net/browse/UPONE-1184)), prereqs
  ([1219](https://u-planner.atlassian.net/browse/UPONE-1219)). **Versiona un objeto, no hace
  deep-clone atomico de un grafo.**
- **Gate de estados = configuracion** ([UPONE-1220](https://u-planner.atlassian.net/browse/UPONE-1220)
  HU-0h): `allowsVersioning` por estado del workflow + FKs `versionInitialStatusId`/
  `scratchInitialStatusId`. El "desde que estados se versiona" ya es config, no hardcode.
- **Adyacente pendiente:** [UPONE-1340](https://u-planner.atlassian.net/browse/UPONE-1340)
  "Gestion de la version actual (current version)" (Tarea, Backlog, sin SP, mod CurriculumDesign).
  **No** esta dentro de 1450.

## Alcance: mod vs core

| Capa | Que | Estado |
|---|---|---|
| **Mod (curriculum-design)** | Versionar el objeto Plan (cadena, code, Draft, unicidad por linaje, UI), datos por recordType, subtipos minor/plan | Casi todo hecho en 1270 |
| **Core (object-manager)** | **Clone profundo atomico** del grafo del plan: `planEntry` + `requirement` + `requirementCategory` + lineas + secciones polimorficas + subtipos, en una sola operacion | **Pendiente = nucleo de 1450** |

**Por que es CORE:** la parte sustantiva es un cambio en el motor de clonacion/versionado de
object-manager (el clone hoy no es atomico sobre el grafo hijo). Lo confirmo la investigacion de
SP5 (1270), no es un supuesto.

## Evidencia del transcript

- Hijos polimorficos + subtipos [00:11:26]: "el plan tiene los hijos directos, los polimorficos,
  que son las secciones, y tambien... los subtipos que viene a ser el minor y el plan, porque
  cuando es plan tiene otros datos aparte."
- Subtipo nuevo sin aplicar [~00:13:30]: el minor "si lo revisamos en Activity no existe, no se ha
  aplicado por lo menos de nuestro lado."
- Que se replica [00:12:49]: datos generales + datos especificos del record.
- Extender el gate [00:11:26]: "esto mas que nada deberia ser extender al resto de las estructuras
  de datos que se incluyeron."
- Estados crudos [00:09:56]: "no tenemos un estado tan largo como en activity... esto lo habiamos
  dejado mas crudo."

---

## Verificacion en codigo (2026-07-21, `uplanner/up1`)

Revision directa del object-manager + mod. **Corrige varias suposiciones previas.**

### Ya existe / ya esta hecho (mas de lo que asumiamos)

1. **El motor de deep-clone EXISTE y es config-driven.** Se dispara con `prefillFrom.deepClone: [...]`,
   corre en **clonar Y versionar**, y para `asNewVersion` es **atomico** (`$transaction` Serializable,
   `instance.resolver.js:3851`). Cubre:
   - Hijos **polimorficos** (`ownerType/ownerId`) + recursivos (orden topologico + remap self-ref) —
     `deep-clone-polymorphic.js`.
   - Hijos **directos** (FK) + recursivos — `deep-clone-direct.js`.
   - **Proyecciones RT de los hijos** (base + `rt__` + `ext`) — `cloneChildProjections` (FINDING-V1).
   - **Remapeo de cross-refs** entre hijos clonados — `applyDerivedRemap` via `polymorphicChildrenDerived`.
2. **Enum de estados de Curriculum COMPLETO** (no "crudo"): Draft/InReview/Approved/Active/Deprecated/
   Archived + transiciones declarativas (motor enum 1381/P4). Y **`versionableFromStates: ["Approved",
   "Active"]` YA configurado** en `Curriculum.json` → el gate "desde que estados se versiona" esta hecho.
3. **El versionado del objeto raiz ya funciona** (`prepareVersionData`: bump, lineage, v2 nace Draft por
   `static_default` + `prefillFrom.exclude: [status,...]`). El fix "versionar sin workflow" (Alt. A del
   doc sp4) esta landeado (ticket-074).
4. **Los hijos ya estan declarados** en `Curriculum.json` metadata: `polymorphicChildren` (sections,
   requirements) + `directChildren` (planEntries, requirementCategories).
5. **Precedente de adopcion:** [1214](https://u-planner.atlassian.net/browse/UPONE-1214) (adopcion de
   versionamiento en Activity) fue **pub 3 → exec 3, 0% de sesgo** — porque reuso el motor. Es el
   comparable correcto de 1450, NO 1219 (que fue construir el motor).

### Lo que FALTA (el trabajo real de 1450)

1. **Cablear `prefillFrom.deepClone`** en `Curriculum.json` con los 4 aliases (sections, requirements,
   planEntries, requirementCategories). Hoy `prefillFrom` **solo tiene `exclude`**. Es config del mod.
2. **GAP — cross-refs entre hijos DIRECTOS no cubiertos → cerrar en CORE.** `applyDerivedRemap` solo
   lee `polymorphicChildrenDerived`. `planEntry.categoryId` → `requirementCategory` (ambos directChildren)
   **no se remapea** → apuntaria al requirementCategory viejo. **No existe `directChildrenDerived`.**
   **Decision (dev, 2026-07-21): generalizar el motor con `directChildrenDerived` en core**, espejo de
   `polymorphicChildrenDerived`. NO hook de mod. Razon: el versionado completo debe ser una **capacidad
   de plataforma disponible para todos los objetos**; un hook de mod seria autocontenido y habria que
   reimplementarlo en cada objeto de estructura similar — exactamente lo que la estrategia de versionado
   (epica 1206) buscaba evitar. Ademas es el mismo movimiento que ya se hizo:
   `polymorphicChildrenDerived` **generalizo al motor** el hook por-modulo HU-8b (CurricularLink). Este
   gap es su equivalente para relaciones directas.
   - `planEntry.activityId` → Activity: NO se clona (catalogo compartido) → se mantiene, correcto.
   - `planEntry.sourceEntryId` (self-FK trazabilidad de clon): decidir si apunta al viejo.
3. **VERIFICAR — proyeccion RT del propio Curriculum base (`rt__Plan__curriculum`).**
   `cloneChildProjections` clona el RT de los HIJOS, no del objeto raiz versionado. Falta confirmar si
   el path de version arrastra los campos RT del plan (progression, totalCredits). El guard
   `AS_NEW_VERSION_NOT_SUPPORTED_FOR_RECORD_TYPE` bloquea `model=rt__`, pero el base con
   `recordType=Plan` va por otro path — verificar el prefill del RT base.
4. Tests + smoke del grafo completo clonado atomicamente.

### Implicancia mod vs core — CORE confirmado

La etiqueta **CORE es correcta**. Aunque el cross-ref *podria* parcharse con un hook de mod, el dev
decidio (2026-07-21) **cerrarlo en core** (`directChildrenDerived`) para que el versionado completo
quede como **capacidad de plataforma para todos los objetos**, no autocontenido en el mod. Un hook de
mod obligaria a reimplementar la logica en cada objeto con grafo similar — en contra de la estrategia
de versionado ya construida (epica 1206) y del precedente `polymorphicChildrenDerived` (que subio el
hook de CurricularLink al motor). Reparto: **core** = generalizar el motor (`directChildrenDerived`) +
verificar/soportar el clone del RT base; **mod** = solo la config (`prefillFrom.deepClone` +
declarar el bloque `directChildrenDerived` en `Curriculum.json`).

### Refuerzo de evidencia (2da pasada, 2026-07-21) — verificado en object-manager

Sobre la 1ra pasada, esta verificacion precisa y **baja el riesgo**:

- **Atomicidad confirmada:** `asNewVersion` corre en `$transaction` Serializable (`instance.resolver.js:3724-3726`).
- **`prefillFrom.deepClone` ya rutea hijos DIRECTOS** (no solo polimorficos): split de aliases +
  `deepCloneDirectChildren` (`instance.resolver.js:3768-3808`). "Cablear" = agregar el array de aliases
  al JSON; el mecanismo ya esta probado.
- **El fix del gap `directChildrenDerived` es un espejo trivial:** `applyDerivedRemap`
  (`helpers/deep-clone-polymorphic.js:108`) es **agnostico poly/direct** — opera sobre `cloneMap` +
  un bloque `{object, via, remapTo}`. La fase DERIVED (`:3810-3829`) hoy solo lo llama con
  `readPolymorphicChildrenDerived` (`:3816`). Falta solo: reader de `directChildrenDerived` + esa
  llamada + declarar el bloque en el JSON. **No es construir motor.**
- **RT base tiene mecanismo (HU-10 / UPONE-1216, `:3106-3129`):** con `prefillFrom.source`, resuelve
  base+RT+ext del source y mergea sus campos (clon de las 3 filas). Reduce el riesgo del gap #3; queda
  confirmar el **end-to-end en runtime** (versionar un Plan arrastra `progression`/`totalCredits` +
  interaccion con el guard `AS_NEW_VERSION_NOT_SUPPORTED_FOR_RECORD_TYPE`).
- **Hallazgo lateral:** hay **dos archivos** `curriculum.json` y `Curriculum.json` en `objects/` (solo
  difieren en case; colisionan en fs case-insensitive) — posible artefacto del PascalCase audit
  (SPEC-013). Aclarar cual es la fuente antes de editar el `deepClone`/`directChildrenDerived`.

**Efecto en el SP:** refuerza **8** (cablear + espejo acotado + RT base con mecanismo). Solo el RT base
end-to-end podria mover a 13 si sorprende en runtime.

## Analisis de esfuerzo

- **SP planning 3-5 → Jira 5 → 8** (subido el 2026-07-21). Va en la direccion correcta.
- **Calibracion DKC (DET-26)** — comparables directos, `published` vs `executed` real:
  | Jira | Que es | pub | exec real | sesgo |
  |---|---|---:|---:|---:|
  | [1270](https://u-planner.atlassian.net/browse/UPONE-1270) | **Plan clonar/versionar (predecesor directo)** | 3 | 12 | **+300%** |
  | [1219](https://u-planner.atlassian.net/browse/UPONE-1219) | Motor de versionado core | 5 | 21 | **+320%** |
  | [1220](https://u-planner.atlassian.net/browse/UPONE-1220) | Modelo para versionar Activity | 3 | 6 | +100% |
  - Subset versionamiento (10 Jiras): **pub 23 → exec 60 = +161%**. Global up1: +100%.
- **CORRECCION tras verificar el codigo:** la calibracion pura (subset versionamiento +161%) mezclaba
  tickets de **construir el motor** (1219: 5→21, 1210: 1→5). Pero el motor **ya existe**; 1450 es
  **adopcion + 2 gaps**, no construccion. El comparable correcto es **[1214](https://u-planner.atlassian.net/browse/UPONE-1214)
  (adopcion en Activity): pub 3 → exec 3, 0% de sesgo**.
- **Veredicto revisado:** **8 es razonable.** Curriculum tiene grafo mayor que Activity (4 colecciones
  hijas, arboles recursivos) + la generalizacion del motor (`directChildrenDerived`) + verificar el RT
  base — por eso 8 y no 3 (Activity). Ya **no** es el "candidato #1 a overrun".
- **La carga real (core):** generalizar `applyDerivedRemap` a `directChildrenDerived` (espejo acotado
  del bloque polimorfico ya existente) + soportar/verificar el clone del RT base + tests del grafo
  completo. Es trabajo core, pero **acotado** (reusa patrones ya construidos).
- **Riesgo → 13** solo si el clone del RT base resulta no trivial (path RT no-atomico, backlog B1 /
  TICKET-056) o si la generalizacion del motor arrastra mas de lo esperado.
- **Recomendacion:** mantener 8, con la generalizacion en core como el corazon del ticket.

## Certezas

- La capa mod (versionar el objeto Plan) ya esta hecha (1270).
- El motor de versionado por objeto existe y es reusable (epica 1206).
- El gate "desde que estados se versiona" ya es configuracion (1220 HU-0h).
- El grafo a replicar ya existe en el modelo (malla MC-01..MC-09).
- El deep-clone del grafo requiere tocar object-manager (confirmado SP5).

## Riesgos

- **Atomicidad no definida**: transaccion unica vs. saga; un clone parcial dejaria un plan
  inconsistente. Principal driver de que 5 quede corto.
- **Subtipo minor no aplicado**: hay que definir su alta y sus datos propios antes de replicarlo.
- **Enum de estados del plan "crudo"**: falta confirmar el enum real y desde/ hacia que estados
  aplica el versionado.
- **Grafo profundo**: requirement (Composite 3 RT) + requirementCategory + lineas + secciones
  polimorficas; cada tipo puede necesitar manejo explicito en el clone.

## Observaciones

- Confirmar que el tag **CORE** es correcto (lo es por el cambio en object-manager); implica
  revision con criterio de "core = tocar con cuidado".
- Decidir si [1340](https://u-planner.atlassian.net/browse/UPONE-1340) (version actual) entra a SP7
  o queda fuera.

## Dudas a resolver (actualizado 2da pasada, 2026-07-21)

- **[SP driver] RT base end-to-end:** confirmar en runtime que versionar un `Curriculum` recordType=Plan
  arrastra `rt__Plan__curriculum` (`progression`, `totalCredits`) via HU-10 + interaccion con el guard
  `AS_NEW_VERSION_NOT_SUPPORTED_FOR_RECORD_TYPE`. **Unico que puede mover 8→13** (requiere servidor
  corriendo; no se resuelve por lectura estatica).
- **`planEntry.sourceEntryId`** al clonar (trazabilidad self-FK): decidir apunta-al-viejo vs
  remap/limpiar.
- **Fuente real `curriculum.json` vs `Curriculum.json`** (case): aclarar antes de editar el
  `deepClone`/`directChildrenDerived`.
- **Alcance de [1340](https://u-planner.atlassian.net/browse/UPONE-1340)** (version actual): dentro o
  fuera de SP7 (hoy fuera).

> **Cerrado en la 2da pasada:** el cross-ref `planEntry→requirementCategory` se cierra **generalizando
> core** (`directChildrenDerived`) — decision del dev, y se verifico que `applyDerivedRemap` es
> agnostico poly/direct → el mirror es trivial (no hook de mod via `_cloneMap`). Atomicidad, mecanismo
> `prefillFrom.deepClone` para hijos directos, y mecanismo del RT base (HU-10): confirmados en codigo.
>
> **Ticket DKC:** [TICKET-111](../../../deckard/projects/up1/tickets/TICKET-111.md) es la fuente
> autoritativa del plan de ejecucion (sessions S1 spike → S2 core → S3 config+tests). Esta ficha es el
> analisis; ambos sincronizados a esta fecha.
