---
id: DOC-kb-sp13-guardado-manual-cd-contexto-core-y-referencia-tributacion
project: up1
type: doc
module: curriculum-design
tags:
  - sp13
  - curriculum-design
  - guardado-manual
  - borrador
  - tributacion
  - core
  - UPONE-1931
  - contexto
---

# Guardado manual en cd: contexto del core y patrón de referencia de tributación

Documento de contexto que alimenta los planes por componente y el plan de acción del cambio de autoguardado a guardado manual con borrador, Guardar y Descartar en curriculum-design (cd). Verificado contra código real el 2026-10-13, rama develop (cd 6e2988f, monorepo up1 2c19522). Las decisiones tomadas sobre estos precedentes están en [[guardado-manual-cd-decisiones-resueltas]]. Documentos hermanos al final.

## En una frase

El patrón de guardado manual ya existe y funciona en tributación (mod curriculum-mapping, cm), y cm tiene además el guardado de un árbol con ids temporales. El core no ofrece un contrato para que un componente se enganche al Guardar del formulario salvo `customEndpoint`, que no sirve en las páginas de cd donde viven los componentes. Por eso cada componente de cd trae su propia barra Guardar/Descartar sobre un composable genérico.

## Glosario

- **Autoguardado**: cada gesto del usuario (arrastrar, aceptar un modal, borrar) escribe a la base de datos de inmediato, sin un botón Guardar.
- **Borrador (draft)**: copia local de los datos que el usuario edita. Los cambios viven solo en pantalla hasta que se guardan.
- **Snapshot**: copia de lo que había en la base al cargar. Sirve de línea base para calcular qué cambió.
- **Diff**: lista de altas, bajas y modificaciones entre el snapshot y el borrador.
- **Dirty**: hay diferencias sin guardar. En tributación se deriva del diff, no de un flag.
- **Batch transaccional**: una sola operación del servidor que aplica muchos cambios juntos: o se guardan todos o ninguno.
- **Elemento custom**: componente Vue propio de un mod que se monta dentro de un layout de UP1.
- **Core**: los repos `layout` (front) y `object-manager` (backend) que comparten todos los mods.
- **knownIds**: ids que el cliente conocía al cargar. El servidor solo retira lo que está en esa lista y ya no viene en el payload.
- **`_tempId`**: id temporal de un nodo nuevo en el cliente; el servidor lo resuelve y devuelve el mapeo a ids reales.
- **`customEndpoint`**: configuración de un layout que hace que el Guardar del formulario ejecute una mutation gobernada con los datos del formulario, en lugar del guardado estándar.

## Nota de alcance: qué es de cd y qué es del core

En el mod cd, `components/` y `composables/` son enlaces simbólicos a `layout/src/components` y `layout/src/composables`. Los elementos genéricos (`FileFieldElement`, `ReferenceSelectElement`, `RecordPickerElement`, `RecordDetailElement`, `RecordListElement`, `usePendingChanges`, `PendingChangesPanel`) son del core. Los componentes custom propios de cd son los 8 de `modsComponents/`: CurriculumMesh, CompositeSectionTree, RequirementEditor, ColorPicker, ActivityStatusBadge, InstructionalTotalDisplay, ReglaUnificadaView y RichTextRenderer.

Consumidores cruzados verificados: ningún otro mod importa estos componentes. Las coincidencias en academic-scheduling, curriculum-mapping y up1-manager son comentarios que citan el patrón. cm declara explícitamente que no importa CurriculumMesh (`MatrixMeshView.ts`).

## Precedente 1: guardado manual de tributación (referencia principal)

Componente: `curriculum-mapping/modsComponents/CompetencyAlignmentGrid/` (Element de 3719 líneas más módulos de lógica).

**Modelo de estado** (`competencyAlignmentDraft.logic.ts`):
- Estado `{snapshot, draft}`, ambos mapas por clave lógica `sourceId::competencyNodeId` (L52-83). La clave excluye el nivel, así que mover de nivel se ve como modificación.
- `isDirty` es un computed sobre `diffDraft` (L218-261). Un peso `"50.0"` contra `"50"` no ensucia.
- Operaciones puras e inmutables: `upsertRow`, `removeRow`, `setField`, `moveRowToLevel`, `knownIdsOf`, `resetDraft` (L125-212).
- El estado vive en el shell como `draftState` y se recrea en cada `loadView` (Element L548, L1065).

