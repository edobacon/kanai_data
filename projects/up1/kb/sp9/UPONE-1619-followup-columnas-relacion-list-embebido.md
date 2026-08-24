# UPONE-1619 - Columnas de relacion (proyeccion RT) en un list embebido: caso, limitante y opciones

> **Interno, no pegar en Jira.** Registro del follow-up detectado en el smoke de E2 (S5.T4) sobre el
> listado embebido de piezas de dictado dentro del detalle de la Modalidad. La lista solo renderiza la
> columna "Nombre"; las columnas con atributos de la pieza (horas, tipo, grupo, docentes) no aparecen.
> Aqui queda la evidencia del caso, que se quiere lograr, la limitante real del motor, y las dos opciones
> (mod-only y core) con el detalle de cada una, para que Aduana decida la frontera.
>
> Contrato del ticket: `UPONE-1619-detalle.md`. Aduana previa del ticket: `UPONE-1619-aduana.md`
> (ya anticipo esta capacidad como observacion, ver seccion 6). Todo lo verificado aqui se leyo del
> working tree real el 2026-08-19.

---

## 1. Que se quiere

En el detalle de una Modalidad (`rt__Modality__curricularsection`, view y edit) hay un listado embebido
de sus **piezas de dictado** (`rt__InstructionalComponent__curricularsection`, RecordType de
`CurricularSection` anidado por `parentId`). El objetivo del formulario (Request de UPONE-1619) es que ese
listado muestre las piezas **con sus atributos**: Tipo, Horas semanales, Tamano de grupo, Docentes. Hoy la
lista solo muestra **Nombre**.

## 2. Evidencia del caso

### 2.1 El config del list ya declara las columnas (mod, bien formado)

`mods/curriculum-design/config/layouts/default_rt__Modality__curricularsection_{view,edit}.json`, campo
`piezasList`:

```json
"piezasList": {
  "type": "record-list",
  "objectName": "CurricularSection",
  "layoutConfig": {
    "relations": ["rt__InstructionalComponent__curricularsection"],
    "columns": [
      { "key": "name", "label": "Nombre", "sortable": true },
      { "key": "rt__InstructionalComponent__curricularsection.componentTypeName", "label": "Tipo" },
      { "key": "rt__InstructionalComponent__curricularsection.hoursPerWeek", "label": "Horas semanales" },
      { "key": "rt__InstructionalComponent__curricularsection.plannedGroupSize", "label": "Tamano de grupo" },
      { "key": "rt__InstructionalComponent__curricularsection.requiredInstructorCount", "label": "Docentes" }
    ],
    "filters": [
      { "field": "parentId", "operator": "EQUALS", "value": "{{parentId}}" },
      { "field": "recordType", "operator": "EQUALS", "value": "InstructionalComponent" }
    ]
  }
}
```

Las columnas usan la sintaxis dot-path de relacion (`<relacion>.<campo>`) sobre el objeto base
`CurricularSection`.

### 2.2 Comportamiento observado (smoke S5.T4)

En la UI real (Calculo I -> Modalidades -> Presencial -> tab "Piezas de dictado"), la lista embebida
muestra las 2 piezas (Catedra, Practica) pero **solo con la columna Nombre**. Ninguna de las 4 columnas de
proyeccion RT aparece.

### 2.3 Causa raiz en el motor (no es config)

`layout/src/layouts/RecordList/RecordList.vue`, `applyLayoutColumnOverrides` (lineas 7276-7298). La
docstring es explicita:

> *"Merge per-column overrides (label, sortable, editable) from a layout config into the matching backend
> fields. Layout columns that don't appear in the backend response are intentionally NOT added - the
> backend has already filtered the field list by RBAC, so any column the layout config references but the
> user can't read should be dropped, not stubbed back in."*

El cuerpo solo mapea sobre `availableFields` (los campos reales del objeto base que devuelve
`getObjectFields`): si el `key` de una columna del config no coincide con un campo backend, la funcion no
la agrega. Una columna dot-path (`rt__...componentTypeName`) no es campo real de `CurricularSection`, asi
que se descarta. El comentario de la linea 7421 ("Virtual columns ... appended as stubs") esta
desactualizado: la funcion real no las agrega.

