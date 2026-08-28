---
id: DOC-kb-sp8-BUG-core-getvalidtransitions-rt-keying
project: up1
type: doc
---

# BUG core — la maquina de estados (`getValidTransitions`) no soporta RecordTypes

> **RESUELTO por UPONE-1566 (Listo) — este doc quedo STALE.** El bug descrito aca (los resolvers `getValidTransitions` / `previewBulkTransition` leen con `findUnique({ where: { id } })` sobre un alias RT) ya fue corregido en `develop`: hoy leen via `loadTransitionRecords` (`objectDefinition.resolver.js:280-315`), que resuelve el alias por la relacion a la base (`where: { [baseObjectLower]: { id: { in: ids } } }`) y aplana el registro. Fix `33b54103` (Reland UPONE-1566), mergeado 2026-08-10, ancestro de HEAD. **Este doc se escribio el 2026-08-11, un dia despues del merge, o sea nacio stale** (reflejaba el codigo previo). Cobertura viva: `tests/unit/resolvers/objectDefinition.transitions.rt.test.js` (30/30 verde). Verificado durante el intake de TICKET-131, que se descarto por esto (DET-32 drop, superseded por UPONE-1566) y NO se ejecuto; UPONE-1608 quedo con solo el Caso A (previews de borrado, TICKET-129). El texto de abajo se conserva como registro historico del analisis, no como bug abierto.

> **Contexto**: UPONE-1537 (vista de metadata de matrices de competencia). El dev reporta:
> *"el estado (con su maquina) al partir del RT esta fallando; si parto del objeto funciona pero se pierden el resto de los datos"* y *"me esta dando un problema la maquina de estado al partir del elemento del rt__"*.
>
> **Veredicto**: fallo de **core** (object-manager), no del mod. El mod modela bien. Dos resolvers de la maquina de estados quedaron sin el tratamiento RecordType que el resto del `instance.resolver` ya tiene.

---

## 1. Que se intenta hacer

Armar la vista de edicion/detalle de una **matriz de competencias** (layout `default_CompetencyNode_edit`, `layoutType: RecordDetail`). El form muestra: codigo, nombre, tipo de matriz, esquema de nivel, politica de modelo de rubrica, modo de evaluacion, politica/modo de agregacion, descripcion y **Estado** con su maquina de ciclo de vida.

Una matriz **no es un objeto propio**: es un **RecordType de `CompetencyNode`**, el `rt__Matrix__competencynode`.

- `objects/RecordTypes/rt__Matrix__competencynode.json` (mod `curriculum-mapping`) define la metadata de matriz **y** el campo `status` con sus `transitions`:
  - metadata: `levelSchemeId`, `matrixType`, `rubricModelPolicy`, `aggregationMode`
  - `status` enum: `Draft → InReview → Approved → Active → Deprecated → Archived` (con `requiredCapabilities` y `requiresComment` por transicion)
- `objects/CompetencyNode.json` (base) solo tiene: `recordType`, `name`, `code`, `description`, `position`, `externalId`, `metadata`, `parentId`. **No tiene `status` ni la metadata de matriz.**

O sea: **toda la data de la matriz (metadata + estado + su maquina) vive en el RT, no en el base.**

---

## 2. Por que sucede

El RecordType `rt__Matrix__competencynode` **no se keyea por `id`**. Su PK es `<base>Id`, en este caso **`competencynodeId`** (FK scalar al `CompetencyNode` base). Es la convencion RT de up1 (ver `CLAUDE.md` → "RecordType (RT) Conventions": *RT models use `rt__<base>` naming; FK fields on RT models: scalar IDs*).

El resolver de la maquina de estados fue escrito asumiendo que **todo modelo tiene columna `id`**. Al apuntar el layout al RT:

```
Invalid prisma.rt_Matrix__competencynode.findUnique() invocation
Unknown argument 'id'. Did you mean 'OR'?
Available: competencynodeId, AND, OR, NOT, levelSchemeId, matrixType,
           rubricModelPolicy, defaultEvaluationMode, defaultRubricModel,
           aggregationPolicy, aggregationMode, competencynode, levelscheme,
           ext__uplanner__rt_matrix__competencynode
path: getValidTransitions
extensions.code: INTERNAL_SERVER_ERROR
```

