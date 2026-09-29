---
id: DS-jormat-evolution-md
project: jormat-evolution
type: doc
module: design-system
tags:
  - design-system
---

# Jormat Evolution Design System

Design system de la app administrativa Jormat Evolution (Next.js + Tailwind + shadcn/ui + Radix + CVA). Dos capas de tokens conviven: una paleta legacy del scaffold (`--color-*` en RGB, consumida por clases `.btn-primary`, `.card`, `.badge` y el shell entregado) y el design system semantico JOR-003 en convencion shadcn (variables HSL sin `hsl()`, tema claro en `:root` y oscuro en `.dark` aplicado por ThemeProvider sobre `<html>`). La identidad es verde de marca sobre neutros grises, mucho aire, esquinas redondeadas (radius base 12px), sombras suaves y jerarquia por peso tipografico y color mas que por bordes. Tipografia Inter via next/font. La galeria de UI vive en `src/components/ui/<kebab>/` con un componente por carpeta, `index.ts` de reexport y story de Storybook con `tags:['autodocs']`; encima hay componentes de dominio por modulo (ventas, compras, payments, items, config) y el shell (AppShell/TopBar/Sidebar) con scroll unico en `<main>`. Estados semanticos (success/warning/info/destructive/accent-brand) estan triplicados en `-bg` (pill suave), `-fg` (texto/icono) y solido, lo que da badges, alerts y KPI cards consistentes en ambos temas.

## Paleta

