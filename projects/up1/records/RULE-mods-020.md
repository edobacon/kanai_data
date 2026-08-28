---
id: RULE-mods-020
project: up1
type: rule
module: mods
tags:
  - app-config
  - menu
  - ux
---

# `defaultObjects` en `app.json` debe contener solo objetos raiz que el usuario navega

## What

La logica del menu de objetos ([useObjectManager.ts:75-91](../../../up1/suite/composables/useObjectManager.ts#L75)) muestra para cada app: (a) layouts con `applicationId === appId` (explicitos) + (b) layouts con `applicationId === null && layoutType === RecordList && (objectName en defaultObjects O RT cuyo base esta en defaultObjects lowercased)` (defaults). Mantener `defaultObjects` minimo — solo objetos raiz que el usuario debe ver en el menu lateral.

## Why

Si se incluyen objetos auxiliares (FKs, relations, RT extensions), el menu se llena con items que el usuario no debe poder navegar. Para que un layout NO aparezca: `applicationId: null` + objeto NO en `defaultObjects`.

## Where

`mods/<m>/config/apps/<app>.json` — array `defaultObjects`.

## When

Al declarar/modificar un app. Validar que cada entry corresponde a un objeto que el usuario abre directamente desde el menu.

## Source

- [TICKET-009](../../tickets/ticket-009.md) L21 — Session 1 (2026-04-29)
