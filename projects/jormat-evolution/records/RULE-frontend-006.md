---
id: RULE-frontend-006
project: jormat-evolution
type: rule
module: frontend
level: must
tags:
  - frontend
  - testing
  - rbac
  - capabilities
  - shell
  - mock
---

# Al agregar gateo por capability a un componente de shell, los mocks de auth store de TODOS sus tests deben incluir `capabilities`

## What

Cuando un componente de shell (ej. `NavGroup`) se gatea por capability (`can(capability, ...)`), cualquier test existente que mockee el store de auth (`useAuthStore`) sin el campo `capabilities` hace que el selector reciba `undefined`, y una llamada como `.some(...)` sobre ese `undefined` revienta con un error real (no un fallo de assertion, un throw). Al introducir gateo por capability en un componente compartido, revisar y actualizar TODOS los mocks de auth store de sus tests para que incluyan `capabilities` (ej. `['*']` para un admin de prueba).

## Why

Un componente de shell (sidebar, nav) suele tener muchos tests que lo montan indirectamente; ninguno de ellos anticipa el nuevo campo si el mock de auth se escribio antes del gateo. El fallo resultante (10 tests reventados en Sidebar.test.tsx) es facil de mal-diagnosticar como "introducido por el cambio actual" cuando en realidad es preexistente al cambio de shell que agrego el gateo — confirmarlo con stash-test (falla igual en HEAD sin los cambios de la sesion actual) antes de asumir regresion propia.

## Where

- **Layers**: frontend (componentes de shell con gateo RBAC, sus test suites).
- Ejemplo origen: `NavGroup` (JOR-008 A4.5), `Sidebar.test.tsx` (JOR-014).

## When

- Al agregar gateo por capability (`can(...)`) a un componente compartido de shell.
- Al ver un test de shell fallar con un throw sobre `.some`/similar en un selector de auth: sospechar mock de auth store sin `capabilities`, no un bug del componente.

## Verification

- `grep` de `useAuthStore`/mocks de auth en los tests del componente de shell modificado; cada uno declara `capabilities` (o el shape completo esperado por el selector nuevo).
- Confirmar con stash-test si un fallo de shell es preexistente antes de clasificarlo como introducido.

## Source

- **Discovered in**: JOR-014, Session #1.
- **Evidence**: L1 (mock de `useAuthStore` sin `capabilities` -> `can(undefined,...)` revienta en `.some`; confirmado preexistente por stash-test; fix: mock retorna `capabilities: ['*']`).
