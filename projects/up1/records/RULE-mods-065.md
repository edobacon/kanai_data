---
id: RULE-mods-065
project: up1
type: rule
module: mods
tags:
  - security
  - sql-injection
  - ai-agent
  - raw-sql
---

# ai-agent: antes de interpolar `objectType` en raw SQL, validar que sea un objeto queryable (excluir tablas core_*)

## What

En el fallback accent-insensitive de búsqueda de instancias, antes de interpolar `objectType` en una query SQL cruda, MUST validarse que el valor sea un objeto real y queryable del tenant (no una tabla de sistema `core_*`). Un regex de caracteres permitidos (`^[a-zA-Z_]+$`) no es suficiente: bloquea inyección de sintaxis pero sigue admitiendo identificadores válidos de tablas internas.

## Why

`tryAccentInsensitiveFallback` validaba `objectType` solo por regex de caracteres antes de UPONE-1426. Eso bloqueaba la inyección de SQL pero seguía dejando pasar nombres de tablas de sistema (ej. `core_Capability`) porque son identificadores válidos según el regex. El fix agrega `fetchQueryableObjectNames(context)` (consulta Prisma la lista completa de objetos no-core del tenant) y rechaza el fallback si `objectType` no está en esa lista, con log de warning.

## Where

- `mods/ai-agent/logic/tools/listInstancesTool.js:140-144` (gate `queryableObjects.includes(objectType)`)
- Exporta `fetchQueryableObjectNames()` y `tryAccentInsensitiveFallback()` (antes privada) - ver `tests/unit/tools/listInstancesTool.test.js`.

## When

Al escribir o modificar cualquier fallback o ruta que interpole un nombre de objeto/tabla en raw SQL dentro de `ai-agent` (o cualquier mod que use raw SQL sobre objectType dinámico): el regex de caracteres es necesario pero no suficiente, exigir también el gate contra la lista real de objetos queryable.
