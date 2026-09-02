---
id: SPEC-frontend-ui-atoms-forms
project: jormat-evolution
ticket: JOR-006
status: in_progress
---

# Librería UI: átomos + formularios (Input/Select/Switch/Card/Dialog + Badge ext + FormField/FormSection)

# Librería UI: átomos + formularios (Input/Select/Switch/Card/Dialog + Badge ext + FormField/FormSection)

## Executive summary — lo que estas aprobando

> *Revision rapida. El detalle tecnico vive en Requirements, Artifacts y Tasks.*

**Que se quiere**: Completar la librería de UI compartida de `front/jormat-front`. El intake encontró que Button/Badge/Tooltip ya están entregados (JOR-005/024/025), así que el trabajo real es agregar los 5 átomos faltantes (Input, Select, Switch, Card, Dialog), extender Badge con variantes semánticas (success/warning/error/info/neutral), y crear los composites FormField/FormSection que estandarizan validación (react-hook-form + zod) y el mapeo del contrato de error `{code,message}` del backend. Cada pieza con story + test + chequeo a11y. Esto desbloquea JOR-007 (DataTable/organismos), JOR-008 (toasts/modales) y JOR-011 (RBAC).

**Decisiones criticas que necesitan tu OK** (resueltas en modo super con racional — ver Decisions):

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | Extender Badge con variantes semánticas (additivo) en vez de dejarlo intacto | Toca un átomo "entregado" (RULE-global-003) — pero es alcance explícito del ticket; se mitiga con test de regresión de variantes previas |
| 2 | Select simple (single), sin Combobox/MultiSelect | Acota el alcance a lo que JOR-006 pide literalmente; Combobox/MultiSelect quedan para cuando un consumidor real los necesite |
| 3 | Mantener addon-a11y en `test: 'todo'` global; verificar a11y limpio sólo en componentes nuevos | Flip a `'error'` afectaría retroactivamente las stories existentes (Button/Badge/shell) — fuera de alcance |

**Riesgos principales y como los mitigamos**:

- **Romper el Badge entregado al extenderlo** → test de regresión que verifica que las variantes previas (default/secondary/destructive/outline) conservan sus clases, antes de mergear la extensión.
- **Deps Radix nuevas invisibles en el contenedor Docker del dev** → la verificación de build/test del gate corre en host; el spec documenta que el dev debe `./run.sh build` para su runtime (no es bug, es operativo).
- **Tests de portal Radix (Select/Dialog) flaky o sin cobertura a11y** → seguir RULE-frontend-002: `defaultOpen` en test jsdom, `play()` abre el overlay en la story para que addon-a11y escanee el contenido del portal.

**Que NO se hace en este ticket** (límites explícitos):

- DataTable, FilterBar, KPICard, StatGrid, PageLayout, TwoColumn → JOR-007.
- Combobox, MultiSelect, AlertDialog con countdown → fuera de alcance literal (se evalúan cuando haya consumidor).
- Reconstruir Button/Tooltip → ya entregados, RULE-global-003.
- Vistas de negocio (FASE B), backend.

**Tamano estimado**: 5 sessions ejecutables (~6–9h efectivas). La más riesgosa es S4 (FormField/FormSection — integración RHF+zod+error contract, tier T3).

**Como vas a saber que funciona**:

- Abro Storybook y veo cada átomo nuevo con sus variantes/estados en claro y oscuro, sin violaciones a11y.
- `npm run test` (vitest: jsdom + storybook browser) pasa 100% verde, incluyendo el test de regresión de Badge.
- Un form de ejemplo con FormField valida con zod, y un error backend `{code:'X'}` pinta el campo correcto en rojo.

---

## Purpose

Proveer los átomos y composites de formulario faltantes de la librería UI compartida (`src/components/ui/` y `src/components/forms/`), construidos con shadcn/ui + CVA sobre los tokens de JOR-003, siguiendo la convención carpeta-por-componente (RULE-frontend-001) y las convenciones de test/story del stack vitest-dual + storybook-nextjs-vite (RULE-frontend-002). FormField/FormSection encapsulan el patrón RHF + zodResolver + mapeo del contrato de error `{code,message}` del backend.

## Requirements

### REQ-01: Input

> **Que cambia**: el dev dispone de un `<Input>` reusable con estados default/focus/error/disabled y soporte de ícono leading, en vez de un `<input>` crudo por pantalla.
> **Por que**: cada formulario re-implementaba el estilo del input; se centraliza el look (tokens JOR-003) y la a11y.

