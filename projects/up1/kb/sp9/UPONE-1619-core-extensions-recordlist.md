# UPONE-1619 - Core Extensions (RecordList): drafts para revisar

> **Interno, no pegar en Jira todavia.** Salida de `core-extension-writer` (pasada de redaccion, 2026-08-19)
> sobre los dos candidatos core-worthy que marco Aduana en
> `UPONE-1619-followup-columnas-relacion-list-embebido.md` (seccion 7). **No se creo ningun ticket en Jira**:
> esto es el borrador para revisar y decidir como continuar. Cuando se apruebe, se crea con
> `core-extension-writer` (Step 5) definiendo antes el issue type stand-in (ver "Pendiente de definir").
>
> Ambos tickets son del **RecordList** (list/tabla). Lo del **RecordDetail** (detalle) YA se hizo en esta
> sesion (ver "Ya hecho, no re-proponer"). Los dos tickets son en buena medida **alternativas** segun el
> enfoque que tome el mod, no ambos obligatorios (ver "Relacion entre los dos tickets").

---

## Pendiente de definir antes de crear en Jira

- **Issue type**: el workflow define **UP1 Feature**, pero aun no esta configurado en Jira (Entrega 3 del
  plan de frontera pendiente). Hay que confirmar que issue type usar como stand-in y marcarlo temporal.
- **Origin / blocking**: el origen es UPONE-1619, pero **ninguno de los dos bloquea UPONE-1619**: E2 se
  cerro sin esta capacidad (con la Opcion B1 mod-only). Recomendacion: NO marcar bloqueado a 1619; si se
  quiere trazabilidad, abrir un follow-up mod-ticket propio (curriculum-design) y linkear a ese, o dejar
  el core ext como referencia sin blocking.

## Ya hecho, no re-proponer (esta sesion, RecordDetail)

- `componentTypeId` en el **RecordDetail** del alias `rt__InstructionalComponent__curricularsection`
  (view/edit/create) ya usa el **select nativo** con `references`/`valueField:id`/`displayField:name`:
  muestra el nombre del catalogo `InstructionalComponentType`, guarda el id.
- El componente custom `InstructionalComponentTypeName` fue **eliminado**.
- El total derivado quedo **view-only**.
- Estos tickets NO tocan el RecordDetail. El RecordDetail es la **implementacion de referencia** a espejar
  para el Ticket 1.

---

## Ticket 1 (ACOTADO)

**Title:** RecordList - resolver el nombre de una FK escalar en celda de columna (paridad con RecordDetail)

**Origin:** mod `curriculum-design`, origen UPONE-1619 (follow-up). **No bloquea** UPONE-1619.
**Reported by:** dev curriculum-design, durante el smoke de E2 de UPONE-1619 (S5.T4).
**Urgency:** Low (cosmetico; workaround: omitir la columna u mostrar el id).
**Change Type:** New optional capability (tipo 3).

**Functional description:**

En una tabla (RecordList), una columna atada a una **FK escalar** (un id guardado en la fila que apunta a
un catalogo, sin relacion Prisma) muestra el **id crudo**, no el nombre. Un coordinador ve un codigo
(`cmt0i8u...`) en vez de "Practica". El **RecordDetail** ya resuelve esto: una columna/campo que declara
`references` + `valueField: "id"` + `displayField` trae el registro del catalogo y muestra su nombre. El
**RecordList no tiene ese mecanismo** en sus celdas. Se pide **paridad**: que una columna de RecordList
pueda declarar lo mismo y mostrar el nombre del catalogo en vez del id, para cualquier list con una columna
FK escalar (no solo curriculum-design).

Consumidor concreto que lo motiva: la columna "Tipo de pieza" del listado embebido de piezas dentro de la
Modalidad (curriculum-design), cuando el list se arma sobre el alias RT (Opcion B) y `componentTypeId` es
una columna real que hoy mostraria el id.

**Technical (New Optional Capability + Layout config artifact):**
```
New surface: claves de columna de RecordList `references` + `valueField` + `displayField`
Where it lives: layout/src/layouts/RecordList/RecordList.vue (motor del RecordList)
Why it's additive: ninguna columna existente usa estas claves hoy; es superficie nueva opt-in, los
  configs actuales siguen renderizando igual

New config key: references + valueField + displayField (a nivel de columna)
Layout type(s) it applies to: RecordList (evaluar ChibiList por consistencia)
Possible values (finito, nunca codigo ni query):
  - references: nombre del objeto catalogo (p.ej. "InstructionalComponentType")
  - valueField: "id" (el valor guardado en la fila es el id del registro referenciado)
  - displayField: nombre del campo a mostrar como label (p.ej. "name")
Example config:
{
  "key": "componentTypeId",
  "label": "Tipo",
  "references": "InstructionalComponentType",
  "valueField": "id",
  "displayField": "name"
}
Must be available consistently across every product (rule 17)? [x] yes
```

