# Edición full-page no vuelve al listado tras guardar — el caso de Curriculum (guardado custom + `openMode: route`)

> **Origen**: descubierto en la verificación E2E de la convergencia de Curriculum (UPONE-1270), al editar un Plan/Minor desde la suite.
> **Estado**: análisis + solicitud de cambio al equipo de core (layer suite / layout-engine).
> **Fecha**: 2026-06-18.
> **Tickets Jira involucrados**: UPONE-1270 (convergencia clonado/versionado de Curriculum — donde surge), UPONE-1219 (guard de atomicidad del split base/RecordType — contexto del guardado custom), UPONE-1261 (rama de épica de core donde vive el trabajo de core de este frente).
> **Componentes**: `suite/pages/[tenant_id]/[object_name]/[instance_id]/[view_type]/...` (host de la ruta de detalle), `layout/src/layouts/RecordDetail.vue` (form que emite el evento de guardado), `layout/.../ModalStackManager.vue` (host modal), `mods/curriculum-design` (mutation custom y layout de edición).

---

## 1. Resumen ejecutivo

Al editar un **Curriculum** (Plan/Minor) desde la suite, el formulario **guarda correctamente** pero **no vuelve al
listado** — se queda abierto en la vista de edición. El usuario percibe que "el guardado normal sí vuelve al listado, y
este guardado no".

La causa **no es** el guardado custom ni la mutation. Es una **brecha del host de la ruta de detalle full-page** en la
suite: el guardado emite el evento de éxito (`instance-updated`), pero la página que renderiza la edición en modo
**ruta full-page** (`openMode: "route"`) **no escucha ese evento** y por lo tanto **nunca navega de vuelta** al listado.
La edición en **modal** sí vuelve, porque `ModalStackManager` escucha el mismo evento y cierra el modal.

Curriculum se edita en **ruta full-page** y con un **guardado custom** (por razones que se explican abajo), así que es el
primer objeto que expone esta brecha de forma visible. Pero el problema **no es exclusivo de Curriculum ni del guardado
custom**: cualquier objeto editado en `openMode: "route"` tiene el mismo comportamiento.