- `primary`: hsl(142 76% 36%) /* #16A34A */ (Verde de marca: botones primarios (Button default), CTA, total, ring de foco. En dark: 142 70% 45%)
- `primary-foreground`: hsl(0 0% 100%) (Texto/icono sobre el primario. En dark: 144 80% 8%)
- `background`: hsl(210 20% 98%) /* #F7F8FA */ (Fondo de pagina. En dark: 222 47% 11%)
- `foreground`: hsl(222 47% 11%) /* #111827 */ (Texto fuerte / titulos. En dark: 210 20% 98%)
- `card`: hsl(0 0% 100%) (Superficie de card, KPI card, tabla. En dark: 222 41% 14%)
- `card-foreground`: hsl(222 47% 11%) (Texto sobre card (valor del KPI). En dark: 210 20% 98%)
- `popover`: hsl(0 0% 100%) (Fondo de popover, dropdown-menu, select. En dark: 222 41% 14%)
- `secondary`: hsl(220 14% 96%) /* #F3F4F6 */ (Relleno neutro: Button variant secondary, Badge secondary, superficie de outline en dark. En dark: 217 33% 18%)
- `secondary-foreground`: hsl(217 19% 27%) /* #374151 */ (Texto sobre relleno neutro. En dark: 210 20% 92%)
- `muted`: hsl(220 14% 96%) (Relleno apagado: Badge neutral, icono KPI neutral, skeleton. En dark: 217 33% 18%)
- `muted-foreground`: hsl(220 9% 46%) /* #6B7280 */ (Texto secundario, labels, headers de tabla, placeholders, captions. En dark: 218 11% 65%)
- `accent`: hsl(138 64% 96%) /* #ECFDF3 */ (Realce sutil de marca: hover de Button ghost/outline, item de nav activo. En dark: 142 28% 18%)
- `accent-foreground`: hsl(142 72% 29%) /* #15803D */ (Texto sobre el realce de marca. En dark: 141 79% 78%)
- `destructive`: hsl(0 72% 51%) /* #DC2626 */ (Peligro: Button destructive, Badge destructive/error, tendencia a la baja. En dark: 0 63% 50%)
- `destructive-foreground`: hsl(0 0% 100%) (Texto sobre el rojo solido)
- `destructive-fg`: hsl(0 72% 42%) (Texto/icono rojo suave (KPI 'Sin stock'). En dark: 0 91% 82%)
- `destructive-bg`: hsl(0 86% 97%) (Fondo rojo suave de pill/recuadro de error. En dark: 0 40% 18%)
- `success`: hsl(142 76% 36%) (Estado OK solido (Aceptado, En stock). En dark: 142 70% 45%)
- `success-fg`: hsl(142 72% 29%) (Texto/icono verde de estado OK (Badge success, tendencia al alza). En dark: 141 79% 78%)
- `success-bg`: hsl(141 79% 93%) /* #DCFCE7 */ (Fondo suave de pill/alert success. En dark: 142 38% 16%)
- `warning`: hsl(38 92% 50%) (Advertencia solida (Pendiente, Bajo stock). En dark: 38 92% 55%)
- `warning-fg`: hsl(26 90% 37%) (Texto/icono ambar de advertencia. En dark: 48 96% 77%)
- `warning-bg`: hsl(48 96% 89%) /* #FEF3C7 */ (Fondo suave de Badge/Alert warning y banners. En dark: 36 45% 16%)
- `info`: hsl(221 83% 53%) (Informativo solido (Pagos, Entradas). En dark: 217 91% 60%)
- `info-fg`: hsl(224 76% 48%) (Texto/icono azul informativo. En dark: 213 94% 80%)
- `info-bg`: hsl(214 95% 93%) /* #DBEAFE */ (Fondo suave de Badge/Alert info y KPI 'Con stock'. En dark: 217 45% 20%)
- `accent-brand`: hsl(262 83% 58%) (Acento morado de marca (KPI 'Marcas' — JOR-067). En dark: 262 83% 68%)
- `accent-brand-fg`: hsl(263 70% 50%) (Texto/icono morado. En dark: 258 90% 84%)
- `accent-brand-bg`: hsl(252 100% 96%) (Fondo suave morado del recuadro de icono KPI. En dark: 262 40% 20%)
- `border`: hsl(220 13% 91%) /* #E5E7EB */ (Borde de 1px en cards, tablas y separadores. En dark: 217 33% 22%)
- `input`: hsl(220 13% 91%) (Borde de inputs y Button outline. En dark: 217 33% 24%)
- `ring`: hsl(142 76% 36%) (Anillo de foco visible (= primary). En dark: 142 70% 45%)
- `--color-primary (legacy)`: rgb(77 194 71) /* #4dc247 */ (Verde del scaffold JOR-002; alimenta `brand-400` y `.btn-primary`. Convive con `primary` hasta la retematizacion del shell)
- `--color-primary-hover (legacy)`: rgb(61 168 58) /* #3da83a */ (Hover del verde legacy (= brand-500))
- `--color-surface (legacy)`: rgb(255 255 255) (Superficie blanca de `.card` legacy)
- `--color-surface-alt (legacy)`: rgb(249 250 251) (Fondo del `body` (legacy). Es el gris que se ve en la pantalla de login)
- `--color-border (legacy)`: rgb(229 231 235) (Borde por defecto aplicado globalmente con `* { @apply border-[rgb(var(--color-border))] }`)
- `--color-text (legacy)`: rgb(17 24 39) /* #111827 */ (Color de texto heredado del body; por eso Button ghost/outline fuerzan `text-foreground` para no quedar invisibles en dark)
- `--color-text-muted (legacy)`: rgb(90 95 112) (Texto apagado de la capa legacy)
- `--color-warning (legacy)`: rgb(202 138 4) (Ambar legacy del scaffold)
- `--color-danger (legacy)`: rgb(220 38 38) (Rojo legacy del scaffold)
- `brand-500 / brand-600`: #3da83a / #2f8a2d (Escala `brand` legacy en tailwind.config (50–950) usada por las clases de componente legacy; los docs proponen realinearla a la escala green de Tailwind)

## Tipografia

