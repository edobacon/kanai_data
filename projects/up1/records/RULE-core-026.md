---
id: RULE-core-026
project: up1
type: rule
module: core
tags:
  - testing
  - cross-ticket
  - cross-mod
  - contract-test
  - pipeline
  - events
  - scope
  - core
---

# Testing cross-ticket/cross-mod: nombrar HU pendiente en tests anticipatorios y usar contract tests en la juntura

## What

Un test que deja un contrato pendiente (por depender de una HU que aún no existe) debe nombrar explícitamente qué HU lo completará. La HU siguiente debe buscar ese test y actualizarlo antes de cerrar su S1. Los pipelines cross-mod (ej. object-manager emite evento → n8n → mod persiste) se testean por `execute_scope`: cada repo cubre su mitad y un **contract test** cierra la juntura (ej. verificar que `input.data._versionSourceId` llega al otro extremo). No se re-testea el módulo vecino (DET-10: developer no expande alcance).

## Why

Sin nombrar la HU pendiente, el test anticipatorio queda huérfano y la HU siguiente lo ignora, dejando el contrato indefinidamente incumplido. Re-testear la persistencia del módulo vecino viola DET-10 y amplía el scope innecesariamente — el contract test en la juntura es suficiente y auditado.

## Where

- `object-manager/tests/unit/resolvers/instance.resolver.test.js` — TC-13b (037/L1): actualizado cuando 037 completó la HU que 033 anticipaba
- `object-manager/tests/unit/resolvers/created-via.test.js` — contract test de HU-6 (S2.T1) que verifica `input.data._versionSourceId` sin re-testear `auditCapture.resolver.js`
- `mods/curriculum-design/logic/auditCapture.resolver.js` — testeado por HU-9 (TICKET-035), no por HU-6 (fuera de su `execute_scope`)

## When

Al escribir un test que depende de una HU futura (marcarlo con comentario `// TODO: <HU-X> completar`). Al abrir la HU que completa ese contrato, buscar los tests anticipatorios como primera tarea de S1. Al implementar pipelines event-driven cross-mod.

## Verification

1. Grep `// TODO:` y `// PENDING:` en los tests del modulo para hallar contratos pendientes y verificar que la HU fue completada o sigue en backlog. 2. Verificar que el contract test de juntura existe y cubre el campo cruzado. 3. Confirmar que los tests del módulo vecino no están duplicados en el execute_scope del ticket.

## Source

- **Discovered in**: TICKET-037, TICKET-041