Este documento explica: qué tipo de objeto es Curriculum, por qué dejó de servir el guardado genérico (el que "sí
vuelve"), por qué se tuvo que optar por un guardado custom, por qué ese guardado custom guarda pero no vuelve, y el
**cambio que se solicita al equipo de core**.

---

## 2. Contexto: qué tipo de objeto es Curriculum

Curriculum es un objeto **con extensión RecordType (RT)**: una fila base `Curriculum` + una extensión 1:1
`rt__Plan__curriculum` (campos `progression`, `totalCredits`, `totalPeriods`, `periodType`, …) que cuelga del
RecordType "Plan"/"Minor". Es decir, los datos de un Curriculum viven **partidos en dos tablas**: la base y la extensión
del RT.

Además, Curriculum **no tiene workflow** (modela el estado como un enum simple `status` ∈ {Draft, Active, Archived},
igual que `AcademicProgram`). Esto último es contexto de UPONE-1270, no central a este documento.

El layout de **lista** de Curriculum declara `"openMode": "route"`, por lo que la edición **abre en ruta full-page**
(navegación a `.../{id}/RecordDetail/{layout}`), no en modal. (Por contraste, el modo por defecto de la plataforma es
**modal**: los objetos que no declaran `openMode` se editan en un modal.)

---

## 3. Por qué dejó de servir el guardado normal (el que sí vuelve al listado)

El guardado **genérico** de la plataforma (`updateInstance` de core) separa los campos base de los campos de la
extensión RT **solo cuando el payload usa el alias `rt__<RT>__campo`**. El formulario de edición de Curriculum, en
cambio, envía `objectType = Curriculum` (la base) con los campos del RT **planos** (`progression`, `totalCredits`, …),
porque así los modela el form.

Con ese payload, el guardado genérico **falla** por dos razones independientes:

1. **No separa los campos del RT** → Prisma rechaza con `Unknown argument 'progression'` (esos campos no existen en la
   tabla base; pertenecen a la extensión `rt__Plan__curriculum`). El guardado **se cae**, no persiste.
2. **No convierte la FK escalar a relación** → al setear `institutionId` (FK requerida de la base) junto con la
   escritura anidada de la extensión, Prisma fuerza el *checked input* y **rechaza** el `institutionId` escalar. El
   `createInstance` ya resolvía esto convirtiendo la FK escalar a `{ relation: { connect } }`, pero el `updateInstance`
   **no tenía** esa simetría.

Conclusión: **el guardado genérico —que en el flujo estándar (modal) guarda y vuelve al listado— no puede usarse para
Curriculum**, porque no sabe partir base/extensión RT en el update ni normalizar la FK requerida. No es que "deje de
volver": es que **se cae antes de guardar**.

> El guardado genérico funciona (y vuelve al listado) para objetos **sin extensión RT** y/o editados en **modal**. Por eso
> la percepción "el guardado normal sí vuelve": se observa en ese flujo. Ver §5 para por qué "vuelve" en ese caso.

---

## 4. Por qué se optó por el guardado custom

Para que la edición de Curriculum **guarde**, se implementó —del lado del mod `curriculum-design`— una mutation custom
`updateCurriculumWithRecordType` (espejo del `createCurriculumWithRecordType` que ya existía para el alta). Esa mutation
hace explícitamente lo que el genérico no hacía:

- **Parte** el payload en campos base vs campos de la extensión `rt__Plan__curriculum`.
- Hace el **update de la base** de forma standalone (FK escalar OK, sin checked-input).
- Hace el **upsert de la extensión** del RT.

El layout de edición de Curriculum se cableó para usar esa mutation vía `customEndpoint`. **Resultado: el guardado
funciona** (verificado E2E: editar un Minor/Plan persiste todos los campos, base + RT, sin el error de `progression` ni
el de `institutionId`).

Esta era la alternativa correcta: el split base/RT en escritura es **lógica de dominio del RecordType**, y replicar el
patrón ya probado del alta (`createCurriculumWithRecordType`) es la vía consistente y de menor riesgo.

---

## 5. Por qué el guardado custom guarda pero no vuelve al listado

Aquí está el verdadero gap, y **es de la suite (host de la ruta), no del mod ni de la mutation**.

Tras un guardado exitoso, `layout/src/layouts/RecordDetail.vue` **emite siempre un evento de éxito** hacia el host:

- `instance-updated` cuando es una edición,
- `instance-created` cuando es un alta.

Esto vale **para ambos caminos de guardado** (genérico y custom). En el caso custom, para que el evento sea
`instance-updated` (edición) y no `instance-created` (alta), el layout declara `returnsScalar: true` y la mutation
devuelve `Boolean!`. Eso ya está resuelto: el evento que sube es `instance-updated`, el correcto para una edición.

**Quién navega de vuelta al listado depende del host que escucha ese evento:**

| Contexto de edición | Host que escucha `instance-updated` / `instance-created` | Resultado |
|---|---|---|
| **Modal** (default de la plataforma) | `ModalStackManager.vue` → cierra el modal (`closeModal`) | ✅ vuelve al listado |
| **Ruta full-page** (`openMode: "route"`) | La página de detalle de la suite (`pages/.../[instance_id]/[view_type]/[layout_id]/index.vue`) **solo maneja `navigate-to-relation`** — **ignora** `instance-updated` / `instance-created` | ❌ se queda en el form |

Es decir: **en modal, "volver al listado" = cerrar el modal**, y eso lo hace `ModalStackManager` al escuchar el evento de
éxito. **En ruta full-page no hay equivalente**: la página tiene su propio botón "Guardar" (que dispara el submit del
form) y un botón "Volver" manual, pero **nada navega de vuelta tras un guardado exitoso**.

Curriculum cae exactamente en esa fila: se edita en **ruta full-page**, el guardado custom emite `instance-updated`, y
**nadie en la suite lo escucha** para volver al listado.

> **Matiz importante para el equipo de core**: el guardado **custom no es la causa**. Si Curriculum se editara por el path
> genérico en ruta full-page, **tampoco volvería** (mismo evento, mismo host que lo ignora). Y a la inversa: cualquier
> objeto editado en `openMode: "route"` (p. ej. Activity, que también declara `route`) tiene el mismo comportamiento. El
> `customEndpoint` / `returnsScalar` solo explica por qué Curriculum necesitó un guardado custom; **no** es el origen de
> la falta de navegación.

---

## 6. Cambio solicitado al equipo de core

Que las páginas de detalle full-page de la suite, al recibir un evento de guardado exitoso (`instance-updated` o
`instance-created`), **naveguen de vuelta al listado** — el equivalente en ruta a lo que `ModalStackManager` hace
cerrando el modal.

- **Archivos** (suite, host de la ruta de detalle):
  - `suite/pages/[tenant_id]/[object_name]/[instance_id]/[view_type]/[layout_id]/index.vue`
  - `suite/pages/[tenant_id]/[object_name]/[instance_id]/[view_type]/index.vue`
  - (y, por simetría con el alta, las rutas de creación sin `[instance_id]` que emiten `instance-created`)
- **Qué agregar**: en el handler de `request-action` (hoy solo atiende `navigate-to-relation`), tratar también
  `instance-updated` / `instance-created` → invocar la navegación de vuelta. La función `goBack()` ya existe en la
  página de edición y hace lo correcto: `router.back()` si hay historial (preserva filtros/scroll/paginación del
  listado) y, si no, `router.push` al RecordList del objeto.
- **Comportamiento esperado**: editar en ruta full-page → guardar → toast de éxito → **volver al listado**, igual que el
  modal hoy.

### Alcance y riesgo

| Dimensión | Detalle |
|-----------|---------|
| **Repo / layer** | `suite` (core). Trabajo de core → rama de épica + review del equipo de core. |
| **Tipo de cambio** | Agregar el manejo de `instance-updated` / `instance-created` en el handler de `request-action` del host de la ruta de detalle. Cambio chico y localizado. |
| **Blast radius** | **Todos** los objetos editados en `openMode: "route"` (Curriculum, Activity, AcademicProgram, futuros). Es el comportamiento deseado y consistente con el modal — hoy ninguno de ellos vuelve tras guardar. |
| **Riesgo** | Bajo. No toca el guardado ni la emisión del evento (ya correctos). Solo agrega navegación en el host que hoy ignora el evento. |
| **Reversibilidad** | Alta (handler en la página de la suite, `git revert`). |
| **Sin cambios en** | El mod (`updateCurriculumWithRecordType` y `returnsScalar` ya correctos), `RecordDetail.vue` (ya emite el evento correcto), `ModalStackManager` (ya navega en modal). |

### Alternativas descartadas

- **Resolverlo en el mod** (config del layout, `returnsScalar`, etc.): **no es posible**. El mod ya emite el evento
  correcto (`instance-updated`); la navegación post-guardado la decide el **host de la ruta** en la suite, fuera del
  alcance del mod. Se intentó y se confirmó que la config del mod no controla este punto.
- **Tocar `RecordDetail.vue` para que navegue él mismo**: incorrecto por capas. `RecordDetail` es agnóstico al contexto
  de renderizado (modal vs ruta) — su responsabilidad es **emitir** el evento de éxito; **quién navega** es el host
  (modal o página). Meter navegación en `RecordDetail` duplicaría la responsabilidad de `ModalStackManager` y acoplaría
  el form al routing de la suite.

---

## 7. Estado actual

- El guardado de Curriculum en edición **funciona** (split base/RT + FK normalizada), verificado E2E.
- La **navegación de vuelta al listado tras guardar en ruta full-page** queda pendiente del cambio de core descrito en §6.
- Mientras tanto, el usuario debe volver al listado manualmente (botón "Volver" de la página de detalle).
