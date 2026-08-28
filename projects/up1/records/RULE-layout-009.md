---
id: RULE-layout-009
project: up1
type: rule
module: layout
tags:
  - rbac
  - roles
  - layout
  - pattern
---

# Roles array en app.json y layout.json filtra server-side

## What

El campo 'roles' en app.json y layout.json define que roles pueden ver esa app/layout. Es filtrado server-side — distinto de requiredCapability (client-side row actions) y withAuth (resolver-level).

## Why

Tres mecanismos de control de acceso complementarios. 'roles' controla visibilidad de apps/layouts completos. Confundirlo con requiredCapability o withAuth deja funcionalidad expuesta o innecesariamente restringida.

## Where

mods/*/config/apps/, mods/*/config/layouts/

## When

Al definir que roles ven una app o layout.

## Verification

Verificar que roles[] en app.json/layout.json contiene los roles correctos. No confundir con requiredCapability en row actions.

## Source

- **Discovered in**: —