El sistema MUST proveer un componente `Input` en `src/components/ui/input/` basado en `<input>` nativo con clases CVA sobre los tokens (`--input`, `--background`, `--muted-foreground`, `--ring`, `--destructive`), que soporte estado `error` (borde destructive + `aria-invalid`) y `disabled` (opacidad + `pointer-events-none`).

**Actor**: dev consumidor
**Layers**: frontend

<details><summary>Scenarios de validacion</summary>

#### Scenario: render default
- **GIVEN** un `<Input placeholder="x" />`
- **WHEN** se renderiza
- **THEN** tiene borde `--input`, placeholder con color `--muted-foreground`, y radio `calc(var(--radius) - ...)`

#### Scenario: estado error
- **GIVEN** un `<Input aria-invalid />` (o prop `error`)
- **WHEN** se renderiza
- **THEN** el borde usa `--destructive` y `aria-invalid="true"` está presente

#### Scenario: disabled
- **GIVEN** un `<Input disabled />`
- **WHEN** se renderiza
- **THEN** no es editable y aplica opacidad reducida

</details>

#### Acceptance
**El usuario puede verificar que funciona**: en Storybook, la story de Input muestra default/error/disabled/con-ícono en claro y oscuro sin violaciones a11y.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | default | `<Input/>` | render | clase base | `border-input` presente |
| 2 | error | `<Input aria-invalid/>` | render | borde destructive | `aria-invalid="true"` + clase destructive |
| 3 | disabled | `<Input disabled/>` | render | no editable | `disabled` + `disabled:opacity-50` |

### REQ-02: Select

> **Que cambia**: el dev tiene un `<Select>` (single) accesible con placeholder, opciones y estado error, construido sobre Radix.
> **Por que**: estandariza dropdowns de selección (estado, tipo de documento) con a11y de teclado y foco.

El sistema MUST proveer un componente `Select` en `src/components/ui/select/` envolviendo `@radix-ui/react-select`, con subcomponentes shadcn (Trigger, Content, Item, Value), soporte de placeholder, estado `error` en el trigger, y `disabled`.

**Actor**: dev consumidor
**Layers**: frontend

<details><summary>Scenarios de validacion</summary>

#### Scenario: selección
- **GIVEN** un Select con opciones y `defaultOpen`
- **WHEN** el contenido se monta (portal)
- **THEN** las opciones tienen `role="option"` y el trigger muestra el valor seleccionado

#### Scenario: placeholder
- **GIVEN** un Select sin valor
- **WHEN** se renderiza
- **THEN** el trigger muestra el placeholder con color `--muted-foreground`

#### Scenario: error
- **GIVEN** un Select con prop `error`
- **WHEN** se renderiza
- **THEN** el trigger usa borde `--destructive`

</details>

#### Acceptance
**El usuario puede verificar que funciona**: la story abre el dropdown en `play()` y addon-a11y escanea las opciones sin violaciones.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | opciones montadas | `<Select defaultOpen>` | render | portal montado | items con `role="option"` |
| 2 | placeholder | Select sin valor | render | trigger | muestra placeholder |
| 3 | error | `error` prop | render | trigger | clase destructive |

### REQ-03: Switch

> **Que cambia**: toggle on/off accesible para flags booleanos (cliente preferente, oferta sí/no).
> **Por que**: reemplaza checkboxes ad-hoc por un control consistente y accesible.

El sistema MUST proveer un componente `Switch` en `src/components/ui/switch/` envolviendo `@radix-ui/react-switch`, con estados on (`bg-primary`), off (`bg-input`), disabled y `focus-visible` (`ring-ring`).

**Actor**: dev consumidor
**Layers**: frontend

<details><summary>Scenarios de validacion</summary>

#### Scenario: toggle
- **GIVEN** un `<Switch>` off
- **WHEN** el usuario hace click
- **THEN** cambia a on con `aria-checked="true"` y `bg-primary`

#### Scenario: disabled
- **GIVEN** un `<Switch disabled>`
- **WHEN** el usuario hace click
- **THEN** no cambia de estado

</details>

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | render off | `<Switch/>` | render | `role="switch"` | `aria-checked="false"` |
| 2 | toggle | `<Switch/>` | click (play) | cambia | `aria-checked="true"` |
| 3 | disabled | `<Switch disabled/>` | click | sin cambio | `disabled` presente |