Prisma rechaza el `where: { id }` porque el where input del RT no expone `id`; su unica es `competencynodeId`.

### El trade-off que observo el dev (por que "un lado si, otro no")

| Layout apunta a... | Metadata + estado | Maquina de estados (`getValidTransitions`) |
|---|---|---|
| `rt__Matrix__competencynode` (RT) | **carga OK** (todo vive aca) | **CRASHEA** — `findUnique({ where: { id } })` sobre PK `competencynodeId` |
| `CompetencyNode` (base) | **se pierde** (metadata y `status` son columnas del RT, no del base) | no revienta (el base si tiene `id`), pero opera sobre un registro que no tiene los datos |

Por eso "se pierden el resto de los datos" al partir del objeto base: no es que la maquina funcione bien, es que el `findUnique` por `id` no crashea; pero el registro base carece de metadata y del propio `status`.

---

## 3. Donde sucede

Repo `object-manager` (core). Archivo:

`src/graphql/resolvers/objectDefinition.resolver.js`

- **`getValidTransitions`** (`~L645`), lectura del registro en **L668**:
  ```js
  const rawRecord = await prisma[modelName].findUnique({
    where: { id: coerceId(recordId) },   // ← asume PK `id`; el RT usa `competencynodeId`
    ...(hasExtendedModel ? { include: { [extendedModelName]: true } } : {}),
  });
  ```
- **`previewBulkTransition`** (`~L726`), **mismo defecto** en **L743** (transicion masiva):
  ```js
  const rawRecords = await prisma[modelName].findMany({
    where: { id: { in: recordIds.map(coerceId) } },  // ← mismo problema con RTs
    ...
  });
  ```

`resolveModelName(objectName)` (L45) solo hace `charAt(0).toLowerCase()`, no distingue RT. En este archivo **ya existe** el parser `parseRecordTypeParentName(objectName)` (L52) que reconoce `rt__<Nombre>__<baseLower>` y expone el base — pero ninguno de los dos resolvers de transiciones lo usa para construir el `where`.

### Core ya sabe hacerlo (patron a reusar)

`src/graphql/resolvers/instance.resolver.js` ya trata los RT correctamente:

- Deteccion canonica (L1575-1577):
  ```js
  const rtMatch = tableName.match(/^rt__(.+)__(.+)$/);
  const isRecordType = !!rtMatch;
  const rtBaseObjectLower = isRecordType ? rtMatch[2] : null;
  ```
- Comentario explicito (L2153): *"RecordType models use `{baseObject}Id` as PK instead of `id`."*
- Lectura por PK RT (L4551):
  ```js
  await prisma[modelName].findUnique({ where: { [`${baseObjectLower}Id`]: idValue } });
  ```

La maquina de estados quedo fuera de ese tratamiento.

---

## 4. Que se necesita

Que `getValidTransitions` y `previewBulkTransition` sean **RT-aware**: detectar si `objectName` es un RecordType y, en ese caso, keyear por `<baseLower>Id` en vez de `id`, reusando el parser que ya existe en el mismo archivo. El resto de la logica (include de la extension `ext__<client>__<rtModel>`, `flattenExtRecord`, el guard de transiciones) queda igual — solo cambia la construccion del `where`.

Notas de correctitud:
- La PK de estos RT es **string tipo cuid** (ej. `cmsj5vc3m00uytoc4iaexem1m`). `coerceId` ya lo respeta (`Number(cuid)` es `NaN` → devuelve el string), asi que sirve tanto para RT (string) como para bases con `id` numerico.
- El `include` de la extension ya funciona en el error (`ext__uplanner__rt_matrix__competencynode: true`); el unico punto roto es el `where`.
- El campo gobernado (`status`) vive en el propio RT, asi que el `findUnique` sobre el RT trae el valor actual sin joins extra.

---

## 5. Posibles fixes

### Opcion A — Fix local en los dos resolvers (recomendada)

Construir el `where` segun si el objeto es RT, reusando `parseRecordTypeParentName` / el mismo regex.

