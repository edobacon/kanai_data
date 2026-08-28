---
id: DOC-kb-sp8-PLAN-esquema-de-coberturas-dev-francisco
project: up1
type: doc
tags:
  - coverageScheme
  - F1
  - curriculum-mapping
  - composite
  - recordType
  - vueform
  - seed
  - vitest
---

# Plan de implementacion: Esquema de cobertura (`coverageScheme`)

> Fase **F1 - Fundaciones**, hermano de `LevelScheme` (UPONE-1454). Implementa el catalogo de
> **cobertura curricular** (I/R/M): la escala con que un curso tributa a una competencia
> (proposal §3.5b, mockup v4 pestaña "Esquemas de cobertura").
>
> A diferencia del plan de `levelScheme`, este NO parte de cero: la anatomia completa (objeto
> Composite, mutations `*Validated`, layouts, editor de coleccion, seed, tests) ya existe en el mod.
> El objetivo es **reusar**, no replicar. La pieza central de reuso es el custom element generico
> `RecordCollectionEditor`.

## 0. Alcance

**Dentro:**

- Objeto `CoverageScheme` con RecordTypes `Scheme` / `Level` (Composite self-tree, mismo patron D-2).
- Mutations gobernadas `upsertCoverageSchemeValidated`, `setCoverageSchemeActiveValidated`,
  `deleteCoverageSchemeValidated` + helper puro `validateCoverageScheme.js`.
- Layouts `list` / `view` / `create` / `edit` sobre `rt__Scheme__coveragescheme`.
- **Extension del `RecordCollectionEditor` generico** para que sirva como editor de niveles de
  cobertura sin escribir un `.vue` nuevo (ver §3, es la decision de diseño principal del plan).
- i18n `es` / `en` / `pt` con paridad de keys (D-11 ya cerrado: las 3 lenguas).
- Capabilities `coveragescheme:view|create|modify|delete`.
- Seed: esquema semilla de plataforma `IRM` (Introduce / Reinforce / Master).
- Tests vitest: reglas (unit), resolver + RBAC (unit), estructurales (RTs / layouts / lang / seed).

**Fuera:**

- `competencyAlignment` y `outcomeAlignment` (los consumidores de `coverageLevelId`): F3. Mientras no
  existan, el guard de "en uso" del borrado devuelve `false` siempre (mismo estado que `levelScheme`).
- Heatmap de cobertura curricular y deteccion de brechas (analitica, F4+).
- Override institucional vs default de plataforma (proposal §3.5b lo declara diferido).
- Versionado: `coverageScheme` no lo lleva ni siquiera como campo (a diferencia de `levelScheme`, que
  dejo `version`/`previousVersionId` preparados). Un cambio de convencion de cobertura se resuelve
  creando otra escala e inactivando la anterior.

## 1. Decisiones a confirmar antes de codear

