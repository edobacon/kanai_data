---
id: DOC-kb-sp9-UPONE-1686-pre-intake
project: up1
type: doc
---

# UPONE-1686 - Pre-intake (guia de implementacion)

> **Interno, material del implementador.** Alimenta un intake de DKC: entrega el mapa de enfoques, las
> hipotesis a validar y las consideraciones tecnicas para que el intake genere/confirme hipotesis, las
> valide y corra el flujo, sin partir de cero. Contrato del ticket: `UPONE-1686-detalle.md`. Delta contra
> el analisis previo: `UPONE-1686-reconciliacion.md`. No pegar en Jira.

## Veredicto y superficie

- **No es "feature nueva". Es cierre de deuda + config del consumidor.** El mecanismo de columnas de
  proyeccion de relacion ya existe y esta mergeado a develop. La superficie remanente es chica:
  - `layout/src/layouts/RecordList/RecordList.vue:7417-7423` (comentario mal atribuido) - core.
  - `layout/docs/reference/record-list-config-keys.md` (documentar clave dot-path + opt-in) - core.
  - Tests del contrato dot-path en `layout` (unit + smoke) - core.
  - `mods/curriculum-design/config/layouts/default_rt__Modality__curricularsection_{view,edit}.json`
    (agregar `visible: true` a las 4 columnas) - **mod**, fuera del ticket de core.

## Estado actual del codigo (verificado 2026-08-20, rama develop de layout)

- **Deteccion de columna dot-path:** `useColumnConfiguration.ts:108-119` (`relationColumnFields`). Una
  columna es RelationField si su `key` contiene `.`, no es `source` y no coincide con un campo real de
  `availableFields`.
- **Merge de campos:** `useColumnConfiguration.ts:121-125` (`effectiveFields`) = reales + source + relacion.
- **Gate opt-in:** `useColumnConfiguration.ts:203-219`. Linea clave:
  `visible: relationColumnKeys.has(col.key) ? col.visible === true : col.visible !== false`. Para una
  columna de relacion, `visible` es `true` **solo si** el layout puso `col.visible === true`; si se omite,
  queda `visible: false` (aparece en el selector de columnas, no se renderiza).
- **Resolucion de celda dot-path:** `recordListFormatters.ts:261-301` (`getDisplayValue`). Arma
  `recordData = { ...item.data, ...item.extended, ...item }`, parte el `fieldName` por `.`, camina cada
  tramo (parseando JSON serializado) y devuelve `-` si es nulo. Llamado desde `RecordList.vue:6175-6184`.
- **Fetch de la relacion:** `useDataFetching.ts:143-156` y `RecordList.vue:2504, 7447-7463` (la clave
  `relations` -> `includeRelations: true` + `relations` en la query `LIST_INSTANCES`).
- **Referencia (no tocar):** RecordDetail resuelve FK escalar por nombre con `fetchReferenceSelectOptions`
  (`RecordDetail.vue:2045`) y un branch de `enrichSchemaWithFKMetadata` (`RecordDetail.vue:3427`).
- **Consumidor:** `piezasList` en `default_rt__Modality__curricularsection_view.json:58-86` (y `_edit`),
  con `objectName: CurricularSection`, `relations: [rt__InstructionalComponent__curricularsection]` y 4
  columnas dot-path **sin `visible`**. El resolver enriquece el objeto anidado con `componentTypeName`
  (`curriculum-read.resolver.js:446, 477, 512`).

## Separacion hechos / propuesta / inferencia (DET-4)

| Estado | Afirmacion |
|---|---|
| **Verificado** | El mecanismo dot-path (RelationField) existe, es opt-in por `visible: true`, y esta en develop (`useColumnConfiguration.ts:108-219`, `recordListFormatters.ts:261-301`, commit `4b9bf665`) |
| **Verificado** | El consumidor `piezasList` no declara `visible: true` en sus columnas dot-path -> por eso el smoke vio solo "Nombre" |
| **Verificado** | El comentario de `RecordList.vue:7417-7423` esta mal atribuido; `applyLayoutColumnOverrides` (7283-7298) no agrega columnas |
| **Verificado** | El doc `record-list-config-keys.md` no documenta la clave dot-path ni el opt-in |
| **Propuesta del analisis** | El trabajo core se reduce a comentario + doc + tests; el render ya funciona con `visible: true`. A confirmar con un smoke real del consumidor |
| **Inferencia sin respaldo** | Que la degradacion por RBAC del objeto relacionado ya este cubierta end-to-end en la celda dot-path. `getDisplayValue` no consulta RBAC por si mismo; el filtrado depende de que el backend no traiga el campo sin permiso. **Validar** antes de afirmar el AC de RBAC |

## Analisis de enfoques (posibilidades)

**Opcion A - Acotar a la realidad (recomendada).** Tratar el ticket como cierre de deuda de plataforma:
corregir el comentario `7417-7423`, documentar la clave dot-path + opt-in `visible:true` en
`record-list-config-keys.md`, agregar tests que fijen el contrato ya vigente, y hacer el smoke del
consumidor (con `visible:true` puesto en el mod).
- Pros: honesto con el codigo; deja doc + tests que evitan que el proximo dev repita el diagnostico
  erroneo; ~1 SP; reversible.
