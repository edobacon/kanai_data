---
id: RULE-core-007
project: up1
type: rule
module: core
tags:
  - events
  - bullmq
  - async
  - pattern
---

# Eventos via BullMQ — mutations triggean, workers procesan

## What

El sistema de eventos usa BullMQ + Redis. GraphQL mutations publican eventos a colas. Workers (docker compose --profile worker) procesan los eventos y disparan n8n workflows o handlers custom.

## Why

Procesamiento asincrono desacopla la respuesta HTTP del trabajo pesado. Sin el worker corriendo, los eventos se encolan pero no se procesan.

## Where

mods/*/events/, object-manager/src/events/

## When

Al crear funcionalidad que requiere procesamiento asincrono, notificaciones, o integracion con n8n.

## Verification

Verificar que el worker esta corriendo (npm run worker:start). Verificar que el evento tiene JSON config en events/ y el handler esta registrado.

## Source

- **Discovered in**: —
