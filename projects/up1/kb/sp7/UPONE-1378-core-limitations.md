# UPONE-1378 · Limitaciones de core que topa el feature "Requisitos"

> Análisis consolidado (2026-07-28) de todas las limitaciones del **core** (`layout/`,
> `object-manager/`) que impiden reproducir 1:1 la maqueta `sp6/mockup-sp6.html` desde el
> **mod** `curriculum-design`, por qué elegimos el enfoque "nativo-first + documentar", y qué
> haría falta para implementar cada cambio de core. Insumo para decidir con el platform team.
>
> **Verificado contra código (2026-07-28).** Cada limitación se puso a prueba leyendo el código
> real en `/Users/edobacon/Workspace/uplanner/up1` (`layout/` y `object-manager/`, rama `develop`).
> Los `file:line` de abajo son los **actuales verificados** (no los de una lectura previa). Cada
> caso incluye veredicto (REAL / PARCIALMENTE REAL / FALSA), evidencia citada, dónde se genera el
> impedimento y viabilidad real de la solución. Ver la sección "Notas de verificación" al final de
> cada limitación cuando el hallazgo corrige o matiza el diagnóstico original.

---

## Por qué lo estamos haciendo de esta forma (validación del enfoque)

**Restricción base, mod-only (RULE-dev-004 / reglas del proyecto).** El mod es autocontenido:
`object-manager/`, `layout/`, `suite/`, `flow/` son **core compartido**. Un cambio ahí afecta a
**todos los mods y tenants** y debe ir por coordinación + aprobación del platform team, no como
efecto colateral de un mod. Por eso el mod NO toca core.

**Nativo-first.** Usamos componentes de plataforma (RecordList, RecordDetail, atoms/molecules,
tokens `--up1-*`) siempre que alcancen. Ventajas: mantenibilidad, consistencia visual (un solo
sistema de diseño), no reinventar, heredar mejoras del core. Componentes custom del mod solo
donde el core no llega (y aun así, con tokens/atoms de up1 para no divergir del diseño).

**Documentar la brecha en vez de forzar.** Cuando la maqueta pide algo que el core no da
mod-only, la opción NO es (a) un workaround custom frágil que diverge del sistema de diseño, ni
(b) tocar core reactivamente sin coordinación. Es: **usar lo nativo hasta donde llega + registrar
la limitación** (este doc + `UPONE-1378-out-of-scope-followups.md §4`) como follow-up de core con
evidencia, para que el platform team lo priorice con contexto. Decisión del dev (2026-07-28):
"dejemos todo lo nativo que se pueda, las limitantes las vamos documentando".

**Consecuencia concreta en este ticket.** La lista de Requisitos quedó como **RecordList nativo**
(3 columnas base) + un **launcher custom mínimo** (botones Agregar / Ver regla unificada + modal
de alta 2 pasos + árbol read-only). La maqueta completa (5 columnas con Vía/Condición + menú por
fila Ver/Editar/Eliminar en modal) **solo sería 100% alcanzable con una tabla custom**, que se
descartó para no divergir del enfoque nativo, a cambio de las limitaciones de abajo.

---

## Limitaciones de core que topamos

### L1 — RecordList no soporta columnas COMPUTADAS / derivadas

**Veredicto: REAL.**

- **Qué pasa.** El RecordList solo renderiza columnas cuyo `key` es un **campo real persistido**
  del objeto. `layout/src/composables/useColumnConfiguration.ts:176-177` filtra las
  `initialColumns` contra `effectiveFields` y **descarta en silencio** cualquier columna derivada:
  ```ts
  // useColumnConfiguration.ts:176-177
  determinedColumns = initialColumns
    .filter(col => effectiveFields.value.some(f => f.name === col.key))
  ```
  `effectiveFields` (líneas 98-101) es la unión de `availableFields` (campos reales del backend) y
  `sourceColumnFields` (líneas 87-97), un mecanismo ya existente pero de alcance angosto: columnas
  "Multivalue" que agregan una relación to-many (UPONE-1334). Cualquier `initialColumns` cuyo `key`
  no calce con ninguno de los dos grupos se descarta sin log ni warning (verificado: no hay
  `console.warn`/`console.error` en el path). El descarte es efectivamente silencioso.
- **Qué nos bloquea.** Las columnas **"Vía"** (derivada de `parentId` + `combinator=OR`) y
  **"Condición"** (por-familia: `mustBe`/`timing`/`operator`) de la maqueta **no se pueden mostrar**.
  El único valor "derivado" nativo (`getDisplayValue` en `RecordList.vue:5468`) viene ya calculado
  por el backend bajo `item.data[key]` (caso multivalor); no hay resolver client-side que combine
  otros campos del row. `TableCell.vue` renderiza a partir de `props.fieldMetadata`, sin slot
  `#item.`/`cellRenderer`/`customRender`.
- **Qué se necesita (core `layout/`).** Un mecanismo de columna computada/enriquecida: columnas
  "virtuales" declarables en el `layoutConfig` con un resolver de valor (respetando RBAC), o un
  hook de post-proceso client-side sobre `item.data`. **Alcance medio**, con molde directo: replicar
  el patrón `sourceColumnFields` + rama en `getDisplayValue` (UPONE-1334): (1) flag `computed`/
  `virtual` en el tipo de columna, (2) agregarlas a `effectiveFields` para sobrevivir el filtro de
  la línea 176-177, (3) rama en `getDisplayValue` que ejecute el resolver, (4) decidir política RBAC
  sobre los campos consumidos. No toca GraphQL ni backend. Alternativa sin core: persistir el valor
  derivado como campo real (cambio de modelo + codegen/sync + mantenerlo sincronizado con el árbol).

