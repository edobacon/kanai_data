---
id: SPEC-frontend-dark-mode-ui-fixes
project: jormat-evolution
ticket: JOR-028
status: done
---

# Fix · Detalles de modo oscuro + coherencia de componentes

# Fix · Detalles de modo oscuro + coherencia de componentes

## Executive summary — lo que estas aprobando

### 1. Que se arregla
Tres síntomas de dark-mode reportados por el dev, con **dos causas raíz**:

- **Botones `outline` invisibles en dark** (steppers +/- de `NumberStepper` en `/inventario/nuevo`; botón "Guardar borrador" en el `TransactionBuilder` de Ventas). El `variant="outline"` (`button.tsx`) no define background propio: en dark, `bg-background` (L11%) se funde con la superficie (card L14% / page L11%) y el `border-input` (L24%) apenas se distingue → el botón se percibe como un rectángulo vacío. Es el anti-patrón canónico de shadcn para outline en dark.
- **Filtros nativos de `DocumentosListView` ilegibles en dark** (3 `<select>` + `<input search>` + 2 `<input date>`). Tienen `bg-background` pero **no setean `text-foreground`** → el texto hereda un color oscuro sobre fondo oscuro. Además los `<select>` son nativos del navegador, incoherentes con el `Select` (Radix) que usan los formularios de la app.

### 2. Decisiones críticas
| Decisión | Racional (1 línea) |
|----------|--------------------|
| **Fix global del `variant="outline"`** (no targeted por componente) | DET-16: el origen es sistémico (cualquier botón outline en dark se funde). Se corrige una vez en `button.tsx` con `dark:bg-input/30 dark:border-input dark:hover:bg-input/50` (patrón shadcn) → arregla P1, P3 y cualquier outline futuro. Solo afecta dark; light mode intacto. |
| **Migrar los 3 `<select>` nativos → `Select` compartido (Radix)** | Pedido explícito del dev (coherencia con formularios) + el `Select` ya soporta dark (`text-foreground`). Resuelve P2 y unifica el lenguaje visual. |
| **`<input search>` → `Input` compartido; `<input date>` → agregar `text-foreground`** | Mismo bug de dark (sin `text-foreground`) en la misma barra. No hay date-picker compartido → fix mínimo en los date inputs; el search migra al `Input` que ya soporta dark. |
| **Verificación visual en dark obligatoria** | Es un fix de rendering: la evidencia es visual (Storybook dark + smoke en la vista). No se cierra solo con tsc/unit. |

### 3. Alcance
- **Dentro**: `button.tsx` (variant outline dark); `DocumentosListView.tsx` (migrar selects + inputs); stories/tests de dark para `Button` outline y la barra de filtros.
- **Fuera**: rediseño de tokens del theme (los tokens dark se mantienen — solo se corrige cómo el outline los usa); otros `<select>` nativos fuera de `DocumentosListView` (no reportados; se evalúan si aparecen — DET-16 nota); date-picker compartido nuevo (YAGNI).

## REQ-01 · Botón `outline` visible en modo oscuro

> **Que cambia**: el `variant="outline"` de `button.tsx` gana un background en dark (`dark:bg-input/30`) y un hover dark coherente, de modo que el botón tenga superficie visible sobre cards/page oscuros.
> **Por que**: en dark `bg-background` iguala la superficie → el botón desaparece (steppers P1, "Guardar borrador" P3). Solo se toca dark; light mode no cambia.

El sistema MUST modificar el `variant.outline` de `buttonVariants` en `src/components/ui/button/button.tsx` agregando, **solo para dark**, un background distinto de la superficie y su hover, sin alterar las clases de light mode (`border border-input bg-background hover:bg-accent hover:text-accent-foreground`). Patrón objetivo: añadir `dark:bg-input/30 dark:border-input dark:hover:bg-input/50`. El texto/icono MUST quedar legible (hereda `foreground`). El cambio MUST NO afectar otras variantes (`default`/`secondary`/`ghost`/`destructive`/`link`).

<details><summary>Scenarios</summary>