| ID | Decision | Valor propuesto | Nota |
|----|----------|-----------------|------|
| C-1 | Objeto separado vs RTs extra en `LevelScheme` | **Objeto propio `CoverageScheme`** con sus 2 RTs | Semantica distinta (progresion curricular, no logro), capabilities propias, unicidad de `code` que no debe competir con las escalas de logro. Es lo que dice el proposal §3.5b. |
| C-2 | Casing y aliases | `CoverageScheme`; `rt__Scheme__coveragescheme.json`, `rt__Level__coveragescheme.json`; accessor `prisma.coverageScheme` | Copia exacta de la convencion de `levelScheme` (D-1). |
| C-3 | Campos propios del RT `Scheme` | Solo `position` (orden entre escalas) | El proposal lo lista. Ademas evita un RT sin properties (el codegen genera un modelo RT vacio y el test estructural exige `properties` no vacio). |
| C-4 | Campos propios del RT `Level` | Solo `position` (orden de progresion I=1, R=2, M=3) | `name` / `code` / `description` son base, igual que en `levelScheme`. |
| C-5 | Editor de niveles | **Sin componente nuevo**: se extiende el `RecordCollectionEditor` generico y el layout lo configura | Ver §3. Alternativas evaluadas y descartadas ahi. |
| C-6 | Backend | Extraer de `levelScheme-upsert.resolver.js` el motor comun de reconciliacion a `logic/helpers/compositeCatalog.js` y que ambos resolvers lo usen | ~250 de las 657 lineas del resolver actual son mecanicas (clasificar/crear/actualizar/borrar hijos, liberar codes para rename, DataLog consolidado). Copiarlas garantiza divergencia. Los 28 tests del upsert cubren la extraccion. |
| C-7 | Codigo de la semilla | `IRM` (proposal) y no `COB-IRM` (mockup) | El `code` ya vive en un objeto llamado CoverageScheme; el prefijo `COB-` es redundante. Decision de negocio, confirmar. |
| C-8 | Orden del listado | Por `code` (campo base), no por `position` (campo RT) | Limitacion conocida de plataforma: el front prefija `extended.` al ordenar/filtrar por campos RT. Mismo workaround que el listado de `levelScheme`. |
| C-9 | Minimo de niveles | 2 | Es lo que valida el mockup ("Al menos 2 niveles, todos con nombre y codigo"). |
| C-10 | Descripcion del nivel | Campo base `description`, editable en la grilla | En cobertura la descripcion SI es dato del esquema (dice cuando usar ese grado), a diferencia del `descriptor` de `levelScheme` (D-3, display). |

## 2. Modelo de datos

### 2.1 Campos base (comunes a `Scheme` y `Level`)

| Campo | Tipo | Req | Notas |
|---|---|---|---|
| `recordType` | string enum `Scheme` / `Level` | si | Discriminador Composite |
| `name` | string | si | Scheme: "Cobertura curricular". Level: "Introduce" |
| `code` | string | si | Scheme: `IRM`. Level: `I`. Unico dentro de su padre |
| `description` | string | no | En Level: cuando corresponde usar ese grado (C-10) |
| `isActive` | boolean | si (def `true`) | Ciclo de vida de catalogo (D-12): retira la escala de nuevas tributaciones sin borrarla |
| `ownerType` | string enum `institution` | no | Scope institucional |
| `ownerId` | string | no | Institucion dueña |
| `parentId` | FK self -> `CoverageScheme` | no | Solo en `Level` |

`metadata` del objeto: `enableDataLog: false` (el mod consolida el historial a mano, D-imp-3),
`directChildren` con `levels` por `parentId`, `uniqueConstraints`
`["ownerId","recordType","code"]` y `["parentId","recordType","code"]`, `indexes` iguales a
`LevelScheme.json`.

### 2.2 Campos por RecordType

| RT | Campo | Tipo | Notas |
|---|---|---|---|
| `Scheme` | `position` | integer | Orden entre escalas del catalogo (C-3) |
| `Level` | `position` | integer | Orden de progresion; lo renumera el guardado |

### 2.3 Restricciones y donde se enforzan

| ID | Regla | Donde |
|----|-------|-------|
| RC1 | `code` de Scheme unico por `(ownerId, recordType)` | `uniqueConstraints` (DB) + chequeo previo en la mutation para dar mensaje amable |
| RC2 | `code` de Level unico dentro del Scheme | `uniqueConstraints` (DB) + `findDuplicateLevelCodes` (reuso del helper actual) |
| RC3 | Minimo 2 niveles (C-9) | `validateCoverageScheme.js` (server, en la mutation) |
| RC4 | Cada nivel con `name` y `code` no vacios | `validateCoverageScheme.js` |
| RC5 | `position` contigua 1..N en orden de progresion | `renumber()` al guardar (helper ya existente) |
| RC6 | No borrar una escala en uso; sugerir inactivar | Guard `assertSchemeNotInUse` (hoy stub, F3 consulta `competencyAlignment.coverageLevelId`) |

No hay reglas de umbral, peso ni cobertura de escala: **el dominio de cobertura es puramente ordinal**.
Por eso el helper de validacion queda en ~60 lineas contra las 216 de `validateLevelScheme.js`.

## 3. Estrategia de componente (la evaluacion pedida)

### 3.1 Que necesita la grilla de cobertura