- `font-sans` — 'Inter', system-ui, -apple-system, sans-serif — — — Unica familia. Cableada con next/font en layout.tsx y expuesta como `--font-sans`; el `body` la aplica junto a `antialiased`
- `H1 de pagina` — Inter text-2xl / text-3xl (24–30px) font-bold (700) — Titulo de vista en la cabecera de pagina, junto al subtitulo y las acciones a la derecha. En el login, 'Jormat Evolution'
- `Titulo de seccion / card` — Inter text-sm / text-base (14–16px) font-semibold (600) — CardTitle, encabezados de secciones numeradas de formulario, titulo de modal
- `Valor KPI` — Inter text-2xl (24px) en KPICard implementado; los docs proponen text-3xl/4xl font-semibold (600) — Numero grande de la tarjeta de metrica (`mt-2 text-2xl font-semibold text-card-foreground`)
- `Cuerpo` — Inter text-sm (14px) font-normal (400) — Texto corrido, celdas de tabla, descripciones de EmptyState/ErrorState
- `Boton` — Inter text-sm (14px) font-medium (500) — Label de Button en todas sus variantes y tamanos
- `Label / header de tabla` — Inter text-xs / text-[13px] (12–13px) font-medium (500) — Labels de formulario, headers ordenables de DataTable y label del KPICard, siempre en `text-muted-foreground`
- `Badge / pill` — Inter text-xs (12px) font-semibold (600) — Badge en todas sus variantes (`rounded-full px-2.5 py-0.5 text-xs font-semibold`)
- `Caption / meta` — Inter text-xs (12px) font-normal (400) — Texto de apoyo en `text-muted-foreground`: 'Acceso seguro mediante tu cuenta corporativa', tendencia del KPI, 'Mostrando X a Y de N'
- `Numeros tabulares` — Inter — — — `font-variant-numeric: tabular-nums` para montos y columnas numericas, alineados a la derecha

## Espaciado y tamanos

- `--radius (base)`: 0.75rem (12px)
- `rounded-lg (= --radius)`: 0.75rem (12px) — cards, dropdowns, KPICard
- `rounded-md (= radius - 2px)`: 0.625rem (10px) — botones e inputs
- `rounded-sm (= radius - 4px)`: 0.5rem (8px) — chips, inputs pequenos
- `rounded-full`: 9999px — badges/pills, avatar, switch
- `escala base`: 4px (escala Tailwind por defecto)
- `gap-3`: 12px — separacion entre KPI cards en StatGrid
- `gap-4 / gap-5`: 16px / 20px — grilla de cards y modulos
- `p-4`: 16px — padding interno de KPICard
- `p-5 / p-6`: 20px / 24px — padding interno de cards y del area de contenido
- `space-y-6`: 24px — separacion vertical entre secciones de una vista
- `Button h-default`: h-10 px-4 py-2 (40px de alto)
- `Button h-sm`: h-9 px-3 (36px)
- `Button h-lg`: h-11 px-8 (44px)
- `Button icon`: h-10 w-10 (40x40)
- `Sidebar`: w-64 (256px) expandido · w-16 (64px) colapsado
- `Topbar`: h-14–h-16 (56–64px)
- `Recuadro de icono KPI`: h-9 w-9 (36px), rounded-md
- `Sombras`: shadow-sm (card en reposo) · shadow-md (hover, dropdown) · shadow-lg (popover) · shadow-xl/2xl (modales)
- `Z-index`: contenido 0 · sidebar 30 · topbar 40 · dropdown/popover 50 · overlay+modal 60 · toast 70
- `Breakpoints`: sm 640 · md 768 · lg 1024 · xl 1280 · 2xl 1536 (desktop-first)
- `Motion`: 150–200ms ease-out; animate-fade-in 0.15s, animate-slide-in-right 0.2s, sidebar duration-200
- `Scrollbar`: 6px de ancho/alto, thumb #d1d5db (hover #9ca3af), radio 3px

## Componentes existentes (reusar antes de crear)