> **Nota de verificación.** Hallazgo extra que refuerza L1: `RecordList.vue:6473` tiene un comentario
> *"Virtual columns (not present in backend metadata) are appended as stubs"* referido a
> `applyLayoutColumnOverrides` (6335-6352), pero esa función solo hace `.map()` sobre campos
> existentes para pisar `label/sortable/editable`; **nunca** hace append de columnas nuevas. El
> comentario es aspiracional/desactualizado: ni siquiera existe el "stub append" que promete.

### L2 — RT-specific columns solo aparecen con filtro `recordType EQUALS` (listas polimórficas)

**Veredicto: REAL, y más profundo de lo que sugería el diagnóstico original (no es solo `layout/`).**

- **Qué pasa.** Los campos de un RT (ej. `rt__RecordState__requirement.timing`) se inyectan a
  `availableFields` **solo cuando hay un filtro `recordType EQUALS <valor>` activo**
  (`layout/src/layouts/RecordList.vue:5916`, función `transitionRecordTypeFilter`):
  ```ts
  // RecordList.vue:5916-5920
  const transitionRecordTypeFilter = async (newFilters: FilterType[]) => {
    const rtFilter = newFilters.find(f => f.field === 'recordType' && f.operator === 'EQUALS' && f.value);
    const matchedRt = rtFilter
      ? recordTypeOptions.value.find(rt => rt.shortName === rtFilter.value) || null
      : null;
  ```
  Si `matchedRt` es `null` (sin filtro, operador distinto a EQUALS, o valor no reconocido) se toma
  el `else` (línea 5947) que solo restaura el snapshot base; nunca inyecta campos RT. En una lista
  **mixta** (RecordState + MetricThreshold + Group) ningún campo de familia es columna.
- **Qué nos bloquea.** No se puede tener UNA lista unificada de las 3 familias mostrando columnas
  por-familia; empujaría a 3 listas/tabs por RT, perdiendo la vista única de la maqueta.
- **Qué se necesita (core `layout/` + `object-manager/`).** El bloqueo tiene **dos capas**:
  1. **Frontend (`layout/`).** Unir campos de las N familias presentes y mostrar celdas
     condicionales por fila (análogo a `transitionRecordTypeFilter` pero para múltiples RT a la vez).
  2. **Backend (`object-manager/`).** `effectiveObjectName` (`RecordList.vue:3989-3991`) cambia el
     **tipo GraphQL consultado** al target RT (`rt__<Short>__<base>`). Consultar el objeto base **no
     trae campos RT** (cada RT es un modelo Prisma 1:1 separado, ver `object-manager/docs/features/
     record-types.md`), y **no existe ningún tipo `union`/`interface`** en el schema para una query
     polimórfica multi-RT. Haría falta fragments inline sobre un tipo unión
     (`... on rt__RecordState__requirement { timing }`) o N fetches por familia + merge client-side
     (con costo N+1).

> **Corrección al diagnóstico original.** El documento previo listaba L2 como "core `layout/`",
> esfuerzo **medio**. Verificado: es un cambio **transversal `layout/` + `object-manager/`**, de peso
> **mayor** (afecta el contrato de tipos GraphQL, no solo el composable de columnas).

### L3 — RecordList "Ver" no resuelve el layout de detalle por `recordType` (polimórfico)

**Veredicto: PARCIALMENTE REAL. El gap backend está 100% confirmado; la estimación "candidato de
menor fricción" estaba subestimada por un problema de casing en los datos ya sembrados.**

- **Qué pasa.** La acción "Ver" nativa (`layout/src/layouts/RecordList.vue:5770-5853`, `handleView`)
  abre un RecordDetail modal en modo view y envía `recordType` de la fila:
  ```ts
  // RecordList.vue:5846-5850
  layoutConfig: {
    mode: targetMode,
    parentId: recordId,
    recordType: item?.recordType || undefined
  },
  ```
  `LayoutOrchestrator.vue` propaga el parámetro correctamente: declara `$recordType: String` en la
  query (`:425`), lo pasa a `resolveDefaultLayout` (`:433`) y lo puebla desde
  `props.layoutConfig?.recordType` (`:455`). **El frontend está bien en toda la cadena.**
  El schema lo promete explícitamente:
  ```graphql
  # object-manager/src/graphql/typeDefs/up1.js:117-118
  """RecordType discriminator value (e.g. 'Laboratorio'). When provided, resolves layout for
     rt__{recordType}__{objectName} first, falling back to objectName."""
  recordType: String
  ```
  PERO el resolver **ni siquiera destructura** ese argumento:
  ```js
  // object-manager/src/graphql/resolvers/up1/layout/layout.resolver.js:442
  resolveDefaultLayout: async (_, { objectName, layoutType, mode, roleName, applicationId }, { prisma }) => {
  ```
  El cuerpo completo (442-579) arma `baseWhere` con `objectName` tal cual, construye el id como
  `default_${objectName}_${mode}` y hace el fallback por query, **sin usar `recordType` en ningún
  punto**. Feature documentada en el schema, código muerto en el resolver.
- **Qué nos bloquea.** En una lista polimórfica, el "Ver" nativo no abre el layout de detalle
  correcto por fila (RecordState vs MetricThreshold).
- **Qué se necesita (core `object-manager/`).** Implementar el manejo de `recordType` en
  `resolveDefaultLayout` (buscar `rt__{recordType}__{objectName}`, fallback a `objectName`). El
  parámetro ya es opcional en el contrato y nadie lo usa hoy (no rompe llamadas actuales). **Pero
  no basta con "leer el parámetro"** por el landmine de casing de abajo: hay que decidir el modo de
  lookup antes de codear. Aún así, sigue siendo de **esfuerzo bajo, riesgo medio**.