Implementacion de referencia (ya existe, a espejar): en el RecordDetail, `fetchReferenceSelectOptions`
(`layout/src/layouts/RecordDetail/RecordDetail.vue:~2045`) + el branch de `enrichSchemaWithFKMetadata`
(`~3427`) hacen exactamente esta resolucion para un campo. El Ticket pide portar ese patron a la celda del
RecordList (batch de opciones por columna, cache, RBAC `<objeto>:view` del catalogo).

**Acceptance criteria:**
- Una columna de RecordList con `references` + `valueField:"id"` + `displayField` renderiza el
  `displayField` del registro referenciado (el nombre), no el id.
- Las opciones se traen una vez por columna (batch), respetando RBAC del objeto referenciado
  (`<objeto>:view`); sin permiso, degradacion sin romper la tabla.
- Cero regresion en columnas existentes (que no declaran estas claves).
- Tests: (a) columna con `references` renderiza el label; (b) fila con id sin match en el catalogo muestra
  fallback identificable (no rompe); (c) sin permiso de lectura del catalogo, la tabla sigue renderizando
  el resto.

**Related:** UPONE-1619 (origen), `UPONE-1619-followup-columnas-relacion-list-embebido.md` (evidencia).

---

## Ticket 2 (AMPLIO)

**Title:** RecordList - columnas de proyeccion de relacion (dot-path)

**Origin:** mod `curriculum-design`, origen UPONE-1619 (follow-up). **No bloquea** UPONE-1619.
**Reported by:** dev curriculum-design, durante el smoke de E2 de UPONE-1619 (S5.T4).
**Urgency:** Low (capacidad generica de plataforma; no bloquea a UPONE-1619).
**Change Type:** New optional capability (tipo 3).

**Functional description:**

Una tabla (RecordList) hoy solo puede mostrar como columnas los **campos reales del objeto base** que
lista. No puede mostrar, como columna, un atributo de un **objeto relacionado** (p.ej. los campos de un
RecordType satelite, o de una FK). El config del layout **ya permite declarar** la relacion a traer (clave
`relations`) y columnas con sintaxis dot-path (`<relacion>.<campo>`), pero el motor las **descarta**: solo
renderiza columnas que sean campo real del base. Se pide que el motor **reconozca** las columnas dot-path,
las **agregue** como columnas (virtuales) y **resuelva** el valor caminando el dato de la relacion ya
traido, respetando el RBAC del objeto relacionado. Beneficia a cualquier mod que quiera mostrar atributos
de un objeto relacionado en una tabla (patron comun: listar hijos/satelites con sus campos).

Consumidor concreto que lo motiva: el listado embebido de piezas dentro de la Modalidad
(curriculum-design), que declara `relations` + columnas `rt__InstructionalComponent__curricularsection.<campo>`
(Tipo, Horas semanales, Tamano de grupo, Docentes) y hoy solo muestra "Nombre".

**Technical (New Optional Capability + Layout config artifact):**
```
New surface: soporte de render para columnas cuyo `key` es dot-path (`<relacion>.<campo>`), apoyado en la
  clave `relations` ya existente
Where it lives: layout/src/layouts/RecordList/RecordList.vue (applyLayoutColumnOverrides ~7283, la
  inicializacion de columnas, y la resolucion de valor de celda)
Why it's additive: los configs sin columnas dot-path siguen igual; la clave `relations` ya existe (hoy solo
  alimenta el fetch de datos, no el render). Es render nuevo opt-in

New config key: `key` de columna con dot-path (`<relacion>.<campo>`); se apoya en `relations: [<relacion>]`
Layout type(s) it applies to: RecordList (embebido en RecordDetail y standalone)
Possible values (finito): un string dot-path que referencia una relacion declarada en `relations` + un
  campo de esa relacion
Example config:
{
  "relations": ["rt__InstructionalComponent__curricularsection"],
  "columns": [
    { "key": "name", "label": "Nombre" },
    { "key": "rt__InstructionalComponent__curricularsection.hoursPerWeek", "label": "Horas semanales" },
    { "key": "rt__InstructionalComponent__curricularsection.componentTypeName", "label": "Tipo" }
  ]
}
Must be available consistently across every product (rule 17)? [x] yes
```