- **GIVEN** `<html class="dark">` **WHEN** se renderiza un `<Button variant="outline">` sobre una card **THEN** el botón tiene superficie visible (bg distinto de la card) y borde perceptible.
- **GIVEN** modo claro (sin `.dark`) **WHEN** se renderiza `<Button variant="outline">` **THEN** se ve idéntico a antes (sin regresión visual).
- **GIVEN** dark **WHEN** se renderizan los steppers +/- de `NumberStepper` y el botón "Guardar borrador" del `TransactionBuilder` **THEN** ambos son claramente visibles.
</details>

**Ampliación (feedback del dev, root cause de texto)**: el `body` (`globals.css @layer base`) usa el color legacy `text-[rgb(var(--color-text))]` que **NO tiene override en `.dark`** → cualquier botón sin color de texto propio hereda texto oscuro que no invierte en dark. Afecta `ghost` (botón "Cancelar" del `TransactionBuilder` → invisible) y `outline` (texto oscuro sobre el fill → "apenas visible"). El sistema MUST agregar `text-foreground` a las variantes `outline` y `ghost` de `button.tsx` (invierte correctamente en dark; en light ≈ `--color-text` → sin regresión). NO se cambia el `body` (decisión: fix acotado a las variantes, evita tocar el theme-system global; la migración body→`text-foreground` queda como mejora futura del theme).

- **source_ref**: `button.tsx:13` (variant outline), `number-stepper.tsx:62-94`, `TransactionBuilder.tsx:198-220` (Cancelar ghost + Guardar borrador outline), `globals.css` tokens dark + `@layer base body` (legacy `--color-text` sin `.dark`), `SPEC-frontend-theme-system` REQ-07 (QA contraste). **Layers**: frontend (ui atom). **Certeza**: confirmed.

## REQ-02 · Filtros de `DocumentosListView` coherentes y legibles en dark

> **Que cambia**: los 3 `<select>` nativos pasan al `Select` (Radix) compartido; el `<input search>` pasa al `Input` compartido; los 2 `<input date>` ganan `text-foreground`. La barra de filtros queda legible en dark y coherente con los formularios.
> **Por que**: los nativos no setean `text-foreground` → texto oscuro sobre fondo oscuro en dark; y los `<select>` rompen la coherencia (los forms usan el `Select` Radix).

El sistema MUST reemplazar en `src/components/ventas/list/DocumentosListView/DocumentosListView.tsx` los 3 `<select>` nativos (Tipo de documento, Estado SII, Estado comercial) por el componente `Select` compartido (`@/components/ui/select`) con `SelectTrigger`/`SelectContent`/`SelectItem`/`SelectValue`, conservando el comportamiento de filtrado actual (valor "" = "Todos", `onValueChange` → setter), con `SelectTrigger` ajustado a `h-8` para igualar la barra. El sistema MUST migrar el `<input type="search">` al componente `Input` compartido (`@/components/ui/input`) y MUST agregar `text-foreground` a los 2 `<input type="date">`. El filtrado, los `activeFilters` y el clear MUST seguir funcionando igual.

<details><summary>Scenarios</summary>

- **GIVEN** dark, `/ventas/documentos` **WHEN** se abre cada filtro **THEN** trigger y opciones son legibles (texto claro sobre fondo oscuro).
- **GIVEN** los filtros **WHEN** se inspecciona el DOM **THEN** los selects son el `Select` Radix (role=combobox/listbox), no `<select>` nativo.
- **GIVEN** un filtro seleccionado **WHEN** se aplica **THEN** la tabla filtra igual que antes y el chip de `activeFilters` aparece; "limpiar" resetea.
- **GIVEN** dark **WHEN** se ven search y date inputs **THEN** su texto es legible.
</details>

- **source_ref**: `DocumentosListView.tsx:226-294`, `select.tsx:19-39` (SelectTrigger con `text-foreground`), `input.tsx`, `SPEC-frontend-ui-atoms-forms` REQ-02 (Select canónico). **Layers**: frontend (vista ventas). **Certeza**: confirmed.

## REQ-03 · Alineación consistente del `KPICard` (con/sin ícono)