En `getValidTransitions` (reemplaza L668-671):
```js
const rtMatch = objectName.match(/^rt__(.+)__(.+)$/);
const pkWhere = rtMatch
  ? { [`${rtMatch[2]}Id`]: coerceId(recordId) }   // RT: <baseLower>Id
  : { id: coerceId(recordId) };                    // base: id

const rawRecord = await prisma[modelName].findUnique({
  where: pkWhere,
  ...(hasExtendedModel ? { include: { [extendedModelName]: true } } : {}),
});
```

En `previewBulkTransition` (reemplaza L743):
```js
const rtMatch = objectName.match(/^rt__(.+)__(.+)$/);
const pkWhere = rtMatch
  ? { [`${rtMatch[2]}Id`]: { in: recordIds.map(coerceId) } }
  : { id: { in: recordIds.map(coerceId) } };

const rawRecords = await prisma[modelName].findMany({
  where: pkWhere,
  ...(hasExtendedModel ? { include: { [extendedModelName]: true } } : {}),
});
```

- **Pros**: minimo, quirurgico, sin tocar otros consumidores; alinea la maquina de estados con el patron ya probado en `instance.resolver`.
- **Contras**: duplica el regex de deteccion RT en dos puntos mas (deuda menor).
- **Reversibilidad**: total (dos ediciones acotadas).

### Opcion B — Extraer un helper compartido `rtPkWhere(objectName, recordId)`

Un util unico (`rtPkWhere` / `resolveUniqueWhere`) que dado `objectName` + id(s) devuelva el `where` correcto, y usarlo en ambos resolvers (y candidato a que `instance.resolver` tambien lo consuma).

- **Pros**: fuente unica de verdad para el keyeo RT; elimina la duplicacion del regex; reduce el riesgo de que un tercer resolver repita el bug.
- **Contras**: mas superficie de cambio; idealmente refactor coordinado con `instance.resolver` (mas revision).
- **Reversibilidad**: alta, pero toca mas archivos.

### Descartadas

- **Cambiar el layout al base `CompetencyNode`**: no es fix — pierde la metadata y el estado (son columnas del RT). Es el sintoma que reporta el dev.
- **Agregar columna `id` al RT / cambiar la PK del RT**: rompe la convencion RT transversal de up1 y todo `instance.resolver`; migracion destructiva. No.

---

## 6. Donde aplicar y como validar

- **Repo/archivo**: `object-manager/src/graphql/resolvers/objectDefinition.resolver.js` (core). Es un workspace CORE — cambio con revision.
- **Sin tocar el mod**: `curriculum-mapping` esta correcto.
- **Regression / tests**:
  - Existe `object-manager/tests/integration/enum-transitions.integration.test.js` — extenderlo con un caso RT (`getValidTransitions` sobre `rt__Matrix__competencynode` por `competencynodeId`) y otro para `previewBulkTransition` masivo sobre RTs.
  - Assertions concretas: que devuelva las `options` de transicion reales del `status` de la matriz (no error), y que un base sin RT siga funcionando por `id` (no regresion).
- **Smoke UI**: abrir el layout de edicion de matriz apuntado al RT y confirmar que el selector de Estado carga las transiciones validas sin `INTERNAL_SERVER_ERROR`, mostrando ademas toda la metadata.

---

## Referencias

- `object-manager/src/graphql/resolvers/objectDefinition.resolver.js` — `getValidTransitions` (L645, where L668), `previewBulkTransition` (L726, where L743), `resolveModelName` (L45), `parseRecordTypeParentName` (L52), `coerceId` (L171), `extModelNameFor` (L185), `flattenExtRecord` (L189)
- `object-manager/src/graphql/resolvers/instance.resolver.js` — deteccion RT (L1575-1577), nota PK RT (L2153), lectura por PK RT (L4551)
- `mods/curriculum-mapping/objects/RecordTypes/rt__Matrix__competencynode.json` — metadata + `status` con `transitions`
- `mods/curriculum-mapping/objects/CompetencyNode.json` — objeto base (sin `status` ni metadata)
- `CLAUDE.md` → "RecordType (RT) Conventions"
