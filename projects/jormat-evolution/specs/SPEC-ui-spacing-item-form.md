---
id: SPEC-ui-spacing-item-form
project: jormat-evolution
ticket: JOR-066
status: in_progress
---

# Spacing global + rediseño de ItemCreateForm

# Spacing global + rediseño de ItemCreateForm

## Executive summary — lo que estás aprobando

**Qué se quiere**: (1) dar aire vertical a todas las vistas de una (fix en `PageLayout`, que hoy apila los hijos sin separación); (2) rediseñar `/inventario/nuevo` para que cada sección viva en su card, en el layout de columnas de la maqueta (1&2 / 3 / 4&5), y corregir la sección de códigos/referencias (dark mode + columnas). Lo colapsable queda diferido a backlog hasta validar el formato de columnas.

Sin decisiones críticas — mejora de UI directa sobre componentes existentes.

## Purpose

Mejorar la legibilidad y jerarquía visual de las vistas: dar aire vertical uniforme (fix en `PageLayout`) y presentar el alta de item (`/inventario/nuevo`) con cada sección en su card, en el layout de columnas de la maqueta, corrigiendo la sección de códigos/referencias en dark mode.

## Requirements

### REQ-01 — Aire vertical entre elementos (global)

> **Qué cambia**: los elementos de cada vista dejan de estar pegados verticalmente.
> **Por qué**: `PageLayout` renderiza `{children}` sin `space-y`; las vistas que apilan KPIs + filtros + tabla quedan flush.

`PageLayout` DEBE separar sus hijos de nivel superior con espaciado vertical consistente. Aplica a todas las vistas sin cambiarlas una por una.

### REQ-02 — ItemCreateForm en cards por columnas

> **Qué cambia**: cada sección de `/inventario/nuevo` en su card; grid **1&2 / 3 / 4&5**; galería en card; fix dark mode + columnas de códigos/referencias.
> **Por qué**: hoy es una sola columna con `FormSection`, sin cards; códigos/referencias no respeta columnas y falla en dark mode.

Las 5 secciones DEBEN renderizarse en cards dentro del grid de la maqueta. La sección "Códigos y referencias" DEBE respetar columnas y verse bien en dark mode (usar tokens del tema). Colapsable: DIFERIDO (backlog B1).

## Tasks

### Session 1 — Spacing global [tier: T2]

| ID | Descripción | REQ | Files | DETs |
|----|-------------|-----|-------|------|
| S1.T1 | `PageLayout` envuelve `children` en contenedor con `space-y`; verificar vistas (documentos, items) con aire; test | REQ-01 | `src/components/layout/page-layout/*` | DET-23 |

### Session 2 — ItemCreateForm cards/columnas [tier: T2]

| ID | Descripción | REQ | Files | DETs |
|----|-------------|-----|-------|------|
| S2.T1 | Secciones en `Card` dentro del grid 1&2/3/4&5 + galería en card + fix dark mode/columnas de códigos-referencias + tests | REQ-02 | `src/components/items/create/ItemCreateForm/*`, `src/components/forms/*` | DET-23, RULE-frontend-001 |

## Constraints

- `PageLayout` es compartido: el `space-y` no debe romper vistas existentes (solo agrega separación entre hermanos top-level).
- Usar tokens del tema (`bg-card`, `text-foreground`, `border-border`) — nada hardcodeado (dark mode).
- Reusar `Card`/`CardHeader`/`CardContent` existentes.

## Acceptance checkpoints

- [ ] Documentos e Items muestran aire entre KPIs/filtros/tabla.
- [ ] ItemCreateForm: 5 secciones en cards, grid 1&2/3/4&5.
- [ ] Códigos/referencias respeta columnas y se ve bien en dark mode.
- [ ] Suite completa verde; tsc + lint limpios.