### REQ-04: Card

> **Que cambia**: contenedor `<Card>` con subcomponentes (Header/Title/Description/Content/Footer) para agrupar contenido.
> **Por que**: estandariza el contenedor base de tiles, resúmenes y paneles.

El sistema MUST proveer un componente `Card` (HTML puro, sin Radix) en `src/components/ui/card/` con subcomponentes `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`, usando tokens `--card`, `--card-foreground`, `--border`, `--radius` y sombra `shadow-sm`.

**Actor**: dev consumidor
**Layers**: frontend

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | composición | Card con Header/Content/Footer | render | estructura | subcomponentes renderizados en orden |
| 2 | tokens | `<Card/>` | render | clase base | `bg-card` + `border` + `rounded-*` |

### REQ-05: Dialog

> **Que cambia**: modal centrado con overlay y focus-trap, construido sobre la misma primitiva Radix que el Sheet existente.
> **Por que**: confirmaciones y formularios en modal necesitan a11y de foco y cierre por Escape/overlay.

El sistema MUST proveer un componente `Dialog` en `src/components/ui/dialog/` envolviendo `@radix-ui/react-dialog` (ya instalado), con `DialogOverlay`, `DialogContent` (centrado, `shadow-xl`), `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogFooter`, `DialogClose`. MUST atrapar el foco y cerrar con Escape.

**Actor**: dev consumidor
**Layers**: frontend

<details><summary>Scenarios de validacion</summary>

#### Scenario: apertura y foco
- **GIVEN** un Dialog con `defaultOpen`
- **WHEN** el contenido se monta (portal)
- **THEN** tiene `role="dialog"`, overlay visible, y el foco entra al panel

#### Scenario: cierre
- **GIVEN** un Dialog abierto
- **WHEN** se presiona Escape o se hace click en Close
- **THEN** el dialog se cierra

</details>

#### Acceptance
**El usuario puede verificar que funciona**: la story abre el dialog en `play()`; addon-a11y escanea el panel; el role `dialog` y el focus-trap están presentes.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | montado | `<Dialog defaultOpen>` | render | portal | `role="dialog"` presente |
| 2 | título a11y | Dialog con DialogTitle | render | accesibilidad | `aria-labelledby` apunta al título |

### REQ-06: Badge — extensión de variantes semánticas

> **Que cambia**: Badge gana variantes `success/warning/error/info/neutral` (pills de estado), sin alterar las variantes previas.
> **Por que**: las vistas de negocio necesitan pills de estado; los tokens ya existen pero el átomo no los expone.

El sistema MUST extender el `badgeVariants` (CVA) existente en `src/components/ui/badge/badge.tsx` con las variantes `success`, `warning`, `error`, `info`, `neutral` usando los tokens `--success-bg/--success-fg`, `--warning-bg/--warning-fg`, `--destructive`, `--info-bg/--info-fg`, `--muted/--muted-foreground`. La extensión MUST ser additiva: las variantes previas (`default`, `secondary`, `destructive`, `outline`) conservan su comportamiento y clases.

**Actor**: dev consumidor
**Layers**: frontend

<details><summary>Scenarios de validacion</summary>

#### Scenario: variante nueva
- **GIVEN** `<Badge variant="success">`
- **WHEN** se renderiza
- **THEN** aplica `--success-bg`/`--success-fg`

#### Scenario: regresión de variantes previas
- **GIVEN** `<Badge variant="secondary">` y `<Badge variant="destructive">`
- **WHEN** se renderizan
- **THEN** conservan exactamente las mismas clases que antes de la extensión

</details>

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | success | `variant="success"` | render | clase | token success aplicado |
| 2 | regresión secondary | `variant="secondary"` | render | clase intacta | `bg-secondary` presente |
| 3 | regresión destructive | `variant="destructive"` | render | clase intacta | clase destructive presente |

### REQ-07: FormField

> **Que cambia**: un composite que conecta un control (Input/Select/Switch) con react-hook-form: label, control, mensaje de error accesible, y mapeo del error backend `{code}` al campo.
> **Por que**: hoy cada form cablearía RHF + aria-invalid + mensaje a mano; FormField lo estandariza y hace testeable el contrato de error.

El sistema MUST proveer `FormField` en `src/components/forms/FormField/` que, dado un `name` y el contexto de un formulario RHF (`useFormContext`), renderice label + control (via `render` prop o children) + mensaje de error (`text-destructive`, con `aria-invalid` y `aria-describedby` en el control). MUST exponer un helper para mapear un error backend `{code, message}` a `setError(name, {message})`.

