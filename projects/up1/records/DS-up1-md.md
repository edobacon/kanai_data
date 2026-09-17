---
id: DS-up1-md
project: up1
type: doc
module: design-system
tags:
  - design-system
---

# uPlanner One (up1) Design System

Sistema de diseño de uPlanner One, definido como tokens CSS con prefijo `--up1-*` en el paquete `layout` (autoridad de valores) y unificado light/dark en `suite/css/1-theme/theme-tokens.css` mediante `light-dark()`. Identidad de marca teal (#0a808c) sobre una escala de grises neutra (sin tinte azul), tipografía Inter, radios y espaciado compatibles con Bootstrap (el DS sobrescribe Bootstrap vía `bootstrap-overrides.css` y mapea Vueform con variables `--vf-*`). La librería de componentes sigue Atomic Design (atoms / molecules / organisms) en `layout/src/components`, con stories de Storybook y tipos TS por componente; los mods (academic-scheduling, curriculum-design, curriculum-mapping, up1-manager, retention-wellbeing, ai-agent) consumen esos tokens y aportan componentes de dominio en `modsComponents`. Dark mode se activa con la clase `theme-dark` en `<html>` más `color-scheme`, nunca con `[data-theme]` ni `.dark`.

## Paleta

- `--up1-color-primary-500`: #0a808c (Color de marca base (teal). Fondo de botón primario, borde de input en foco, badge por defecto.)
- `--up1-color-primary-600`: #12717b (Hover de primario (`--up1-color-primary-hover`) y color de link (`--up1-text-link`); 5.02:1 sobre bg-body.)
- `--up1-color-primary-700`: #16626b (Estado activo (`--up1-color-primary-active`) y hover de link.)
- `--up1-color-primary-50`: #E7F2F3 (Tinte claro para fondos seleccionados (`--up1-color-primary-light`, cabecera de tabla ordenada).)
- `--up1-color-primary-100`: #B6D9DC (Tinte de fondo suave de la escala primaria.)
- `--up1-color-primary-200`: #7FC4CA (Escala primaria intermedia clara.)
- `--up1-color-primary-300`: #47AEB8 (Escala primaria intermedia.)
- `--up1-color-primary-800`: #17545b (Fondos seleccionados en dark mode.)
- `--up1-color-primary-900`: #17464c (Texto de alto contraste sobre tintes primarios.)
- `--up1-color-primary-950`: #16393d (Fondos profundos de la escala primaria.)
- `--up1-color-primary-rgb`: 10, 128, 140 (Canales RGB del primario para componer rgba() con opacidad (focus ring, bordes sutiles).)
- `--up1-color-success-500`: #22946e (Semántico de éxito: fondo de badge/alert success, acento de tarjeta inscrita.)
- `--up1-color-success-600`: #1b7a5a (Hover de éxito.)
- `--up1-color-success-700`: #156147 (Texto/borde fuerte de éxito.)
- `--up1-color-success-50`: #ecfdf5 (Fondo teñido de éxito.)
- `--up1-color-success-100`: #d1f0e6 (Fondo teñido medio de éxito.)
- `--up1-color-danger-500`: #9c2121 (Semántico de error: Alert/Badge variant danger, botón danger, borde de input inválido.)
- `--up1-color-danger-600`: #851b1b (Hover de error.)
- `--up1-color-danger-700`: #6e1616 (Texto/borde fuerte de error.)
- `--up1-color-danger-50`: #fef2f2 (Fondo teñido de error (también `--up1-notification-error-bg`).)
- `--up1-color-danger-100`: #fadbd8 (Fondo teñido medio de error.)
- `--up1-color-warning-500`: #f59e0b (Semántico de advertencia: Alert/Badge warning, escala de riesgo media.)
- `--up1-color-warning-600`: #d97706 (Hover de advertencia y borde hover.)
- `--up1-color-warning-700`: #b45309 (Texto de advertencia en banners, modales de error y resaltado de SearchBar.)
- `--up1-color-warning-50`: #fffbeb (Fondo de NotificationBanner warning.)
- `--up1-color-warning-100`: #fef3c7 (Fondo de ErrorAlertModal severidad warning.)
- `--up1-color-info-500`: #21498a (Semántico informativo: Alert/Badge info, badge de tipo Evento.)
- `--up1-color-info-600`: #1a3b73 (Hover informativo.)
- `--up1-color-info-700`: #142e5c (Texto/borde fuerte informativo.)
- `--up1-color-info-50`: #eff6ff (Fondo teñido informativo (también `--up1-notification-info-bg`).)
- `--up1-color-info-100`: #d6eaf8 (Fondo teñido medio informativo.)
- `--up1-color-purple-500`: #7c3aed (Paleta extendida púrpura: badge de tipo Webinar, riesgo crítico.)
- `--up1-color-purple-600`: #6d28d9 (Hover púrpura.)
- `--up1-color-purple-700`: #5b21b6 (Púrpura fuerte.)
- `--up1-color-rose-500`: #e11d48 (Paleta extendida rosa: badge de tipo Seminario.)
- `--up1-color-rose-600`: #be123c (Hover rosa.)
- `--up1-color-rose-700`: #9f1239 (Rosa fuerte.)
- `--up1-gray-0`: #ffffff (Superficie de tarjeta/panel (`--up1-bg-primary`), sidebar y texto inverso.)
- `--up1-gray-50`: #f0f0f0 (Fondo de aplicación (`--up1-bg-body`); es el gris de fondo visible detrás de la tarjeta de login.)
- `--up1-gray-100`: #e1e1e1 (Paneles secundarios / sidebars (`--up1-bg-secondary`), borde claro.)
- `--up1-gray-200`: #d3d3d3 (Fondo terciario de inputs/hover (`--up1-bg-tertiary`) y color de borde por defecto en colors.css.)
- `--up1-gray-300`: #c5c5c5 (Borde por defecto en borders.css, borde hover y texto deshabilitado.)
- `--up1-gray-400`: #b6b6b6 (Gris intermedio de la escala.)
- `--up1-gray-500`: #a9a9a9 (Borde en hover (borders.css).)
- `--up1-gray-600`: #9b9b9b (Secundario semántico (`--up1-color-secondary-500`). No cumple AA como texto sobre blanco.)
- `--up1-gray-650`: #6b6b6b (Texto atenuado accesible (`--up1-text-muted`): 4.68:1 sobre bg-body y 5.33:1 sobre blanco.)
- `--up1-gray-700`: #525252 (Texto secundario / descripciones (`--up1-text-secondary`).)
- `--up1-gray-800`: #3a3a3a (Gris oscuro neutro.)
- `--up1-gray-900`: #262626 (Texto principal (`--up1-text-primary`); es el color del título "uPlanner One" en la pantalla de login.)
- `--up1-gray-950`: #171717 (Gris más oscuro de la escala.)
- `--up1-focus-ring-color`: rgba(var(--up1-color-primary-rgb), 0.25) (Color del anillo de foco; ancho 0.25rem vía `--up1-focus-ring-width`.)
- `--up1-bg-overlay`: rgba(0, 0, 0, 0.35) (Backdrop de modales y dropdowns (`--up1-overlay-backdrop`); `--up1-overlay-dark` al 10% resultaba imperceptible.)
- `--up1-capacity-low`: #1d9e75 (Escala de dominio de capacidad 0-30% (amplia disponibilidad).)
- `--up1-capacity-mid`: #639922 (Capacidad 30-60% (cómodo).)
- `--up1-capacity-high`: #ef9f27 (Capacidad 60-85% (llenándose).)
- `--up1-capacity-crit`: #d85a30 (Capacidad 85-99% (últimos cupos).)
- `--up1-capacity-full`: #888780 (Capacidad 100% (sin cupos).)
- `--up1-action-enroll-bg`: #1d9e75 (Acción primaria de inscripción, desacoplada del verde de éxito reservado al badge "Inscrito".)
- `--up1-syntax-keyword`: #8e44ad (Resaltado de sintaxis del editor de fórmulas/validación: keyword.)
- `--up1-syntax-function`: #2563eb (Resaltado de sintaxis: función.)
- `--up1-syntax-string`: #16a34a (Resaltado de sintaxis: string.)
- `--up1-syntax-number`: #b45309 (Resaltado de sintaxis: número.)
- `--up1-shadow-md`: 0 4px 6px rgba(0, 0, 0, 0.1) (Elevación media; hover de tarjeta.)
- `--up1-shadow-modal`: 0 10px 40px rgba(0, 0, 0, 0.2) (Elevación de modal; coincide con la sombra difusa de la tarjeta de login.)
- `--up1-shadow-focus`: 0 0 0 3px rgba(10, 128, 140, 0.25) (Anillo de foco teal para controles interactivos.)

## Tipografia

- `--up1-font-family-base` — 'Inter', system-ui, -apple-system, "Segoe UI", Roboto, sans-serif 1rem 400 — Familia base de toda la UI; Inter se importa desde Google Fonts en design-tokens/index.css con pesos 300-800.
- `--up1-font-family-mono` — 'SFMono-Regular', Menlo, Monaco, Consolas, monospace 0.875rem 400 — Código, fórmulas, editor de validación y detalles técnicos de ErrorState.
- `--up1-font-size-xs` — var(--up1-font-family-base) 0.75rem 400 — 12px. Descripciones de campo (`--up1-vf-description-font-size`) y texto opcional de steps.
- `--up1-font-size-sm` — var(--up1-font-family-base) 0.875rem 500 — 14px. Labels de formulario (`--up1-vf-label-font-size` con weight 500), tags, botones size sm.
- `--up1-font-size-base` — var(--up1-font-family-base) 1rem 400 — 16px. Cuerpo de texto e inputs (`--up1-input-font-size`, `--bs-body-font-size`), line-height 1.5.
- `--up1-font-size-lg` — var(--up1-font-family-base) 1.125rem 500 — 18px. Botones size lg y subtítulos.
- `--up1-font-size-xl` — var(--up1-font-family-base) 1.25rem 600 — 20px. Títulos de sección y encabezados de modal.
- `--up1-font-size-2xl` — var(--up1-font-family-base) 1.5rem 700 — 24px. Título de página / heading principal; corresponde al "uPlanner One" de la pantalla de acceso.
- `--up1-font-size-3xl` — var(--up1-font-family-base) 1.875rem 700 — 30px. Cifras destacadas (StatCard) y encabezados grandes.
- `--up1-font-size-4xl` — var(--up1-font-family-base) 2.25rem 800 — 36px. Display, uso excepcional.
- `--up1-font-weight-light` — 300 — Peso más liviano disponible en Inter.
- `--up1-font-weight-normal` — 400 — Peso de cuerpo por defecto.
- `--up1-font-weight-medium` — 500 — Peso de botones (`--up1-button-font-weight`) y labels.
- `--up1-font-weight-semibold` — 600 — Encabezados de tabla y títulos de tarjeta.
- `--up1-font-weight-bold` — 700 — Títulos principales.
- `--up1-font-weight-extrabold` — 800 — Display, uso excepcional.
- `--up1-line-height-tight` — 1.25 — Interlineado de títulos.
- `--up1-line-height-normal` — 1.5 — Interlineado de cuerpo e inputs (`--bs-body-line-height`).
- `--up1-line-height-relaxed` — 1.625 — Bloques de texto largo.

## Espaciado y tamanos

- `--up1-spacing-0`: 0
- `--up1-spacing-px`: 1px
- `--up1-spacing-0-5`: 0.125rem (2px)
- `--up1-spacing-1`: 0.25rem (4px)
- `--up1-spacing-1-5`: 0.375rem (6px)
- `--up1-spacing-2`: 0.5rem (8px)
- `--up1-spacing-2-5`: 0.625rem (10px)
- `--up1-spacing-3`: 0.75rem (12px)
- `--up1-spacing-3-5`: 0.875rem (14px)
- `--up1-spacing-4`: 1rem (16px)
- `--up1-spacing-5`: 1.25rem (20px)
- `--up1-spacing-6`: 1.5rem (24px)
- `--up1-spacing-7`: 1.75rem (28px)
- `--up1-spacing-8`: 2rem (32px)
- `--up1-spacing-10`: 2.5rem (40px)
- `--up1-spacing-12`: 3rem (48px)
- `--up1-spacing-16`: 4rem (64px)
- `--up1-spacing-20`: 5rem (80px)
- `--up1-spacing-24`: 6rem (96px)
- `--up1-spacing-xs`: var(--up1-spacing-1) = 0.25rem
- `--up1-spacing-sm`: var(--up1-spacing-2) = 0.5rem
- `--up1-spacing-md`: var(--up1-spacing-4) = 1rem
- `--up1-spacing-lg`: var(--up1-spacing-6) = 1.5rem
- `--up1-spacing-xl`: var(--up1-spacing-8) = 2rem
- `--up1-border-radius-none`: 0
- `--up1-border-radius-sm`: 0.25rem (4px)
- `--up1-border-radius`: 0.375rem (6px) — radio por defecto de botones e inputs
- `--up1-border-radius-md`: 0.5rem (8px)
- `--up1-border-radius-lg`: 0.75rem (12px) — radio de tarjetas (`--up1-card-border-radius`)
- `--up1-border-radius-xl`: 1rem (16px)
- `--up1-border-radius-2xl`: 1.5rem (24px)
- `--up1-border-radius-full`: 9999px — badges pill y avatares
- `--up1-border-width-0`: 0
- `--up1-border-width-1`: 1px — ancho de borde por defecto (`--up1-border-width`)
- `--up1-border-width-2`: 2px
- `--up1-border-width-4`: 4px
- `--up1-input-min-height`: 2.5rem (40px)
- `--up1-input-padding-x`: var(--up1-spacing-3) = 0.75rem
- `--up1-input-padding-y`: var(--up1-spacing-2) = 0.5rem
- `--up1-button-padding-sm`: var(--up1-spacing-1) var(--up1-spacing-2)
- `--up1-button-padding-md`: var(--up1-spacing-2) var(--up1-spacing-4)
- `--up1-button-padding-lg`: var(--up1-spacing-3) var(--up1-spacing-6)
- `--up1-focus-ring-width`: 0.25rem
- `--up1-breakpoint-xs`: 480px
- `--up1-breakpoint-sm`: 576px
- `--up1-breakpoint-md`: 768px
- `--up1-breakpoint-lg`: 1024px
- `--up1-breakpoint-xl`: 1200px
- `--up1-transition-fast`: 0.15s ease-in-out — transición de botones
- `--up1-transition-base`: 0.3s ease-in-out — transición de tarjetas
- `--up1-transition-slow`: 0.5s ease-in-out

## Componentes existentes (reusar antes de crear)

- **Button** (`layout/src/components/atoms/Button/Button.vue`) — Botón base. Variantes sólidas, outline y link; icono de Bootstrap Icons, block y aria-label. Tokenizado en atoms.css: padding por tamaño, weight 500, radio 0.375rem, hover con translateY(-1px) + shadow-sm. Variantes: primary | secondary | success | danger | warning | info | light | dark | outline-* | link. Tamaños sm | md | lg. Estados: loading, disabled (opacity 0.65), block.
- **Badge** (`layout/src/components/atoms/Badge/Badge.vue`) — Etiqueta/chip de estado. El modo `soft` es la forma canónica de chip o criterio activo; con `pill` y `dismissible` reemplaza los pills que varios organismos replicaban. `customColor` para tokens de dominio (`--up1-badge-type-*`).
- **Input** (`layout/src/components/atoms/Input/Input.vue`) — Campo con label, icono, help y error. Altura mínima 2.5rem, padding 0.5rem/0.75rem, radio 0.375rem, borde a `--up1-color-primary` en foco.
- **Alert** (`layout/src/components/atoms/Alert/Alert.vue`) — Mensaje contextual en línea con título, mensaje, icono por variante y acción. Auto-cierre pausable por hover/foco. Patrón para errores de guardado y advertencias de formulario.
- **Spinner** (`layout/src/components/atoms/Spinner/Spinner.vue`) — Loader inline de grano fino (dentro de botones, celdas o paneles), distinto de LoadingState que ocupa la vista.
- **Átomos base** (`layout/src/components/atoms/`) — Avatar, Checkbox, Divider, Heading, Icon, IconButton, Image, Label, Link, Progress, Radio, Select, Text, Textarea, Tooltip. Todos con types.ts, spec y story.
- **EmptyState** (`layout/src/components/molecules/EmptyState/EmptyState.vue`) — Estado vacío canónico: icono, título obligatorio, descripción y acción opcional. Obligatorio cuando una lista/tabla/preview no tiene filas.
- **ErrorState** (`layout/src/components/molecules/ErrorState/ErrorState.vue`) — Error de vista completa con título, mensaje, detalles colapsables y botones reintentar/volver. Emite `retry`.
- **LoadingState** (`layout/src/components/molecules/LoadingState/LoadingState.vue`) — Carga de vista completa con mensaje/submensaje. Contraparte de EmptyState/ErrorState en la tríada loading → error → vacío.
- **Modal** (`layout/src/components/molecules/Modal/Modal.vue`) — Diálogo con v-model, header/body/footer por slots, teleport y gestión de foco. z-index calculado al abrir; ModalStackManager para stacks. Tamaños sm | md | lg | xl | full.
- **Moléculas de formulario y datos** (`layout/src/components/molecules/`) — FormField, FormErrorSummary, ValidationErrorBanner, PasswordInput, SearchBar, SearchInput, SelectMenu, PersonSearchDropdown, Dropdown, ActionMenu, ActionToolbar, ButtonGroup, Pagination, TableCell, StatCard, FieldCard, JsonFieldViewer, RecordHoverCard, ViewToggle, Breadcrumb, RecurrenceConfig.
- **Moléculas de tarjeta y feedback** (`layout/src/components/molecules/`) — BaseCard y Card (superficie blanca, radio 0.75rem, hover con translateY(-2px) + shadow-md), NotificationBanner, RefreshOverlay, BlockedOverlapBanner, HolidayBanner, PickerStateAlerts, BulkTransitionPreview.
- **Moléculas de calendario** (`layout/src/components/molecules/`) — CalendarDatePicker, CalendarEventCard, CalendarLegend, CalendarNavBar, CalendarViewToggle. Tokens propios de calendario con valores distintos en dark.
- **Table** (`layout/src/components/organisms/data/Table/`) — Tabla con tokens dedicados (`--up1-table-bg`, `--up1-table-head-bg`, `--up1-table-hover-bg`, `--up1-table-head-sorted-bg` = tinte primario-50). Fila con hover en bg-tertiary y cabecera ordenada resaltada en teal claro.
- **Organismos de datos** (`layout/src/components/organisms/data/`) — BlockCalendar, OfferingCalendar, CalendarMonthGrid, CalendarWeekDayGrid, CalendarEventCreationFlow, CardGrid, MultiSelectPickerTab, Table.
- **Organismos modales** (`layout/src/components/organisms/modal/`) — ConfirmationModal, CriticalWarningModal, ErrorAlertModal (severidades critical/error/warning/info), AvailabilityConflictModal, EventDetailModal, AllInputsModal, ImportTemplateModal, DownloadTemplateModal, MultiSelectPickerModal, FiltersColumnRecordList, ChangeColumnsPosition, FormBoundaryElement, ModalStackManager.
- **Layouts** (`layout/src/layouts/`) — LayoutOrchestrator, RecordList, RecordDetail, ChibiList, CalendarLayout, ImportTaskList, AiChatbox y widgets (WidgetHeader, KpiOverlay).
- **Componentes de dominio (mods)** (`up1/mods/*/modsComponents/`) — Academic scheduling: TimeBlockHeatmap, TimeBlockGrid, Scenario*, ConflictDetailPanel, InstructorAssignPanel, RuleSetEditor, FilterBar. Curriculum: CurriculumMesh, CompetencyMatrixShell, CompetencyAlignmentGrid, CompetencyTreeEditor, PerformanceScaleEditor, MatrixAdoptionEditor, ConsolidationBlock, MeasurementModelHelp, CompositeSectionTree, InstructionalTotalDisplay, ReglaUnificadaView. Genéricos: RichTextRenderer, RecordCollectionEditor, RelationMultiSelect, ColorPicker, ActivityStatusBadge, RequirementEditor, ValidationTextEditor.
- **Workflow / diff (flow)** (`up1/flow/`) — WorkflowHistory, WorkflowVersionFormModal, WorkflowDiffModal, WorkflowDiffView/Aside/Content, SyncedWorkflowCanvas, NodeDiff, DiffBadge, HighlightedEdge, Templates*.

## Patrones transversales

- **Tríada loading → error → vacío**: Toda vista que carga datos encadena LoadingState (mientras `loading`), ErrorState con `@retry` (si falló) y EmptyState (si no hay filas). Para cargas de grano fino dentro de un botón o celda se usa Spinner, no LoadingState.
- **Error de formulario con Alert accesible**: Errores de guardado con `<Alert variant="danger" role="alert" aria-live="assertive" />` junto al formulario; advertencias no bloqueantes con `variant="warning"`. Errores por campo en la prop `error` del Input; resumen en FormErrorSummary / ValidationErrorBanner.
- **Botón en estado de guardado**: el mismo flag alimenta `:loading` y `:disabled` del botón primario; el cancelar contiguo es `outline-secondary` también deshabilitado. Un botón deshabilitado conserva el color de su variante con `--up1-button-disabled-opacity: 0.65`.
- **Foco visible tokenizado**: el foco nunca se elimina; se pinta con un anillo teal de 0.25rem (25% del primario), reexportado a botones, sombras e inputs de Vueform. Variantes danger y success. Controles a mano usan `:focus-visible`.
- **Dark mode con light-dark() y clase theme-dark**: el modo oscuro se resuelve en `suite/css/1-theme/theme-tokens.css` con `light-dark(<claro>, <oscuro>)`. La clase `theme-dark` en `<html>` (nunca `[data-theme]` ni `.dark`) queda para lo que `light-dark()` no cubre: filtros, gradientes, SVG data-URIs, mapeos Vueform y escalas de dominio.
- **Accesibilidad de contraste en la escala de grises**: el texto atenuado usa `--up1-gray-650` (#6b6b6b), no gray-600 (2.85:1 sobre blanco). Links en primary-600 en lugar de primary-500, hover en primary-700.
- **Semántica de color separada de la escala de dominio**: estados binarios con success/danger/warning/info; magnitudes progresivas con escalas de dominio (`--up1-capacity-low → -full`). `--up1-action-enroll-bg` desacoplado del verde de éxito.
- **Tinte translúcido vía canales RGB**: cada color semántico expone sus canales (`-rgb`) para componer `rgba()`; alimenta bordes sutiles (20%) y fondos de icono (12-15%).
- **Elevación por intención, no por número**: además de la escala xs → 2xl, sombras nombradas por rol (`--up1-shadow-card-hover`, `-dropdown`, `-popover`, `-modal`, `-table-cell`, `-dragging`, `-sidebar`, `-inset`).
- **Tokens en capas: base → semántico → componente**: paleta base, mapeo semántico (`--up1-text-*`, `--up1-bg-*`, `--up1-border-*`) y tokens por componente. Un componente nunca consume un hex crudo; así un tema de tenant reasigna solo la capa base.
- **Integración con Bootstrap y Vueform**: el DS no reemplaza Bootstrap ni Vueform, los reasigna. `bootstrap-overrides.css` mapea `--bs-*` a tokens up1; las `--vf-*` de Vueform se redirigen a up1.
- **Iconografía Bootstrap Icons por nombre**: los iconos se pasan como string (`icon="bi-inbox"`) en Button, Badge, Alert, Input, EmptyState y ErrorState. No SVG inline para iconografía de sistema.
- **Contrato de props por componente**: cada componente expone su contrato en un `types.ts` propio, con `index.ts`, `.spec.ts` y `.stories.ts`. Variantes y tamaños con el mismo vocabulario en toda la librería.
- **Textos vía i18n, nunca literales**: todo texto visible pasa por `$t()` / `t()`, incluidos los mensajes de estados vacío, error y carga.

## Layout de pantallas internas (cd / cm)

Revisión de las vistas reales de Curriculum Design (cd) y Curriculum Mapping (cm) en el app corriendo (tenant UPU), con foco en paddings, margins y columnas. Scaffolds que se repiten:

- **App shell**: barra superior fija (logo + menús desplegables) + rail de apps colapsable a la izquierda (uP1 Manager, Academic Scheduling, Curriculum Design, Engagement, Curriculum Mapping) + área de contenido. El rail se colapsa a botón hamburguesa en anchos angostos.
- **RecordList** (`layout/src/layouts/RecordList`): breadcrumb, título de página con dropdown de vista, SearchBar de ancho completo, toolbar de acciones (filtro / configuración de columnas / toggle lista-grilla / refresh / botón primario "+"; en cm se suman acciones custom), Table con cabeceras ordenables (flecha asc/desc), checkbox por fila y hover de fila, y pie de Pagination con "Mostrar N por página".
- **RecordDetail** (`layout/src/layouts/RecordDetail`): título + tab bar horizontal (con overflow a chevron cuando no entran las pestañas), y cuerpo de formulario en **grilla de 2 columnas** (`1fr 1fr`) con labels en mayúscula tamaño xs (0.75rem) sobre inputs de 40px (`--up1-input-min-height`).
- **Malla curricular** (`CurriculumMesh`, cd): tres bloques apilados con `margin-bottom: 1rem`. (1) **Barra de resumen** `.cm-sumbar`: `grid-template-columns: repeat(4, 1fr); gap: 12px`; cada stat-card `.cm-sumstat` con `padding: 12px 14px`, radio md y **acento lateral de 3px** (equivalente a StatCard). (2) **Filtros de líneas de formación** `.cm-filters`: chips en `flex-wrap` con `gap: .5rem`; cada `.cm-fchip` con `min-width: 120px`, `padding: .35rem .6rem` y **barra de cobertura de 3px**. (3) **Tablero kanban por período** `.cm-cols`: `display:flex; gap: 12px; overflow-x:auto`; columnas `.cm-col` fijas en `flex: 0 0 196px; min-width: 196px`; header `.cm-colh` con `padding: 8px` y fondo secundario; tarjetas de asignatura `.cm-pe` con `padding: 8px 10px`, `margin-bottom: 8px` y **borde-acento izquierdo de 4px** por línea de formación.
- **Tributación** (`CompetencyAlignmentGrid`, cm — UPONE-1756): grilla CRUD por competencia. La celda de tributación usa `grid-template-columns: repeat(3, minmax(0, 1fr))`; la primera columna (árbol de competencias) queda **sticky** a la izquierda y el resto scrollea horizontal; la jerarquía se dibuja con **rieles** cuyo paso es `--up1-spacing-1` (4px, rieles pegados). Todo el espaciado está tokenizado con `--up1-spacing-*`: es el componente **mejor alineado al DS** de los mods, el patrón a imitar.
- **Medición** (matriz, cm): formulario + sección "Consolidación de logro" con **selector de 4 tarjetas** (Estándar / Escalonado / Mejor evidencia / Personalizada) en grilla `1fr 1fr` (colapsa a 1 columna en angosto, `MeasurementModelHelp`); la tarjeta activa lleva borde teal. Botón secundario "Ver un ejemplo del cálculo" y expander "Ver el detalle".
- **Competencias** (matriz, cm — `CompetencyTreeEditor`): chips de definición, header con botones outline, filas colapsables por competencia (chip de código de color + badges de estado, incl. pill outline de advertencia "N por revisar") y banner soft-success con la suma total. Grillas internas `repeat(12, minmax(0, 1fr))` y `repeat(auto-fit, minmax(11rem, 1fr))`.
- **Adopción** (matriz, cm — `MatrixAdoptionEditor`): formulario + **Alert informativo** (explica Quitar vs Retirar) + SearchBar con botón "Buscar" y Select, y Table de planes que adoptan.

**Catálogo de grid-template-columns en cd/cm** (para reuso):
- Tributación (celda): `repeat(3, minmax(0, 1fr))`
- CompetencyTreeEditor: `repeat(12, minmax(0, 1fr))` y `repeat(auto-fit, minmax(11rem, 1fr))`
- ConsolidationBlock: `repeat(auto-fit, minmax(12rem, 1fr))`
- MeasurementModelHelp: `1fr 1fr` → `1fr` (responsive)
- Malla (sumbar): `repeat(4, 1fr)` con `gap: 12px`
- RequirementEditor (cd): `1fr minmax(180px, 240px)` y `1fr 1fr`
- ColorPicker (cd): `repeat(8, minmax(0, 1fr))`
- CompositeSectionTree (cd): `minmax(120px, 30%) 1fr`

## Fidelidad de spacing y tokens en los mods (hallazgos)

Contraste medido entre los dos mods (usos en los `<style>` de sus `modsComponents`):
- **curriculum-mapping (cm)**: ~338 usos de `var(--up1-spacing-*)`, ~35 px crudos, 1 rem crudo. **Sigue la escala del DS** (tributación, medición, matrices).
- **curriculum-design (cd)**: solo ~2 usos de `var(--up1-spacing-*)`, con ~75 px + ~114 rem hardcodeados. **Prácticamente ignora la escala de spacing** (malla, RequirementEditor definen paddings/margins/gaps con literales: `.75rem`, `12px`, `8px`, `196px`).

**Deuda concreta en la malla (`CurriculumMesh`)** — nombres de token que NO existen:
- Usa `var(--up1-radius-md, 8px)` y `var(--up1-radius, 6px)`, pero esos tokens **no existen**: los reales son `--up1-border-radius-md` (0.5rem = 8px) y `--up1-border-radius` (0.375rem = 6px). Hoy "funciona" solo porque el fallback coincide en px, pero el componente **ignora el token del DS**: un tema de tenant que reasigne el radio no llega a la malla.
- Igual con fallbacks de color de otra paleta (`#e5e7eb`, `#d1d5db`, `#374151`, `#f3f4f6` de Tailwind) en vez de los `--up1-gray-*` / `--up1-bg-*`. Si el token faltara, pintaría un gris ajeno al sistema.

**Recomendación** (no bloqueante, para cuando se toque cd/malla): migrar los literales a la escala `--up1-spacing-*` y corregir los nombres de token de radio a `--up1-border-radius*`. Tributación (cm) es el patrón de referencia.

> Nota: la sección "Layout de pantallas internas" y estos hallazgos de fidelidad se agregaron manualmente sobre el design system generado (revisión de las vistas cd/cm logueado). Si se regenera con el constructor automático —que solo captura la pantalla de acceso sin sesión— esta ampliación se sobrescribe.

## Fuentes

- layout/src/styles/design-tokens/colors.css (autoridad de la paleta y los semánticos)
- layout/src/styles/design-tokens/typography.css, spacing.css, borders.css, shadows.css, transitions.css, z-index.css
- layout/src/styles/design-tokens/index.css (orden de carga, import de Inter y Bootstrap Icons)
- layout/src/styles/design-tokens/components/atoms.css, molecules.css, organisms.css
- layout/src/styles/design-tokens/bootstrap-overrides.css, layout/src/styles/vueform-uplanner.css
- layout/public/design-tokens.source.json
- suite/css/1-theme/theme-tokens.css (unificación light/dark con light-dark()), dark.css, default.css, uengagement.css, report-builder.css
- layout/src/components/atoms/, molecules/, organisms/, layout/src/layouts/ (con types.ts, spec y stories)
- layout/.storybook/ (incluye stories/foundations/Theme_Dark_Example.stories.ts)
- up1/mods/*/modsComponents/ (academic-scheduling, curriculum-design, curriculum-mapping, up1-manager, retention-wellbeing, ai-agent, uengagement-up1)
- up1/mods/curriculum-mapping/tests/integration/design-tokens.test.ts
- Capturas de la app corriendo (tenant UPU, login clerk_test): pantalla de acceso; y pantallas internas de cd/cm — RecordList (Programas académicos, Planes de estudios, Matrices de competencias), RecordDetail (Plan de Estudios: General), Malla curricular (CurriculumMesh), y matriz de competencias (Medición, Competencias, Adopción)
- Componentes hero revisados en código: mods/curriculum-mapping/modsComponents/CompetencyAlignmentGrid (tributación) y mods/curriculum-design/modsComponents/CurriculumMesh (malla)
