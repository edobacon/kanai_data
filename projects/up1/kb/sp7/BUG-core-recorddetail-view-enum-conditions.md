# BUG core: en modo view, las `conditions` sobre campos enum se evalúan contra la etiqueta traducida

> Diagnóstico y fix aplicado en `curriculum-design` (develop, 2026-07-30). Doc local de plataforma, no se commitea al repo de código.
> Listo para convertirse en ticket. El mod queda desbloqueado con un fix por identificador; el fix de raíz en core está evaluado, probado y **no aplicado** (requiere OK).

## Síntoma

En **Planes de Estudio** (`Curriculum`, RecordType `Plan`), al abrir un plan en modo **view** no se ven las pestañas:

- Líneas de formación
- Malla curricular
- Perfil de egreso

Tampoco se ven los 4 campos del RecordType en la pestaña General: Progresión, Créditos totales, Períodos totales, Tipo de período.

Solo quedan visibles General e Historial. En modo **edit** el mismo registro muestra todas las pestañas correctamente.

## Descarte previo: no es RBAC

El síntoma se parece al de una capability faltante, pero no lo es. Verificado en `uplanner_upu` y en runtime:

| Chequeo | Resultado |
|---|---|
| `core_Capability` contiene `planentry:view`, `requirementcategory:view`, `curricularsection:view` | sí |
| Asignadas con `defaultValue = 'allow'` y `contextPath` que incluye `/UPU` | sí |
| `getMyPermissions.capabilityNames` las devuelve en runtime (con `X-Selected-Role` del rol activo) | sí, las tres |
| Layout `default_Curriculum_view` presente en `up1_layen_layout` con sus 5 tabs | sí |

## Causa raíz

Las tabs declaran `"conditions": [["recordType", "==", "Plan"]]`. Vueform evalúa esas condiciones contra el **form data**.

En modo view, RecordDetail convierte todo campo enum en un input de texto cuyo valor **es la etiqueta traducida**, no el valor crudo del enum:

`layout/src/layouts/RecordDetail.vue:3228-3236`

```js
// VIEW MODE: Render as disabled text input showing the label.
// Using type: 'text' + disabled keeps visual consistency with other
// disabled fields in view mode (gray input style).
schemaLevel[fieldName] = {
  ...schemaLevel[fieldName],
  type: 'text',
  default: displayLabel,    // "Plan de estudios", no "Plan"
  disabled: true,
  _enumDisplayOnly: true,
};
```

Ese `default` es lo que entra al form data. La comparación pasa a ser `"Plan de estudios" == "Plan"` → falso → las tabs y los campos se ocultan.

En modo edit el mismo campo se construye como `select` (línea 3237 en adelante), cuyo `value` es el valor crudo `Plan` y el label traducido es solo display. Por eso edit funciona y view no. Esa asimetría es la firma del bug.

Efecto secundario: al ocultarse las 3 tabs queda una sola tab de campos, y `RecordDetail.vue:5082` desarma el contenedor de pestañas para no dejar un header suelto. Por eso no se ven "pestañas deshabilitadas", sino ninguna pestaña.

## Cambio que destapó la regresión, y por qué se hizo

La traducción del enum **no es nueva**: nació junto con los layouts, en el mismo ticket.

| Commit | Fecha | Qué pasó |
|---|---|---|
| `a3292b4` (UPONE-1268) | 2026-06-16 | Se crean los 4 layouts de Curriculum, las `conditions` de los campos y la traducción `"Plan": "Plan de estudios"`, en `lang/es_CL@Curriculum.json` (esquema legacy `{locale}@{Objeto}.json`) |
| `39cbbba` (UPONE-1345) | 2026-06-25 | Se agregan las `conditions` a las tabs. El mensaje del commit dice *"Verificado en vivo: Plan muestra Líneas/Malla, Minor no"*, o sea funcionaba con la traducción ya en el repo |
| `078c4c7` | — | *"Fase 3: Migracion de langs a arq. escalable"*: los archivos pasan a `lang/{lng}/{stem}.json` |
| `6ca0bc1` | 2026-07-09 | *"FIX: Cambios de claves y referencias para evitar confusion con objetos"*: rename a `lang/{lng}/{stem}.i18n.json` |