Del mockup (`sc-edit-row`): columnas **Nombre**, **Codigo**, **Descripcion**, mas subir/bajar y
eliminar. Sin `kind`, sin umbrales, sin peso, sin toggle de logrado, sin banda de validacion numerica.
Es exactamente la superficie del `RecordCollectionEditor` generico.

### 3.2 Que le falta hoy al generico

`RecordCollectionEditorElement.vue` hidrata **solo** desde el valor del form (`props.default` /
`element.value`). Los niveles de cobertura, igual que los de nivel, son **registros hijos**
(`rt__Level__coveragescheme` por `parentId`), no un campo del padre, asi que hay que cargarlos por
GraphQL. Esa logica existe pero vive en el wrapper de dominio `LevelSchemeEditorElement.vue`:

| Pieza | Hoy | Es de dominio? |
|---|---|---|
| Query `listInstances(name, filters, sort)` + mapeo a filas | `LevelSchemeEditorElement.vue` | No |
| `resolveSchemeSource` (edit / clone / current / create) | `useLevelSchemeEditor.ts` | No |
| `readCloneSourceId` (hidden `prefillFrom`, D-imp-2) | `useLevelSchemeEditor.ts` | No |
| Escritura al form sin ensuciarlo (`writeElementValue`) | `elementBridge.ts` (ya generico) | No |
| `buildLevelColumns` (labels/placeholders por i18n desde `key`) | `LevelSchemeEditor/columns.ts` | Solo el filtro por `kind` |
| `syncMinThresholds`, `isNumericKind` | `useLevelSchemeEditor.ts` | **Si** |

Es decir: **casi todo lo que falta ya esta escrito, pero en el lugar equivocado**.

### 3.3 Opciones

- **A. Wrapper `CoverageSchemeEditor` nuevo** (copia del de niveles sin umbrales). Rapido de escribir,
  pero duplica la carga por GraphQL y el clon en un segundo `.vue` que hay que mantener en paralelo.
  Es exactamente el escenario que la Regla de Creacion busca evitar.
- **B. Extender el generico y configurar por layout** (recomendada). Se sube al
  `RecordCollectionEditor` lo que no es de dominio y cobertura queda **sin codigo nuevo de front**:
  solo JSON de layout.
- **C. Editar los niveles como sub-layout `RecordList` embebido del core.** Se descarta: el guardado
  debe ser atomico por mutation gobernada (header + niveles), y un RecordList embebido escribe por
  CRUD generic, violando la regla de escrituras gobernadas del mod.

### 3.4 Detalle de la opcion B

Movimientos (todos dentro de `modsComponents/`, sin tocar el core):

1. **Nuevo** `RecordCollectionEditor/useChildRows.ts`: resuelve el origen (`edit` / `clone` /
   `current` / `create`), consulta `listInstances` por `parentId`, mapea `items[].data` a filas segun
   las columnas declaradas y escribe el resultado al form con `writeElementValue(..., { silent: true })`.
   Sale de `LevelSchemeEditorElement.vue` + `useLevelSchemeEditor.ts` casi tal cual.
2. **Nuevo** `RecordCollectionEditor/columns.ts` con `buildColumns(t, defs)` generico (label
   `columns.{key}`, placeholder `placeholders.{key}`). `LevelSchemeEditor/columns.ts` se reduce a
   filtrar por `kind` y delegar.
3. **Props nuevas** del element generico: `childObjectName`, `parentId`, `sortField`, `columnDefs`
   (hoy recibe `columns` ya resueltos; se mantiene por compatibilidad).
4. **`LevelSchemeEditorElement.vue`** pasa a consumir `useChildRows` y `buildColumns`; conserva
   `syncMinThresholds`, el filtro por `kind` y la lectura del scheme hermano.

Con eso, el campo de niveles del layout de cobertura es solo configuracion:

```json
"levels": {
  "type": "record-collection-editor",
  "label": "Niveles de cobertura",
  "childObjectName": "rt__Level__coveragescheme",
  "parentId": "{{parentId}}",
  "sortField": "code",
  "i18nNamespace": "curriculum-mapping/coverageSchemeEditor",
  "columnDefs": [
    { "key": "name", "type": "text", "hasPlaceholder": true, "width": "minmax(8rem, 1.5fr)" },
    { "key": "code", "type": "text", "hasPlaceholder": true, "width": "minmax(5rem, 1fr)" },
    { "key": "description", "type": "text", "hasPlaceholder": true, "width": "minmax(12rem, 3fr)" }
  ],
  "columns": { "container": 12 }
}
```

En el layout `view` las mismas columnas van con `"readOnly": true` y el campo con `"disabled": true`,
igual que en `default_LevelScheme_view.json`.

**Costo estimado:** un refactor acotado (4 archivos tocados, ~150 lineas movidas) contra ~250 lineas
duplicadas de la opcion A. Red de seguridad: los 129 tests actuales, mas los de a11y que ya montan
`RecordCollectionGrid`.

## 4. Archivos

**Nuevos:**

| Archivo | Que es |
|---|---|
| `objects/CoverageScheme.json` | Objeto base Composite |
| `objects/RecordTypes/rt__Scheme__coveragescheme.json` | RT raiz |
| `objects/RecordTypes/rt__Level__coveragescheme.json` | RT hijo |
| `logic/helpers/validateCoverageScheme.js` | Reglas puras RC3-RC5 |
| `logic/helpers/compositeCatalog.js` | Motor comun de reconciliacion (C-6) |
| `logic/coverageScheme-upsert.resolver.js` | 3 mutations gobernadas |
| `logic/coverageScheme-upsert.schema.graphql` | SDL (sin backticks en las descripciones) |
| `modsComponents/RecordCollectionEditor/useChildRows.ts` | Carga de hijos por `parentId` |
| `modsComponents/RecordCollectionEditor/columns.ts` | `buildColumns` generico |
| `config/layouts/default_CoverageScheme_{list,view,create,edit}.json` | 4 layouts |
| `lang/{es,en,pt}/CoverageScheme.i18n.json` | Labels del objeto |
| `lang/{es,en,pt}/rt__{Scheme,Level}__coveragescheme.i18n.json` | Labels por RT |
| `lang/{es,en,pt}/coverageSchemeEditor.i18n.json` | Columnas y placeholders de la grilla |
| `seed/_data-coveragescheme.js` | Semilla IRM |
| `docs/reference/coveragescheme-object.md` | Referencia de campos, reglas y mutations |

**Modificados:**

| Archivo | Cambio |
|---|---|
| `modsComponents/RecordCollectionEditor/RecordCollectionEditorElement.vue` | Props de carga de hijos + `columnDefs` |
| `modsComponents/LevelSchemeEditor/{LevelSchemeEditorElement.vue,columns.ts,useLevelSchemeEditor.ts}` | Consumir lo extraido |
| `logic/levelScheme-upsert.resolver.js` | Consumir `compositeCatalog.js` |
| `capabilities.json` | 4 capabilities `coveragescheme:*` |
| `config/app.json` | `rt__Scheme__coveragescheme` en `defaultObjects` |
| `seed/{seed.js,_cleanup.js}` | Cargar y limpiar el catalogo nuevo |
| `tests/integration/{recordtypes,layouts,lang-enums,seed-counts}` | Cubrir el objeto nuevo (hoy asumen solo `levelscheme`) |
| `CLAUDE.md`, `README.md`, `docs/INDEX.md`, `.ai/CONTEXT.md` | Decisiones C-1..C-10 y estado |

## 5. Pasos ejecutables

> Antes de crear cada archivo de codigo: `/up1-check` describiendo el artifact (Regla de Creacion).