Consecuencia: el list arma sus columnas desde los campos del **objeto base** (`CurricularSection`), donde
solo `name` (entre las 5 declaradas) es campo real -> por eso "solo Nombre". El dato de la relacion si se
trae (el config declara `relations`, y `RecordList.vue:4633` documenta que el tab embebido trae "base +
relations"), pero **no hay columna que lo renderice** ni resolucion de celda por dot-path.

## 3. La limitante

El RecordList, **por diseno**, construye sus columnas contra los campos reales del objeto base y descarta
cualquier columna del layout que no sea un campo real de ese objeto (filtrado por RBAC). No existe hoy el
soporte de **columna de proyeccion de relacion** (dot-path) en el list: ni el append de la columna
virtual, ni la resolucion del valor de celda caminando `item.data[<relacion>].<campo>`.

Es la misma capacidad que la Aduana previa del ticket ya habia marcado como generica y diferida (ver
seccion 6).

## 4. Opciones

### Opcion B - mod-only (workaround por objectName = alias RT)

**Idea**: en vez de un list de `CurricularSection` + `relations` + columnas dot-path, apuntar el list
embebido a `objectName: "rt__InstructionalComponent__curricularsection"` (el alias RT), con columnas de
**campo plano**:

```json
"piezasList": {
  "type": "record-list",
  "objectName": "rt__InstructionalComponent__curricularsection",
  "layoutConfig": {
    "columns": [
      { "key": "name", "label": "Nombre" },
      { "key": "hoursPerWeek", "label": "Horas semanales" },
      { "key": "plannedGroupSize", "label": "Tamano de grupo" },
      { "key": "requiredInstructorCount", "label": "Docentes" }
    ],
    "filters": [ { "field": "parentId", "operator": "EQUALS", "value": "{{parentId}}" } ]
  }
}
```

**Por que puede funcionar**: `getObjectFields` del alias RT devuelve los campos base + satelite como
campos reales (evidencia: el RecordDetail del alias YA renderiza `hoursPerWeek`, `plannedGroupSize`, etc.
como campos reales, verificado en el smoke). Si el list usa el alias, esas columnas existen como reales y
pasan el filtro de `applyLayoutColumnOverrides`. El `listInstances(name = alias RT)` lo maneja el resolver
del mod (`curriculum-read.resolver.js`, `isCurricularSectionRead`). El filtro `recordType` se vuelve
redundante (el alias YA es ese RecordType).

**Frontera**: solo toca `mods/curriculum-design/config/layouts/` (JSON). Cero core.

**Caveat (el punto a resolver)**: la columna **Tipo** (`componentTypeId`) mostraria el **id**, no el
nombre. El list no tiene el mecanismo de select-nativo con `references` que si tiene el RecordDetail
(seccion "select nativo", commit S5). Sub-opciones para el Tipo en el list:
- B1: omitir la columna Tipo del list (mostrar horas/grupo/docentes, que son el objetivo principal). 100%
  mod-only.
- B2: resolver el nombre del tipo por otra via en la celda del list. Esto podria necesitar un toque core
  (resolucion de nombre de FK escalar en celda de list) -> deja de ser mod-only para esa columna puntual.

**Riesgo/incertidumbre**: no verificado en runtime que un `record-list` embebido acepte `objectName` =
alias RT con el filtro `parentId`. Requiere smoke antes de darlo por bueno.

### Opcion A - core (soporte real de columnas de relacion en el list)

**Idea**: que el motor del RecordList soporte columnas dot-path de relacion como capacidad de plataforma:
(a) reconocer un `key` con punto como columna de proyeccion de la relacion declarada en `relations`,
(b) agregar esa columna virtual aunque no sea campo real del objeto base, (c) resolver el valor de celda
caminando `item.data[<relacion>].<campo>` (el dato ya viene por `relations`), respetando RBAC del objeto
relacionado.

**Donde**: `layout/src/layouts/RecordList/RecordList.vue` (workspace **core** `layout`), principalmente
`applyLayoutColumnOverrides` (7283) + la inicializacion de columnas (`initializeColumnConfiguration`) + el
render/resolucion de celda por dot-path. Alinear el comentario obsoleto de la linea 7421 con el
comportamiento real.

**Frontera**: `layer: core`. Aplica `core_work_policy` (RULE-dev-004): rama de epica, merge a develop
gated por revision del team up1. Va por el proceso de core-extension.

**Beneficio**: capacidad generica; cualquier mod con satelites RT (o relaciones) que quiera mostrar
atributos del relacionado en un list embebido se beneficia. Resuelve tambien el Tipo por nombre
(via `componentTypeName` anidado que el resolver del mod ya enriquece).

**Costo/riesgo**: cambio en un componente central (RecordList) de alto uso; superficie de regresion amplia
(el list lo usan todos los mods). Requiere tests del motor + revision del team core.

## 5. Recomendacion

Camino incremental barato-primero:
1. Probar **Opcion B1** (mod-only, omitir Tipo o mostrarlo aparte): reapuntar el list embebido al alias RT
   y verificar en runtime que rendericen horas/grupo/docentes. Es config, reversible, sin core.
2. Si el **Tipo por nombre en el list** resulta obligatorio y B1/B2 no lo cubren mod-only, escalar **solo
   ese pedazo** (resolucion de nombre de FK escalar en celda de list) o la **Opcion A completa** como
   core-extension.

No es bloqueante de E2 (cosmetico del list embebido). Se puede diferir como follow-up con ticket propio.

## 6. Relacion con la Aduana previa del ticket

`UPONE-1619-aduana.md`, seccion "Razonamiento descartado", ya habia anticipado esta capacidad:

> *"Marcar la derivacion del total como core-worthy y escalar una capacidad de campo derivado desde una
> coleccion de hijos, o una fila de totales en el listado. Es una capacidad genuinamente generica que
> otros mods podrian querer. Se descarto para este ticket porque el mod puede resolverlo integramente con
> un resolver propio... Queda registrado como observacion y como Decision abierta en el contrato, no como
> veredicto core-worthy."*

Lo de aqui es el **hermano concreto** de esa observacion, ya materializado: no el total derivado (resuelto
con componente custom en view), sino las **columnas de relacion en el list embebido**. La evidencia de la
seccion 2 confirma que la capacidad no existe hoy y que el mod no la puede fabricar sin, o bien cambiar la
estrategia del list (Opcion B, con el caveat del Tipo), o bien tocar core (Opcion A).

---

## 7. Veredicto Aduana (frontera core/mod)

> Pasada de analisis 2026-08-19. Modo: analisis, no se creo ningun ticket ni se invoco
> `core-extension-writer`. La decision final de frontera la tiene el triage del team core.

### Artefactos y juicio

| Artefacto | Tipo | Juicio | Razon |
|---|---|---|---|
| Config del list `piezasList` (reapuntar `objectName` al alias RT + columnas de campo plano `hoursPerWeek`, `plannedGroupSize`, `requiredInstructorCount`) | layout-config | **Mod-only** | Es solo JSON del mod. El alias RT expone esos campos como reales (`getObjectFields` del alias los devuelve; el RecordDetail del alias ya los renderiza). El RecordList YA soporta columnas de campo real -> sin capacidad nueva |
| Columna "Tipo" por nombre en el list (`componentTypeId`, FK escalar -> nombre del catalogo) | layout-config capability | **Core-worthy** (evitable) | El list tiene `relationDisplayFields` para FK reales, pero NO un mecanismo `references`/`valueField`/`displayField` para FK escalar como el que SI tiene el RecordDetail (`RecordList.vue`: sin equivalente a `fetchReferenceSelectOptions`). Generico: cualquier mod con FK escalar a catalogo lo querria en un list. **Evitable mod-only** omitiendo la columna (B1) o mostrando el id |
| Soporte de columnas dot-path de relacion en RecordList (append de columna virtual + resolucion de celda `item.data[rel].campo` con RBAC) | layout type / capability (core `layout`) | **Core-worthy** | Verificado que NO existe: `RecordList.vue:7276-7298` descarta por diseno columnas que no son campo real del base; el comentario de `~7421` ("appended as stubs") esta desactualizado. Capacidad genuinamente generica (todo mod con relaciones/satelites RT la usaria). **No requerida** si se toma la Opcion B |

### Veredicto global

**Frontera mixta, con salida mod-only para el objetivo principal.** Las columnas de atributos de la pieza
(Horas semanales, Tamano de grupo, Docentes) se resuelven **mod-only** por la Opcion B (reapuntar el list
al alias RT). Las dos capacidades genericas (columnas dot-path de relacion, y nombre de FK escalar en celda
de list) son **core-worthy** pero **no bloqueantes**: no hacen falta si se toma la Opcion B con la columna
Tipo omitida o mostrada como id.

### Recomendacion (reparto mod/core)

1. **Ahora, mod-only (Opcion B1)**: reapuntar `piezasList` al `objectName` del alias RT con columnas
   `name`, `hoursPerWeek`, `plannedGroupSize`, `requiredInstructorCount`; **omitir la columna Tipo** (o
   mostrarla como id de forma explicita). Cero core, reversible, desbloquea lo visible. Verificar en smoke
   que un record-list embebido acepta `objectName` = alias RT con filtro `parentId`.
2. **Si el "Tipo por nombre en el list" se vuelve requisito**: escalar a `core-extension-writer` el
   artefacto **acotado** primero (paridad de `references`/`valueField`/`displayField` para FK escalar en
   celda de RecordList), y solo si el team core lo prefiere, la capacidad **amplia** (columnas dot-path de
   relacion). Origen: UPONE-1619. No se crea ticket en esta pasada.

### Que se recomendaria escalar (sin crear)

- **Core-extension candidato (acotado)**: "Resolucion de nombre de FK escalar en celda de RecordList"
  (paridad con el select-nativo del RecordDetail, `references`+`valueField`+`displayField`).
- **Core-extension candidato (amplio, opcional)**: "Columnas de proyeccion de relacion (dot-path) en
  RecordList". Es la materializacion de la observacion ya registrada en `UPONE-1619-aduana.md`.

Ambos quedan como **candidatos**, no como tickets. La decision de crearlos es del dev + triage del team
core.