> **Corrección al diagnóstico original (landmine de casing).** Los `objectName` de layouts RT están
> sembrados con **casing inconsistente**:
> - `mods/uengagement-up1/config/layouts/engagement_Activity_service_view.json:5` →
>   `"objectName": "rt__Service__Activity"` (base en PascalCase).
> - `mods/curriculum-design/config/layouts/default_rt__Modality__curricularsection_edit.json:5` →
>   `"objectName": "rt__Modality__curricularsection"` (base en minúscula), mientras el frontend envía
>   `objectName: "CurricularSection"`.
>
> Si el resolver arma literalmente `rt__${recordType}__${objectName}` con el `objectName` del
> frontend, produce `rt__Modality__CurricularSection`, que **no matchea** el dato sembrado
> `rt__Modality__curricularsection` (Postgres es case-sensitive). Una implementación literal de lo
> que promete el schema **seguiría fallando justo en curriculum-design** (el mayor consumidor de RT),
> y funcionaría en uengagement solo por coincidencia de casing. Antes de implementar hay que elegir:
> - **A (recomendada, menor riesgo):** lookup case-insensitive (`mode: 'insensitive'` en Prisma) para
>   el query construido con `recordType`. No toca datos, no rompe uengagement.
> - **B:** normalizar el casing de los `objectName` sembrados (migración de datos) y dejar el resolver
>   case-sensitive.
> - **C:** normalizar el `objectName` recibido a minúscula (convención `baseObjectLower` del resto del
>   codebase) + migrar los seeds de uengagement que rompen esa convención.
>
> Evidencia de que el problema ya se sortea con workaround: `default_Offering_syllabus_view.json:130-131`
> hardcodea `"objectName": "rt__Modality__curricularsection"` en `associatedLayoutConfigs` en vez de
> resolver por `recordType` dinámico (funciona solo porque esa sublista es homogénea; en una lista
> heterogénea el "Ver" nativo queda roto como describe L3).

### L4 — No se puede disparar un modal de componente CUSTOM desde un row-action

**Veredicto: PARCIALMENTE REAL. Los tres sub-puntos describen mecanismos reales, con matices que
precisan el alcance exacto del bloqueo.**

- **Qué pasa.**
  - **(a) Canal `row-click` muerto en el borde con Vueform. REAL.** `RecordListElement.vue:14`
    solo bindea `@request-action`, no reenvía `row-click`:
    ```html
    <!-- RecordListElement.vue:5-16 (línea 14) -->
    @request-action="handleAction"
    ```
    El evento SÍ existe end-to-end en el core: `RecordList.vue` lo declara en el `defineEmits`
    (~1531-1546) y lo **emite** en `RecordList.vue:1563` (`emit('row-click', payload)`), y
    `LayoutOrchestrator.vue:48` lo reenvía hacia arriba. El corte está específicamente en
    `RecordListElement.vue` (el punto de unión con Vueform), no en el core del RecordList.
    *(Precisión de línea: la emisión real es 1563, no 1531-1546, que es la declaración.)*
  - **(b) `rowAction type:'modal'` no permite modo view/edit sobre un RecordDetail derivado. REAL,
    matizado.** No es "siempre `create`": para layouts contextuales fuerza `view`, para RecordDetail
    fuerza `create`:
    ```ts
    // useRowActionHandler.ts:309-323 (createModalHandler)
    if (layoutType === 'RecordList' || layoutType === 'ChibiList' || layoutType === 'Calendar' || layoutType === 'OfferingCalendar') {
      modalOptions.mode = 'view'; // prevents Save/Cancel footer
    } else {
      modalOptions.mode = 'create';   // RecordDetail: create incondicional
    }
    ```
    El tipo `RowAction` (`layout/src/types/recordlist.ts`) no tiene campo `mode`: no hay forma de
    pedir `view`/`edit` para un modal RecordDetail vía `type:'modal'`. Matiz: el "Ver/Editar" del
    **propio registro** ya funciona por otro camino (`handleOpenRecordDetail`,
    `RecordList.vue:4420-4427`, que llama `modalStackManager.openModal({ mode: 'view' })` directo, sin
    pasar por `useRowActionHandler`). La limitación aplica solo a abrir un componente/layout
    **derivado** custom (el caso de L4: modal con Condición/Vía amigables).
  - **(c) No hay componente arbitrario por config ni bus de eventos. REAL, con precedente parcial.**
    El destino de modal se resuelve contra un mapa **hardcodeado en core**:
    ```ts
    // LayoutOrchestrator.vue:847-857
    const availableLayouts = { RecordList, RecordDetail, ChibiList, ImportTaskList,
      AiChatbox: defineAsyncComponent(() => import('../modsComponents/AiChatbox/AiChatbox.vue')),
      ConfigPanel, OfferingCalendar, Calendar, Dashboard };
    ```
    Un mod no puede agregar su componente ahí vía JSON. `AiChatbox` (un modsComponent) llegó al mapa
    por un cambio de core, no por configuración. No hay `mitt`/`eventBus`/`provide-inject` para
    comunicación fila→hermano (verificado por grep en `layout/src/elements/` y `layout/src/layouts/`).
  - **(d) El "create modal" (el único modal que un row-action alcanza) NO puede hospedar un componente
    custom. REAL.** Este es el punto clave de por qué no pudimos reusar el modal de alta nativo para
    nuestro componente custom. El único camino de modal accesible desde un row-action es
    `ModalStackManager.openModal` (vía `useRowActionHandler` con `type:'modal'`, que fuerza
    `mode:'create'`, ver sub-punto (b)). Pero la API `openModal` **no tiene ningún parámetro para
    pasar un componente arbitrario**. Su firma solo acepta datos, no un componente:
    ```ts
    // ModalStackManager.vue:809-826 (opciones de openModal)
    const openModal = (options: {
      objectName: string;
      mode?: 'create' | 'edit' | 'view';
      title?: string; instanceId?: string; layoutId?: string;
      layoutConfig?: any; roleName?: string; initialData?: Record<string, any>;
      layoutType?: string;            // <- lo más cercano a "qué renderizar", pero es un string enum
      beforeSave?: ...; modalSize?: ...;
    }, hooks?: ModalHooks) => { ... }
    ```
    No hay campo `component`/`componentName`. Además, cada modal del stack renderiza **siempre** un
    `LayoutOrchestrator`, no un componente libre:
    ```html
    <!-- ModalStackManager.vue:84-88 -->
    <LayoutOrchestrator
      :objectName="modal.objectName"
      :layout-type="modal.layoutType || 'RecordDetail'"
      ...
    ```
    Y `layoutType` solo se resuelve contra el **mapa hardcodeado en core** (`LayoutOrchestrator.vue:848-857`,
    el mismo del sub-punto (c)). Conclusión: el "create modal" está cableado por diseño a la familia
    RecordDetail/RecordList/etc.; no existe forma (ni por `openModal`, ni por JSON de rowAction) de
    decirle "renderiza mi componente custom del mod". Por eso el `RequirementEditor` tuvo que construir
    su **propio modal interno** dentro del modsComponent (con su propia lógica `canCreate`,
    `RequirementEditorElement.vue`), en vez de reusar el modal de alta de la plataforma: el modal
    nativo no admite el componente custom, y el modsComponent no puede inyectarse en el stack nativo.