**Actor**: dev consumidor
**Layers**: frontend

<details><summary>Scenarios de validacion</summary>

#### Scenario: validación zod
- **GIVEN** un form con `zodResolver` y un FormField cuyo campo es requerido
- **WHEN** se hace submit vacío
- **THEN** FormField muestra el mensaje de error de zod y marca `aria-invalid`

#### Scenario: error de backend mapeado a campo
- **GIVEN** un submit que el backend rechaza con `{code:'RUT_DUPLICATE', message:'...'}`
- **WHEN** el handler llama al helper de mapeo
- **THEN** `setError('rut', {message})` se invoca y el FormField del rut muestra el mensaje

#### Scenario: válido
- **GIVEN** un form válido
- **WHEN** se hace submit
- **THEN** no hay mensaje de error y `aria-invalid` está ausente/false

</details>

#### Acceptance
**El usuario puede verificar que funciona**: en un form de ejemplo, dejar un campo requerido vacío muestra el error de zod; simular un error backend con un `code` conocido pinta el campo correspondiente.

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | error zod | form requerido | submit vacío | error visible | mensaje zod + `aria-invalid="true"` |
| 2 | map backend | error `{code}` | helper map | setError | campo muestra `message` |
| 3 | válido | form válido | submit | sin error | no `aria-invalid`, callback llamado |

### REQ-08: FormSection

> **Que cambia**: agrupador visual de campos con título y separador.
> **Por que**: forms largos necesitan secciones (Datos del cliente / Configuración) consistentes.

El sistema MUST proveer `FormSection` en `src/components/forms/FormSection/` que renderice un título opcional + separador (reusando `Separator`) + el grupo de campos (children).

**Actor**: dev consumidor
**Layers**: frontend

#### Test scenarios
| # | Scenario | Given | When | Then | Expected |
|---|----------|-------|------|------|----------|
| 1 | con título | `<FormSection title="X">` | render | título + separador | título renderizado + separator presente |
| 2 | children | FormSection con campos | render | agrupa | children renderizados |

## Artifacts

### Componentes nuevos (carpeta-por-componente — RULE-frontend-001)

| Componente | Carpeta | Primitiva | Archivos | source_ref |
|------------|---------|-----------|----------|-----------|
| Input | `src/components/ui/input/` | `<input>` nativo | input.tsx, input.stories.tsx, input.test.tsx, index.ts | REQ-01 |
| Select | `src/components/ui/select/` | @radix-ui/react-select | select.tsx, select.stories.tsx, select.test.tsx, index.ts | REQ-02 |
| Switch | `src/components/ui/switch/` | @radix-ui/react-switch | switch.tsx, switch.stories.tsx, switch.test.tsx, index.ts | REQ-03 |
| Card | `src/components/ui/card/` | HTML puro | card.tsx (+ subcomponentes), card.stories.tsx, card.test.tsx, index.ts | REQ-04 |
| Dialog | `src/components/ui/dialog/` | @radix-ui/react-dialog | dialog.tsx, dialog.stories.tsx, dialog.test.tsx, index.ts | REQ-05 |
| FormField | `src/components/forms/FormField/` | RHF (useFormContext) | FormField.tsx, FormField.stories.tsx, FormField.test.tsx, index.ts | REQ-07 |
| FormSection | `src/components/forms/FormSection/` | HTML + Separator | FormSection.tsx, FormSection.stories.tsx, FormSection.test.tsx, index.ts | REQ-08 |

### Componente modificado (additivo)

| Componente | Archivo | Cambio | source_ref |
|------------|---------|--------|-----------|
| Badge | `src/components/ui/badge/badge.tsx` (+ .stories + .test) | +variantes success/warning/error/info/neutral; +test de regresión | REQ-06 |

### Dependencias npm a agregar

| Paquete | Para | Nota |
|---------|------|------|
| @radix-ui/react-select | Select | dep nueva — requiere `./run.sh build` para runtime Docker |
| @radix-ui/react-switch | Switch | idem |
| @radix-ui/react-label | label a11y de FormField/Input | idem |

## Tasks