- **Button** (`src/components/ui/button/button.tsx`) — Boton base con CVA y `asChild` (Radix Slot) para renderizar como link. Clases comunes: inline-flex, gap-2, rounded-md, text-sm font-medium, transition-colors. [estados: variant: default (bg-primary), variant: destructive, variant: outline (border-input, en dark bg-secondary), variant: secondary, variant: ghost, variant: link, size: default / sm / lg / icon, hover (bg-primary/90, accent en ghost-outline), focus-visible (ring-2 ring-ring ring-offset-2), disabled (pointer-events-none opacity-50)]
- **Badge** (`src/components/ui/badge/badge.tsx`) — Pill de estado o de entidad: rounded-full, fondo suave + texto saturado sobre los tokens *-bg/*-fg. Las variantes semanticas son aditivas sobre las shadcn originales. [estados: default, secondary, destructive, outline, success, warning, error, info, neutral, hover (bg/80 en las variantes solidas), focus (ring-2 ring-ring ring-offset-2)]
- **Card** (`src/components/ui/card/card.tsx`) — Superficie compuesta: Card + CardHeader + CardTitle + CardDescription + CardContent + CardFooter. Fondo `bg-card`, borde 1px `border-border`, rounded-lg, shadow-sm. [estados: reposo (shadow-sm), hover (shadow-md, en cards clicables del launcher)]
- **KPICard** (`src/components/ui/kpi-card/kpi-card.tsx`) — Tarjeta de metrica presentacional y agnostica al dominio: label + valor grande + icono opcional en recuadro tintado + tendencia. Reserva `min-h-9` para alinear los valores entre cards con y sin icono. [estados: variant de icono: success / warning / info / destructive / brand (morado) / neutral (default), trend: up (verde, ArrowUp) / down (rojo, ArrowDown) / flat (gris, Minus), sin icono, sin tendencia]
- **StatGrid** (`src/components/ui/stat-grid/stat-grid.tsx`) — Grilla responsive contenedora de KPICards: `grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5`. [estados: movil 1 col, sm 2 cols, lg 5 cols]
- **DataTable** (`src/components/ui/data-table/data-table.tsx`) — Tabla generica sobre TanStack Table: columnas tipadas por el consumidor, orden, toggle de columnas, paginacion client o server (totalCount/page/pageCount/onPageChange), acciones por fila, clase por fila segun el dato, primera columna sticky y copys sobrescribibles (deuda i18n explicita). [estados: loading ('Cargando…'), error ('Error al cargar los datos'), vacio ('Sin resultados'), sorting asc/desc/none, paginacion client vs server, columnas ocultas, con columna de acciones, fila con clase condicional por estado]
- **EmptyState** (`src/components/ui/empty-state/empty-state.tsx`) — Estado vacio centrado: icono (buzon por defecto, `null` para ocultarlo) + titulo + descripcion + CTA opcional que solo se renderiza si se provee `action`. [estados: default (solo titulo + descripcion), con accion (CTA), con icono custom, sin icono]
- **ErrorState** (`src/components/ui/error-state/error-state.tsx`) — Estado de error centrado: icono de alerta (triangulo por defecto) + titulo + descripcion + boton de reintento que solo aparece si se pasa `onRetry`. [estados: sin reintento, con reintento, icono custom]
- **LoadingSkeleton** (`src/components/ui/loading-skeleton/loading-skeleton.tsx`) — Placeholder con pulso cuya forma acompana al contenido que carga; `rows` controla la cantidad de filas en list y table. [estados: variant: card, variant: list, variant: table, rows configurable]
- **FullScreenLoader** (`src/components/ui/full-screen-loader/full-screen-loader.tsx`) — Spinner a pantalla completa con texto bajo el spinner (por defecto 'Cargando…'). Para bloqueos de vista completa (bootstrap de sesion, guardas de ruta). [estados: default, con label custom]
- **Alert** (`src/components/ui/alert/alert.tsx`) — Banner de mensaje con slot de icono y cierre opcional; fondo y borde tomados del mismo token de estado (`border-warning-bg bg-warning-bg text-warning-fg`). [estados: variant: info (default), variant: warning, variant: success, variant: error, dismissible (con boton de cerrar + onDismiss), no dismissible]
- **Input** (`src/components/ui/input/input.tsx`) — Input base con variante de error derivada automaticamente de la prop de error; borde `border-input` y ring de foco `ring-ring` (o `ring-destructive` en error). [estados: default, error (border-destructive, ring-destructive), focus-visible, disabled, placeholder (text-muted-foreground)]
- **Select** (`src/components/ui/select/select.tsx`) — Select sobre Radix: trigger con chevron, contenido en popover, items con check de seleccion. [estados: cerrado, abierto, item seleccionado, item deshabilitado, disabled, focus-visible]
- **MultiSelect** (`src/components/ui/multi-select/MultiSelect.tsx`) — Seleccion multiple con chips removibles, usada en formularios de item (Categorias, Aplicaciones, Proveedores). [estados: vacio (placeholder), con chips seleccionados, abierto / buscando, opcion deshabilitada, disabled]
- **FilterBar** (`src/components/ui/filter-bar/filter-bar.tsx`) — Barra de filtros responsive: controles inline en ≥lg y dentro de un drawer en <lg, chips de filtros activos con boton de remover y boton 'Limpiar' que solo aparece si hay handler. [estados: sin filtros activos, con chips activos, boton Limpiar visible/oculto, drawer abierto (<lg), inline (≥lg)]
- **Pagination** (`src/components/ui/pagination/pagination.tsx`) — Pager con 'Mostrando X a Y de N', selector de filas por pagina y navegacion de paginas; consumido por DataTable y por listados server-side. [estados: primera pagina (anterior deshabilitado), ultima pagina (siguiente deshabilitado), pagina activa, una sola pagina, selector de tamano oculto]
- **Dialog** (`src/components/ui/dialog/dialog.tsx`) — Modal sobre Radix Dialog: overlay oscurecido con desenfoque, contenido centrado con radio grande, header con titulo y cierre, footer de acciones. [estados: abierto, cerrado, con footer de acciones, overlay con backdrop-blur]
- **ConfirmDialog** (`src/components/ui/confirm-dialog/confirm-dialog.tsx`) — Modal chico de confirmacion: icono tintado + titulo + mensaje + par de botones (outline de cancelar + primario o destructivo de confirmar). [estados: abierto, confirmando (pendiente), variante destructiva, cancelado]
- **UnsavedChangesDialog** (`src/components/ui/unsaved-changes-dialog/unsaved-changes-dialog.tsx`) — Dialogo de cambios sin guardar, acoplado a la guarda de navegacion del shell (`navigation-guard`) y al hook `useUnsavedChangesModal`. [estados: abierto al intentar navegar, descartar, seguir editando]
- **Sheet** (`src/components/ui/sheet/sheet.tsx`) — Panel lateral deslizable (Radix Dialog con animacion slide-in), usado para filtros en pantallas chicas y paneles auxiliares. [estados: abierto, cerrado, lado configurable, con overlay]
- **DropdownMenu** (`src/components/ui/dropdown-menu.tsx`) — Menu contextual sobre Radix: acciones por fila (ver / editar / mas), toggle de columnas de la DataTable y menu de usuario del TopBar. [estados: cerrado, abierto, item hover/focus, item deshabilitado, con separadores]
- **Tooltip** (`src/components/ui/tooltip/tooltip.tsx`) — Tooltip de Radix para iconos sin label y para texto truncado en tablas. [estados: oculto, visible (hover/focus), con delay]
- **Toaster** (`src/components/ui/toaster/toaster.tsx`) — Contenedor global de notificaciones toast, montado una sola vez en el layout; capa z 70, por encima de modales. [estados: exito, error, informativo, auto-dismiss, cierre manual]
- **Switch** (`src/components/ui/switch/switch.tsx`) — Toggle de Radix (rounded-full) para opciones booleanas como 'Despacho' en el builder de transaccion. [estados: off, on, focus-visible, disabled]
- **NumberStepper** (`src/components/ui/number-stepper/number-stepper.tsx`) — Input numerico con flechas de incremento y decremento, para cantidades y montos. [estados: valor minimo (decremento deshabilitado), valor maximo (incremento deshabilitado), disabled, invalido]
- **PercentStepper** (`src/components/ui/percent-stepper/percent-stepper.tsx`) — Variante del stepper acotada a porcentajes, usada para descuentos (Dcto. max). [estados: 0%, tope alcanzado, disabled, invalido]
- **DatePicker** (`src/components/ui/date-picker/DatePicker.tsx`) — Selector de fecha con calendario en popover; en rangos, el input activo muestra ring verde. [estados: vacio, con fecha, calendario abierto, activo (ring de marca), disabled]
- **ImageGalleryUploader** (`src/components/ui/image-gallery-uploader/ImageGalleryUploader.tsx`) — Dropzone mas grilla de miniaturas con reordenamiento, marca de imagen 'Principal', edicion y borrado por imagen, contador y tope de imagenes; utilidades en `gallery-utils.ts`. [estados: vacio (dropzone), arrastrando, subiendo, con imagenes, imagen principal, tope alcanzado, error de formato o tamano]
- **Avatar** (`src/components/ui/avatar/avatar.tsx`) — Avatar circular con imagen y fallback de iniciales; usado en el TopBar y en el bloque de perfil del Sidebar. [estados: con imagen, fallback de iniciales, cargando imagen]
- **Separator** (`src/components/ui/separator/separator.tsx`) — Divisor de 1px sobre `border`, horizontal o vertical, para separar secciones y grupos de menu. [estados: horizontal, vertical, decorativo (aria-hidden)]
- **ThemeToggle** (`src/components/ui/ThemeToggle/ThemeToggle.tsx`) — Interruptor de tema claro/oscuro del TopBar; el ThemeProvider aplica la clase `.dark` sobre `<html>` y persiste la preferencia respetando `prefers-color-scheme`. [estados: claro, oscuro, sistema, focus-visible]
- **StatusBadge** (`src/components/shared/StatusBadge`) — Envoltorio de dominio sobre Badge que mapea un estado de negocio (SII, comercial, de pago, de stock) a la variante semantica correspondiente. [estados: Aceptado, Pendiente, Rechazado, Pagado, Vencida, En stock, Bajo stock, Sin stock]
- **CurrencyDisplay** (`src/components/shared/CurrencyDisplay`) — Formateo multi-moneda (CLP sin decimales con punto de miles, EUR/USD para importacion) alineado a la derecha y con numeros tabulares. [estados: CLP, moneda extranjera, valor cero, valor negativo]
- **DateDisplay** (`src/components/shared/DateDisplay`) — Formateo consistente de fechas y fechas relativas ('Hace 2 min') en listados y feeds de actividad. [estados: fecha absoluta, relativa, sin valor]
- **FormSection / FormField** (`src/components/forms/FormSection, src/components/forms/FormField`) — Secciones numeradas en card y campo de formulario con label, marca de requerido y mensaje de error; base de los formularios largos (React Hook Form + Zod). [estados: default, requerido (*), con error, disabled, con texto de ayuda]
- **TransactionBuilder** (`src/components/ventas/builder/TransactionBuilder.tsx`) — Constructor de documento en dos columnas: tabla de items del documento mas panel de busqueda para agregar, con tarjetas de Resumen (Subtotal/Descuento/Neto/IVA/Total), Forma de pago y Datos del cliente. Tiene variante de compra en `components/compras/builder`. [estados: vacio, con items, stock insuficiente (banner warning), precio bajo el minimo, guardando, stock por bodega]
- **PaymentCard** (`src/components/payments/PaymentCard`) — Tarjeta de pago aplicado a una factura, con total, pendiente, estado y usuario que lo registro. [estados: Pagado, Pendiente, Vencida, eliminable]
- **CustomerCard** (`src/components/ventas/clientes/CustomerCard`) — Tarjeta de cliente con razon social, RUT bajo el nombre y acciones asociadas. [estados: default, seleccionada, sin datos de contacto]
- **AppShell / TopBar / Sidebar** (`src/components/shell/AppShell, src/components/shell/TopBar, src/components/shell/Sidebar`) — Shell de la aplicacion: topbar de 56–64px (logo, busqueda global, notificaciones, ayuda, toggle de tema, switcher de empresa, avatar), sidebar de 256px colapsable a 64px con grupos expandibles, y un unico `<main>` scrolleable (position relative, requisito del fix de scroll unico de JOR-053). [estados: sidebar expandido, sidebar colapsado, item de nav activo (texto y fondo de marca), grupo expandido/colapsado, tema claro/oscuro, con breadcrumb]
- **LoginScreen** (`src/components/auth/LoginScreen`) — Pantalla de acceso centrada en fondo gris claro: tile cuadrado verde con la inicial, titulo, subtitulo apagado, boton primario de ancho completo con icono y nota de pie. [estados: reposo, autenticando, error de autenticacion]

## Patrones transversales

- **Tokens semanticos, nunca hex sueltos**: Los componentes solo consumen tokens (`bg-primary`, `text-muted-foreground`, `bg-success-bg`). Los valores se definen una vez en `globals.css` y se bindean en `tailwind.config.js` via `hsl(var(--token))`. Convive una capa legacy en RGB (`--color-*` + escala `brand`) que alimenta las clases `.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.input`, `.card` y `.badge` del scaffold, marcada como no removible hasta que se retematice el shell.
- **Terna de estado bg / fg / solido**: Cada estado semantico (success, warning, info, destructive, accent-brand) expone `-bg` para el relleno suave del pill o del recuadro, `-fg` para el texto e icono, y el token base para el uso solido. Es lo que permite que Badge, Alert y KPICard compartan la misma lectura de color y funcionen en claro y en oscuro sin condicionales.
- **Dark mode por clase**: `darkMode: ['class']`: el ThemeProvider aplica `.dark` sobre `<html>` y la preferencia se persiste respetando `prefers-color-scheme`. Todos los tokens se redefinen en el bloque `.dark`. Trampa documentada en el codigo: el `body` hereda el color legacy `--color-text`, que no invierte, por lo que los componentes sin fondo propio (Button ghost y outline) deben fijar `text-foreground` explicito; y en dark el outline usa `dark:bg-secondary` porque `bg-background` lo funde con la superficie.
- **Foco visible con anillo de marca**: Patron uniforme `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2` en botones y controles (los badges usan `focus:`). El `--ring` es igual al primario, asi que el foco siempre se lee como verde de marca; los inputs con error cambian el anillo a `ring-destructive`.
- **Trio estado vacio / error / carga**: Toda vista de listado resuelve sus tres estados con componentes dedicados en lugar de condicionales ad hoc: EmptyState (icono + titulo + descripcion + CTA opcional), ErrorState (icono de alerta + reintento solo si hay handler) y LoadingSkeleton con la forma del contenido (card, list, table). DataTable trae ademas sus propios copys de vacio, error y carga, sobrescribibles por prop.
- **Un componente por carpeta con barrel y story**: `src/components/ui/<kebab-case>/` contiene el componente, su `index.ts` de reexport y una story de Storybook con `tags:['autodocs']` que documenta cada variante. Los componentes de dominio viven en `src/components/<modulo>/` (ventas, compras, payments, items, config) con subcarpetas list / detail / builder.
- **Variantes con CVA**: Las variantes visuales se declaran con `class-variance-authority`: clase base compartida mas mapa de variantes y `defaultVariants`, combinadas con el helper `cn()`. Las variantes nuevas se agregan de forma aditiva para no alterar las shadcn preexistentes (asi se sumaron las semanticas de Badge en JOR-006 y la morada del KPICard en JOR-067).
- **Composicion con Radix y asChild**: Los primitivos accesibles (Dialog, Select, DropdownMenu, Switch, Tooltip, Sheet, Avatar, Separator) vienen de Radix; Button expone `asChild` con Slot para renderizarse como link sin perder estilos ni semantica.
- **Presentacional agnostico al dominio**: Los componentes de UI reciben el valor ya formateado y no conocen el dominio: KPICard documenta que el formato lo provee el consumidor, StatGrid solo dispone la grilla, DataTable recibe las columnas tipadas. El formateo de moneda y fecha se centraliza en CurrencyDisplay y DateDisplay, y el mapeo de estados de negocio a variantes en StatusBadge.
- **Scroll unico en el shell**: La unica region scrolleable es el `<main>` del AppShell (`relative` + `overflow-auto`); `html` y `body` quedan fijos al viewport con `height:100%` y `overflow:hidden`. El `relative` es el fix real: contiene los inputs absolutos que Radix renderiza ocultos, que de otro modo cuelgan del bloque contenedor inicial y hacen que Next scrollee el documento al navegar (JOR-053).
- **Desktop-first con reflow por arquetipo**: Diseno pensado para ≥xl. El sidebar colapsa y las grillas bajan de columnas por debajo de `lg` (StatGrid: 1 / 2 / 5). Las tablas anchas hacen scroll horizontal con la primera columna sticky en vez de ocultar columnas; la FilterBar pasa de inline a drawer por debajo de `lg`. Movil es solo consulta.
- **Jerarquia por color y peso, no por bordes**: Borde unico de 1px sobre `border`, divisores de tabla sutiles y escalera de elevacion de cuatro niveles (sm en reposo, md en hover y dropdowns, lg en popovers, xl/2xl en modales con overlay `bg-black/40` y `backdrop-blur-sm`). Todo redondeado a partir del radio base de 12px, con mucho aire interior.
- **Iconografia lucide**: Iconos de linea de `lucide-react` con trazo consistente, monocromos en gris o en el color del estado. Dentro de los componentes van marcados `aria-hidden="true"` cuando son decorativos, y los botones icon-only se acompanan de Tooltip o label accesible.
- **Motion contenido**: Transiciones de color, sombra y transform de 150–200ms ease-out; `animate-fade-in` (0.15s) y `animate-slide-in-right` (0.2s) definidos en `globals.css`; colapso del sidebar en `duration-200`; modales con fade y escala leve segun el patron shadcn. Se debe respetar `prefers-reduced-motion`.
- **Copys en espanol y deuda i18n explicita**: La UI esta en espanol neutro y los copys por defecto viven junto al componente (DataTable declara su diccionario 'Sin resultados', 'Cargando…', 'Error al cargar los datos') con la prop de sobrescritura documentada como deuda i18n asumida, no como olvido. Los formularios marcan los requeridos con asterisco y usan barras de accion pegajosas arriba y abajo en formularios largos.

## Fuentes

- front/jormat-front/src/app/globals.css (tokens legacy `--color-*`, design system JOR-003 `:root` y `.dark`, clases de componente legacy, keyframes, scrollbar)
- front/jormat-front/tailwind.config.js (darkMode class, escala brand 50–950, binding de tokens semanticos, borderRadius derivado, fontFamily, plugin tailwindcss-animate)
- front/jormat-front/src/components/ui/ (33 carpetas de componentes con su story de Storybook: button, badge, card, alert, input, select, multi-select, data-table, kpi-card, stat-grid, empty-state, error-state, loading-skeleton, full-screen-loader, filter-bar, pagination, dialog, confirm-dialog, unsaved-changes-dialog, sheet, dropdown-menu, tooltip, toaster, switch, number-stepper, percent-stepper, date-picker, image-gallery-uploader, avatar, separator, ThemeToggle)
- front/jormat-front/src/components/ (shell AppShell/TopBar/Sidebar, shared StatusBadge/CurrencyDisplay/DateDisplay, forms FormSection/FormField, y modulos ventas, compras, payments, items, config, auth, session, reportes)
- jormat_docs/ongoing/design-tokens.md (especificacion canonica de valores: color, radios, bordes y foco, espaciado, sombras, tipografia, z-index, motion, breakpoints)
- jormat_docs/ongoing/design-language.md (look and feel observado en los mockups: identidad, neutrales, semanticos, tiles pastel, layout-shell, inventario de componentes, convenciones de dominio, iconografia)
- jormat-evolution-mono/docs/front/patterns.md (organizacion de componentes, capa API tipada, estado UI vs servidor, forms RHF + Zod, permisos en UI, layout de scroll unico)
- Captura del app corriendo: pantalla de login (fondo #F9FAFB, tile verde redondeado con la inicial, titulo en Inter bold, subtitulo apagado, boton primario verde de ancho completo con icono, nota de pie en text-xs muted)
