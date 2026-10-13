---
id: DOC-kb-sp13-guardado-manual-cd-componentes-menores
project: up1
type: doc
module: curriculum-design
tags:
  - sp13
  - curriculum-design
  - guardado-manual
  - borrador
  - componentes-menores
  - core
  - plan
---

# Guardado manual en cd: componentes menores y elementos del core que escriben por su cuenta

Revisión de los componentes custom menores de curriculum-design y de los elementos del core que cd monta, para decidir cuáles se ven afectados por el cambio a guardado manual. Verificado contra código real el 2026-10-13, rama develop (cd 6e2988f). Aplica la decisión D3 de [[guardado-manual-cd-decisiones-resueltas]]. Contexto común en [[guardado-manual-cd-contexto-core-y-referencia-tributacion]]; plan global y tickets en [[guardado-manual-cd-plan-de-accion]].

## En una frase

De los 5 componentes custom menores de cd, ninguno escribe a la base: no necesitan borrador. Los únicos autoguardados fuera de los 3 componentes grandes son elementos del core (subida de archivos y creación desde un selector de referencia); por decisión D3 se aceptan como acciones inmediatas fuera del borrador y se documentan como excepción.

## Componentes custom menores de cd (`modsComponents/`)

| Componente | ¿Escribe a la base? | Cómo participa del guardado | Impacto del cambio |
|---|---|---|---|
| ColorPicker (`ColorPickerElement.vue`) | No | Campo de formulario: valor string, `submits: true`, `element.update()` (L11, L111, L203) | Ninguno: ya depende del Guardar |
| ActivityStatusBadge (`ActivityStatusBadgeElement.vue`) | No | Solo lectura: mapea `value` a una variante de Badge. El cambio de estado ocurre por `updateInstance` con el motor de enum del core, fuera del elemento | Ninguno en el componente. La transición de estado sigue como acción inmediata con su propia validación, fuera de cualquier borrador |
| InstructionalTotalDisplay | No | Lee `el$.form$.data.totalHoursPerWeek`, un campo derivado por enriquecimiento de lectura que no se persiste | Ninguno |
| ReglaUnificadaView (`ReglaUnificadaViewElement.vue`, `useReglaUnificada.ts`) | No | Solo lectura, query `network-only` (L90), cabecera "sin edición" (L21-22) | Ninguno. Es la base del árbol que usa RequirementEditor |
| RichTextRenderer | No | Renderiza HTML sanitizado, solo lectura | Ninguno |

Nota: no se verificó qué layout o row action del mod dispara la transición de `ActivityStatus`.

## Elementos del core que cd monta y que escriben por su cuenta

Viven en `layout/src/components/vueform/elements/` (cd los ve vía enlace simbólico). No son propiedad de cd: cambiarlos es trabajo del core y se tramita como parte del kit de UPONE-1931 o como Core Extension.

| Elemento | Hallazgo | Resolución (D3) |
|---|---|---|
| `FileFieldElement.vue` | Autoguarda: `submits: false` (L114) y sube o borra de inmediato con `uploadFieldFile` y su variante multipart (L245-261, borrado L305). Avisa al host con `up1:record-persisted-by-element` (L209-215) sin marcar dirty (UPONE-1979) | Se acepta como acción inmediata fuera del borrador; se documenta. Diferir la subida es trabajo del core |
| `ReferenceSelectElement.vue` | El valor del campo depende del Guardar (`submits: true`, L220, L502, L581). El botón "crear nuevo" abre un modal en modo create que crea el registro destino de inmediato (L377-396) | Se acepta como efecto lateral conocido: el registro destino existe aunque no se guarde el padre. Se documenta |
| `RecordListElement.vue` y `RecordDetailElement.vue` | Contenedores que montan un layout anidado (`LayoutOrchestrator`, RecordDetail L3-14, RecordList L5-18). Todo lo que ese layout haga (edición inline, row actions, su propio Guardar) persiste por separado. `RecordListElement` tiene `submits: false` (L62) | Se inventarían las listas anidadas que usa cd (spike X0). Sin edición inline, no hay cambio |
| `RecordPickerElement.vue` | `submits: false` (L84), usa `MultiSelectPickerTab` con `onConfirm`. No se confirmó si confirmar muta de inmediato o encola. RecordDetail tiene una cola diferida (`executePendingPickerOps`, ~L5465, PICK-05 UPONE-1161) que corre tras el guardado del padre | Pendiente verificar `useMultiSelectPicker` y `onConfirm` |
| `ImageFieldElement`, `RelatedOptionPickerElement`, `FeedbackFormElement` | Dependen del Guardar del formulario (`submits: true`, `element.update`) o escriben a campos hermanos con `writeSibling` | Ninguno |

Precedente en el código: el árbol de competencias de cm también deja una acción inmediata fuera del Guardar (`deleteCompetencyNodesValidated`), por lo tanto existe la convención de excepciones documentadas.

## Qué ofrece el core hoy para esto

- `usePendingChanges`, `useInlineEditing`, `useRowMutation` y `PendingChangesPanel` son del core y están acoplados a RecordList (ver documento de contexto). Ningún componente del mod cd los usa directamente.
- `useRowMutation` ejecuta `client.mutate` inmediato y refetch (L105-160): es una acción inmediata declarativa, no un borrador.

## Plan (esfuerzo orientativo en puntos)

Rangos para calibrar, no compromisos. La numeración corresponde a los tickets del plan.

| Fase | Ticket | Contenido | Esfuerzo |
|---|---|---|---|
| X0 | dentro de G0 | Inventariar en los layouts de cd las listas anidadas, pickers y campos de archivo; confirmar `onConfirm` de `RecordPicker` y la fuente de la transición de estado | 2-3 |
| X1 | X1 | Documentar las excepciones (subida de archivos, crear nuevo, transición de estado) en la guía del mod y en el aviso al usuario; abrir ticket Core Extension solo si el PO decide diferirlas | 3-5 |

Total orientativo en cd: 5 a 8 puntos. El esfuerzo del cambio en el core no se estima aquí.

## Criterios de aceptación propuestos

1. Las excepciones (transición de estado, subida de archivos, crear desde un selector) figuran en la documentación del mod con su motivo.
2. El inventario de listas anidadas, pickers y campos de archivo de los layouts de cd está registrado.
3. Ningún componente menor modificó su comportamiento.

## Pendientes de verificación

- Inventario de listas anidadas y campos de archivo en los layouts de cd distintos de Curriculum y Activity.
- Qué hace exactamente `onConfirm` de `RecordPicker`.
- Qué layout o acción dispara la transición de `ActivityStatus`.

## Vigencia

Depende de los elementos del core (`layout`). Re-verificar si el core cambia `FileFieldElement`, `ReferenceSelectElement` o publica el contrato de UPONE-1931.

## Documentos relacionados

- [[guardado-manual-cd-decisiones-resueltas]]
- [[guardado-manual-cd-contexto-core-y-referencia-tributacion]]
- [[guardado-manual-cd-plan-de-accion]]
- [[guardado-manual-cd-curriculum-mesh]]
- [[guardado-manual-cd-composite-section-tree]]
- [[guardado-manual-cd-requirement-editor]]