### Session 1 — Setup deps + Input + Switch [tipo: auto] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Agregar deps `@radix-ui/react-switch` + `@radix-ui/react-label` a package.json e instalar (host) | REQ-03 | developer | — | front/jormat-front/package.json | `npm ls @radix-ui/react-switch` | git checkout package.json package-lock.json | DET-8, DET-16 | done | 1 |
| S1.T2 | Crear Input (carpeta-por-componente): input.tsx con CVA + estados, index.ts, input.stories.tsx (default/error/disabled/con-ícono), input.test.tsx | REQ-01 | developer | — | front/jormat-front/src/components/ui/input/ | vitest jsdom input.test + lint | git rm -r input/ | DET-1, DET-2, RULE-frontend-001, RULE-frontend-002, RULE-global-001 | done | 1 |
| S1.T3 | Crear Switch (carpeta) sobre react-switch: switch.tsx, index.ts, story (on/off/disabled, play toggle), test (role switch, toggle, disabled) | REQ-03 | developer | S1.T1 | front/jormat-front/src/components/ui/switch/ | vitest jsdom switch.test + lint | git rm -r switch/ | DET-1, DET-2, RULE-frontend-001, RULE-frontend-002 | done | 1 |
| **S1.GATE** | Gate de sync Session 1 (tier: T2) — persistir en `## Sessions`, correr vitest+lint+tsc del área, quality review, decidir continue/iterate | — | reviewer | S1.T1, S1.T2, S1.T3 | projects/jormat-evolution/tickets/JOR-006.md | gate persistido + decision | (no aplica) | DET-20, DET-23 | done | 1 |

### Session 2 — Card + Dialog [tipo: auto] [tier: T2]

parallel_groups: [[S2.T1, S2.T2]]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S2.T1 | Crear Card (carpeta) HTML puro + subcomponentes (Header/Title/Description/Content/Footer), index.ts, story (con header/content/footer + hover), test (composición + tokens) | REQ-04 | developer | S1.GATE | front/jormat-front/src/components/ui/card/ | vitest jsdom card.test + lint | git rm -r card/ | DET-1, DET-2, RULE-frontend-001, RULE-global-001 | done | 2 |
| S2.T2 | Crear Dialog (carpeta) sobre react-dialog: overlay+content centrado+header/footer/close, index.ts, story (play abre overlay, a11y), test (defaultOpen → role dialog, aria-labelledby) | REQ-05 | developer | S1.GATE | front/jormat-front/src/components/ui/dialog/ | vitest jsdom dialog.test + lint | git rm -r dialog/ | DET-1, DET-2, RULE-frontend-001, RULE-frontend-002 | done | 2 |
| **S2.GATE** | Gate de sync Session 2 (tier: T2) — persistir, vitest+lint+tsc, a11y de overlay, quality review | — | reviewer | S2.T1, S2.T2 | projects/jormat-evolution/tickets/JOR-006.md | gate persistido + decision | (no aplica) | DET-20, DET-23 | done | 2 |

### Session 3 — Select + extensión Badge [tipo: auto] [tier: T2]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S3.T1 | Agregar dep `@radix-ui/react-select` e instalar (host) | REQ-02 | developer | S2.GATE | front/jormat-front/package.json | `npm ls @radix-ui/react-select` | git checkout package.json package-lock.json | DET-8, DET-16 | done | 3 |
| S3.T2 | Crear Select (carpeta) sobre react-select: trigger/content/item/value, placeholder/error, index.ts, story (play abre dropdown, a11y), test (defaultOpen → options, placeholder, error) | REQ-02 | developer | S3.T1 | front/jormat-front/src/components/ui/select/ | vitest jsdom select.test + lint | git rm -r select/ | DET-1, DET-2, RULE-frontend-001, RULE-frontend-002 | done | 3 |
| S3.T3 | Extender Badge: +variantes success/warning/error/info/neutral en badgeVariants; actualizar story (todas las variantes); test de regresión (variantes previas intactas) + test variantes nuevas | REQ-06 | developer | S2.GATE | front/jormat-front/src/components/ui/badge/badge.tsx, badge.stories.tsx, badge.test.tsx | vitest jsdom badge.test (regresión) + lint | git checkout badge/ | DET-5, DET-7, RULE-global-003, RULE-frontend-002 | done | 3 |
| **S3.GATE** | Gate de sync Session 3 (tier: T2) — persistir, vitest+lint+tsc, verificar regresión Badge verde, quality review | — | reviewer | S3.T1, S3.T2, S3.T3 | projects/jormat-evolution/tickets/JOR-006.md | gate persistido + decision | (no aplica) | DET-20, DET-23 | done | 3 |