> **Que cambia**: la fila header del `KPICard` reserva siempre el alto del recuadro del ícono (`min-h-9`), de modo que el valor quede a la misma altura tenga ícono o no.
> **Por que**: hoy la fila header mide `h-9` (36px) cuando hay ícono y solo el alto del label cuando no → en una grilla de KPIs (ej. Listado de Items: "Total items" con ícono vs "Con stock"/"Sin stock"/"Marcas" sin ícono) los valores quedan desalineados verticalmente ("descuadrados").

El sistema MUST agregar `min-h-9` a la fila header (`flex items-center justify-between`) del `KPICard` en `src/components/ui/kpi-card/kpi-card.tsx`, sin alterar el resto del layout (label, valor `mt-2`, trend). El resultado MUST ser que cards con y sin ícono alineen su `label` y su `value` a la misma altura.

<details><summary>Scenarios</summary>

- **GIVEN** una grilla con KPICards mixtas (algunas con `icon`, otras sin) **WHEN** se renderiza **THEN** todos los `value` quedan a la misma altura vertical.
- **GIVEN** un KPICard sin ícono **WHEN** se renderiza **THEN** su header reserva el mismo alto que uno con ícono (no colapsa).
</details>

- **source_ref**: `kpi-card.tsx:55` (header `flex items-center justify-between`), screenshot del dev (Listado de Items). **Layers**: frontend (ui atom). **Certeza**: confirmed.

## Acceptance checkpoints

- [ ] **REQ-01**: `<Button variant="outline">` visible en dark (story dark + smoke en steppers y "Guardar borrador"); light mode sin cambios.
- [ ] **REQ-02**: filtros de Documentos usan `Select`/`Input` compartidos, legibles en dark, filtrado sin regresión.
- [ ] **Regresión**: suite front (`vitest --project '!storybook'`) verde; `tsc --noEmit` exit 0; otros botones outline (en otras vistas) sin regresión visual en light y mejor/igual en dark.
- [ ] **Evidencia visual**: screenshots dark de (a) un Button outline, (b) la barra de filtros de Documentos.

## DET-30 / seguridad

- Rama de ticket no protegida (`epic/jormat-v1`, donde vive el código de la épica; no develop/master/main).
- `execute_scope` declarado en el ticket (button, number-stepper, select, DocumentosListView, TransactionBuilder, globals.css).
- Sin cambios de datos, sin secretos, sin backend.

## Tasks

### Session 1 — Fix outline dark + migración filtros Documentos + verificación visual [tipo: ⚑ fuerte] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | `variant="outline"` con visibilidad en dark (`dark:bg-input/30 dark:border-input dark:hover:bg-input/50`) sin tocar light | REQ-01 | developer | — | `src/components/ui/button/button.tsx` | `tsc` exit 0; story Button outline en dark; light sin cambios | git revert | DET-16, RULE-frontend-001 | done | 1 |
| S1.T2 | Migrar 3 `<select>` nativos → `Select` compartido (`h-8`, valor ""=Todos, onValueChange) en `DocumentosListView` | REQ-02 | developer | — | `src/components/ventas/list/DocumentosListView/DocumentosListView.tsx` | filtrado preservado (test); `tsc` exit 0 | git revert | RULE-frontend-001, RULE-frontend-002 | done | 1 |
| S1.T3 | `<input search>` → `Input` compartido + `text-foreground` en los 2 `<input date>` | REQ-02 | developer | S1.T2 | `DocumentosListView.tsx` | dark legible (story/smoke); filtrado preservado | git revert | RULE-frontend-001 | done | 1 |
| S1.T4 | Stories/tests de dark: Button outline (dark bg) + barra de filtros Documentos (Select Radix, filtrado) | REQ-01/02 | developer | S1.T1, S1.T2, S1.T3 | `button.stories.tsx`, `DocumentosListView.test.tsx`/stories | vitest verde + a11y portal (RULE-frontend-002) | git revert | RULE-frontend-002 | done | 1 |
| **S1.GATE** | Gate de cierre (tier T2): acceptance REQ-01/02 + regresión vitest + tsc + evidencia visual dark + quality review 10-dim | REQ-01/02 | reviewer | S1.T1..T4 | ticket, spec | vitest verde + tsc 0 + screenshots dark + reviewer aislado approve | — | DET-13, DET-20, DET-23 | done | 1 |