El commit `6ca0bc1` **no creó ni modificó ninguna traducción**: fue un rename masivo (el `--stat` muestra `lang/es/{Curriculum.json => Curriculum.i18n.json}` con cero cambios de contenido), más la actualización de docs y referencias.

Lo que hizo fue **activarlas**. El pipeline de publicación de i18n exige el sufijo, y lo declara en el código:

`suite/scripts/lib/i18n-source-map.mjs:120-133`

```js
// Source files carry a mandatory .i18n.json suffix so they never share a
// basename with the object definition of the same name (Event.i18n.json vs
// ...)
const SOURCE_SUFFIX = '.i18n.json';
...
`${ws.name}: ${path.relative(ws.langPath, file.path)} is missing the ${SOURCE_SUFFIX} suffix — ` +
`rename to {stem}${SOURCE_SUFFIX} (see mods/docs/guides/i18n.md)`
```

Antes del rename, el archivo de traducciones existía en el repo pero no era elegible para publicarse a `locales-dist/`, así que la etiqueta del enum no llegaba a la UI: el input de view mostraba el valor crudo `Plan` y la condición daba verdadero **por accidente**. El rename hizo que las traducciones empezaran a publicarse, el input pasó a mostrar `Plan de estudios`, y ahí se destapó el acoplamiento.

**El cambio fue correcto y no debe revertirse.** Resolvía una colisión real de nombres: `lang/es/Curriculum.json` contra `objects/Curriculum.json`, dos archivos con el mismo basename y significados distintos. El sufijo `.i18n` los desambigua y es contrato del pipeline nuevo.

Dicho de otro modo: el bug no lo introdujo el rename, lo introdujo el layout el 2026-06-16 al comparar contra un campo cuya representación depende de la capa de presentación. Estuvo latente 23 días porque las traducciones no se estaban publicando.

**Nota sobre el momento de aparición:** el síntoma se percibió junto con el seed nuevo (UPONE-1456, 2026-07-30), pero el seed no es la causa. Los datos son correctos (`recordType = 'Plan'` en los 32 registros). Lo que cambió el runtime fue el sync que acompañó al seed y publicó el i18n renombrado el 2026-07-09.

## Criterio de no regresión: qué debe seguir funcionando

Cualquier fix de este bug tiene que preservar lo que `6ca0bc1` habilitó. En concreto:

1. **Las etiquetas de enum se siguen mostrando traducidas.** El campo Tipo debe decir `Plan de estudios`, no `Plan`; Estado debe decir `Borrador`, no `Draft`. Un fix que "arregle" las condiciones apagando las traducciones estaría revirtiendo el trabajo original.
2. **Los archivos de idioma conservan el sufijo `.i18n.json`.** Es contrato del pipeline y lo que evita la colisión con las definiciones de objeto.
3. **No se toca `lang/es/Curriculum.i18n.json`.** El contenido de la traducción no es el problema.

Verificado en los dos fixes de este documento: tanto el campo espejo del mod como la opción A de core dejan las etiquetas traducidas intactas (`Plan de estudios` en Curriculum, `Borrador` en Activity). Ninguno de los dos toca la capa de i18n.

## Estado en otros mods

Barrido de `mods/*/config/layouts/*_view.json` buscando `conditions` en tabs o campos: el único layout con el patrón es `default_Curriculum_view.json`, ya corregido. `default_Activity_view.json` tiene `visibilityConditions` en un rowAction de lista embebida, que es otro mecanismo (se evalúa contra los datos de la fila, no contra el form data) y no está afectado.

El bug no está desperdigado hoy, pero cualquier layout view futuro que compare contra un enum lo reproduce.

## Comportamiento comprometido en tickets previos

El ocultamiento condicional por RecordType es alcance entregado y declarado en dos tickets. Cualquier fix debe preservarlo.