### Session 4 — FormField + FormSection [tipo: auto] [tier: T3]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S4.T1 | Crear FormField (carpeta) sobre RHF useFormContext: label+control+error a11y (aria-invalid/aria-describedby) + helper mapApiErrorToField; index.ts; story (form con zodResolver, error visible); test integración (error zod, map backend, válido) | REQ-07 | developer | S3.GATE | front/jormat-front/src/components/forms/FormField/ | vitest jsdom FormField.test (integración RHF+zod) + lint | git rm -r FormField/ | DET-1, DET-2, DET-7, RULE-frontend-001, RULE-frontend-002, RULE-global-001 | done | 4 |
| S4.T2 | Crear FormSection (carpeta): título+Separator+children; index.ts; story; test (con/sin título, children) | REQ-08 | developer | S4.T1 | front/jormat-front/src/components/forms/FormSection/ | vitest jsdom FormSection.test + lint | git rm -r FormSection/ | DET-1, DET-2, RULE-frontend-001 | done | 4 |
| **S4.GATE** | Gate de sync Session 4 (tier: T3) — persistir, vitest completo del área + lint + tsc, a11y de labels/errores, quality review exhaustiva | — | reviewer | S4.T1, S4.T2 | projects/jormat-evolution/tickets/JOR-006.md | gate persistido + decision | (no aplica) | DET-20, DET-23 | done | 4 |

### Session 5 — Cierre WP: suite completa + mutation + a11y + review [tipo: auto] [tier: T3]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S5.T1 | Correr suite completa (`npm run test`: jsdom + storybook browser con cache limpia) + verificar a11y de componentes nuevos; lanzar dkc-mutate (async, warn-first, diff-scoped) | — | reviewer | S4.GATE | front/jormat-front/ | `npm run test` 100% verde + reporte a11y + mutation report | (no aplica) | DET-7, DET-13, DET-23, DET-31 | done | 5 |
| **S5.GATE** | Gate de cierre WP (tier: T3) — consolidar evidencia, coverage delta, decidir continue → close | — | reviewer | S5.T1 | projects/jormat-evolution/tickets/JOR-006.md | gate persistido + decision close | (no aplica) | DET-13, DET-20, DET-23 | done | 5 |

### Task contract (detalle de las tasks de mayor riesgo)

```
Task S3.T3: Extender Badge con variantes semánticas
- source_ref: REQ-06
- agent: developer
- files: src/components/ui/badge/{badge.tsx, badge.stories.tsx, badge.test.tsx}
- precondition: badge.tsx existe (entregado JOR-005/024)
- expected_output: badgeVariants tiene success/warning/error/info/neutral; story muestra todas; test de regresión verde
- validation: vitest jsdom badge.test.tsx — incluye assertions de que default/secondary/destructive/outline conservan sus clases
- rollback: git checkout src/components/ui/badge/
- rules: [DET-5, DET-7, RULE-global-003, RULE-frontend-002]
```

```
Task S4.T1: FormField (RHF + zodResolver + mapeo de error backend)
- source_ref: REQ-07
- agent: developer
- files: src/components/forms/FormField/{FormField.tsx, FormField.test.tsx, FormField.stories.tsx, index.ts}
- precondition: Input/Select/Switch existen (S1-S3); RHF+zod+@hookform/resolvers instalados
- expected_output: FormField renderiza label+control+error a11y; helper mapApiErrorToField(error, setError) mapea {code,message}→campo; tests de integración verdes
- validation: vitest jsdom — render dentro de FormProvider con zodResolver; submit vacío → error; map backend → setError
- rollback: git rm -r src/components/forms/FormField/
- rules: [DET-1, DET-2, DET-7, RULE-frontend-001, RULE-frontend-002, RULE-global-001]
```

## Constraints