**Guardar** (`onSaveAlignmentSet`, Element L1182-1222):
- Una sola mutation `upsertCompetencyAlignmentSetValidated` con el conjunto completo del borrador y `knownIds` (L1191-1201).
- El servidor (`competencyAlignment-batch.resolver.js` L380-568) valida antes de abrir la transacción (tope de filas, RBAC por operación efectiva, plan editable), aplica altas, cambios y bajas dentro de `runInTransaction`, registra una sola entrada de historial y publica el evento después del commit.
- Éxito: notifica y recarga la vista. Si la recarga falla, la mutation ya ocurrió: se muestra un aviso y el borrador conserva una línea base vieja.
- Error: el borrador no se toca y el reintento manual es seguro.
- Con `PLAN_LOCKED` se recarga a solo lectura y el borrador se descarta a propósito.

**Descartar** (`onDiscardDraft`, L1226-1232): restaura el borrador desde el snapshot, sin llamar al servidor, sin confirmación, sin deshacer por operación.

**Aviso de cambios sin guardar**: indicador en la barra y confirmación solo al cambiar de matriz (L1096-1105, L342-352). No hay protección al cerrar la pestaña, recargar, navegar, cambiar de pestaña del formulario o cambiar de layout (el componente lo declara, L30-33). No existe `beforeunload` en el mod.

**Permisos**: `deriveCompetencyAlignmentAccess` combina `enableEdit` del layout, capabilities por operación y estado del plan, fail-closed (`competencyAlignmentPermissions.logic.ts` L79-115). El servidor revalida todo.

**Reutilizable**: modelo snapshot/draft/diff, guardado de conjunto con `knownIds`, barra con `saving` y `saveError`, descarte de cargas atrasadas (L1055-1058), traducción de errores por `extensions.code`, permisos en capas. **Específico**: la clave `sourceId::competencyNodeId`, los campos editables, la regla del peso, la carga masiva por niveles y los códigos del plan. La lógica del borrador importa un tipo desde `CompetencyAlignmentGridTable.ts` (L10), por eso hoy no se reusa tal cual.

**Limitaciones heredadas si se copia sin mejorar**: sin protección ante cierre de pestaña, Descartar sin confirmación, concurrencia de última escritura gana, payload `JSON!` sin tipado, lógica concentrada en un Element de 3719 líneas, rechazo del conjunto sin indicar la fila culpable.

## Precedente 2: guardado de un árbol con ids temporales (cm)

`curriculum-mapping/logic/competencyTree-upsert.resolver.js` (`upsertCompetencyTreeValidated`):
- Payload plano con `parentId`; los nodos nuevos traen `_tempId` y pueden colgar de otros nodos nuevos del mismo guardado. `planTree` resuelve niveles y la escritura baja de a uno.
- Devuelve `nodes` (mapeo a ids reales) y `warnings` que no bloquean (suma de pesos distinta de 100; se bloquea al publicar).
- Un grupo de hermanas que viene entero se renumera a 1..N respetando el orden recibido.
- Rechaza todo el guardado si un id ya no existe, y exige el árbol entero.
- Todo en una transacción. El borrado va aparte (`deleteCompetencyNodesValidated`), de forma inmediata.

Es el modelo del guardado del árbol de secciones y del editor de requisitos de cd.

## Precedente 3: elementos en el Guardar del formulario con `customEndpoint` (cm y core)

- `PerformanceScaleEditor` y `CompetencyTreeEditor` son elementos `submits: true`: su valor (con `_tempId` y `_dirty` por fila) vive en `form$.data` y viaja a una mutation gobernada a través del `customEndpoint` del layout (`default_PerformanceScale_edit.json`, `default_CompetencyNode_edit.json`, `default_DevelopmentLevel_edit.json`).
- Lo ejecuta `RecordDetail.vue` (L5272): si el layout trae `customEndpoint`, el formulario llama a esa mutation con las variables armadas desde `formData` en lugar del guardado estándar.
- Con este mecanismo el elemento participa del dirty, del Guardar y del aviso de cierre del formulario sin kit del core.
- Limitación: es una sola mutation por layout y reemplaza al guardado estándar. Sirve en un layout dedicado a un solo objeto; no sirve en `default_Activity_edit.json` (campos estándar de la Activity más árbol y editor de requisitos) ni en `default_Curriculum_edit.json` (malla y tributación juntas, cada una con su guardado).

## Qué ofrece el core hoy

Verificado en `layout` y `object-manager`, ambos en develop = origin/develop.

**Guardar del formulario** (`layout/src/layouts/RecordDetail/RecordDetail.vue`):
- En modal, `ModalStackManager` llama a `submitForm()` (L881-884) y antes corre `modal.beforeSave` (L860-875). Habilitar Guardar en edición exige `form.dirty || isDirty() || hasPersistedChanges()` (L659).
- `afterSave` es una lista declarativa del layout, con composable y método cargados con `loadComposable`. Los errores se tragan con `console.error` (L5456, L5630): el guardado se da por exitoso aunque falle el hook.
- La cola diferida de pickers `executePendingPickerOps` corre tras el guardado del padre.
- `isDirty` es `vueform.dirty` (L7657-7659).