- **Qué nos bloquea.** El menú por fila "Ver/Editar/Eliminar" de la maqueta, que abre un **modal
  custom** con Condición/Vía derivadas, no se puede cablear desde el RecordList mod-only. El detalle
  queda solo en "Ver regla unificada" (global, no por-fila). Tampoco se puede reusar el "create modal"
  nativo apuntándolo a nuestro componente (sub-punto (d)): el modal siempre monta un
  `LayoutOrchestrator`, no un componente arbitrario del mod.
- **Qué se necesita (core `layout/`). Dos alternativas:**
  1. **Extender el rowAction modal (menor alcance).** Agregar `mode?: 'view'|'edit'|'create'` a
     `RowAction`, que `createModalHandler` respete ese valor en vez de forzar `create`
     (`useRowActionHandler.ts:323`), y permitir que `targetLayoutType` referencie un modsComponent ya
     registrado. Riesgo bajo si el campo es opcional con default retrocompatible (`create`).
  2. **Bus de eventos entre elementos hermanos (mayor alcance).** Capa pub/sub a nivel de layout raíz
     (via `provide/inject`) + `RecordListElement` reenviando `row-click`. Cambio transversal (toca cada
     `*Element.vue`), mayor superficie de riesgo, pero resuelve el caso general.

> **Validación contra lo que se implementó (TICKET-101 / UPONE-1378).** La solución adoptada en el
> ticket confirma L4 de forma directa: como el modal nativo no puede hospedar un componente custom, el
> mod NO reusó el "create modal" de la plataforma; construyó su propio modal dentro del modsComponent.
> Evidencia en el código shippeado (`layout/src/modsComponents/RequirementEditor/RequirementEditorElement.vue`):
> - `:19` comentario explícito: *"Modal (molecule) del design system, NO ModalStackManager. Lógica en
>   `.ts` puro."* El componente **no importa ni usa** `openModal`, `ModalStackManager` ni
>   `useRowActionHandler` (confirmado por grep: la única aparición de "ModalStackManager" es ese
>   comentario que dice NO usarlo).
> - Los 3 modales (`ruleOpen`, `add.open`, `del.open`) son `<Modal v-model=...>` (molecule) con estado
>   local del propio componente (`:134`, `:161`, `:303`), no modales del stack nativo.
> - Editar/Eliminar se cablean desde los botones **propios** del componente (`@click="openEdit(r)"` `:116`,
>   `@click="askDelete(r)"` `:125`), no desde row-actions del RecordList.
> - El prop `showList` (`:405-413`) documenta la arquitectura resultante: en modo LAUNCHER
>   (`showList:false`) el elemento *"oculta la tabla propia (la lista la provee un RecordList nativo
>   hermano en la misma tab) y deja solo la toolbar (Agregar + Ver regla unificada) + los modales...
>   este elemento solo levanta el modal de alta 2 pasos. Arquitectura nativa (dev 2026-07-28)"*.
> - El stepper de 2 pasos es hand-rolled (`:811`, *"patrón .m-steps de la maqueta, con tokens up1"*),
>   consistente con L6.
>
> En el ticket, la decisión de alcance registra esta UI como *"RecordList + modal 2 pasos nuevo + regla
> unificada"*, con el modal 2 pasos clasificado como **build mínimo** (no reuse de nativo). Es decir: la
> plataforma no ofrecía el camino nativo, así que el modal custom se construyó por fuera del stack y se
> lanza por toolbar global, no por fila. Esto reproduce exactamente lo que L4 predice: el menú por fila
> Ver/Editar/Eliminar de la maqueta cableado a un modal custom **no se pudo hacer desde el RecordList
> nativo**; el detalle amigable quedó en "Ver regla unificada" (global). *(Nota: el comentario cita
> "RULE-014" como convención del design system de `layout/`; no confundir con `RULE-core-014` del KB de
> DKC, que trata de capability sync — el número coincide por casualidad.)*

### L5 — Layout config servido con Apollo `cache-first` (stale hasta hard reload)

**Veredicto: REAL. Afecta dos queries, no una.**

- **Qué pasa.** La query directa de layout por `layoutId` en `LayoutOrchestrator.vue:534-537`
  (`getInstance`) **no pasa `fetchPolicy`** → hereda el default `cache-first`. Tras `npm run sync`
  (que SÍ actualiza la BD: `object-manager/scripts/sync/dbSync.js:749-772`, `findFirst` → `update`/
  `create` real sobre `up1_layen_layout` con `updatedAt: new Date()`), la UI sigue sirviendo el
  `layoutConfig` viejo de la cache normalizada hasta un **hard reload**. Es inconsistente con otras
  queries del mismo archivo que sí fuerzan `network-only` (`:457` resolución por rol, `:581` fallback
  por nombre, `:659` sibling layouts). `useApolloClient.ts` no define `defaultOptions` globales, así
  que aplica el `cache-first` de Apollo sin override.