Evidencia del vacio: `applyLayoutColumnOverrides` (`RecordList.vue:7283-7298`) solo mapea sobre los campos
reales del base y no agrega columnas cuyo `key` no exista en el backend (docstring `~7276-7282`: "layout
columns that don't appear in the backend response are intentionally NOT added"). El comentario de `~7421`
("Virtual columns ... appended as stubs") esta **desactualizado** respecto al comportamiento real y debe
alinearse. No hay clave de render dot-path documentada en `layout/docs/reference/record-list-config-keys.md`
(`relations` figura solo como fetch de datos).

**Acceptance criteria:**
- Una columna con `key` = `<rel>.<campo>`, con `<rel>` declarada en `relations`, renderiza el valor del
  dato traido por la relacion (`item.data[<rel>].<campo>`).
- Funciona tanto en list embebido (tab de un RecordDetail) como en list standalone.
- Respeta el RBAC del objeto relacionado.
- Se corrige el comentario obsoleto de `RecordList.vue:~7421`.
- Se documenta la clave en `layout/docs/reference/record-list-config-keys.md`.
- Tests: (a) columna dot-path renderiza el valor de la relacion; (b) relacion no declarada en `relations` no
  rompe; (c) sin permiso sobre el objeto relacionado, degradacion controlada.

**Related:** UPONE-1619 (origen), `UPONE-1619-followup-columnas-relacion-list-embebido.md` (evidencia),
`UPONE-1619-aduana.md` (observacion original de la capacidad).

---

## Relacion entre los dos tickets (como continuar)

**No son ambos obligatorios. Dependen del enfoque del mod:**

| Camino del mod | Ticket 1 (FK label) | Ticket 2 (dot-path) | Resultado |
|---|---|---|---|
| **B1 mod-only** (list sobre alias RT, sin columna Tipo) | no | no | horas/grupo/docentes salen; Tipo omitido. Cero core |
| **B + Tipo por nombre** (list sobre alias RT, `componentTypeId` real) | **si** | no | horas/grupo/docentes + Tipo por nombre. Core = Ticket 1 |
| **Config original** (list sobre CurricularSection + relations + dot-path) | no | **si** | TODO sale, incluido Tipo por nombre via el `componentTypeName` que el resolver del mod ya enriquece en el objeto anidado. Core = Ticket 2 |

Observaciones:
- Con **Ticket 2** solo, la config original funciona completa (incluido Tipo por nombre), porque el resolver
  del mod ya enriquece `componentTypeName` dentro del objeto de relacion. Ticket 2 es el fix "de fondo".
- **Ticket 1** solo aporta si el mod toma la Opcion B (alias RT) y ademas quiere el Tipo por nombre.
- Si el core prefiere una sola capacidad, **Ticket 2** es la mas general y cubre el caso completo sin
  Ticket 1. Ticket 1 tiene valor independiente (cualquier list con FK escalar), pero para ESTE caso es
  redundante frente a Ticket 2.

**Recomendacion de continuidad:**
1. Cerrar E2 con **B1 mod-only** (sin core, sin ninguno de estos tickets). Ya desbloquea horas/grupo/docentes.
2. Si el negocio pide el **Tipo por nombre en el list**: llevar **Ticket 2** al green-light del core team
   (es tipo 3: propuesta breve -> core aprueba -> PR). Ticket 2 resuelve el caso completo.
3. **Ticket 1** dejarlo como candidato de plataforma independiente (util para otros lists con FK escalar),
   pero no crearlo solo para este caso si se toma Ticket 2.

---

## DECISION del dev (2026-08-19): ir por Ticket 2 (fix de mayor escala)

Se elige la solucion de mayor escala (evita el workaround y que el caso se repita):

- **Se crea Ticket 2** (columnas dot-path de relacion en RecordList) como core ticket separado, a ejecutar
  DESPUES. **NO bloquea UPONE-1619.**
- **Ticket 1 se descarta para este caso** (Ticket 2 cubre el Tipo por nombre via el `componentTypeName`
  que el resolver del mod ya enriquece). Queda solo como candidato de plataforma independiente.
- **NO se aplica B1.** La config del mod (`piezasList`: `objectName: CurricularSection` + `relations` +
  columnas dot-path) queda **como esta hoy**, que es la forma exacta que consume Ticket 2.

### Por que UPONE-1619 puede cerrar sin Ticket 2

Aceptacion de E2 (`SPEC-curriculum-design-instructional-component.md:51-52`): "cada modalidad **muestra sus
piezas** y su total derivado". Cumplida (piezas por nombre + total 6/0). Ningun REQ exige las columnas de
atributos en el list; el smoke S5.T4 ya las marco follow-up, no bloqueante.

### Forward-compatibilidad (cero rework al llegar Ticket 2)

Cuando core entregue Ticket 2, el list de UPONE-1619 renderiza las columnas **sin ningun cambio en el mod**,
porque:
- `piezasList` ya declara `relations` + las columnas dot-path (`rt__...hoursPerWeek`, `.componentTypeName`,
  etc.).
- El resolver del mod ya enriquece `item.data[rt__...]` con `{...rt, componentTypeName}` (nested, se
  mantuvo al quitar el top-level).
- El ejemplo de config del Ticket 2 (arriba) es literalmente el `piezasList` actual. Construir Ticket 2 a
  su aceptacion hace que este list se encienda solo.

Estado hasta que Ticket 2 aterrice: el list muestra solo "Nombre" (piezas abribles a su detalle completo).
Sin workaround, sin rework.