- Contras: el "entregable" no es codigo de feature sino doc/tests/comentario; hay que explicar el re-scope
  al PO.
- Reglas up1: respeta core-extension (PR + aprobacion core) y el principio de no reescribir el request.

**Opcion B - Cerrar como ya resuelto.** Cerrar UPONE-1686 declarando que el mecanismo existe (commit/PR de
referencia) y mover comentario + doc a una tarea menor absorbida por el ticket de config del mod.
- Pros: minimo; no ocupa capacidad de sprint.
- Contras: deja el comentario mal atribuido y el doc sin la clave, que fueron parte del pedido; pierde los
  tests de contrato.
- Nota: si se elige B, dejar igualmente registrado el gap de doc/comentario para no perderlo.

**Opcion C - Ampliar a FK escalar por nombre en celda de list.** Portar el patron del RecordDetail
(`fetchReferenceSelectOptions`) a la celda del RecordList, para columnas de FK escalar sin relacion Prisma.
- Pros: capacidad genuina para otros lists.
- Contras: **no la pide el consumidor actual** (el resolver del mod ya entrega `componentTypeName` dentro
  del objeto de relacion, asi que la columna Tipo se resuelve por dot-path, no por FK escalar). Es un
  ticket de plataforma aparte; construirla aqui es alcance nuevo no motivado por este caso. Aqui es donde
  entrarian Aduana + core-extension-writer si se decide crearla, pero como ticket propio, no dentro de este.

Recomendacion: **A**. Confirmar el re-scope con el PO/autor en el intake antes de codear.

## Consideraciones de implementacion

- **El opt-in es contraintuitivo:** default de columna de relacion = oculta; default de campo real =
  visible. Documentarlo explicito para que nadie asuma que declarar la columna basta.
- **Secuencia sugerida (Opcion A):** (1) confirmar re-scope; (2) smoke con `visible:true` en el consumidor
  para tener evidencia de render; (3) tests de contrato en layout; (4) doc; (5) fix del comentario;
  (6) PR core-extension.
- **RBAC:** validar en runtime que sin permiso sobre el objeto relacionado la celda degrada sin romper la
  tabla. Confirmar por donde se aplica el filtro (backend que no trae el campo, o algo en la celda).
- **No mezclar repos en un commit:** el `visible:true` del mod va por el repo curriculum-design; el resto
  por `layout`. Coordinar orden.

## Hipotesis a validar (para el intake)

- **H1:** una columna dot-path con `visible: true` sobre una relacion declarada renderiza el valor en un
  list embebido. _Validacion:_ smoke sobre el detalle de Modalidad con `piezasList` en `visible:true`, o
  un caso minimo en Storybook/test de RecordList.
- **H2:** sin `visible: true`, la columna dot-path no se renderiza (opt-in). _Validacion:_ test unit del
  gate `useColumnConfiguration.ts:203-219`.
- **H3:** una columna dot-path cuya relacion no esta en `relations` no rompe el render. _Validacion:_ test
  con relacion no declarada -> celda `-`, tabla intacta.
- **H4:** sin permiso sobre el objeto relacionado, la tabla degrada sin romperse. _Validacion:_ smoke/test
  con RBAC restringido; confirmar el punto exacto donde se filtra (esta es la inferencia sin respaldo).
- **H5:** el consumidor `piezasList` renderiza sus 4 columnas al agregar `visible:true` y con el resolver
  enriqueciendo `componentTypeName`. _Validacion:_ smoke en tenant real (hoy solo hay verificacion API,
  commit `840ba6c`).

## Decisiones tecnicas abiertas (dev/intake)

- Re-scope A/B/C (ver detalle). Recomendado A.
- Si se agregan tests: donde (unit del composable + formatter, o test de integracion del RecordList).
- Si el smoke del consumidor lo cubre este ticket o el ticket de config del mod.

## Reglas / patrones y su fuente (traza)

- Opt-in `visible:true` de columnas de relacion. _Fuente:_ `layout/src/composables/useColumnConfiguration.ts:203-219`.
- Resolucion de celda por dot-path. _Fuente:_ `layout/src/utils/recordListFormatters.ts:261-301`.
- `relations` alimenta el fetch, no el render. _Fuente:_ `layout/src/composables/useDataFetching.ts:143-156`.
- RecordDetail como referencia de FK escalar (no rehacer). _Fuente:_ `RecordDetail.vue:2045, 3427`.
- core-extension para tocar `layout`. _Fuente:_ label `core-extension`; `docs/guides/core-mod-boundary-workflow.md`.
- No editar archivos sincronizados; solo id Jira en commits/PR; tenant isolation. _Fuente:_ `up1/CLAUDE.md`.

## Archivos candidatos (tentativo)

- `layout/src/layouts/RecordList/RecordList.vue` (comentario 7417-7423).
- `layout/docs/reference/record-list-config-keys.md` (doc de la clave dot-path + opt-in).
- Tests en `layout` (composable/formatter o integracion del RecordList).
- `mods/curriculum-design/config/layouts/default_rt__Modality__curricularsection_{view,edit}.json`
  (`visible:true`, fuera del ticket de core; coordinar con el mod).
