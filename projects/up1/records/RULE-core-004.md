---
id: RULE-core-004
project: up1
type: rule
module: core
tags:
  - rbac
  - security
  - pattern
---

# RBAC en tres capas — capabilities, withAuth, requiredCapability

## What

El sistema de permisos opera en 3 capas complementarias: 1) Definir capabilities en capabilities.json, 2) Proteger resolvers con withAuth([caps], resolver) o withObjectAuth, 3) Gate row actions con requiredCapability en layouts JSON.

## Why

Una sola capa no es suficiente. Sin capabilities.json el permiso no existe. Sin withAuth el resolver es publico. Sin requiredCapability el boton aparece a todos.

## Where

mods/*/capabilities.json, mods/*/logic/*.resolver.js, mods/*/config/layouts/

## When

Al crear funcionalidad que requiere control de acceso.

## Verification

Para cada feature protegida: verificar que existe capability + withAuth en resolver + requiredCapability en row action (si aplica).

## Source

- **Discovered in**: —
