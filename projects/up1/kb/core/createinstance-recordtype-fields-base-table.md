# Crear un Plan (Curriculum) desde la UI falla — los campos del RecordType se envían a la tabla base

> **Para**: curriculum-design (implementación elegida: camino **D-delegar**, mod-only). Seguimiento en core/object-manager: promover el split base→alias en `createInstance` (camino **B**), tras lo cual D se vuelve redundante.
> **De**: curriculum-design (familia UPONE-1268).
> **Fecha**: 2026-06-17.
> **Estado**: **IMPLEMENTADO (2026-06-17, TICKET-070)** — camino **D-delegar**, mod-only, funcionando para Plan y Minor (verificado API end-to-end + 132 unit; confirmación browser a cargo del dev). Ver [Implementación realizada](#implementación-realizada-2026-06-17-ticket-070--upone-1268), que documenta dos refinamientos vs el boceto original (el `customEndpoint` no admite `source: "formData"` whole-object; el form único rompía Minor por mandar los campos Plan-only en `null`). Seguimiento en core/object-manager: promover el split base→alias en `createInstance` (camino **B**), tras lo cual D se vuelve redundante.
> **Tipo**: gap en el path **create** para objetos con RecordType cuyos campos propios viven en la tabla de extensión.

---

## TL;DR

Crear un **Plan de estudios** (objeto `Curriculum`, `recordType = Plan`) desde la UI **falla siempre**. El form envía `objectType = Curriculum` (la tabla base) con un `data` plano que incluye los campos del RecordType Plan (`progression`, `totalCredits`, `totalPeriods`, `periodType`). Esos campos **no son columnas de la tabla base `curriculum`**: viven en la tabla de extensión 1:1 **`rt__Plan__curriculum`**. El resolver arma `prisma.curriculum.create({ data })` con todo, Prisma rechaza con *Unknown argument `progression`*, y al usuario le aparece *«La información proporcionada no es válida. Ubicación: > Progression»*.

**Hallazgo clave**: el backend (object-manager) **ya sabe** separar los campos base/RT/ext y crear las tablas correctamente — pero solo cuando se lo invoca con `objectType = rt__Plan__curriculum`. El bloqueo está en la **capa de layout/front**, que para este formulario envía la base en vez del alias `rt__`. Ver [análisis de causa raíz](#análisis-de-causa-raíz).

---

## Qué sucede

Al guardar el formulario de creación de un Plan, el POST GraphQL `CreateInstance` devuelve `errors` con una invocación de Prisma inválida. El cliente traduce ese error a un modal genérico cuya "Ubicación" apunta a **`Progression`** — el primer campo del RecordType que Prisma no reconoce (usa el `title` del schema, en inglés, no el label i18n del layout).

El problema no es de tipo de dato ni de validación del cliente: el payload se envía al backend y **Prisma lo rechaza** porque los campos del RecordType no existen como columnas en la tabla base.

## Cuándo sucede

- Objeto con **RecordType** cuyos campos propios se generan como **tabla de extensión** `rt__<RT>__<base>` (patrón estándar del codegen: el RecordType NO agrega columnas nullable a la base, crea una tabla 1:1 con FK al base).
- Se crea desde la UI mediante un **layout autorado** que apunta `objectName` a la base y manda en `data` campos de la base + campos del RecordType, enviando `objectType = <base>`.
- Caso confirmado: `Curriculum` con `recordType = Plan` (campos Plan-only `progression`, `totalCredits`, `totalPeriods`, `periodType` en `rt__Plan__curriculum`).
- **Alcance probable**: cualquier objeto con RecordType + campos propios creado por la UI con un layout autorado que apunte a la base. El Minor de Curriculum no declara campos propios, por eso no se ve afectado hoy.

## Cómo reproducir

1. Suite (`:3000`), tenant **UPU**, **rol Admin** (Consultor no puede crear Curriculum).
2. App **Curriculum Design** → pestaña **Planes de Estudio** → listado *Currículos*.
3. **+ Crear registro** → **Tipo = Plan** (aparecen los campos Plan-only por `conditions`).
4. Completar Nombre, Código, Estado, Institución, Tipo de dueño, Dueño (+ Progresión, Créditos, etc.).
5. **Guardar**.

**Resultado actual**:
- Modal: *«La información proporcionada no es válida. Ubicación: > Progression. Por favor, revisa los campos resaltados y corrige los errores.»*
- Red: `POST /graphql` operación `CreateInstance` → HTTP 200 con `errors`:

```
Invalid `prisma.curriculum.create()` invocation:

{
  data: {
    name: "asdf",
    recordType: "Plan",
    code: "111",
    status: "Active",
    ownerType: "AcademicProgram",
    ownerId: "cmqh1zkhd00p9xxgak6xnc51e",
    appearsInDiploma: true,
    externalId: "asdf111",
    progression: "ext",
    ~~~~~~~~~~~                      ← Prisma: Unknown argument `progression`
    totalCredits: "1",
    totalPeriods: "1",
    periodType: "Semester",
    institution: { connect: { id: "cmqh1zbqp0003xxf6a69xyhct" } },
    createdAt: new Date("2026-06-17T13:49:06.280Z"),
    ...
  }
}
```

---

## Análisis de causa raíz

> **El backend NO es el bloqueo.** `createInstance` ya resuelve el caso; el formulario lo invoca mal. La cadena completa, con la evidencia de código:

### 1. Core ya maneja el split base/RT/ext en create

`createInstance` tiene un **"RecordType early-return"** (`instance.resolver.js:2508-2682`) que, cuando el `objectType` es un alias `rt__<RT>__<base>`:

- separa `data` en 4 buckets — base / RT / ext-RT (`ext__<client>__rt__…`) / ext-base (`instance.resolver.js:2567-2588`);
- fija el discriminador `recordType` en la fila base (`:2636-2638`);
- crea la fila base + la fila `rt__Plan__curriculum` con su FK `<base>Id` + las filas `ext__` (`:2640-2668`);
- **castea los tipos** (incl. integer) vía `coerceRtFields(rtFields, rtFieldTypes)` antes de Prisma (`:2656`).

→ Implica que el problema "secundario" de los integers que viajan como string (`"1"`) **también queda resuelto** por este path. No requiere fix aparte.

### 2. Pero ese path está gateado por el nombre del `objectType`

El early-return solo entra si `parseRecordTypeFileName(objectType)` matchea el patrón `rt__<algo>__<algo>` (`instance.resolver.js:2509`; el regex en `fileParsing.js:172-176`). Con `objectType = Curriculum` devuelve `null` → se salta el split → cae en el `prisma.curriculum.create()` plano (`:2640` del path base) → Prisma corta en el primer argumento desconocido (`progression`).

> `updateInstance` usa el **mismo gate** (`instance.resolver.js:~3404` con `parseRecordTypeFileName`). El edit funciona porque, sobre un registro ya tipado, el front envía el alias `rt__`; el create es el que manda la base.

### 3. El front YA sabe enviar el alias — vía un wizard RT-aware nativo

Existe un camino que funciona out-of-the-box para objetos con RecordTypes y **sin** layout explícito:

- `useRowActionHandler.ts:321-339` detecta RecordTypes con `getRecordTypes(...)` y arma un `layoutConfig` con `recordTypeField` cuyo dropdown lleva como **value el nombre completo del RT** (`rt__Plan__curriculum`), no el discriminador — `useRecordTypeResolver.ts:92-119` (`value: rt.name`).
- `RecordDetail.vue` reconoce `layoutConfig.recordTypeField` (`:369`), y al seleccionar el RT setea `effectiveObjectName = <rt__…>` (`:1343-1344`), que se usa como `objectType` en el submit (`submissionObjectName`, `:371` y `:3819`).

### 4. Curriculum NO usa ese wizard — tiene un layout autorado que apunta a la base

`mods/curriculum-design/config/layouts/default_Curriculum_create.json`:

- fija `objectName: "Curriculum"` (la base);
- declara `recordType` como `select` con `native: true` → sus valores son los discriminadores `"Plan"`/`"Minor"`, **no** nombres `rt__`;
- **no** declara `recordTypeField` en `layoutConfig`;
- declara los campos Plan-only con `conditions: [["recordType","==","Plan"]]` en el mismo `schema` que la base.

Como hay `layoutId` explícito, el wizard RT-aware nativo se **bypassa** (`useRowActionHandler.ts:321`, `if (!layoutId …)`), el modo RT-aware de RecordDetail nunca se activa, `effectiveObjectName` queda `null`, y el submit usa `objectName = Curriculum`. Resultado: el payload de la sección [Cómo reproducir](#cómo-reproducir).

### 5. Por qué NO basta un fix de config en el mod

La opción aparente —agregar `recordTypeField: "recordType"` al layout y cambiar el dropdown a valores `rt__`— **rompe el formulario custom**. Al activarse RT-aware, `handleRecordTypeSelected` **reconstruye el schema desde cero** (`RecordDetail.vue:1383-1392`): conserva solo el selector de RecordType y **regenera el resto de los campos desde las field-definitions** (`buildFormFromFields`), descartando la config autorada por el mod. En particular se pierde:

- el `autoPopulate` del picker de **Dueño** (`ownerId` → composable `useOwnerIdOptions`),
- las columnas (`columns.container`) y labels i18n,
- los `conditions`.

→ Hoy **no es expresable** un layout autorado que a la vez (a) conserve schema custom y (b) envíe al alias `rt__`. Esa es la verdadera falta.

### 6. La diferencia exacta con los casos que SÍ funcionan (UPONE-1035)

Lo que distingue un caso que funciona (las 6 secciones) de Curriculum/Plan es **una sola cosa: el `objectName` del layout de create** — y, en consecuencia, el `objectType` que viaja en el submit. Comparación literal de los dos layouts:

| | Sección que funciona (`default_rt__Modality__curricularsection_create.json`) | Curriculum/Plan que falla (`default_Curriculum_create.json`) |
|---|---|---|
| `objectName` | **`rt__Modality__curricularsection`** (el alias) | **`Curriculum`** (la base) |
| campo `recordType` en el schema | **no existe** (el tipo es implícito: el layout *es* el tipo) | **sí**, `select native:true` con valores `"Plan"`/`"Minor"` (discriminador) |
| `recordTypeField` en `layoutConfig` | no | no |
| campos del RT en el schema | sí, mezclados (deliveryMode, theoryHours…) | sí, mezclados (progression, totalCredits…) |
| `objectType` que viaja al submit | **`rt__Modality__curricularsection`** | **`Curriculum`** |
| en core | `parseRecordTypeFileName` matchea → **RT early-return** → split base/rt/ext | no matchea → `prisma.curriculum.create()` plano → **Prisma rechaza `progression`** |

**Qué lo rompe, en una frase**: el layout de Curriculum apunta `objectName` a la **base** en vez de al **alias**, así que el submit lleva `objectType = Curriculum` y core nunca entra al split. Los layouts de 1035 apuntan al alias, por eso entran al split y funcionan. Los campos del RT mezclados en el schema **no** son el problema (ambos los mezclan) — el problema es a qué `objectType` se envían.

**Por qué pudieron evitarlo en 1035 y acá no (la causa de fondo)**: 1035 eligió **un layout de create por RT** (el tipo se conoce antes de abrir el form → cada layout fija su alias y no necesita selector de tipo). Curriculum eligió **un único form con selector de tipo adentro** — y ahí cayó en la trampa: metió un campo `recordType` que *parece* enrutar por tipo, pero es un `native:true` cosmético que solo dispara los `conditions` (muestra/oculta campos); **no** es el `recordTypeField` que cambiaría el `objectType` al alias. Resultado: un selector de tipo que conmuta campos pero deja el submit apuntando a la base. El front no tiene hoy un modo que combine "form con selector de tipo" + "schema autorado custom" + "ruteo al alias" — `recordTypeField` rutea al alias pero regenera el schema (pierde el picker); el layout-alias conserva el schema pero no conmuta tipo. Curriculum no usó ninguno de los dos correctamente: usó un layout-base con un toggle cosmético.

---

## Casos similares y cómo se resolvieron

> Inventario de objetos con RecordType **que declaran campos propios** (los únicos que pueden gatillar este bug) y cómo está cableada su creación. El hallazgo central: **el patrón correcto ya existe y está probado en el propio curriculum-design** — Curriculum/Plan es la única excepción que no lo adoptó.

| Objeto / RT (con campos propios) | Mod | Cómo se crea | Estado |
|---|---|---|---|
| **CurricularSection** × 6 (Bibliography, Content, CustomSection, EvaluationComponent, LearningOutcome, Modality, Session) | curriculum-design | Layout de create **dedicado por RT** `default_rt__<RT>__curricularsection_create.json` con `objectName = rt__<RT>__curricularsection` (el **alias**). | ✅ **Resuelto**. Apuntar al alias entra al RT early-return de core → split correcto. Introducidos a propósito en **UPONE-1035** ("layouts create de los 6 RTs", commit `612603f`). EvaluationComponent no tiene layout suelto: se crea desde el árbol de secciones (`buildPayloads`). |
| **Curriculum / Plan** (progression, totalCredits, totalPeriods, periodType, rotationConfig) | curriculum-design | Layout único `default_Curriculum_create.json` con `objectName = Curriculum` (**base**) + dropdown `recordType` + `conditions`. | ❌ **Este bug**. Construido después, en **UPONE-1268** (commit `a3292b4`), sin reusar el patrón de alias de UPONE-1035. Minor es inmune (sin campos propios). El fix del picker (`db5ef19`) no tocó esto. |
| **OrgUnit** RTs (Campus, Faculty, SupportCenter), **InstructorAffiliation** RTs (Departmental, Institutional), **Availability** RTs | uengagement-up1 | Layouts apuntan a la **base** pero el create **solo expone campos base + el discriminador** `recordType`; los campos del RT (address, city, capacity, serviceScope, contactEmail, acronym…) NO están en el create. | ⚠️ **Evitado por diseño**. Esquiva el error de Prisma a costa de no capturar los campos del RT al crear (se completan en edit). |
| **Activity / Service** (serviceType, activityTypeId, operationalStatus) | uengagement-up1 | `engagement_Activity_service_create.json` (`objectName = Activity`, `recordType` hidden) **sí incluye `activityTypeId`**, que es un campo de `rt__Service__Activity`, no de la base. | ⚠️ **Posible caso latente**. Candidato al mismo fallo. Debe verificarse si `activityTypeId` es columna base en el Activity efectivo (Activity está colisionado entre mods) o si hay un resolver custom; el form omite `serviceType` (required del RT), señal de que la creación de Service quizá va por otra vía. **Reportar a uengagement** (fuera del scope de UPONE-1268). |
| rt__Course__activity, rt__Minor__curriculum | — | Sin campos propios (discriminador puro). | ✅ Inmunes por construcción. |

**Por qué CurricularSection pudo usar 1 layout por RT y Curriculum no (aparentemente)**: las secciones se crean desde listas embebidas, donde cada entry point ya conoce el RT → un layout por RT es natural. Curriculum tiene un único "+ Crear" con dropdown de tipo, así que se intentó resolver en un solo form sobre la base — y ahí entró el bug.

## Requisito de diseño: los RecordTypes de Curriculum crecerán

Plan/Minor son el inicio; se sumarán más tipos con el tiempo. Eso es un **driver de decisión**: la solución debe escalar sin tocar config por cada tipo nuevo. Impacta el ranking de los caminos:

- **Entrada de creación por-tipo con botones fijos** (`modalActionButtons`) **no escala**: están **capados a 3** (`RecordList.vue:2935`) y hay que declarar uno por tipo a mano.
- **Modal en 2 pasos** (elegir tipo → form del tipo) **sí escala solo**: el dropdown del paso 1 se puebla con `getRecordTypes(baseObject)` (`useRecordTypeResolver.ts:56`), que consulta `getObjectDefinitions(baseObject: Curriculum)` → **cada RT nuevo aparece automáticamente, sin cambiar ningún layout**. Es el "RT-aware wizard" nativo del front. El submit ya va al alias `rt__…` (el value del dropdown es el nombre completo del RT).
- El wizard nativo **hoy** regenera el form en el paso 2 (`RecordDetail.vue:1383`) y **pierde el picker de Dueño** (su `autoPopulate`/`useOwnerIdOptions` vive en el layout, no en la field-definition — `useOwnerIdOptions.ts:12`). Para tener 2-pasos + auto-escalado **+** picker hay que hacer que el paso 2 **mergee** los campos del RT sobre el schema autorado en vez de regenerarlo.

→ Con el requisito de crecimiento, el camino correcto es **A**.

## Qué necesitamos — tres caminos

| | Camino | Escala con nuevos tipos | Dónde | Costo / riesgo |
|---|--------|---|-------|----------------|
| **A** (recomendado dado el crecimiento) | **Modal en 2 pasos que preserva el schema autorado**: el RT-aware wizard ya da paso 1 (dropdown dinámico) + paso 2 (campos del RT) + submit al alias. El fix es que `handleRecordTypeSelected` **mergee** los campos del RT sobre `layoutConfig.schema` autorado en vez de reconstruirlo (`RecordDetail.vue:1383-1392`: de `{ selector, ...buildFormFromFields(rtFields) }` a `{ ...schemaAutorado, ...rtFields }`). Preserva el picker, columnas y labels. | ✅ Sí — dropdown poblado por `getRecordTypes`, cero config por tipo | repo **`layout`** (una función) | Acotado a `handleRecordTypeSelected`. Reusa el split de core. **Beneficia a todo objeto con RecordType + layout custom**, no solo Curriculum. No es mod-only. |
| **C** | Layout de create por RT con `objectName = rt__…` (`canCreateObjectName` + `canCreateLayoutId`), patrón probado de las 6 secciones. Mod-only. | ❌ No — `canCreateObjectName` es un valor único; con botones (`modalActionButtons`) hay tope de 3 y declaración manual por tipo | repo **`mod`** únicamente | Mínimo, cero cambios en front/core, pero **no escala**. Útil como destrabe táctico para Plan ya, no como solución de la familia. |
| **B** | `createInstance` deriva el alias desde `objectType = <base>` + `data.recordType`. El mod no toca nada. | ✅ Sí (a nivel datos) | repo **`object-manager`** | Cambia el path base para **todos** los objetos con RecordType; mayor blast radius en core. No resuelve por sí solo el picker en el form de 2 pasos. |
| **D** (mod-only, conserva el form único) | **Mutation custom del mod + form genérico ruteado a ella** vía `customEndpoint`. El mod agrega `logic/curriculum-create.schema.graphql` (`createCurriculumWithRecordType(data: JSON!)`) + `.resolver.js`, y `default_Curriculum_create.json` declara `customEndpoint: { mutation, variables }`. El form genérico (RecordDetail) renderiza el schema autorado y submitea a la mutation del mod en vez de `createInstance` (`RecordDetail.vue:3661`). Patrón probado: `createSyllabusOffering` (UPONE-1269). | ✅ Sí si la mutation toma `data: JSON` (sin mapear campo por campo); el resolver lee `recordType` y splitea genérico | repo **`mod`** únicamente | **Conserva el form único con dropdown + el picker**, cero cambios en front/core. Pero: es una mutation a medida para un gap **genérico**; cada objeto futuro con RT repetiría la suya. El resolver debe **delegar** en `createInstance(alias)` (reusa split/validación/eventos/audit — `instance.resolver.js:3826/5258`), NO reimplementar el split (duplicaría lógica de core → divergencia). D-delegar es, de hecho, la lógica de B viviendo en el mod. |

**Recomendación** — es una decisión **táctico-local vs estructural-plataforma**:

- Si el objetivo es **no acumular deuda** y que el próximo objeto-con-RT no repita el bug: camino **A**. Entrega las tres cosas a la vez (2 pasos, auto-escalado, picker preservado) y arregla el gap **una vez para todos** los objetos con RecordType + layout custom. B es la variante en core (centraliza el split en el resolver) con mayor blast radius.
- Si el objetivo es **desbloquear Curriculum ya, sin depender de los equipos de front/core**: camino **D** (mod-only). Conserva el form único con dropdown y el picker, y es un patrón probado en el mod (`createSyllabusOffering`). Su resolver debe **delegar** en `createInstance(alias)` (no reimplementar el split). El costo: es una mutation a medida para un gap genérico — cada objeto futuro con RT necesitaría la suya.

El requisito de que los tipos crezcan **descarta C** (botones capados a 3, manual por tipo) y descarta el wizard nativo tal cual (pierde el picker). C queda solo como destrabe puntual de Plan si ni A ni D están disponibles. D y B comparten la misma idea (derivar el alias); difieren solo en el repo donde vive.

### Decisión (2026-06-17): camino D-delegar

Se va por **D-delegar**: mutation custom del mod (`createCurriculumWithRecordType(data: JSON!)`) que **arma el alias `rt__<recordType>__curriculum` y delega en el `createInstance` de core**, con el form genérico ruteado vía `customEndpoint`. Motivo: desbloquea Curriculum **sin depender** de los equipos de front/core, conserva el form único con dropdown + el picker, y reusa toda la lógica de core (split/validación/eventos/audit) al delegar.

**Disciplina obligatoria del resolver** (lo que mantiene válida la decisión):
- **Delegar, no reimplementar** el split. El resolver es un *adapter delgado*: normaliza el `data` del form, deriva el alias, y llama a `createInstance(alias, data)`. Nada de `prisma.create` propios.
- **Cero lógica de negocio en la mutation**. Cualquier default/validación/derivación de Curriculum debe vivir donde TODOS los clientes pasan (el path `createInstance(alias)` de core o un hook de mod sobre él), no en la mutation UI-only — de lo contrario diverge de los demás clientes (ver observación MCP).

> **Observación — por qué el core (camino B) sería lo mejor, y qué deuda asumimos al ir por D**
>
> D resuelve **el síntoma en Curriculum**; el problema real es **genérico de la plataforma**: `createInstance(objectType: <base>, data con recordType)` debería splittear hacia `rt__<RT>__<base>` para *cualquier* objeto con RecordType + campos propios. Arreglarlo en core (B) es superior porque:
> 1. **Lo arregla una vez para todos.** Hoy ya hay casos latentes con la misma forma (ej. `Activity/Service` en uengagement mete `activityTypeId` del RT en un layout a la base — ver [Casos similares](#casos-similares-y-cómo-se-resolvieron)). Con D, cada objeto futuro con RT necesitaría su propia mutation a medida; con B, ninguno.
> 2. **Uniformidad entre clientes (MCP/REST/n8n/UI).** El split en `createInstance` aplica sin importar quién llame ni si manda el base o el alias. Con D, el fix vive en una mutation que **solo la UI usa**; el MCP queda obligado a seguir usando el alias por su cuenta (hoy lo hace vía `typedRecordName`, [sections.ts:15](../../../mcp/src/mods/curriculum-design/sections.ts)), y si la mutation del mod acumulara lógica, los Planes creados por UI y por MCP **divergirían**. B elimina esa clase de divergencia de raíz.
> 3. **Sin mutation bespoke por objeto ni acoplamiento.** D-delegar acopla el mod a un internal de core (`createInstance`) y agrega superficie de API (`createCurriculumWithRecordType`) para algo que debería ser comportamiento por defecto del resolver genérico.
>
> **Deuda asumida con D**: una mutation a medida por objeto-con-RT, un acoplamiento mod→core, y la responsabilidad de mantener el resolver *thin* para no divergir de los otros clientes. Recomendación de seguimiento: abrir un ítem en core para promover el split base→alias dentro de `createInstance` (camino B); cuando exista, las mutations D-delegar se vuelven redundantes y se pueden retirar.

> Nota: no existe variante **mod-only** que dé 2-pasos + escalado + picker. La preservación del schema autorado en el paso 2 depende de la lógica de merge en el front (A). Verificado: el picker polimórfico es layout-bound y `buildFormFromFields` no lo reconstruye desde la field-definition.

## Implementación realizada (2026-06-17, TICKET-070 / UPONE-1268)

Se implementó el camino **D-delegar**, mod-only en `curriculum-design`. Lo construido difiere en dos puntos del boceto de la sección [Qué necesitamos](#qué-necesitamos--tres-caminos) — ambos por límites reales descubiertos al implementar y verificar en vivo. Estado: **fix funcionando para Plan y Minor**, verificado end-to-end contra object-manager `:4000` (GraphQL autenticado) + 132 unit del mod; confirmación final en browser a cargo del dev.

### Artefactos (3 piezas, todas en el mod)

1. **`logic/curriculum-create.schema.graphql`** — `extend type Mutation { createCurriculumWithRecordType(data: JSON!): Curriculum! }`.
2. **`logic/curriculum-create.resolver.js`** — *adapter delgado* (`export const curriculumCreateMutation`): carga el `instanceMutation` de core vía **dynamic import dual-path** (mismo helper `loadGenericInstanceMutation` que `sectionValidation.resolver.js:51-67` / `polymorphicUpdate.resolver.js`), arma el alias `rt__<recordType>__curriculum` y **delega** en `createInstance(alias)`. Cero `prisma.create` propios, cero lógica de negocio.
3. **`config/layouts/default_Curriculum_create.json`** — bloque `customEndpoint` que rutea el form a la mutation del mod.

### Lógica del adapter (qué normaliza antes de delegar)

El resolver hace solo **traducción de contrato**, no reimplementa el split:

- **Arma el alias** desde `data.recordType` → `rt__<recordType>__curriculum`.
- **Stripea el discriminador `recordType`** del payload delegado: el alias ya codifica el tipo y core fija el discriminador en el path de alias (`instance.resolver.js:~2636`). Es como crean las 6 CurricularSection (sus forms tampoco mandan `recordType` en `data`).
- **Stripea los campos vacíos** (`null`/`undefined`/`''`; conserva `false`/`0`) — ver refinamiento 2 abajo.
- **Reshapa el retorno**: `createInstance` devuelve `InstanceResult { id, data, extended }` (no un `Curriculum` plano); el adapter aplana a `{ id, ...data }` para que el `customEndpoint` resuelva `responseFields: ["id","name"]`.

### Refinamiento 1 — el `customEndpoint` NO puede usar `data: { source: "formData" }` (objeto completo)

El boceto de D proponía pasar el form entero como un solo `data: JSON!` con `source: "formData"`. **El engine de layout no lo soporta**: el resolver de variables de `RecordDetail.vue:3697-3705` solo matchea `source: "formData.<campo>"` (campo único) e `instanceId`; cualquier otro string cae al `else` y se envía **literal** (mandaría la cadena `"formData"`). El camino mod-only real que sí existe en el engine es **`inputVariable: "data"` + `inputVariableType: "JSON!"`** (patrón de `object-manager-editor/config/layouts/serviceaccount-create.json:30-31`) **+ enumerar cada campo del form** en `variables` con `source: "formData.<campo>"`. El engine empaqueta los campos mapeados en un único objeto y emite `mutation($data: JSON!){ createCurriculumWithRecordType(data: $data){ id name } }` (`RecordDetail.vue:3734-3737`).

**Consecuencia de escalado**: la generalidad sobre **recordType** se conserva (el resolver es genérico; un tipo nuevo no toca el resolver). Pero un **campo** nuevo exige una línea en `variables` del layout (simétrico al `schema` del form, que ya enumera cada campo). Es un argumento adicional a favor de **camino B**: si el split base→alias viviera en `createInstance`, el form podría volver a submitear a `createInstance(base)` sin enumerar nada.

### Refinamiento 2 — el form único manda los campos de TODOS los tipos → rompía Minor

El boceto asumía que Minor (sin campos propios) era inmune. **No lo es** con el form único: al elegir Minor, los campos Plan-only (`progression`, `totalCredits`, `totalPeriods`, `periodType`), aunque ocultos por `conditions`, **se envían igual en el submit como `null`**. El RT early-return de core, al no reconocerlos en `rt__Minor__curriculum`, los **rutea a la tabla base** → reaparece `prisma.curriculum.create()` con `Unknown argument progression` — el **mismo bug, ahora en Minor**. Fix: el adapter **dropea los campos vacíos antes de delegar** (en un CREATE, vacío = "no provisto"). Es genérico (no RT-aware) y thin.

> Esto refuerza el punto de fondo: **camino B** (que `createInstance` ignore/dropee campos no pertenecientes a la extensión del tipo, en vez de rutearlos a la base) resolvería de raíz tanto el caso de campos vacíos como cualquier campo cruzado entre tipos, para todos los clientes.

### Gotcha de sync (object-manager no booteaba)

Las descripciones GraphQL (`"""..."""` / `"..."`) en un `*.schema.graphql` de mod **no pueden contener backticks**: `scripts/sync.js` embebe el contenido del schema dentro de un **template literal JS** (delimitado por backticks) en `object-manager/src/graphql/typeDefs/mods.js`; un backtick en la descripción cierra el template literal antes de tiempo → `SyntaxError` y object-manager crashea al rebootear (nodemon). Detección: `node --check object-manager/src/graphql/typeDefs/mods.js` tras el sync. (Candidato a validación pre-sync de schemas de mod.)

### Verificación

- **Unit** (mod, vitest): 132/132 verde, incluye el adapter (`buildAliasObjectType`, `reshapeInstanceResult`, `dropEmptyFields`, delegación con strip de `recordType`, regresión Minor con Plan-only=null).
- **API end-to-end** (`createCurriculumWithRecordType` vs OM `:4000`, auth dev, tenant UPU): Plan con campos reales → crea base + `rt__Plan__curriculum` con `totalCredits`/`totalPeriods` como **integer** (vía `coerceRtFields`); Minor con Plan-only=null → crea OK; `createInstance(rt__Plan__curriculum)` directo (path MCP/programático) → sin regresión.
- **Browser**: el dev confirma el create de Plan y Minor desde la suite.

### Reversibilidad

Reversible por config + revert de 3 archivos del mod: quitar el bloque `customEndpoint` del layout (el form vuelve a `createInstance` base) y remover el `.resolver.js`/`.schema.graphql`. Sin migración ni cambio de datos. **Cuando aterrice camino B en core, esta mutation D-delegar se vuelve redundante y se retira** (el form vuelve a submitear a la base).

### Commits (repo `mods/curriculum-design`, rama `UPONE-1261-academic-program`)

- `873af6f` — fix: crear Curriculum tipado desde UI delegando en `createInstance(alias)` + `customEndpoint`.
- `4e6ce0a` — test: unit del adapter.
- `7b33748` — fix: stripear campos vacíos (Minor enviaba Plan-only `null` → base rejection).

## Referencias

- **object-manager** — `src/graphql/resolvers/instance.resolver.js`: early-return RT en create (`:2508-2682`), gate `parseRecordTypeFileName` (`:2509`), `coerceRtFields` (`:2656`); `src/services/fileParsing.js:172-176` (regex `rt__…`).
- **layout (front)** — `src/composables/useRowActionHandler.ts:321-339` (auto-wizard RT), `src/composables/useRecordTypeResolver.ts:92-119` (`buildRecordTypeLayoutConfig`, value = `rt__`), `src/layouts/RecordDetail.vue` (`recordTypeField` `:369`, `effectiveObjectName` `:1343`, rebuild del schema `:1383`, submit `:3819`).
- **mod curriculum-design** — `objects/RecordTypes/rt__Plan__curriculum.json` (campos Plan-only, `baseObject: Curriculum`), `config/layouts/default_Curriculum_create.json` (`objectName: Curriculum`, sin `recordTypeField`).
- `core/SPEC-object-manager-hu1-prefillfrom-createinstance.md`.
- Patrón: los RecordTypes generan tablas de extensión 1:1 (no columnas en la base).