- RULE-frontend-001: organización carpeta-por-componente — cada componente en su carpeta con tsx+stories+test+index.ts; tras `npx shadcn add` reorganizar a carpeta.
- RULE-frontend-002: convenciones test/story del stack — Radix en portal usa `defaultOpen` en test jsdom y `play()` abre overlay en story; tooltip `role` en span sr-only; limpiar cache storybook si falla módulo dinámico.
- RULE-global-001: DoD C1–C6 — un componente por archivo, sin `any` (VariantProps), patrones cn()+CVA, sin código muerto ni console.*.
- RULE-global-003: no modificar base entregada — Button/Tooltip no se reconstruyen; Badge se extiende de forma additiva (excepción razonada, ver DEC-LOCAL-01).
- RULE-global-004: dev stack consola limpia — sin console.* en componentes.

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| @radix-ui/react-select | external | primitiva del Select | requiere `./run.sh build` para runtime Docker del dev |
| @radix-ui/react-switch | external | primitiva del Switch | idem |
| @radix-ui/react-label | external | label a11y | idem |
| @radix-ui/react-dialog | external (ya instalado) | primitiva del Dialog | ninguno — ya presente vía Sheet |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Extensión de Badge rompe variantes previas | medium | regresión visual en shell/vistas existentes | test de regresión que verifica clases de default/secondary/destructive/outline antes de mergear |
| Tests de portal Radix (Select/Dialog) sin cobertura a11y | medium | a11y no validada | RULE-frontend-002: `defaultOpen` en jsdom, `play()` abre overlay en story |
| Deps nuevas invisibles en contenedor Docker | high | dev ve "Module not found" | documentado: dev corre `./run.sh build`; gate verifica en host |
| Cache storybook flaky en suite completa | medium | falso rojo en S5 | `rm -rf node_modules/.cache/storybook node_modules/.vite` antes del full run |

## Open questions

- (ninguna — las 3 decisiones del intake se cierran abajo en Decisions)

## Decisions

### DEC-LOCAL-01: Extender Badge con variantes semánticas (additivo)
- **Contexto**: Badge ya entregado (JOR-005/024) tiene default/secondary/destructive/outline; JOR-006 pide success/warning/error/info/neutral.
- **Drivers**: alcance explícito del ticket; tokens ya existen en globals.css; RULE-global-003 (no tocar lo entregado).
- **Opcion elegida**: extender additivamente el CVA, con test de regresión de variantes previas.
- **Alternativas**: dejar Badge intacto (descartada — dejaría JOR-006 incompleto sin razón técnica; empujaría el trabajo a otro ticket).
- **Consecuencias**: gana un Badge canónico completo; cuesta un test de regresión y tocar un archivo entregado (mitigado).
- **Session**: design (confirmado en modo super).

### DEC-LOCAL-02: addon-a11y en `test: 'todo'` global; a11y verificado en componentes nuevos
- **Contexto**: A3.7 exige chequeo a11y; el addon está en `test: 'todo'` (reporta, no falla CI).
- **Drivers**: flip a `'error'` afectaría retroactivamente stories existentes (fuera de alcance).
- **Opcion elegida**: mantener `'todo'` global; verificar manualmente a11y limpio en los componentes nuevos durante los gates.
- **Alternativas**: flip global a `'error'` (descartada — rompería CI por stories preexistentes que no son parte de este ticket).
- **Consecuencias**: a11y validada para lo nuevo sin regresión sobre lo viejo.
- **Session**: design.

### DEC-LOCAL-03: Select simple (single), sin Combobox/MultiSelect
- **Contexto**: component-patterns.md describe Select simple, Combobox (cmdk) y MultiSelect con chips.
- **Drivers**: alcance literal de JOR-006 ("Select con placeholder, opciones, error"); Combobox/MultiSelect requieren cmdk/popover.
- **Opcion elegida**: Select single con @radix-ui/react-select.
- **Alternativas**: incluir Combobox/MultiSelect (descartada — sin consumidor inmediato, agrega deps y superficie de test fuera de alcance).
- **Consecuencias**: alcance acotado; Combobox/MultiSelect quedan para cuando haya consumidor real.
- **Session**: design.

## Acceptance checkpoints

- [ ] **Funcional**: scenarios de REQ-01..08 pasan (átomos renderizan estados; FormField valida zod y mapea error backend)
- [ ] **Tests**: vitest jsdom + storybook browser 100% verde; test de regresión de Badge verde
- [ ] **NFRs**: n/a
- [ ] **Rules**: RULE-frontend-001 (carpeta-por-componente) + RULE-frontend-002 (test/story) + RULE-global-001 (DoD) respetadas
- [ ] **Integration**: variantes previas de Badge intactas; no rompe stories/tests existentes
- [ ] **a11y**: componentes nuevos sin violaciones (addon-a11y) en claro y oscuro
- [ ] **Mutation**: dkc-mutate corrido (warn-first); sobrevivientes triagados (DET-31)
