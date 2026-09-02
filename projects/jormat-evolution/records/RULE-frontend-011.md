---
id: RULE-frontend-011
project: jormat-evolution
type: rule
module: frontend
level: should
tags:
  - frontend
  - msal
  - auth
  - testing
  - storybook
  - mock
---

# Seam de test para componentes que consumen `useMsal()`: stub de contexto en stories, `vi.mock` en unit tests

## What

Un componente que consume `useMsal()` (Azure MSAL) se testea/previsualiza sin montar `PublicClientApplication` real:
- En **stories**: envolver con `<MsalContext.Provider value={stub}>`, con un stub que incluya al menos `loginRedirect` (mock function) e `inProgress` (estado de MSAL).
- En **unit tests**: `vi.mock('@azure/msal-react')` para reemplazar el hook completo.

Este seam respeta que el componente consuma el hook internamente (no recibe MSAL como prop), sin necesitar instanciar `PublicClientApplication` en el entorno de test/story.

## Why

Instanciar MSAL real en tests/stories agrega dependencia de configuracion (Azure CIAM) y lentitud innecesaria para un componente que solo necesita el estado/acciones expuestos por el hook. El seam stub/mock aisla el componente del proveedor real sin cambiar su codigo de produccion.

## Where

- **Layers**: frontend (componentes que consumen `useMsal()` de `@azure/msal-react`).
- Ejemplo origen: `LoginScreen` (JOR-004).

## When

- Al escribir stories o unit tests de cualquier componente auth futuro que consuma `useMsal()` (ej. JOR-008 y sucesores).

## Verification

- La story monta `<MsalContext.Provider value={stub}>` con `loginRedirect`+`inProgress` mockeados.
- El unit test usa `vi.mock('@azure/msal-react')`, sin instanciar `PublicClientApplication`.

## Source

- **Discovered in**: JOR-004, Session #1.
- **Evidence**: L2 (seam MsalContext.Provider en stories / vi.mock en unit test; reusable para componentes auth futuros, DEC-LOCAL-01).