**UPONE-1268** (SP5) — *"Curriculum Design | Plan de estudio | Configuración de vista y objetos"*. Comentario de entrega:

> Los campos temporales (progression, totalCredits, totalPeriods, periodType) viven **solo en el Plan**.
> recordList único con columna Tipo (Plan/Minor) — el filtrado por tipo lo resuelve cada usuario con vistas guardadas, **sin layouts hardcodeados por tipo**.
> **Vista de detalle condicional por tipo**, editar y eliminar real.

**UPONE-1345** (SP6) — *"Curriculum Design | Malla | Objetos planEntry + requirementCategory (MC-02)"*. Comentario de entrega:

> las tabs *Líneas de formación* y *Malla* se muestran embebidas dentro del Plan (no como objetos de menú) y **solo en planes**.

El commit que lo implementó (`39cbbba`, 2026-06-25) lo dice en su mensaje: *"mostrar tabs malla/líneas solo en Curriculum recordType=Plan (no en Minor). Verificado en vivo: Plan muestra Líneas/Malla, Minor no."*

**Consecuencia de diseño:** la línea "sin layouts hardcodeados por tipo" de UPONE-1268 descarta explícitamente resolver esto con layouts separados por RecordType (`default_rt__Plan__curriculum_view`). Fue una decisión consciente, no un olvido.

## Alternativas evaluadas

Todas se probaron en local (tenant UPU) creando copias temporales del layout en `up1_layen_layout` y un `Curriculum` de RecordType `Minor`. Todo fue eliminado al terminar.

| # | Alternativa | Dónde | Plan | Minor | Veredicto |
|---|---|---|---|---|---|
| 1 | Quitar las `conditions` | mod | 5 pestañas | **muestra las 3 pestañas y los 4 campos vacíos** | descartada: rompe UPONE-1268/1345 |
| 2 | `conditions` contra `"Plan de estudios"` | mod | correcto | correcto | descartada: acopla la lógica al texto traducido |
| 3 | Operador `in` con valor crudo y etiqueta | mod | correcto | correcto | descartada: mismo acoplamiento, solo tolerado |
| 4 | Declarar `recordType` como `select` en el schema del layout | mod | falla | n/a | descartada: view fuerza `type: 'text'` después de leer el schema |
| 5 | Layouts separados por RecordType | mod | n/a | n/a | descartada por decisión de UPONE-1268 |
| 6 | **Campo espejo con el identificador** | mod | **correcto** | **correcto** | **aplicada** |
| 7 | Enum como `select disabled` en view | core | **correcto** | **correcto** | probada y revertida; propuesta de raíz |
| 8 | Evaluar `conditions` contra `instanceData` en view | core | no probada | no probada | alternativa de raíz sin impacto visual |

## Fix aplicado (mod): campo espejo con el identificador

`mods/curriculum-design/config/layouts/default_Curriculum_view.json`:

```json
"recordTypeKey": { "type": "hidden", "default": "{{record.recordType}}" }
```

El elemento se declara al final de los `elements` de la tab General, y las `conditions` de las 3 tabs y de los 4 campos apuntan a él:

```json
"conditions": [["recordTypeKey", "==", "Plan"]]
```

`processSchemaPlaceholders` (`RecordDetail.vue:4522`) resuelve `{{record.recordType}}` contra `instanceData`, que siempre trae el **valor crudo** del enum. Como `recordTypeKey` no es un campo del objeto, no tiene `fieldMetadata.enumValues` y por lo tanto la conversión a texto traducido no lo toca. La condición compara identificador contra identificador, sin depender de ninguna traducción.

**Detalle de implementación:** el elemento `hidden` ocupa una celda del grid de Vueform. Declarado al principio de `elements` desalinea todo el formulario; al final es inofensivo. Verificado visualmente en ambas posiciones.

Propagado con:

```bash
npm run sync:layouts --workspace=@uplanner/object-management-backend
```

Verificado en la aplicación, en los dos RecordTypes:

- **Plan** (`UPU-ICIV-PLAN-2026`): 5 pestañas en el orden declarado, malla curricular renderizando con los 609 `planEntry` del seed, los 4 campos del RecordType con sus valores (Credits, 240, 10, Semester), y el grid alineado.
- **Minor** (registro de prueba, ya eliminado): solo General + Historial, sin los 4 campos.

## Fix de raíz en core (evaluado, probado, no aplicado)

El problema no es del mod: **cualquier layout de cualquier mod que use `conditions` sobre un campo enum en modo view está roto**, y se rompe en el momento en que alguien agrega la traducción de ese enum. Es una trampa silenciosa: el layout no cambia, el código no cambia, y la vista se degrada al sincronizar traducciones. El fix del mod evita la trampa en este layout, pero no la elimina para los demás.

### Opción A: enum como `select disabled` en view (probada)

Alinear la rama de view con la de edit en `RecordDetail.vue:3228-3236`:

```js
schemaLevel[fieldName] = {
  ...schemaLevel[fieldName],
  type: 'select',
  native: true,
  items: allowedItems,
  default: currentValue,   // valor crudo; el label lo aporta el item
  disabled: true,
  _enumDisplayOnly: true,
};
```

**Probado en local y revertido.** Resultados con el layout en su forma **original** (`[["recordType", "==", "Plan"]]`, sin ningún cambio en el mod):

- Plan: 5 pestañas y los 4 campos del RecordType.
- Minor: solo General + Historial, sin los 4 campos.
- Sin diferencia visual apreciable: el select nativo deshabilitado se ve igual que el input de texto gris.
- Regresión revisada en `default_Activity_view`: todas las pestañas y campos correctos, enums traducidos bien (`Estado: Borrador`).
- **Efecto lateral positivo:** el campo *Dueño*, que en view aparecía vacío, pasó a mostrar su valor. El `autoPopulate` de `ownerId` observa `ownerType`, que también es enum: al recibir la etiqueta traducida en vez del identificador, no resolvía sus opciones. Es el mismo bug afectando otro punto de la vista.

Costos detectados, ambos acotados y con guarda posible:

1. Enum sin valor: hoy el input muestra `-`; con `select` muestra vacío. Se preserva agregando un item placeholder.
2. Valor huérfano (existe en la BD pero ya no en el enum): hoy muestra `Plan (removed)`; con `select` no habría item que lo represente. Se preserva agregando el item sintético correspondiente.

Con esas dos guardas, el cambio queda en torno a 10 líneas, en un solo lugar.

### Opción B: evaluar las `conditions` contra `instanceData` en modo view

Resolver las condiciones de tabs y campos contra el registro cargado, que siempre tiene el valor crudo, en lugar de delegarlas a Vueform. La plataforma ya tiene el evaluador: `evaluateCondition(condition, record)` en `layout/src/composables/useFieldConditions.ts:183`, con operadores completos (`==`, `!=`, `in`, `!in`, `exists`, `empty`, comparadores), usado hoy para `disableConditions`.

Puntos a resolver si se toma este camino:

- **Normalización de formato:** el layout usa tuplas `["campo", "op", "valor"]` y `evaluateCondition` espera `{ field, operator, value }`. `useSkippableSteps` ya hace una normalización parecida y sirve de referencia.
- **Hay que retirar `conditions` antes de pasar el config a Vueform.** Si se deja, Vueform la vuelve a evaluar contra el form data y oculta igual, anulando el fix.
- **Aplicar solo en modo view.** En create/edit, Vueform evalúa las condiciones de forma reactiva mientras el usuario escribe; reemplazarlo por una evaluación única contra `instanceData` rompería esa reactividad. El bug solo existe en view, así que el alcance se acota ahí.

Ventaja frente a la Opción A: cero impacto en el render, así que no toca los dos comportamientos de display mencionados. Desventaja: no arregla el `autoPopulate` de *Dueño* ni ningún otro consumidor del form data, porque el valor sigue siendo la etiqueta traducida. Es un fix del síntoma en un punto, no del acoplamiento.