- **Qué nos bloquea.** No bloquea funcionalidad, pero causó horas de confusión ("los cambios no se
  aplican") en este ticket. Afecta a TODO cambio de layout de cualquier mod. Matiz: el path primario
  de resolución (por rol, `network-only`) no sufre stale; el problema aparece en el fetch directo por
  `layoutId` y en los associated configs.
- **Qué se necesita (core `layout/`).** `fetchPolicy: 'network-only'` (o `cache-and-network`) en la
  query de `LayoutOrchestrator.vue:534-537` **y en `getAssociatedConfigs` (`:618-621`)**, que tiene el
  mismo patrón sin `fetchPolicy`. **Cambio de 1-2 líneas por query, bajo riesgo, alto valor
  transversal.**

> **Corrección al diagnóstico original.** El documento previo solo citaba `getInstance` (534-537).
> Verificado: `getAssociatedConfigs` (`LayoutOrchestrator.vue:618-621`) tiene el mismo bug y debe
> incluirse en el fix.

### L6 — No existe un componente Stepper/Wizard reutilizable

**Veredicto: REAL, con evidencia más fuerte que "ausencia": hay 5 wizards hand-rolled duplicados.**

- **Qué pasa.** El único wizard Vueform nativo es el interno de `RecordDetail` (config-driven vía
  `layoutConfig.schema.steps`, ver `RecordDetail.vue:299-313`, `useSkippableSteps.ts`), no reusable
  para un alta polimórfica por-vías. Fuera de ahí NO hay `<FormSteps>` en `layout/src` ni un
  átomo/molécula Stepper. Se encontraron **al menos 5 implementaciones hand-rolled distintas**, con
  CSS y lógica de `currentStep` duplicadas:
  - `layout/src/organisms/Navigation/LayoutSelector/CreateViewWizard.vue:13-28,1050-1112`
  - `layout/src/organisms/Modal/ImportTemplateModal/ImportTemplateModal.vue:11-26,588` (comentario
    en :589: *"Wizard Step Indicator — mirrors CreateViewWizard pattern"*, duplicación consciente)
  - `layout/src/organisms/Data/BlockCalendar/BlockCalendar.vue:70-73,899-902`
  - `mods/curriculum-design/modsComponents/RequirementEditor/RequirementEditorElement.vue:811`
    (comentario: *"Stepper del modal de alta (patrón .m-steps de la maqueta, con tokens up1)"*)
  - `mods/curriculum-design/modsComponents/CurriculumMesh/AddEntryModal.ts` (máquina de estados manual)
- **Qué nos bloquea.** Tuvimos que construir el stepper de 2 pasos a mano (con tokens up1). No es un
  bloqueo duro, pero es duplicación de un patrón que se repite 5 veces.
- **Qué se necesita (core `layout/`).** Un átomo/molécula `Stepper`/`Steps` reutilizable (indicador de
  pasos + estados on/done + navegación). Bajo riesgo como wrapper nuevo sin tocar los usos existentes;
  migrar los 5 consumidores es esfuerzo medio (cada uno tiene su lógica de navegación/skip), caso por
  caso, no en un solo cambio.

### L7 (mod-side, no core) — `targetId` no declarado como FK

**Veredicto: REAL. Correctamente clasificado como mod-side (no core).**

- **Qué pasa.** `rt__RecordState__requirement.targetId` no tiene `isForeignKey`/`references`, así que
  no se puede mostrar como referencia resuelta (nombre del curso) en un layout; se vería el uuid:
  ```json
  // mods/curriculum-design/objects/RecordTypes/rt__RecordState__requirement.json:18-23
  "targetId": { "type": "...", "title": "...", "not_null": true, "description": "..." }
  // sin isForeignKey ni references
  ```
  **Esto es del mod** (JSON del RT), no core. Condiciona L3 (el detalle del curso en el modal de view).
  Mitigado hoy con el `label` auto-derivado (`Curso (CÓDIGO)`), documentado en el propio código:
  `RequirementEditorElement.vue:561-575` (`deriveLeafLabel`), con comentario en :565-566 que reconoce
  que "el RecordList no puede resolver el FK targetId a nombre".
- **Qué se necesita (mod).** Agregar `"isForeignKey": true, "references": "Activity"` a `targetId`.
  El patrón ya es soportado en RT (precedente en el mismo mod:
  `rt__Bibliography__curricularsection.json:16-17`). `targetType` está con enum cerrado a `["activity"]`
  (SP6, REQ-03), así que la referencia es estática y no ambigua. Requiere `npm run codegen` + sync; no
  toca core.

### L8 — El CREATE nativo de un objeto polimórfico es un form plano "RT-reveal" (no wizard por familia; campos crudos)

**Veredicto: REAL. Es el "form crudo" que el dev vio con sus propios ojos en S10.**

- **Qué pasa.** Al activar `canCreate` en un RecordList sobre `requirement` (polimórfico), el botón
  "Crear registro" (`RecordList.vue:5566`, `handleCreateRequest`) detecta que el objeto tiene
  RecordTypes y arma el modal de alta con `buildRecordTypeLayoutConfig`:
  ```ts
  // RecordList.vue:5643-5662
  if (!isRecordType(targetObjectName) && !canCreateRecordType && !unifiedConfig.value.canCreateLayoutId ...) {
    const recordTypes = await getRecordTypes(apolloClient.value, targetObjectName);
    if (recordTypes.length > 0) {
      const rtLayoutConfig = buildRecordTypeLayoutConfig(recordTypes, $t, { mode: 'create' });
      modalStackManager.value.openModal({ objectName, mode: 'create', layoutConfig: rtLayoutConfig, ... });
  ```
  `buildRecordTypeLayoutConfig` (`useRecordTypeResolver.ts:92-100`) produce un layout de **página
  única** con `recordTypeField: 'recordType'` — RecordDetail muestra un selector de recordType y
  **revela dinámicamente los campos del RT en la misma pantalla** (comentario `:84`: *"RecordDetail
  recognizes `recordTypeField` and dynamically loads RT-specific fields"*). **No es un wizard por
  pasos ni resuelve un layout de create por-RT** (mismo gap que L3, ahora en modo create): no hay
  `default_requirement_create.json` base (solo `default_rt__<RT>__requirement_create.json`, que el
  create polimórfico NO invoca por-RT). Resultado: un formulario con **todos los campos base crudos**
  (recordType, effect, isHardRule, label, negate, overrideMode, ownerId/ownerType, parentId, position,
  audit) + reveal del RT.
- **Qué nos bloquea.** El "Crear registro" nativo del RecordList **no** da el modal de alta guiado de
  la maqueta (2 pasos: clase + vía + exigencia → catálogo de cursos, con auto-derivación). Da el form
  plano crudo. Es exactamente lo que apareció en S10 al poner `canCreate:true` (el dev: *"no sé de
  dónde salió ese input de etiqueta y efecto, la maqueta no lo tiene"*), y por eso hubo que
  `canCreate:false` + un botón "Añadir" propio en el componente custom que abre el modal a mano.
- **Qué se necesita (core `layout/`).** Que el create polimórfico soporte (a) un modo de **pasos real**
  (clase como paso 1 → detalle del RT como paso 2), o (b) resolver un **layout de create por-RT**
  (`default_rt__<RT>__<base>_create.json`) en vez del RT-reveal plano — relacionado con L3 y L6.
  Alcance medio. Sin esto, un alta guiada por familia solo se logra con un modal custom del mod (L4(d)).

> **Nota (rendering friendly, refuerza L1/L8).** Aun cuando el RecordList muestra columnas base, los
> valores salen **crudos**: la columna `recordType` muestra `RecordState`/`Group`/`MetricThreshold` (no
> "Curso"/"Electivo"/"Métrica"), porque el RecordList no traduce el enum del discriminador a un label
> friendly. Igual que `mustBe`/`effect` sin i18n. Esto obliga a un descriptor friendly custom
> (`describeRequirementNode.logic.ts` en el mod) para toda etiqueta legible. Menor, pero es parte del
> "por qué la lista nativa no se ve como la maqueta".

---

## Historial de intentos (validación empírica en TICKET-101)

> Esta sección documenta **todo lo que se intentó y falló/se revirtió** durante la ejecución de
> TICKET-101 (`external: UPONE-1378`), reconstruido de las sessions del ticket DKC y verificado contra
> git (`mods/curriculum-design`, rama `feat/UPONE-1378-activity-requirements-section`). No es teoría:
> cada limitación de arriba se **topó en la práctica**, en el orden de abajo. La tabla formal
> "Failed approaches" del ticket quedó vacía; los fracasos vivían dispersos en los reencuadres de
> session. Acá quedan consolidados. Es también la evidencia más fuerte de que L1-L4 son reales: se
> chocaron tres veces antes de rodearlas.

**Intento 1 (S4) — RecordList nativo con columnas derivadas + tab "Regla unificada" aparte.**
Se configuró `default_requirement_list.json` con 5 columnas (Clase/Requisito/Condición/Vía/Exigencia)
mapeadas a "campos derivados del árbol". **Falló en el quality review (S4, ronda 1), con 2 HIGH que
son exactamente L1/L2/L3, confirmados leyendo el código vivo (DET-33):**
- Las 3 columnas RT dotted (Condición/Vía) **se descartaban en silencio**: la inyección de campos RT a
  `availableFields` solo ocurre con un filtro `recordType EQUALS` activo, y la lista es heterogénea
  (RecordState + MetricThreshold + Group). Confirmado contra `useColumnConfiguration.ts:176` y
  `RecordList.vue:transitionRecordTypeFilter`. → **L1 + L2 empíricos.** Fix: columnas reducidas a solo
  campos base (`recordType`/`label`/`effect`/`isHardRule`).
- `associatedLayoutConfigs.view` **hardcodeaba** `rt__RecordState__requirement` + `canView` default
  true, así que el "Ver" (label como name-link) abría el RT equivocado en filas Group/MetricThreshold.
  → **L3 empírico** (como el resolver no resuelve por `recordType`, hubo que hardcodear un RT, y eso
  rompe en listas heterogéneas). Fix: `canView:false` + remover `associatedLayoutConfigs`.

**Intento 2 (S5) — editor custom "por vías" (`RequirementEditorElement`) con modal propio.**
Reencuadre por la maqueta: se quitó la tab "Regla unificada" y el RecordList stock (se borró
`default_requirement_list.json`), consolidando en un elemento editor custom. **Sub-fracaso interno que
corrobora L4:** se intentó el modal de alta como un `defineElement`/`.vue` **separado** y no se pudo
embeber limpio (un `defineElement` modal necesita contexto Vueform/ElementLayout; un `.vue` suelto se
auto-registraría como elemento no usado), así que **el modal se tuvo que inlinear dentro del `.vue` del
editor**, con Modal molecule + stepper hand-rolled (no `ModalStackManager`/`openModal`). Es la misma
conclusión de L4 vista desde adentro: la plataforma no deja instanciar un componente custom como modal.

**Intento 3 (S10) — REVERT a RecordList + wizard Vueform + MultiSelectPicker.**
Tras ver el **render real** (primer sync+render), el dev decidió (AskUserQuestion 2026-07-28) revertir
el editor custom de S5 y volver a un RecordList estándar (4 columnas base) + modal con wizard nativo de
Vueform + `MultiSelectPicker`. **La restricción se aceptó explícitamente en el propio contrato de la
session (S10):** *"las columnas Vía y Condición NO se pueden mostrar en un RecordList estándar
(`useColumnConfiguration.ts:176` filtra a campos reales; sin columnas computadas)"* → **L1 aceptada
como constraint duro.** S10.T1 (reinstaurar el RecordList) se ejecutó (commit `e52e530`), y luego
**T2-T6 se descartaron** al aparecer el pivot; solo se conservó lo reusable del modal (stepper 2 pasos +
catálogo multi-selección + auto-derivar, commit `5046223`). **Sub-fracaso que corrobora L8:** al poner
`canCreate:true` en el RecordList, el "Crear registro" nativo abrió el **form plano RT-reveal con todos
los campos base crudos** (el dev: *"no sé de dónde salió ese input de etiqueta y efecto"*), no el modal
guiado de la maqueta → hubo que `canCreate:false` + un botón "Añadir" propio del componente custom.

**Desenlace (S11-S13) — pivot a mantenedor de árbol Y/O, 100% mod-only, que ESQUIVA L1-L4.**
El dev decidió UNA sola vista: el árbol "regla unificada" **como mantenedor editable**, en vez de
RecordList + árbol separado. Razón registrada: *"el requisito ES un árbol (vías OR / condiciones AND /
K-de-N); un RecordList lo aplanaría y duplicaría la estructura"*. Esto **supersede REQ-01 (RecordList)**
y el split lista+modal de la maqueta. Como el mantenedor es un componente custom del mod (no usa
RecordList), **L1, L2, L3, L4 y L8 dejan de bloquear**: eran todas limitaciones del RecordList/su create. Verificado
en git: el código actual (`RequirementEditorElement.vue`, commits `cf7ba99`/`cfbe52f`/`ae1cb2c`) ya es
el árbol editable con búsqueda (S11) + acciones por nodo Ver/Editar/Eliminar y alta con stepper+Electivo
(S12, en curso). El menú por fila y el modal de detalle de la maqueta **sí se logran**, pero desde el
árbol custom del mod, no desde el RecordList nativo.

**Fallas de integración runtime (además de las de UI).**
- **Tab en blanco por sync-skip de carpeta solo-lógica (learn L10 del ticket).** Al inlinear el modal
  (Intento 2), la carpeta `RequirementAddModal/` quedó solo con lógica (`requirementFamilies.logic.ts`)
  y el sync **no la propaga** (solo sincroniza carpetas de `modsComponents/` con un componente-entry).
  Cualquier import cross-folder hacia ella rompía en `layout`/`suite` con Vite *"Failed to resolve
  import"* y dejaba el tab en blanco. Descubierto en el **primer sync+render real** (smoke S9.T5). Fix:
  co-ubicar la lógica compartida dentro de una carpeta que también tenga componente (commit `0f7da4a`).
  Es una limitación del **sync**, no del RecordList; candidata a RULE del mod.
- **Cache Apollo (L5) confirmada en la práctica.** El propio brief de ejecución del ticket instruye:
  *"Para ver en runtime: `npm run sync` (raíz) + hard reload (cache Apollo, L5)"*. El stale de layout se
  vivió como fricción real durante todo el ciclo FE.

---

## Tabla resumen (esfuerzo/riesgo verificados)

| # | Limitación | Dónde (core) | Cambio necesario | Esfuerzo | Riesgo | Reversible |
|---|-----------|--------------|------------------|----------|--------|------------|
| L5 | Layout stale por cache Apollo | `layout/` LayoutOrchestrator (`:534`, `:618`) | `fetchPolicy: network-only` en 2 queries | **Muy bajo** | **Bajo** | Sí |
| L7 | targetId sin FK (mod, no core) | mod RT json | `isForeignKey` + `references: Activity` | Bajo | Bajo | Sí |
| L3 | "Ver" no resuelve por recordType | `object-manager/` resolveDefaultLayout | implementar param `recordType` + decidir casing | Bajo | **Medio** | Sí |
| L6 | Falta Stepper reutilizable | `layout/` components | nuevo atom/molecule Stepper | Bajo | Bajo | Sí |
| L1 | Columnas computadas (Vía/Condición) | `layout/` useColumnConfiguration | columnas virtuales/enriquecidas (molde UPONE-1334) | Medio | Medio | Sí |
| L4 | Modal custom desde row-action | `layout/` RecordList/RecordListElement | rowAction con `mode`+componente, o bus fila→hermano | Medio-alto | Medio | Sí |
| L8 | CREATE polimórfico = form plano RT-reveal (no wizard/por-RT) | `layout/` RecordList + useRecordTypeResolver | pasos reales o layout create por-RT (rel. L3/L6) | Medio | Medio | Sí |
| L2 | Columnas RT en lista polimórfica | `layout/` **+ `object-manager/`** | unión de campos por RT + tipo union GraphQL | **Mayor** | Medio | Sí |

> **Cambios vs la tabla previa:** L2 sube de "medio / solo layout" a **mayor / transversal**;
> L3 sube de riesgo bajo a **medio** (casing); L5 incluye ahora la segunda query (`getAssociatedConfigs`);
> **L8 nueva** (el "form crudo" del create polimórfico que el dev vio en S10).

---

## Priorización sugerida (si se abre trabajo de core)

1. **L5** (cache) y **L3** (recordType en resolveDefaultLayout): baratos, reversibles, alto valor
   transversal. L5 son 2 líneas por query. L3 es una feature ya prometida por el propio schema, pero
   requiere decidir el modo de lookup de casing (recomendado: case-insensitive) antes de codear.
   Desbloquean el "Ver" por fila nativo y matan el stale de layouts para todos los mods.
2. **L7** (FK targetId): mod-side, JSON puro, precedente en el mismo mod. Bajo riesgo. Complementa L3.
3. **L6** (Stepper): oportunidad de plataforma de bajo riesgo; capitaliza el patrón hand-rolled x5.
4. **L1** (columnas computadas): estructural pero con molde directo (UPONE-1334); habilita las
   columnas Vía/Condición. Evaluar contra el costo de mantener el contrato de columnas.
5. **L2** (RT en listas mixtas): el más estructural, transversal `layout/` + `object-manager/`
   (requiere tipo union GraphQL). Evaluar contra el valor de la vista única.
6. **L8** (create polimórfico guiado): junto con L3/L6; habilita el alta nativa por familia (2 pasos)
   sin modal custom. Medio; útil si se quiere el alta guiada sobre RecordList/RecordDetail nativos.
7. **L4** (modal custom desde fila): el más invasivo; solo si el negocio exige el "Ver por fila" con
   modal amigable y no alcanza con L3 + "Ver regla unificada".

Ver `UPONE-1378-out-of-scope-followups.md §4` para el detalle por-limitación en contexto del ticket.

---

## Por qué UPONE-1378 NO se alcanza a ejecutar al 100% (impacto en el ticket)

El **backend y la lógica** del ticket están completos y verificados (evaluador fiel del árbol Y/O,
guards de plan Active y de ciclos, banner de malla, no-negativos, RBAC: S1..S9, con tests). Lo que
**no se alcanza mod-only** es la **fidelidad 1:1 de la UI de la maqueta** para la sección Requisitos,
y la causa es **exclusivamente core**, no del mod. Mapeo objetivo-de-maqueta → limitación → evidencia:

| Objetivo de la maqueta (lo que NO se logra ejecutar) | Bloqueado por | Evidencia (core, verificada) | Qué se entregó en su lugar |
|---|---|---|---|
| Lista con columna **"Vía"** (agrupación O de vías) | L1 (+L2) | `useColumnConfiguration.ts:176-177` filtra a campos reales; "Vía" es derivada (`parentId`+`combinator`) | RecordList con columnas base; Vía visible en "Ver regla unificada" |
| Lista con columna **"Condición"** (Aprobado/timing/umbral por familia) | L1, L2 | RT-cols solo con filtro `recordType EQUALS` (`RecordList.vue:5916`); base no trae campos RT (`:3989-3991`) | idem, detalle en "Ver regla unificada" |
| **Menú por fila Ver/Editar/Eliminar** que abre un **modal de detalle** custom | L4 (+L3) | `RecordListElement.vue:14` no reenvía `row-click`; `useRowActionHandler.ts:309-323` fuerza mode; `resolveDefaultLayout:442` ignora `recordType` | "Ver regla unificada" global (no por-fila); sin Editar/Eliminar por fila desde la lista nativa |
| **"Ver detalle"** con layout de view correcto por `recordType` | L3 | `resolveDefaultLayout` no implementa el param `recordType` que el schema promete (`typeDefs/up1.js:117-118`) + landmine de casing en seeds | bloqueado; necesita el fix de core L3 (con decisión de casing) |
| Curso mostrado como **referencia resuelta** (nombre, no uuid) en el detalle | L7 (mod) + L3 | `targetId` sin `isForeignKey` en `rt__RecordState__requirement.json:18-23` | `label` auto-derivado `Curso (CÓDIGO)` (`RequirementEditorElement.vue:561-575`) |
| Que los cambios de layout **se reflejen sin hard reload** | L5 | `LayoutOrchestrator.vue:534-537` y `:618-621` sin `fetchPolicy` (cache-first) | requiere `Cmd+Shift+R` tras cada sync (workaround manual) |

**Conclusión (actualizada tras el desenlace S11-S13).** El diagnóstico original de esta tabla asumía
el enfoque RecordList: bajo ese enfoque, la paridad 1:1 de la LISTA (columnas Vía/Condición + menú por
fila con modal) efectivamente **no es ejecutable mod-only** y está bloqueada por L1-L4. **Pero el
desenlace del ticket fue otro:** el dev pivotó (S11-S13) a un **mantenedor de árbol Y/O editable, 100%
mod-only**, que **supersede REQ-01 (la lista RecordList de la maqueta)**. Con ese pivot, L1-L4 **y L8
dejan de ser bloqueantes** (eran todas del RecordList / su create) y la funcionalidad de la maqueta (crear/editar/eliminar
por vías, menú por nodo, detalle amigable, K-de-N, búsqueda) se logra **sin tocar core**. La maqueta no
se reprodujo "1:1 como lista"; se entregó su **intención** con una representación de árbol (que además
es más fiel al dominio: el requisito ES un árbol, un RecordList lo aplana).

Por lo tanto, L1-L4 y L8 quedan reclasificadas: **NO son bloqueos del ticket, sino mejoras de plataforma**
que valdría la pena tener si en el futuro se quiere expresar requisitos (u otras entidades polimórficas
/ con valores derivados) como RecordList nativo con alta guiada. L5 (cache), L6 (Stepper) y L7 (FK
targetId) siguen siendo mejoras transversales de bajo costo, independientes del pivot.

**Estado del ticket:** funcionalidad **entregada mod-only** (mantenedor de árbol custom, S1-S12 en git;
cierre S13 + smoke UPU pendientes de coordinación con el dev). Las limitaciones de core L1-L8 quedan
**documentadas como follow-up de plataforma** (no como bloqueo), con evidencia verificada y priorización
arriba (L5 + L3 + L7 son los baratos; L1/L2/L8 los estructurales si se quisiera el enfoque RecordList
con alta guiada; L4 el más invasivo). El platform team decide si las toma; el ticket **no depende** de ellas.
