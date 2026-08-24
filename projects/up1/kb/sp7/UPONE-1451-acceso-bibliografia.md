# UPONE-1451 — Acceso a mantenedor de Referencias bibliograficas

- **Titulo Jira:** Curriculum Desing | Programa de asignatura | Acceso a mantenedor de Referencias bibliograficas
- **Tipo:** Historia · **Epica:** [UPONE-1267](https://u-planner.atlassian.net/browse/UPONE-1267) Curriculum Design
- **Dueno:** Eduardo Bacon · **Prioridad:** Menor · **Estado:** Backlog
- **Modulo (Jira):** CurriculumDesign · **Sprint:** Migracion uAssessment - SP7 (jul 20-31)
- **SP planning:** 1-2 · **SP Jira:** **2** · **Alcance SP7:** IN · **Maqueta:** no aplica (curriculum-design)

---

## Descripcion (literal Jira)

> Se requiere:
> - Configurar el acceso del mantenedor de Referencias bibliograficas desde un boton en la vista
>   de Programa de asignatura
> - Ya no se debe visualizar la pestana del mantenedor de Referencias bibliograficas

---

## Que es

Reubicar el acceso al mantenedor de referencias bibliograficas: agregar un boton en la vista de
Programa de asignatura y **quitar la pestana** del acceso general. Es el ticket mas acotado y cerrado
de los cuatro.

## Antecedentes / linaje

- Sin antecedentes directos en tickets previos ni maqueta (es curriculum-design, no mapping).
- Pertenece al dominio de Programa de asignatura (epica hermana
  [UPONE-1038](https://u-planner.atlassian.net/browse/UPONE-1038)).

## Evidencia del transcript

- El boton [00:15:33]: "un boton en la vista de programacion... el acceso ya no se debe visualizar
  la pestana de referencias bibliograficas."
- Tipo y ubicacion [00:15:33]: Eduardo — "el boton adicional que se puede crear, a la altura donde
  esta el crear/registrar elemento... ahi se deberian desplegar la bibliografia." Esteban — "se
  puede usar **custom**." → boton **custom action** en el mantenedor de programa de asignatura.
- Quitar acceso general [00:15:33]: "y quitarlo del acceso general. Esa es la idea del punto."

## Alcance funcional

1. Boton (custom action) en la vista/mantenedor de **Programa de asignatura** que abre el mantenedor
   de **Referencias bibliograficas** (modal o vista embebida).
2. **Remover la pestana** de referencias bibliograficas del acceso general.

---

## Verificacion en codigo (2026-07-21, `uplanner/up1`)

- **`BibliographyReference`** es un **catalogo por institucion** (FK solo `institutionId`; campos:
  rawCitation, title, author, year, publisher, referenceFormat, isbn, doi, url, ...). Tiene layouts
  `default_BibliographyReference_{list,view,edit,create}`.
- **Esta como objeto top-level del app** (`config/app.json` → `defaultObjects: ["Activity",
  "BibliographyReference", ...]`) = el **"acceso general"** que el ticket quiere quitar.
- **Ojo — hay DOS "bibliografia" distintas en la vista de Activity:**
  1. La **pestaña "Bibliografia"** (`default_Activity_view.json:69`, elemento `bibliographyList`)
     muestra **`CurricularSection` recordType `Bibliography`** (`rt__Bibliography__curricularsection`),
     filtrada por la asignatura actual → es la **bibliografia del programa** (contenido), NO el
     mantenedor de catalogo.
  2. El **mantenedor `BibliographyReference`** (catalogo), accesible desde el nav general.
- **Lectura coherente del ticket:** quitar `BibliographyReference` del **acceso general**
  (`app.json` defaultObjects / nav) y exponerlo via **boton (custom action) en la vista de Programa de
  asignatura** que abre `default_BibliographyReference_list`.
> **Alcance confirmado por el dev (2026-07-21):** es el **menu del objeto** `BibliographyReference` que
> se **retira** del acceso general, y se **anade en la seccion del RecordList** (la lista de Programa de
> asignatura) como un **boton extra**. No se toca la pestana de contenido del programa.

### Detalle de implementacion (verificado en codigo)

El boton extra a nivel de lista es el mecanismo **`modalActionButtons`** del RecordList
(`layout/src/types/recordlist.ts:796` → `ModalActionButton[]`; render en `layout/src/layouts/RecordList.vue:132`,
en la toolbar junto al boton "Nuevo"). Abre otro layout (RecordDetail o **RecordList**) en un modal.

**Precedente identico en el repo:** `mods/uengagement-up1/config/layouts/engagement_Activity_service_list.json`
tiene un boton "Tipos de actividad" que abre el mantenedor `ActivityType` como RecordList en modal.
Tambien `mods/up1-manager/config/layouts/recordtype-edit.json`.

**Cambios concretos:**

1. **Retirar el menu del objeto** — quitar `"BibliographyReference"` de `defaultObjects` en
   `mods/curriculum-design/config/app.json` (hoy: `["Activity", "BibliographyReference", ...]`).
2. **Anadir el boton** en `default_Activity_list.json` (RecordList de Programa de asignatura):
   ```json
   "modalActionButtons": [
     {
       "label": "Referencias bibliograficas",
       "languageTag": "recordList.actions.bibliographyReferences",
       "layoutName": "default_BibliographyReference_list",
       "layoutType": "RecordList",
       "objectName": "BibliographyReference",
       "icon": "bi bi-journal-text",
       "modalTitle": "Referencias bibliograficas",
       "requiredPermission": "bibliographyreference:view"
     }
   ]
   ```

Campos del `ModalActionButton`: `label`/`languageTag`, `layoutName`, `layoutType`, `objectName`, `icon`,
`requiredPermission`, `modalTitle`, `isVisible`/`isEnabled`, `initialData`. Es **config de layout pura**,
sin codigo — abre el mantenedor global (no filtrado por parent), que es justo lo que se necesita.

## Analisis de esfuerzo

- **SP planning 1-2 → Jira 2** (sin cambio en el ajuste del 2026-07-21). Eduardo [01:16:21]:
  "maximo dos puntos: mover/activar el boton y configurar el modal o la vista."
- **Calibracion DKC:** sesgo global up1 +100% → proyeccion ~3-4. Ligeramente optimista, pero de
  **bajo impacto absoluto** (ticket chico).
- **Tras verificar codigo:** es **config de layout pura** — quitar el objeto de `defaultObjects` +
  agregar un `modalActionButtons` que abre `default_BibliographyReference_list`. Mecanismo existente con
  precedente en uengagement. Sin codigo nuevo.
- **Veredicto:** **2 correcto** (incluso holgado). Alcance confirmado, patron verificado, precedente
  identico. Es el ticket de menor riesgo del sprint.

## Certezas

- Alcance cerrado y sin ambiguedad funcional: agregar boton + quitar pestana.
- El patron de "boton adicional / custom action" a la altura de crear/registrar es reconocido por
  el equipo.

## Riesgos

- Bajos. El unico ojo: al **quitar la pestana**, verificar que no haya otros consumidores que
  dependan de ella.

## Observaciones / decisiones abiertas

1. **Forma de despliegue**: modal vs. vista embebida (transcript menciona "modal o la vista").
   Confirmar.
2. **RBAC del boton**: definir la capability que gatea el acceso via el boton (no queda explicito).

## No verificado en esta pasada
- Solo falta definir el `icon` y el `languageTag`/i18n del boton (cosmetico) y en cual list exacto va
  (default_Activity_list). Todo lo estructural esta confirmado.

> Ya verificado: alcance (retirar menu del objeto + boton en el RecordList), mecanismo
> (`modalActionButtons`), precedente (uengagement), y que abre el mantenedor global en modal.