**Aviso de cambios sin guardar**:
- Modal: `ModalStackManager.vue` L758-830 consulta `isDirty()`.
- Ruta completa: `onBeforeRouteLeave` en la página de detalle consulta solo `isDirty()`.
- No existe `beforeunload` en RecordDetail ni en suite (solo en ScenarioImport).
- Consecuencia: un borrador interno de un componente no ensucia el formulario, por lo tanto estos avisos no se activan.

**Contratos para elementos custom** (provide/inject por clave de texto):
- `up1:record-persisted-by-element`: el elemento avisa que persistió por su cuenta y habilita Guardar sin marcar dirty. Lo usa solo `FileFieldElement`.
- `up1:record-saved-by-element`: el elemento persistió todo y el host emite el evento y cierra el modal.
- Elementos `submits:true` participan del Guardar vía `form$.data`/`element.update` (precedente 3).
- **No existe** un contrato para registrar callbacks propios de guardar, descartar o dirty.

**Backend** (`object-manager/src/services/objectHooks.js`): un hook por objeto y registrar uno reemplaza al anterior. Solo `beforeCreate` y `beforeUpdate` (L39-58). No hay hooks `after*` ni transacción multi-mod.

**Código de borrador del core**: `usePendingChanges` (784 líneas), `useInlineEditing` y `PendingChangesPanel` implementan borrador/aplicar/cancelar, pero atados a celdas de RecordList (`rowId` + `fieldKey`) y a `updateBulkInstances`. Su único consumidor es `RecordList.vue`. No se usan en cd.

## Contexto de la propuesta UPONE-1931

El ticket UPONE-1931 ("componentes de learning assessment no deben autoguardar", sin descripción) derivó en la propuesta de un Kit de guardado de UP1 en el core, publicada en Jira el 2026-09-25 en comentarios del propio ticket:
- K1: contrato del participante en el front. K2: orquestador en RecordDetail. K3: hooks `after*` multi-mod en transacción en el backend. K4: declaración en el layout, guardia en sync y guía/plantilla.
- Alcance propuesto: 31 casos de validación, 11 entregables, 66 SP, con primer valor al usuario en 11 SP. Adoptantes iniciales: CompositeSectionTree, RequirementEditor y CurriculumMesh (cd) y la grilla de tributación (cm).
- Pendientes de esa propuesta: redactar el ticket Core Extension, partir el ticket en subtareas, verificar modal o página completa y si un hook backend puede registrarse desde un mod. El caso 28 (tributar asignaturas del borrador de la malla) quedó resuelto aquí como "solo persistidas" (decisión D8).
- Ese ticket no aparece citado en código ni en docs del mod cd.

## Contrato de participación adoptado

Interfaz mínima que cada componente expone, sea con barra propia hoy o enganchado al core mañana:

- `isDirty`: valor derivado del diff.
- `save()`: promesa que resuelve en éxito o rechaza con código de error tipado.
- `discard()`: restaura desde el snapshot, con confirmación si hay cambios.
- `registrarEnHost`: opcional, cuando exista K1/K2 en el core.

Diseño adoptado (decisión D2): un composable genérico en cd (modelo snapshot/draft/diff, estados `saving` y `saveError`, descarte de cargas atrasadas, `beforeunload`) con un adaptador desacoplado del host. Primero lo consume la barra propia de cada componente; cuando el core publique el contrato, solo cambia el adaptador.

## Qué no cubre este documento

- No define el diseño del kit del core (eso es UPONE-1931).
- No verifica los layouts de cd distintos de Curriculum y Activity.
- No mide rendimiento.

## Pendientes de verificación

- Si la edición de Activity y de Curriculum abre en modal o en página completa.
- Si un hook backend puede registrarse desde un mod.
- Qué hace `onConfirm` de `RecordPicker`.

## Vigencia

Depende de `layout`, `object-manager`, de los resolvers de cm citados y de UPONE-1931. Re-verificar `RecordDetail.vue`, `ModalStackManager.vue` y `objectHooks.js` si cambia alguno, y antes de iniciar cualquier ticket derivado.

## Documentos relacionados

- [[guardado-manual-cd-decisiones-resueltas]]
- [[guardado-manual-cd-plan-de-accion]]
- [[guardado-manual-cd-curriculum-mesh]]
- [[guardado-manual-cd-composite-section-tree]]
- [[guardado-manual-cd-requirement-editor]]
- [[guardado-manual-cd-componentes-menores]]