### Comparación de mantenibilidad

| Criterio | Fix en el mod (aplicado) | Core opción A | Core opción B |
|---|---|---|---|
| Alcance del arreglo | solo este layout | toda la plataforma | toda la plataforma, solo `conditions` |
| Sintaxis del layout | exige declarar un campo espejo y apuntar las conditions a él | natural: `["recordType", "==", "Plan"]` | natural |
| Acoplamiento a traducciones | eliminado en este layout | eliminado en la raíz | eliminado para conditions; persiste en el form data |
| Arregla `autoPopulate` de *Dueño* | no | sí | no |
| Impacto visual | ninguno (con el espejo al final) | mínimo, con 2 guardas de display | ninguno |
| Tamaño del cambio | 3 ediciones de JSON por layout afectado | ~10 líneas en un lugar | más código: normalizar, retirar `conditions`, acotar a view |
| Costo de repetición | cada layout futuro con este patrón debe recordar el espejo | ninguno | ninguno |
| Riesgo de regresión | nulo fuera del mod | medio: toca el render de todos los enums en view | bajo: solo el filtrado |

**Recomendación:** la opción A de core es la más mantenible. Es la de menor tamaño, elimina la clase de bug en lugar de esquivarla, deja la sintaxis del layout natural, y arregla de paso el `autoPopulate` de *Dueño*, que hoy está roto por la misma razón. Requiere aceptar un cambio en el render de enums en view y agregar las dos guardas de display.

El fix del mod aplicado es la contención hasta que eso se apruebe. Si core toma la opción A, el campo espejo `recordTypeKey` debe retirarse y las `conditions` volver a apuntar a `recordType`.

### Blast radius del fix de core

Medido en el tenant UPU local:

| Métrica | Valor |
|---|---|
| Layouts `RecordDetail` en el tenant | 196 |
| De esos, en modo `view` | **70**, sobre 54 objetos distintos |
| Tipos enum en la BD del tenant | 59 |
| Bases de tenant en el entorno local | 15 |

La rama que se modifica (`RecordDetail.vue:3228-3236`) se ejecuta para **todo campo enum de todo layout en modo view**. No hay forma de acotarla por mod, objeto o tenant: es el camino único de construcción de esos campos. Los 70 layouts en view quedan dentro del radio, multiplicado por cada tenant.

Lo que **no** entra en el radio, verificado:

- **RecordList**: no hace esta conversión. El grep de `enums.` en `layout/src/` solo devuelve `RecordDetail.vue`.
- **ChibiList**: tiene su propio manejo de etiquetas vía `valueLabels` (`ChibiList.vue:534-542`), mecanismo distinto y no afectado.
- **Modo edit y create**: la rama del `else` no se toca.
- **Capa de i18n**: no se modifica ningún archivo de traducción ni el pipeline de publicación.

Consecuencia para la planificación: el cambio es de pocas líneas pero su verificación no es proporcional al diff. La regresión debe recorrer varias views con campos enum de distintos mods, no solo `Curriculum`.

### Comparación con casos anteriores en la misma zona

Dos precedentes de SP7 que calibran el riesgo de tocar el render de view de RecordDetail:

**UPONE-1353** (`52588ba`, PR #298, merge a develop 2026-07-17). Un `import` faltante en `RecordDetail.vue` lanzaba `ReferenceError: replaceRecordPlaceholders is not defined` y abortaba el render, dejando **todos los campos vacíos** en la view de `Activity`, mientras edit funcionaba bien. Llegó a develop y se descubrió recién en un smoke de otro ticket, una semana después. Registrado en `UPONE-1353-recorddetail-view-placeholder-regression.md`.

Lección aplicable: esta zona no tiene red de seguridad que atrape una rotura de render. El síntoma además es idéntico en su forma al de este bug (view mal, edit bien), lo que hace fácil confundir causas. Cualquier fix acá necesita smoke runtime, no solo unit.

**UPONE-1487** (decimales de despliegue en RecordList/RecordDetail view). El análisis previo levantó dos puntos que aplican directamente: la prioridad estaba subvaluada porque el cambio toca varias superficies de core, y **ChibiList quedaba omitido del alcance** siendo una tercera superficie que pinta valores. Registrado en `UPONE-1487-core-display-decimals-review.md`.

Lección aplicable: delimitar por escrito qué superficies entran y cuáles no, con razón. Para este ticket ya está hecho arriba: solo RecordDetail, solo modo view.

Diferencia relevante frente a ambos: aquí el cambio **no agrega** una capa de formateo nueva, sino que alinea la rama de view con la de edit, que ya está en producción y probada. Eso reduce el riesgo respecto de 1487, pero no elimina el de 1353, porque sigue siendo el mismo archivo y el mismo camino de render.

### Validación sugerida para el fix de core

1. Revertir el campo espejo en `default_Curriculum_view.json` y volver a `[["recordType", "==", "Plan"]]`.
2. Verificar en un plan que se ven las 5 pestañas y los 4 campos.
3. Crear un currículo `Minor` y verificar que las 3 pestañas y los 4 campos se ocultan.
4. Verificar que el campo *Dueño* muestra su valor en view.
5. Enum sin valor: confirmar que sigue mostrando `-`.
6. Valor huérfano: confirmar que sigue mostrando `<valor> (removed)`.
7. **Traducciones intactas** (criterio de no regresión): Tipo muestra `Plan de estudios` y Estado muestra `Borrador`. Si aparecen los valores crudos, el fix está apagando lo que habilitó `6ca0bc1`.
8. Regresión: recorrer layouts en view con campos enum en otros mods (`default_Activity_view` como mínimo) y confirmar que se ven igual.

## Nota sobre dónde se evalúan las `conditions` de una tab

El filtrado de tabs de RecordDetail (`RecordDetail.vue:5041-5085`) solo evalúa `requiredCapability`; no lee la propiedad `conditions`, y la documentación de tabs (`layout/docs/features/recorddetail.md:379-385`) solo declara `label`, `elements` y `requiredCapability`.

Quien aplica las `conditions` es Vueform, al recibir el `tabConfig` verbatim. Funciona, pero es un contrato implícito: no está documentado ni cubierto por el código de la plataforma, y por eso quedó expuesto a un cambio de i18n sin que ninguna capa lo advirtiera. Conviene documentarlo o internalizarlo junto con el fix de raíz.

## Hallazgo adicional: filas de RecordType faltantes en el seed

De los 32 currículos, 20 tienen fila en `rt__Plan__curriculum` (los `UPU-*-PLAN-2026`) y 12 no (los `CALDEMO-PLAN-*`). Los que no la tienen mostrarán los 4 campos del RecordType vacíos aunque el layout ya los exponga.

No es la causa del bug (se reprodujo igual en registros con y sin fila de RT), pero es un hueco de datos del seed que conviene revisar por separado.

## Archivos

- `mods/curriculum-design/config/layouts/default_Curriculum_view.json` (fix aplicado)
- `mods/curriculum-design/lang/es/Curriculum.i18n.json` (traducción del enum; **no tocar**, no es el problema)
- `suite/scripts/lib/i18n-source-map.mjs:120-133` (sufijo `.i18n.json` obligatorio; explica por qué el rename activó las traducciones)
- `layout/src/layouts/RecordDetail.vue:3228-3236` (conversión de enum a texto en view, causa raíz)
- `layout/src/layouts/RecordDetail.vue:4522` (`processSchemaPlaceholders`, resuelve `{{record.campo}}` con el valor crudo)
- `layout/src/layouts/RecordDetail.vue:5041-5085` (filtrado de tabs; `conditions` no evaluado ahí)
- `layout/src/composables/useFieldConditions.ts:183` (`evaluateCondition`, evaluador contra el registro crudo)
- `layout/docs/features/recorddetail.md:379-385` (contrato documentado de tabs)