| # | Paso | Depende de | Verificacion |
|---|------|-----------|--------------|
| 1 | Objeto + 2 RTs | C-1..C-4 | `npm run sync` + `npm run codegen` + `db push` limpios; `recordtypes-declared` en verde |
| 2 | Capabilities | 1 | 4 entradas `coveragescheme:*` en `capabilities.json` |
| 3 | i18n (es fuente de verdad, en/pt en paridad) | 1 | `lang-enums` en verde |
| 4 | `validateCoverageScheme.js` | C-9 | Unit test de RC3-RC5 |
| 5 | Extraer `compositeCatalog.js` desde el resolver de niveles | C-6 | Los 28 tests de `levelSchemeUpsert` siguen verdes **sin cambios** |
| 6 | Resolver + SDL de cobertura | 4, 5 | Unit test de upsert/setActive/delete + RBAC (espejo del de niveles) |
| 7 | Extraer `useChildRows` / `buildColumns` y extender el element generico | ninguna | 129 tests actuales en verde + typecheck + lint |
| 8 | 4 layouts | 6, 7 | `layouts-declared` en verde |
| 9 | Seed IRM + wiring en `seed.js` / `_cleanup.js` | 1 | `seed-counts` en verde; seed idempotente al correrlo dos veces |
| 10 | `app.json` (`defaultObjects`) | 8 | La app muestra la vista de coberturas |
| 11 | Docs (`reference/`, `INDEX.md`, `CLAUDE.md`, `README`) | todo | Revision |
| 12 | Sync + verificacion manual en UPU | todo | §7 |

Los pasos 5-6 (backend) y 7-8 (front) son independientes: se pueden avanzar en paralelo despues del 1.

## 6. Seed

Escala semilla de plataforma, un solo `Scheme` (proposal §3.5b):

| position | code | name | description |
|---|---|---|---|
| 1 | `I` | Introduce | El curso presenta la competencia por primera vez; primer contacto |
| 2 | `R` | Reinforce | El curso profundiza o practica una competencia ya introducida |
| 3 | `M` | Master | El curso lleva la competencia al nivel de dominio esperado al egreso |

Scheme: `code=IRM` (C-7), `name="Cobertura curricular"`, `isActive=true`, `ownerType=institution`,
`ownerId` = institucion de UPU (mismo lookup que `_data-levelscheme.js`). Idempotente por
`(ownerId, recordType, code)`. Las escalas de ejemplo del mockup (`INT-4`, `ABET`) quedan fuera del
seed: la semilla debe ser la convencion de acreditacion, no ruido de demo.

## 7. Definicion de listo

- `npm test` en verde (incluye los nuevos suites y los 129 existentes sin regresiones).
- `npx vue-tsc --noEmit` y `npx eslint .` limpios.
- `npm run sync` + `codegen` + `db push` sin drift.
- En UPU: crear una escala con 3 niveles, reordenar, guardar, reabrir y ver el orden persistido;
  clonar; inactivar y reactivar; intentar borrar (permitido en F1, el guard aun no tiene consumidores);
  historial con **una sola** entrada consolidada por guardado.
- El modal no pregunta por cambios sin guardar si no se toco nada (regresion ya corregida en el
  editor de niveles, aplica igual al generico).

## 8. Riesgos

| Riesgo | Mitigacion |
|---|---|
| El refactor del paso 5 rompe el upsert de niveles ya validado | Commit aparte, sin cambios en los tests; si un test necesita tocarse, el refactor cambio comportamiento y hay que revisarlo |
| Dos objetos Composite parecidos invitan a copiar en vez de compartir | El motor comun (C-6) y el element generico (C-5) son justamente el antidoto; revisar en code review que el resolver de cobertura no reintroduzca helpers propios |
| Orden por campo RT (`position`) en el listado | C-8: ordenar por `code`; el orden de progresion se resuelve client-side en la grilla |
| `defaultObjects` con dos objetos: navegacion del app | Verificar el orden de las vistas en la app despues del sync |

## 9. Referencias

- Modelo: [`competency-management-proposal.md`](competency-management-proposal.md) §3.5b, §3.5, §3.5c.
- Mockup: [`mockup-curriculum-mapping_v4.html`](mockup-curriculum-mapping_v4.html), pestaña
  "Esquemas de cobertura" y modal de edicion (`sc-edit-row`).
- Plan hermano: [`PLAN-esquema-de-niveles.md`](PLAN-esquema-de-niveles.md).
- Editor generico: [`guides/level-scheme-editor.md`](guides/level-scheme-editor.md).
