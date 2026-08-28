---
id: SPEC-core-005
project: up1
type: doc
module: core
tags:
  - up1
  - arquitectura
  - object
  - layout
  - orchestrator
  - app
  - mod
  - component
  - row-action
  - tab
  - step
  - capability
  - role
  - tenant
  - construccion-vistas
  - matriz
---

# Layout Workspace de uP1 (layout-engine)

## Indice

1. [Que es](#1-que-es)
2. [Stack tecnico](#2-stack-tecnico)
3. [Estructura de `layout/src/`](#3-estructura-de-layoutsrc)
4. [Atomic Design](#4-atomic-design)
5. [Tipos de layout renderizados](#5-tipos-de-layout-renderizados)
6. [LayoutOrchestrator: punto de entrada](#6-layoutorchestrator-punto-de-entrada)
7. [Relacion con el design system](#7-relacion-con-el-design-system)
8. [Storybook](#8-storybook)
9. [Actividad reciente](#9-actividad-reciente)
10. [Comandos de referencia](#10-comandos-de-referencia)
11. [Documentacion relacionada (enlaces, no duplicar)](#11-documentacion-relacionada-enlaces-no-duplicar)
12. [Contratos de layoutConfig y paridad RBAC](#12-contratos-de-layoutconfig-y-paridad-rbac)

---

## 1. Que es

`layout/` (paquete `@uplanner/layout-engine`) es la **libreria de componentes UI** de uP1: un conjunto de componentes Vue 3 reutilizables, construidos sobre Bootstrap 5 y Vueform, organizados con **Atomic Design**. No conoce tenants ni rutas: recibe configuracion (JSON de layout) y datos (via Apollo Client inyectado) y renderiza.

Ningun otro workspace importa sus componentes de layout de alto nivel (RecordList, RecordDetail, ChibiList, etc.) directamente. Todo pasa por `LayoutOrchestrator` (seccion 6), que Suite consume como unico punto de integracion (ver `core/suite-workspace.md`, seccion "Integracion con Layout").

### Responsabilidades

- Proveer **atoms** que encapsulan Bootstrap (nunca se usa Bootstrap directo en capas superiores)
- Componer **molecules** y **organisms** a partir de atoms
- Renderizar **layouts dinamicos** (RecordList, RecordDetail, ChibiList, ConfigPanel, Calendar, Dashboard, ImportTaskList) desde configuracion JSON almacenada en `up1_layen_layout`
- Exponer el design system (tokens `var(--up1-*)`) documentado y consumible por mods

---

## 2. Stack tecnico

| Componente | Tecnologia |
|-----------|------------|
| Framework | Vue 3 (Composition API, `<script setup>`) |
| UI base | Bootstrap 5, `bootstrap-vue-next` |
| Formularios | `@vueform/vueform` |
| Datos | `@apollo/client` (cliente inyectado por el consumidor, no propio) |
| Reportes embebidos | `flexmonster` (pivot tables) |
| Build | Vite |
| Testing | Vitest (unit + Storybook interaction tests) |
| Documentacion visual | Storybook 10 |
| Tipado | TypeScript |

Evidencia: `layout/package.json`.

---

## 3. Estructura de `layout/src/`

```
layout/src/
├── components/
│   ├── atoms/            ← 20 atoms + index.ts (Alert, Avatar, Badge, Button, Checkbox,
│   │                        Divider, Heading, Icon, IconButton, Image, Input, Label, Link,
│   │                        Progress, Radio, Select, Spinner, Text, Textarea, Tooltip)
│   ├── molecules/         ← 34 molecules + index.ts (SearchBar, Dropdown, Pagination, Card,
│   │                        TableCell, FormField, Modal, ActionMenu, ActionToolbar,
│   │                        BulkTransitionPreview, CalendarNavBar, CalendarEventCard,
│   │                        PersonSearchDropdown, StatCard, RecordHoverCard, ...)
│   └── organisms/         ← 6 carpetas + index.ts (Data, Feedback, Modal,
│                             MultiSelectPickerTab, Navigation, Settings)
├── layouts/               ← Layouts dinamicos (seccion 5) + helpers propios
│   ├── LayoutOrchestrator.vue
│   ├── RecordList.vue, RecordDetail.vue, ChibiList.vue
│   ├── ConfigPanelLayout.vue, CalendarLayout.vue, Dashboard.vue, ImportTaskList.vue
│   ├── DashboardFilterBar.vue
│   ├── dashboard/          ← helpers del mosaic (ver seccion 5.6)
│   ├── filterControls/, widgets/, styles/
│   └── recordListActions.ts, recordDetailErrorHandling.ts, configPlaceholders.ts (logica extraida)
├── composables/            ← 68 composables (useEnumTransitions, useDashboardDynamicFilters,
│                              useColumnConfiguration, useDetailContextReload, useApiConfig, ...)
├── utils/                  ← 17 utilidades (recordListFormatters, resolveModalTitle, ...)
├── modsComponents/          ← Componentes aportados por mods (ver `mods/internals.md`)
├── vueform/                 ← Adaptadores de atoms/molecules a elementos Vueform
├── styles/design-tokens/    ← Fuente de los tokens `var(--up1-*)` (ver seccion 7)
├── types/, constants/, graphql/, registry/, assets/
└── doc/                     ← Documentacion embebida de componentes
```

Evidencia: listados directos de `layout/src/components/{atoms,molecules,organisms}` y `layout/src/{composables,utils,layouts}`.

---

## 4. Atomic Design

Jerarquia estricta de composicion:

```
Atoms  →  Molecules  →  Organisms  →  Layouts
```

- **Atoms**: envuelven un elemento Bootstrap con props tipadas de Vue. Ningun componente de capa superior usa clases Bootstrap directamente; siempre pasa por un atom.
- **Molecules**: combinan atoms (ej. `SearchBar` combina `Input` + `IconButton`; `TableCell` combina `Text`/`Badge`/`Link` segun el tipo de campo).
- **Organisms**: combinan molecules en unidades funcionales mas grandes (ej. `Settings/ConfigPanel`, `Modal/ModalStackManager`, `Navigation`, `MultiSelectPickerTab`).
- **Layouts**: consumen organisms para armar una vista completa data-driven (RecordList, RecordDetail, etc.).

Regla del proyecto (`up1/CLAUDE.md`): "Bootstrap nunca se usa directamente en molecules u organisms".

---

## 5. Tipos de layout renderizados

`LayoutOrchestrator` mapea el campo `layoutType` de la configuracion a un componente concreto (evidencia: `layout/src/layouts/LayoutOrchestrator.vue:801-812`):

| layoutType | Componente | Que renderiza |
|-----------|------------|----------------|
| `RecordList` | `RecordList.vue` | Tabla con busqueda, filtros, edicion inline, subcampos JSON anidados, bulk edit cross-page |
| `RecordDetail` | `RecordDetail.vue` | Formulario create/edit/view (simple, tabbed, wizard, embedded list) |
| `ChibiList` | `ChibiList.vue` | Lista compacta para sidebars/mobile |
| `ConfigPanel` | `ConfigPanelLayout.vue` | Panel de configuracion de plataforma/mod (ver `features/config-system.md`) |
| `Calendar` / `OfferingCalendar` | `CalendarLayout.vue` | Vistas de calendario (ambos alias apuntan al mismo componente) |
| `Dashboard` | `Dashboard.vue` | Grid de widgets, con soporte de mosaic 2D (seccion 5.6) |
| `ImportTaskList` | `ImportTaskList.vue` | Progreso de importaciones masivas (bulk import) |
| `AiChatbox` | `modsComponents/AiChatbox/AiChatbox.vue` | Chat conversacional del mod `ai-agent` |

### 5.6 Dashboard mosaic

`Dashboard.vue` soporta una sintaxis declarativa de posicionamiento inspirada en `subplot_mosaic` de matplotlib: `layoutConfig.mosaic` es un array 2D donde cada celda contiene el id de un widget; el widget ocupa todas las celdas donde aparece su id (spanning implicito). Es retrocompatible: si `mosaic` no esta presente, se usa el `gridPosition` por widget; si ambos estan, `mosaic` gana.

Implementacion en `layout/src/layouts/dashboard/mosaicHelpers.ts` (con spec en `mosaicHelpers.spec.ts`).

Detalle completo: `features/dashboard-mosaic.md` (doc hermano, en creacion) y `layout/docs/reference/dashboard-mosaic.md`.

Para el resto de los tipos, ver los docs enlazados en la seccion 11 (no se duplican aqui).

---

## 6. LayoutOrchestrator: punto de entrada

Ubicacion: `layout/src/layouts/LayoutOrchestrator.vue`.

Es el **unico punto de integracion** que Suite (y cualquier otro consumidor) debe usar para renderizar un layout. Responsabilidades (evidencia: comentario de cabecera, `LayoutOrchestrator.vue:55-100`):

- Decide dinamicamente que componente renderizar segun `layoutType` (o el `layoutType` resuelto desde BD si se paso `layoutId`)
- Resuelve sub-layouts y los pasa a `RecordDetail` como elementos Vueform
- Reemplaza el placeholder `{{parentId}}` en filtros por el `instanceId` real
- Soporta configuraciones mixtas de sub-layout (inline y referenciadas por id)

Props principales: `apolloClient` (requerido en escenarios multi-tenant), `objectName`, `layoutType`, `layoutConfig`, `layoutId`, `layoutName`, `instanceId`, `applicationId`, `currentUserId`, `roleName`, `mode`, `initialData`, `parentContext`, `isInModalStack`, `additionalFilters`, `enableRowClick`.

Advertencia del propio archivo: si se omite `apolloClient`, el orquestador crea un cliente de respaldo **sin** header `X-Tenant-ID`, valido solo para compatibilidad hacia atras, nunca para multi-tenant en produccion. El cliente correcto se obtiene del plugin Apollo de la app consumidora (ver `suite/plugins/apollo.client.ts`, referenciado en el propio comentario del archivo).

Carga cada componente con `defineAsyncComponent` (code-splitting por tipo de layout), evidencia: `LayoutOrchestrator.vue:803-811`.

### 6.1 Estados de `resolveDefaultLayout`

Cuando no se pasa `layoutId` ni `layoutName`, `LayoutOrchestrator` resuelve el layout por defecto contra el backend (query GraphQL `resolveDefaultLayout`). El contrato de retorno es un payload `{ status, layout }`, no un layout directo (evidencia: `layout.resolver.js:531-532`, tipo `LayoutResolutionStatus` en `object-manager/src/graphql/typeDefs/up1.js:46-105`).

Estados posibles:

| `status` | Significado | Comportamiento del orquestador |
|---|---|---|
| `RESOLVED` | Se encontro un layout aplicable (por rol, por app, o global default) | Renderiza el layout resuelto |
| `NO_MOD_ROLE_ASSIGNED` | La app declara roles internos de mod y el usuario no tiene mapeo a ninguno | Muestra un aviso explicito de "sin rol asignado" en vez de caer a un layout generico (evidencia: `LayoutOrchestrator.vue:497-502`, variable `noModRoleAssigned`) |
| `NOT_FOUND` | No hay layout resuelto (incluye fallos de transporte/red, que se tratan igual que "no encontrado" para no exponer el aviso de rol ante un error de infraestructura) | Sigue el fallback historico existente |

Este cambio (UPONE-1354/UPONE-1460) reemplazo un retorno directo de layout por el payload con estado; cualquier consumidor que invoque `resolveDefaultLayout` debe leer `status` antes de usar `layout`.

Detalle de props, eventos y ejemplos completos: `features/recordlist-recorddetail-2026-07.md`, `layout/docs/features/layout-orchestrator.md`.

---

## 7. Relacion con el design system

Todo valor visual (color, tipografia, espaciado, sombra, borde) se consume como variable CSS `var(--up1-*)`, nunca hardcodeado. Los atoms son la capa que traduce esas variables a estilos concretos de Bootstrap. El detalle completo de tokens, capas CSS y dark mode vive en `core/style-guide.md`; este documento no lo repite.

---

## 8. Storybook

Cada componente de layout (atoms, molecules, organisms y varios layouts) tiene su propia story. El repo cuenta con 125 archivos `*.stories.*`.

Configuracion en `layout/.storybook/` (`main.ts`, `preview.ts`, `vitest.setup.ts`, `vendor-layers.css`). Puerto por defecto 6006 (override via env `STORYBOOK_PORT`), evidencia: `layout/package.json` script `storybook`.

```bash
npm run storybook --workspace=@uplanner/layout-engine        # localhost:6006
npm run test:storybook --workspace=@uplanner/layout-engine   # Vitest sobre las stories
```

---

## 9. Actividad reciente

Commits relevantes desde 2026-05-16 (rama de trabajo activa, `git -C layout log`):

- **UPONE-1382 (borrado en cascada)**: preview dinamico `deleteImpactPreview` y auto-bloqueo `Restrict` en `CriticalWarningModal`; nombre del registro a eliminar movido a la pregunta del modal en vez del boton
- **UPONE-1377**: `RecordDetail` honra `layoutConfig.hasIntegratedControls` (opt-in); `RecordList` con `openMode.create=route`; se elimina el reporte legacy embebido
- **AP-06 / AP-07**: mejoras de calidad en escenarios/stories; boton de reload integrado en `RecordDetail` (UI + i18n + stories)
- Editor de JSON schema; fixes de scroll y multimodales

Detalle de cada feature en los docs enlazados en la seccion 11.

---

## 10. Comandos de referencia

| Comando | Que hace |
|---------|----------|
| `npm run dev --workspace=@uplanner/layout-engine` | Vite dev server |
| `npm run build --workspace=@uplanner/layout-engine` | Build de la libreria |
| `npm run build:full --workspace=@uplanner/layout-engine` | typecheck + build + test |
| `npm run storybook --workspace=@uplanner/layout-engine` | Storybook (localhost:6006) |
| `npm run test --workspace=@uplanner/layout-engine` | Vitest unit |
| `npm run lint --workspace=@uplanner/layout-engine` | ESLint |
| `npm run lint:css --workspace=@uplanner/layout-engine` | Stylelint |
| `npm run typecheck --workspace=@uplanner/layout-engine` | TypeScript check |

Evidencia: `layout/package.json`.

---

## 11. Documentacion relacionada (enlaces, no duplicar)

Este documento cubre arquitectura general. Para el detalle de cada feature, consultar:

| Tema | Documento |
|------|-----------|
| Cambios recientes RecordList/RecordDetail (reload, N:M, create-route) | `features/recordlist-recorddetail-2026-07.md` |
| Transiciones de estado (enums) | `features/enum-transitions.md` |
| Sistema de configuracion (`ConfigPanel`, `useConfig`) | `features/config-system.md` |
| Componentes de mods, patrones Vueform Element vs standalone | `mods/internals.md` |
| Design tokens, capas CSS, dark mode, atoms | `core/style-guide.md` |
| Dashboard mosaic (detalle completo) | `features/dashboard-mosaic.md` (en creacion) |
| Registro de componentes, tipos de layout, layouts por defecto | `layout/docs/reference/component-registry.md`, `layout-types.md`, `default-layouts.md` |
| Claves de configuracion de `RecordList` | `layout/docs/reference/record-list-config-keys.md` |
| Guias tecnicas internas (setup, integracion, multi-tenant) | `layout/docs/guides/` |

**Drift corregido**: `layout/docs/reference/layout-json-schema.md` no existe en el repo. El schema JSON de layout esta cubierto hoy por `layout-types.md` y `record-list-config-keys.md`. El `CLAUDE.md` de la raiz del monorepo todavia referencia el archivo inexistente; usar estas dos rutas reales en su lugar.

---

## 12. Contratos de layoutConfig y paridad RBAC

Contratos nuevos del layer de layouts, verificados directamente en `RecordDetail.vue`/`RecordList.vue`.

### 12.1 `layoutConfig.hasIntegratedControls`

Opt-in booleano para layouts cuyo schema renderiza un elemento custom con sus propios controles de guardar/cancelar (ej. el wizard interno de `report-form-manager`). Cuando esta en `true`, `RecordDetail` no muestra su propio footer de guardado, evitando controles duplicados. Evidencia: `RecordDetail.vue:5482-5491` (computed `hasIntegratedControls`).

### 12.2 `layoutConfig.openMode` en `RecordList`

`getOpenMode(action)` en `RecordList.vue` acepta `layoutConfig.openMode` como string (`'route'` u otro valor tratado como `'modal'`, el default) o como objeto por accion (`{ view, edit, create }`). Para `create`, si `openMode.create === 'route'` (o `openMode === 'route'`), `handleCreateRequest` emite `navigate-to-relation` en vez de abrir un modal, para que Suite navegue a la ruta dedicada del `RecordDetail` en lugar de abrir un modal angosto (util para formularios anchos, ej. el preview de Flexmonster). Evidencia: `RecordList.vue:4481-4504` (`getOpenMode`), `RecordList.vue:5708-5714` (`handleCreateRequest`). Las listas embebidas deben mantener el default `'modal'` para no perder el contexto del `RecordDetail` padre al hacer click en una fila.

### 12.3 Row action `deepClone` opt-in

El handler `prefilledModal` de row actions en `RecordList` solo traspasa `prefillFrom.source` al `initialData` del formulario cuando la accion declara `action.deepClone === true` explicitamente. Es opt-in deliberado: activar el clonado por defecto reactivaba un `prefillFrom.deepClone` dormido que rompia otros flujos de prefill. Evidencia: `RecordList.vue:2932-2938`.

### 12.4 Paridad RBAC entre `RecordDetail` y `RecordList`

`RecordDetail` gateaba tabs por `requiredCapability` pero no bajaba el modo `create`/`edit` ni el estado editable/visible por campo segun las capacidades reales del usuario, a diferencia de `RecordList` (que ya aplicaba `effectiveCanCreate`/`effectiveCanEdit` e `isFieldEditable`). Se corrigio para dar paridad:

- `computedMode` (evidencia: `RecordDetail.vue:1672-1681`) baja el modo solicitado a `'view'` cuando `getEffectivePermission` deniega `create` o `modify`, salvo que `layoutConfig.canCreate`/`canEdit` fuercen un override explicito.
- `useRbacPermissions.ts` agrega `isFieldViewable` (evidencia: `useRbacPermissions.ts:251`), espejo de `isFieldModifiable` pero para la accion `:view`.

Antes de este fix, `RecordDetail` era menos restrictivo que `RecordList` para el mismo usuario y objeto: cualquier layout nuevo que edite/cree debe verificar que gatea por RBAC con el mismo criterio que `RecordList`.

### 12.5 Paridad de vista (view-mode) entre `RecordDetail` y `RecordList`

Dos correcciones puntuales de paridad de renderizado en modo vista, mismo patron que 12.4 (RecordList ya se comportaba asi, RecordDetail no):

- **Timezone en DateTime**: `RecordDetail` mostraba UTC crudo en modo vista para campos `string`+`date-time` (ej. `createdAt`/`updatedAt`); se corrige para aplicar timezone local, igual que `RecordList`. El formateo se resuelve al construir el formulario (`viewModeDateInput`, horneado en el `default` del input deshabilitado), no reactivamente en el render, porque convertir el tipo de un elemento despues de montado Vueform vacia el formulario. Evidencia: `RecordDetail.vue:5063-5066`, `RecordDetail.vue:2578-2594` (`viewModeDateInput`).
- **Enum: valor crudo + label traducida**: en modo vista, el campo enum debe preservar el valor original (`raw`) en el form data ademas de mostrar la label traducida, para no romper el round-trip al volver a editar. El `default` del select en modo vista resuelve al valor canonico si matchea (absorbe drift de casing), al valor crudo si el dato quedo huerfano (ya no esta en `enumValues`), o vacio si no hay valor. Evidencia: `RecordDetail.vue:3225-3250`.

### 12.6 Tipo custom `json-schema-editor` y `JSON_STRING_TRANSPORT_TYPES`

Vueform corrompe un valor objeto anidado si se lo inyecta directo como `default` de un elemento (retiene solo la primera entrada del objeto). Por eso, cualquier elemento custom cuyo valor sea un objeto/array JSON complejo debe transportarse serializado como string (igual que `textarea`), y el propio elemento se encarga de parsear el string de vuelta y emitir un objeto plano al cambiar.

`JSON_STRING_TRANSPORT_TYPES` (evidencia: `RecordDetail.vue:2553-2568`) es el set de tipos que siguen este patron: `textarea`, `form-questions-editor`, `form-questions-renderer`, `json-field-viewer`, y `json-schema-editor` (agregado por UPONE-1290: editor visual de JSON Schema, cuyo valor es un objeto anidado en `properties.jsonSchema`).

**Patron a seguir**: todo tipo de elemento custom nuevo cuyo valor sea un objeto/array (no primitivo) debe agregarse a `JSON_STRING_TRANSPORT_TYPES` en vez de asumir que Vueform lo transporta intacto.

### 12.7 `source:{relation,path}` en campos de `RecordDetail`

Un campo puede declarar `source: { relation, path }` para resolver su valor desde una relacion en vez del propio registro. Evidencia: `RecordDetail.vue:2620` (validacion del contrato), `:2634` (uso al construir el valor), con un ejemplo del formato esperado en el comentario de `:2607`.

### 12.8 `emptyDisplayKey` vive fuera de `RecordDetail.vue`

`emptyDisplayKey` (clave i18n a mostrar cuando un campo esta vacio en modo vista) no se implementa en `RecordDetail.vue`: vive en el modulo aparte `RecordDetail/applyEmptyDisplayFallback.ts` (`:64`, con la doc del contrato en `:17` y la traduccion aplicada en `:71-72`). Buscarlo en `RecordDetail.vue` no lo encuentra.

### 12.9 `confirmOnChange`

Contrato declarado en `RecordDetail.vue:4022` (comentario que documenta el contrato) y leido en `:4042-4046`.

### 12.10 Dos `openMode` distintos: no confundirlos (RULE-layout-048)

Hay dos props llamadas `openMode` en capas distintas del layout, con duenos y efectos distintos:

- **`layoutConfig.openMode` de `RecordList`**: ya documentado en 12.2. `getOpenMode` en `RecordList.vue:5035-5052` controla si view/edit/create se abren embebidos (modal) o navegan a ruta.
- **`ModalActionButton.openMode`**: prop de los botones de header, tipada en `src/shared/types/recordlist.ts:491` como `openMode?: 'modal' | 'route'`, consumida en `RecordList.vue:3550-3565`, que emite `navigate-to-relation` cuando vale `'route'`.

El `roles` de `ModalActionButton` (`recordlist.ts:506`) gatea la visibilidad del boton por rol institucional y es independiente de `requiredPermission` (`:497`, gate por capability): ambos se evaluan, no se sustituyen entre si.

### 12.11 Hooks unificados de ciclo de vida y la deuda declarada (RULE-layout-046)

`src/utils/composableHooks.ts` (doc en `:2-3`) define el shape comun `(apolloClient, recordId, record)` (`:29-30`) para los hooks de ciclo de vida, y `runComposableHooks` los ejecuta best-effort (try/catch por hook). Consumido desde `src/composables/useRowMutation.ts:96-101` para `afterMutation`.

**Deuda declarada, no unificada por completo**: las implementaciones inline de `afterSave` (en `RecordDetail.vue`) y `afterDelete` (en `RecordList.vue`) no migraron a este modulo comun. El motivo esta escrito en `composableHooks.ts:35-38`: el formateador del repo reescribe esos dos archivos completos ante cualquier edicion, y un cambio real de 20 lineas produjo un diff de 4406 lineas la ultima vez que se intento. Documentar esto como estado actual, no como pendiente sin explicar.

### 12.12 `defaultSort` y `searchPlaceholder` (BUG-layout-011)

Ambos se respetan hoy en `RecordList.vue`: `defaultSort` en `:4477-4501` (con warning en consola si el valor declarado es invalido) y `searchPlaceholder` en `:4521-4527`.

### 12.13 Convencion i18n `*Tag` para contratos JSON nuevos (RULE-layout-049)

Un contrato de layout que necesita texto traducible declara la clave con sufijo `Tag` (`labelTag`, `placeholderTag`, `descriptionTag`), cada una mapeada a su campo equivalente de Vueform. Documentado en `src/shared/types/recordlist.ts:77-92` y ejercitado en el test `PrefillStepForm.spec.ts:68-73`.

### 12.14 Contrato `blockCreation` de `CalendarLayout.vue` (RULE-layout-051)

`CalendarLayout.vue` declara: `availableViews` (`:93`), `minDate`/`maxDate` (`:99-100`, aplicados en `:878-879`), `fieldMapping.weekField` (`:1253-1254`). El modo `blockCreation` completo esta en `:74`, `:261` y `:916`.

### 12.15 Clasificacion de errores: patron real, no una funcion clasificadora unica (RULE-layout-047)

No existe una funcion central que clasifique errores. El patron esta repartido en `RecordDetail.vue`: un error de **carga** dispara `<ErrorState>` full-view (`:11-18`, `v-else-if="error"`); un **rechazo de negocio en guardado** va a un toast (`showErrorNotification`, `:4837-4843`) mas un modal (`:4846-4849`), nunca al `ErrorState` de pantalla completa. La distincion es por punto del ciclo de vida (carga vs guardado), no por un tipo de error formalizado.

### 12.16 Migracion a core: `AiChatbox` migrado, `IconPicker` con remanente (DECISION-035)

`AiChatbox` ya es un componente de core: `src/layouts/AiChatbox/AiChatbox.vue`. `IconPicker` tambien migro a core, en `src/components/vueform/elements/IconPickerElement.vue` (con comentario propio de la promocion, UPONE-1504), pero **la copia vieja no se elimino**: sigue existiendo en `src/modsComponents/IconPicker/IconPickerElement.vue`. No afirmar que `IconPicker` salio de `modsComponents`: el remanente sigue ahi hasta que se limpie.

---

## Historial de cambios

| Fecha | Descripcion |
|-------|-------------|
| 2026-08-03 | Seccion 12 nueva: contratos `layoutConfig.hasIntegratedControls`/`openMode.create=route` (UPONE-1377), `action.deepClone` opt-in (UPONE-1450), paridad RBAC RecordDetail/RecordList (`computedMode`, `isFieldViewable`, UPONE-1439), paridad view-mode (timezone UPONE-1227, enum raw+label UPONE-1515), tipo `json-schema-editor` y patron `JSON_STRING_TRANSPORT_TYPES` (UPONE-1290). Seccion 6.1 nueva: estados de `resolveDefaultLayout` (`RESOLVED`/`NO_MOD_ROLE_ASSIGNED`/`NOT_FOUND`, UPONE-1354/1460). Todo verificado contra codigo actual de `layout/` y `object-manager/` |
| 2026-07-16 | Documento inicial: arquitectura actual de layout-engine (Atomic Design, tipos de layout, LayoutOrchestrator, Storybook), basado en codigo fuente y docs internos |
| 2026-08-17 | Secciones 12.7 a 12.16 nuevas: `source:{relation,path}`, `emptyDisplayKey` (vive en `applyEmptyDisplayFallback.ts`, no en `RecordDetail.vue`), `confirmOnChange`, distincion entre los dos `openMode` (`layoutConfig` de RecordList vs `ModalActionButton`), hooks unificados de ciclo de vida y su deuda declarada de no-unificacion en `afterSave`/`afterDelete`, `defaultSort`/`searchPlaceholder` respetados, convencion i18n `*Tag`, contrato `blockCreation` de `CalendarLayout`, patron real de clasificacion de errores (carga vs guardado), migracion a core de `AiChatbox` (completa) e `IconPicker` (con remanente sin limpiar en `modsComponents/`). Corregido drift: `layout/docs/reference/layout-json-schema.md` no existe, la referencia correcta es `layout-types.md` + `record-list-config-keys.md` |
