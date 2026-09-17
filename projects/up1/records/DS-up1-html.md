---
id: DS-up1-html
project: up1
type: doc
module: design-system
tags:
  - design-system-preview
---

<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>uPlanner One (up1) Design System</title>
<style>
:root { color-scheme: light dark; --fg: #1a1a1a; --muted: #666; --bg: #fff; --card: #f6f6f7; --border: #e2e2e5; }
@media (prefers-color-scheme: dark) { :root { --fg: #eaeaea; --muted: #9a9a9a; --bg: #16161a; --card: #1f1f25; --border: #33333a; } }
* { box-sizing: border-box; }
body { margin: 0; font: 14px/1.5 system-ui, -apple-system, Segoe UI, Roboto, sans-serif; color: var(--fg); background: var(--bg); padding: 24px; }
h1 { font-size: 24px; margin: 0 0 4px; }
h2 { font-size: 16px; margin: 32px 0 12px; border-bottom: 1px solid var(--border); padding-bottom: 6px; }
h4 { margin: 0 0 6px; font-size: 14px; }
.summary { color: var(--muted); margin: 0 0 8px; }
.grid { display: grid; gap: 12px; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); }
.swatch { display: flex; gap: 10px; align-items: center; background: var(--card); border: 1px solid var(--border); border-radius: 8px; padding: 8px; }
.chip { width: 40px; height: 40px; border-radius: 6px; border: 1px solid var(--border); flex: none; }
.meta { display: flex; flex-direction: column; min-width: 0; }
.meta code { font-size: 12px; word-break: break-all; }
.meta span, .meta em { font-size: 11px; color: var(--muted); }
.type-row, .space-row { display: flex; gap: 12px; align-items: baseline; padding: 8px 0; border-bottom: 1px solid var(--border); }
.sample { flex: none; min-width: 160px; }
.bar { display: inline-block; height: 12px; background: currentColor; border-radius: 3px; flex: none; }
.component, .pattern { background: var(--card); border: 1px solid var(--border); border-radius: 8px; padding: 12px; margin-bottom: 10px; }
.component .path { font-size: 11px; color: var(--muted); }
.states { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
.pill { font-size: 11px; background: var(--border); border-radius: 999px; padding: 2px 8px; }
pre { background: var(--bg); border: 1px solid var(--border); border-radius: 6px; padding: 8px; overflow-x: auto; font-size: 12px; }
.empty { color: var(--muted); font-style: italic; }
</style></head>
<body>
<h1>uPlanner One (up1) Design System</h1>
<p class="summary">Sistema de diseño de uPlanner One: tokens CSS con prefijo <code>--up1-*</code> en el paquete <code>layout</code> (autoridad de valores), unificado light/dark en <code>suite/css/1-theme/theme-tokens.css</code> con <code>light-dark()</code>. Marca teal (#0a808c) sobre gris neutro, tipografía Inter, radios y espaciado compatibles con Bootstrap; Atomic Design en <code>layout/src/components</code>. Dark mode con la clase <code>theme-dark</code> en &lt;html&gt;, nunca <code>[data-theme]</code> ni <code>.dark</code>.</p>
<h2>Paleta</h2>
<div class="grid">
<div class="swatch"><div class="chip" style="background:#0a808c"></div><div class="meta"><code>--up1-color-primary-500</code><span>#0a808c</span><em>Marca base (teal). Botón primario, borde de input en foco, badge.</em></div></div>
<div class="swatch"><div class="chip" style="background:#12717b"></div><div class="meta"><code>--up1-color-primary-600</code><span>#12717b</span><em>Hover de primario y color de link (5.02:1 sobre bg-body).</em></div></div>
<div class="swatch"><div class="chip" style="background:#16626b"></div><div class="meta"><code>--up1-color-primary-700</code><span>#16626b</span><em>Estado activo y hover de link.</em></div></div>
<div class="swatch"><div class="chip" style="background:#E7F2F3"></div><div class="meta"><code>--up1-color-primary-50</code><span>#E7F2F3</span><em>Tinte claro para fondos seleccionados (cabecera de tabla ordenada).</em></div></div>
<div class="swatch"><div class="chip" style="background:#B6D9DC"></div><div class="meta"><code>--up1-color-primary-100</code><span>#B6D9DC</span><em>Tinte suave de la escala primaria.</em></div></div>
<div class="swatch"><div class="chip" style="background:#7FC4CA"></div><div class="meta"><code>--up1-color-primary-200</code><span>#7FC4CA</span><em>Escala primaria intermedia clara.</em></div></div>
<div class="swatch"><div class="chip" style="background:#47AEB8"></div><div class="meta"><code>--up1-color-primary-300</code><span>#47AEB8</span><em>Escala primaria intermedia.</em></div></div>
<div class="swatch"><div class="chip" style="background:#17545b"></div><div class="meta"><code>--up1-color-primary-800</code><span>#17545b</span><em>Fondos seleccionados en dark mode.</em></div></div>
<div class="swatch"><div class="chip" style="background:#17464c"></div><div class="meta"><code>--up1-color-primary-900</code><span>#17464c</span><em>Texto de alto contraste sobre tintes primarios.</em></div></div>
<div class="swatch"><div class="chip" style="background:#16393d"></div><div class="meta"><code>--up1-color-primary-950</code><span>#16393d</span><em>Fondos profundos de la escala primaria.</em></div></div>
<div class="swatch"><div class="chip" style="background:#22946e"></div><div class="meta"><code>--up1-color-success-500</code><span>#22946e</span><em>Éxito: badge/alert success, acento de tarjeta inscrita.</em></div></div>
<div class="swatch"><div class="chip" style="background:#1b7a5a"></div><div class="meta"><code>--up1-color-success-600</code><span>#1b7a5a</span><em>Hover de éxito.</em></div></div>
<div class="swatch"><div class="chip" style="background:#156147"></div><div class="meta"><code>--up1-color-success-700</code><span>#156147</span><em>Texto/borde fuerte de éxito.</em></div></div>
<div class="swatch"><div class="chip" style="background:#ecfdf5"></div><div class="meta"><code>--up1-color-success-50</code><span>#ecfdf5</span><em>Fondo teñido de éxito.</em></div></div>
<div class="swatch"><div class="chip" style="background:#9c2121"></div><div class="meta"><code>--up1-color-danger-500</code><span>#9c2121</span><em>Error: Alert/Badge danger, botón danger, borde inválido.</em></div></div>
<div class="swatch"><div class="chip" style="background:#851b1b"></div><div class="meta"><code>--up1-color-danger-600</code><span>#851b1b</span><em>Hover de error.</em></div></div>
<div class="swatch"><div class="chip" style="background:#6e1616"></div><div class="meta"><code>--up1-color-danger-700</code><span>#6e1616</span><em>Texto/borde fuerte de error.</em></div></div>
<div class="swatch"><div class="chip" style="background:#fef2f2"></div><div class="meta"><code>--up1-color-danger-50</code><span>#fef2f2</span><em>Fondo teñido de error.</em></div></div>
<div class="swatch"><div class="chip" style="background:#f59e0b"></div><div class="meta"><code>--up1-color-warning-500</code><span>#f59e0b</span><em>Advertencia: Alert/Badge warning, riesgo medio.</em></div></div>
<div class="swatch"><div class="chip" style="background:#d97706"></div><div class="meta"><code>--up1-color-warning-600</code><span>#d97706</span><em>Hover de advertencia y borde hover.</em></div></div>
<div class="swatch"><div class="chip" style="background:#b45309"></div><div class="meta"><code>--up1-color-warning-700</code><span>#b45309</span><em>Texto de advertencia en banners y modales de error.</em></div></div>
<div class="swatch"><div class="chip" style="background:#fffbeb"></div><div class="meta"><code>--up1-color-warning-50</code><span>#fffbeb</span><em>Fondo de NotificationBanner warning.</em></div></div>
<div class="swatch"><div class="chip" style="background:#21498a"></div><div class="meta"><code>--up1-color-info-500</code><span>#21498a</span><em>Informativo: Alert/Badge info, badge de tipo Evento.</em></div></div>
<div class="swatch"><div class="chip" style="background:#1a3b73"></div><div class="meta"><code>--up1-color-info-600</code><span>#1a3b73</span><em>Hover informativo.</em></div></div>
<div class="swatch"><div class="chip" style="background:#142e5c"></div><div class="meta"><code>--up1-color-info-700</code><span>#142e5c</span><em>Texto/borde fuerte informativo.</em></div></div>
<div class="swatch"><div class="chip" style="background:#eff6ff"></div><div class="meta"><code>--up1-color-info-50</code><span>#eff6ff</span><em>Fondo teñido informativo.</em></div></div>
<div class="swatch"><div class="chip" style="background:#7c3aed"></div><div class="meta"><code>--up1-color-purple-500</code><span>#7c3aed</span><em>Extendida púrpura: badge Webinar, riesgo crítico.</em></div></div>
<div class="swatch"><div class="chip" style="background:#e11d48"></div><div class="meta"><code>--up1-color-rose-500</code><span>#e11d48</span><em>Extendida rosa: badge Seminario.</em></div></div>
<div class="swatch"><div class="chip" style="background:#ffffff"></div><div class="meta"><code>--up1-gray-0</code><span>#ffffff</span><em>Superficie de tarjeta/panel (bg-primary), sidebar.</em></div></div>
<div class="swatch"><div class="chip" style="background:#f0f0f0"></div><div class="meta"><code>--up1-gray-50</code><span>#f0f0f0</span><em>Fondo de aplicación (bg-body).</em></div></div>
<div class="swatch"><div class="chip" style="background:#e1e1e1"></div><div class="meta"><code>--up1-gray-100</code><span>#e1e1e1</span><em>Paneles secundarios / sidebars (bg-secondary), borde claro.</em></div></div>
<div class="swatch"><div class="chip" style="background:#d3d3d3"></div><div class="meta"><code>--up1-gray-200</code><span>#d3d3d3</span><em>Fondo terciario (bg-tertiary) y borde por defecto.</em></div></div>
<div class="swatch"><div class="chip" style="background:#c5c5c5"></div><div class="meta"><code>--up1-gray-300</code><span>#c5c5c5</span><em>Borde por defecto, borde hover, texto deshabilitado.</em></div></div>
<div class="swatch"><div class="chip" style="background:#9b9b9b"></div><div class="meta"><code>--up1-gray-600</code><span>#9b9b9b</span><em>Secundario semántico. No cumple AA como texto sobre blanco.</em></div></div>
<div class="swatch"><div class="chip" style="background:#6b6b6b"></div><div class="meta"><code>--up1-gray-650</code><span>#6b6b6b</span><em>Texto atenuado accesible (text-muted): 4.68:1 sobre bg-body.</em></div></div>
<div class="swatch"><div class="chip" style="background:#525252"></div><div class="meta"><code>--up1-gray-700</code><span>#525252</span><em>Texto secundario / descripciones (text-secondary).</em></div></div>
<div class="swatch"><div class="chip" style="background:#262626"></div><div class="meta"><code>--up1-gray-900</code><span>#262626</span><em>Texto principal (text-primary).</em></div></div>
<div class="swatch"><div class="chip" style="background:#171717"></div><div class="meta"><code>--up1-gray-950</code><span>#171717</span><em>Gris más oscuro de la escala.</em></div></div>
<div class="swatch"><div class="chip" style="background:#1d9e75"></div><div class="meta"><code>--up1-capacity-low</code><span>#1d9e75</span><em>Capacidad 0-30% (amplia disponibilidad). También action-enroll-bg.</em></div></div>
<div class="swatch"><div class="chip" style="background:#639922"></div><div class="meta"><code>--up1-capacity-mid</code><span>#639922</span><em>Capacidad 30-60% (cómodo).</em></div></div>
<div class="swatch"><div class="chip" style="background:#ef9f27"></div><div class="meta"><code>--up1-capacity-high</code><span>#ef9f27</span><em>Capacidad 60-85% (llenándose).</em></div></div>
<div class="swatch"><div class="chip" style="background:#d85a30"></div><div class="meta"><code>--up1-capacity-crit</code><span>#d85a30</span><em>Capacidad 85-99% (últimos cupos).</em></div></div>
<div class="swatch"><div class="chip" style="background:#888780"></div><div class="meta"><code>--up1-capacity-full</code><span>#888780</span><em>Capacidad 100% (sin cupos).</em></div></div>
<div class="swatch"><div class="chip" style="box-shadow:0 4px 6px rgba(0,0,0,0.1);background:var(--bg)"></div><div class="meta"><code>--up1-shadow-md</code><span>0 4px 6px rgba(0,0,0,.1)</span><em>Elevación media; hover de tarjeta.</em></div></div>
<div class="swatch"><div class="chip" style="box-shadow:0 10px 40px rgba(0,0,0,0.2);background:var(--bg)"></div><div class="meta"><code>--up1-shadow-modal</code><span>0 10px 40px rgba(0,0,0,.2)</span><em>Elevación de modal.</em></div></div>
<div class="swatch"><div class="chip" style="box-shadow:0 0 0 3px rgba(10,128,140,0.25);background:var(--bg)"></div><div class="meta"><code>--up1-shadow-focus</code><span>0 0 0 3px rgba(10,128,140,.25)</span><em>Anillo de foco teal.</em></div></div>
</div>
<h2>Tipografia</h2>
<div class="type-row"><span class="sample" style="font-size:1rem;font-family:'Inter',system-ui;font-weight:400;">Aa Bb Cc 123</span><div class="meta"><code>--up1-font-family-base</code><span>Inter / 1rem / 400 — Familia base de toda la UI (pesos 300-800).</span></div></div>
<div class="type-row"><span class="sample" style="font-size:0.875rem;font-family:'SFMono-Regular',Menlo,monospace;font-weight:400;">Aa Bb Cc 123</span><div class="meta"><code>--up1-font-family-mono</code><span>monospace / 0.875rem — Código, fórmulas, editor de validación.</span></div></div>
<div class="type-row"><span class="sample" style="font-size:0.75rem;font-weight:400;">Aa Bb Cc 123</span><div class="meta"><code>--up1-font-size-xs</code><span>0.75rem / 400 — 12px. Descripciones de campo.</span></div></div>
<div class="type-row"><span class="sample" style="font-size:0.875rem;font-weight:500;">Aa Bb Cc 123</span><div class="meta"><code>--up1-font-size-sm</code><span>0.875rem / 500 — 14px. Labels, tags, botones sm.</span></div></div>
<div class="type-row"><span class="sample" style="font-size:1rem;font-weight:400;">Aa Bb Cc 123</span><div class="meta"><code>--up1-font-size-base</code><span>1rem / 400 — 16px. Cuerpo e inputs, line-height 1.5.</span></div></div>
<div class="type-row"><span class="sample" style="font-size:1.125rem;font-weight:500;">Aa Bb Cc 123</span><div class="meta"><code>--up1-font-size-lg</code><span>1.125rem / 500 — 18px. Botones lg y subtítulos.</span></div></div>
<div class="type-row"><span class="sample" style="font-size:1.25rem;font-weight:600;">Aa Bb Cc 123</span><div class="meta"><code>--up1-font-size-xl</code><span>1.25rem / 600 — 20px. Títulos de sección y modal.</span></div></div>
<div class="type-row"><span class="sample" style="font-size:1.5rem;font-weight:700;">Aa Bb Cc 123</span><div class="meta"><code>--up1-font-size-2xl</code><span>1.5rem / 700 — 24px. Título de página / heading principal.</span></div></div>
<div class="type-row"><span class="sample" style="font-size:1.875rem;font-weight:700;">Aa Bb Cc 123</span><div class="meta"><code>--up1-font-size-3xl</code><span>1.875rem / 700 — 30px. Cifras destacadas (StatCard).</span></div></div>
<div class="type-row"><span class="sample" style="font-size:2.25rem;font-weight:800;">Aa Bb Cc 123</span><div class="meta"><code>--up1-font-size-4xl</code><span>2.25rem / 800 — 36px. Display, uso excepcional.</span></div></div>
<h2>Espaciado y tamanos</h2>
<div class="space-row"><span class="bar" style="width:1px"></span><code>--up1-spacing-px</code><span>1px</span></div>
<div class="space-row"><span class="bar" style="width:2px"></span><code>--up1-spacing-0-5</code><span>0.125rem (2px)</span></div>
<div class="space-row"><span class="bar" style="width:4px"></span><code>--up1-spacing-1</code><span>0.25rem (4px)</span></div>
<div class="space-row"><span class="bar" style="width:6px"></span><code>--up1-spacing-1-5</code><span>0.375rem (6px)</span></div>
<div class="space-row"><span class="bar" style="width:8px"></span><code>--up1-spacing-2</code><span>0.5rem (8px)</span></div>
<div class="space-row"><span class="bar" style="width:10px"></span><code>--up1-spacing-2-5</code><span>0.625rem (10px)</span></div>
<div class="space-row"><span class="bar" style="width:12px"></span><code>--up1-spacing-3</code><span>0.75rem (12px)</span></div>
<div class="space-row"><span class="bar" style="width:14px"></span><code>--up1-spacing-3-5</code><span>0.875rem (14px)</span></div>
<div class="space-row"><span class="bar" style="width:16px"></span><code>--up1-spacing-4</code><span>1rem (16px)</span></div>
<div class="space-row"><span class="bar" style="width:20px"></span><code>--up1-spacing-5</code><span>1.25rem (20px)</span></div>
<div class="space-row"><span class="bar" style="width:24px"></span><code>--up1-spacing-6</code><span>1.5rem (24px)</span></div>
<div class="space-row"><span class="bar" style="width:32px"></span><code>--up1-spacing-8</code><span>2rem (32px)</span></div>
<div class="space-row"><span class="bar" style="width:40px"></span><code>--up1-spacing-10</code><span>2.5rem (40px)</span></div>
<div class="space-row"><span class="bar" style="width:48px"></span><code>--up1-spacing-12</code><span>3rem (48px)</span></div>
<div class="space-row"><span class="bar" style="width:64px"></span><code>--up1-spacing-16</code><span>4rem (64px)</span></div>
<div class="space-row"><span class="bar" style="width:6px;border-radius:6px"></span><code>--up1-border-radius</code><span>0.375rem (6px) — botones e inputs</span></div>
<div class="space-row"><span class="bar" style="width:8px;border-radius:8px"></span><code>--up1-border-radius-md</code><span>0.5rem (8px)</span></div>
<div class="space-row"><span class="bar" style="width:12px;border-radius:12px"></span><code>--up1-border-radius-lg</code><span>0.75rem (12px) — tarjetas</span></div>
<div class="space-row"><span class="bar" style="width:40px"></span><code>--up1-input-min-height</code><span>2.5rem (40px)</span></div>
<div class="space-row"><span></span><code>Breakpoints</code><span>xs 480 · sm 576 · md 768 · lg 1024 · xl 1200</span></div>
<div class="space-row"><span></span><code>Transiciones</code><span>fast 0.15s · base 0.3s · slow 0.5s (ease-in-out)</span></div>
<h2>Componentes existentes (reusar antes de crear)</h2>
<div class="component"><h4>Button</h4><code class="path">atoms/Button</code><p>Botón base. Variantes sólidas, outline y link; icono, block, aria-label. Radio 0.375rem, weight 500, hover translateY(-1px)+shadow-sm.</p><div class="states"><span class="pill">variant: primary…dark / outline-* / link</span><span class="pill">size: sm|md|lg</span><span class="pill">loading</span><span class="pill">disabled 0.65</span></div></div>
<div class="component"><h4>Badge</h4><code class="path">atoms/Badge</code><p>Chip de estado. <code>soft</code> es la forma canónica de chip/criterio activo; con <code>pill</code> y <code>dismissible</code> reemplaza pills replicados. <code>customColor</code> para tokens de dominio.</p><div class="states"><span class="pill">soft</span><span class="pill">pill</span><span class="pill">dismissible</span></div></div>
<div class="component"><h4>Input / Alert / Spinner</h4><code class="path">atoms/</code><p>Input: label, icono, help, error; 40px, borde primary en foco. Alert: mensaje contextual con icono por variante, auto-cierre pausable. Spinner: loader inline de grano fino.</p></div>
<div class="component"><h4>Estados: Empty / Error / Loading</h4><code class="path">molecules/</code><p>EmptyState (icono+título+acción), ErrorState (detalles colapsables + retry/volver), LoadingState (spinner|dots|pulse). Tríada obligatoria loading → error → vacío.</p></div>
<div class="component"><h4>Modal</h4><code class="path">molecules/Modal</code><p>v-model, header/body/footer por slots, teleport y foco atrapado; z-index al abrir; ModalStackManager para stacks. sm|md|lg|xl|full.</p></div>
<div class="component"><h4>Table</h4><code class="path">organisms/data/Table</code><p>Tokens dedicados (table-bg, head-bg, hover-bg, head-sorted-bg = primary-50). Hover de fila en bg-tertiary, cabecera ordenada en teal claro.</p></div>
<div class="component"><h4>Layouts</h4><code class="path">layout/src/layouts/</code><p>LayoutOrchestrator, RecordList, RecordDetail, ChibiList, CalendarLayout, ImportTaskList, AiChatbox y widgets.</p></div>
<div class="component"><h4>Componentes de dominio (mods)</h4><code class="path">up1/mods/*/modsComponents/</code><p>Curriculum: CurriculumMesh, CompetencyAlignmentGrid, CompetencyTreeEditor, CompetencyMatrixShell, MatrixAdoptionEditor, MeasurementModelHelp, ConsolidationBlock, RequirementEditor. Academic scheduling: TimeBlock*, Scenario*, RuleSetEditor.</p></div>
<h2>Layout de pantallas internas (cd / cm)</h2>
<p class="summary">Revisión de las vistas reales de Curriculum Design (cd) y Curriculum Mapping (cm) en el app corriendo (tenant UPU), con foco en paddings, margins y columnas.</p>
<div class="component"><h4>App shell</h4><code class="path">layout — top nav + app rail</code><p>Barra superior fija (logo + menús desplegables) + rail de apps colapsable a la izquierda + área de contenido. El rail se colapsa a botón hamburguesa en anchos angostos.</p></div>
<div class="component"><h4>RecordList</h4><code class="path">layout/src/layouts/RecordList</code><p>Breadcrumb, título con dropdown de vista, SearchBar de ancho completo, toolbar (filtro / columnas / toggle lista-grilla / refresh / "+"; en cm acciones custom), Table con cabeceras ordenables y hover por fila, y Pagination con "Mostrar N por página".</p><div class="states"><span class="pill">tabla ordenable</span><span class="pill">selección por fila</span><span class="pill">paginación</span></div></div>
<div class="component"><h4>RecordDetail</h4><code class="path">layout/src/layouts/RecordDetail</code><p>Título + tab bar horizontal (overflow a chevron) y cuerpo de formulario en <b>grilla de 2 columnas</b> (<code>1fr 1fr</code>) con labels en mayúscula xs (0.75rem) sobre inputs de 40px.</p><div class="states"><span class="pill">grid 1fr 1fr</span><span class="pill">tabs con overflow</span></div></div>
<div class="component"><h4>Malla curricular — CurriculumMesh (cd)</h4><code class="path">mods/curriculum-design/modsComponents/CurriculumMesh</code><p>Tres bloques con <code>margin-bottom: 1rem</code>: (1) barra de resumen <code>.cm-sumbar</code> = <code>repeat(4, 1fr)</code> gap 12px, stat-cards <code>padding: 12px 14px</code> con acento lateral de 3px; (2) filtros de líneas en flex-wrap gap .5rem, chips <code>min-width: 120px</code> con barra de 3px; (3) tablero kanban <code>.cm-cols</code> flex con scroll horizontal, columnas fijas <code>flex: 0 0 196px</code> gap 12px, tarjetas <code>.cm-pe</code> <code>padding: 8px 10px</code> con borde-acento izquierdo de 4px.</p><div class="states"><span class="pill">sumbar repeat(4,1fr)</span><span class="pill">kanban 196px</span><span class="pill">gap 12px</span><span class="pill">acento 3px / 4px</span></div></div>
<div class="component"><h4>Tributación — CompetencyAlignmentGrid (cm)</h4><code class="path">mods/curriculum-mapping/modsComponents/CompetencyAlignmentGrid</code><p>Grilla CRUD por competencia. Celda <code>repeat(3, minmax(0, 1fr))</code>; primera columna (árbol) <b>sticky</b>, el resto scrollea horizontal; jerarquía con rieles cuyo paso es <code>--up1-spacing-1</code> (4px). Espaciado íntegramente tokenizado: <b>el mejor alineado al DS</b>, patrón a imitar.</p><div class="states"><span class="pill">celda repeat(3)</span><span class="pill">1ª col sticky</span><span class="pill">100% tokenizado</span></div></div>
<div class="component"><h4>Medición (matriz, cm)</h4><code class="path">MeasurementModelHelp / ConsolidationBlock</code><p>Formulario + "Consolidación de logro" con selector de 4 tarjetas en grilla <code>1fr 1fr</code> (colapsa a 1 col); tarjeta activa con borde teal. Botón secundario + expander.</p><div class="states"><span class="pill">selector 2×2</span><span class="pill">tarjeta activa teal</span></div></div>
<div class="component"><h4>Competencias / Adopción (matriz, cm)</h4><code class="path">CompetencyTreeEditor / MatrixAdoptionEditor</code><p>Competencias: chips de definición, botones outline, filas colapsables (chip de código + badges, pill outline de advertencia) y banner soft-success con la suma (grillas <code>repeat(12, minmax(0,1fr))</code> y <code>auto-fit minmax(11rem,1fr)</code>). Adopción: formulario + Alert informativo + SearchBar con botón + Table de planes.</p><div class="states"><span class="pill">grid 12 col</span><span class="pill">filas colapsables</span><span class="pill">Alert informativo</span></div></div>
<h2>Fidelidad de spacing y tokens en los mods (hallazgos)</h2>
<div class="pattern"><h4>cm sigue la escala · cd usa valores crudos</h4><p>Medido en los <code>&lt;style&gt;</code> de los <code>modsComponents</code>: <b>curriculum-mapping</b> ≈ 338 usos de <code>var(--up1-spacing-*)</code> vs ~35 px crudos → sigue la escala. <b>curriculum-design</b> ≈ 2 usos vs ~75 px + ~114 rem hardcodeados → prácticamente la ignora (malla, RequirementEditor con literales <code>.75rem</code>, <code>12px</code>, <code>8px</code>, <code>196px</code>).</p></div>
<div class="pattern"><h4>Deuda en la malla: tokens de radio inexistentes</h4><p>CurriculumMesh usa <code>var(--up1-radius-md, 8px)</code> y <code>var(--up1-radius, 6px)</code>, pero esos tokens <b>no existen</b>: los reales son <code>--up1-border-radius-md</code> (0.5rem) y <code>--up1-border-radius</code> (0.375rem). Hoy "funciona" solo por el fallback en px, pero ignora el token del DS: un tema de tenant que reasigne el radio no llega a la malla. Igual con fallbacks Tailwind (<code>#e5e7eb</code>, <code>#d1d5db</code>) en vez de <code>--up1-gray-*</code>. Recomendación: migrar a la escala y a los nombres reales; tributación (cm) es la referencia.</p></div>
<h2>Nota de la extracción</h2>
<p class="summary">Base extraída de código real (tokens CSS, inventario de componentes, Storybook y tests) más captura del login. Ampliación manual con revisión de pantallas internas de cd/cm logueado (tenant UPU): app shell, RecordList, RecordDetail, malla curricular, medición, competencias y adopción. Esta ampliación manual se sobrescribe si se regenera el DS con el constructor automático (que solo captura el login sin sesión).</p>
</body></html>
