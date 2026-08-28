---
id: DECISION-023
project: up1
type: decision
module: mods
tags:
  - curriculum-mapping
  - workaround
  - float
  - metadata
  - bug-platform-022
---

# DECISION-023: Modelo "string-everywhere" en curriculum-mapping para pesos/umbrales

## Contexto

El dominio `LevelScheme` (curriculum-mapping, UPONE-1454) necesita campos decimales: `weight`, `minThreshold`, `maxThreshold`, `scaleMin`, `scaleMax`. Ninguno de los `fieldType` semánticos disponibles en el platform mapea limpio a un campo decimal en ambas capas (JSON Schema type de `core_FieldDefinition` + columna Prisma): `fieldType:"float"` registra `type:"string"` en la metadata (aunque la columna Prisma sí es `Float`), y `fieldType:"number"` registra metadata correcta pero genera columna Prisma `Int`, truncando decimales. Ver [[BUG-platform-022]].

## Decisión

curriculum-mapping declara `weight`, `minThreshold`, `maxThreshold`, `scaleMin`, `scaleMax` como `string` en el objeto JSON, y parsea/formatea los valores decimales en la capa de aplicación (frontend + resolvers del mod), evitando ambos mapeos rotos del platform.

## Alternativas descartadas

- **Usar `fieldType:"float"` y aceptar la metadata incorrecta**: descartada porque cualquier consumidor que confíe en `core_FieldDefinition.type` (ej. validación genérica, UI dinámica basada en tipo) trataría el campo como texto libre, perdiendo validación numérica automática.
- **Usar `fieldType:"number"` y aceptar el truncamiento**: descartada de plano, pérdida de datos (decimales) es inaceptable para umbrales/pesos académicos.
- **Esperar el fix de plataforma antes de lanzar el mod**: descartada por presión de timeline del mod (creado 2026-07-21, ventana corta); el workaround permite avanzar sin bloquear en un fix de `object-manager` fuera del scope del mod.

## Impacto / reversibilidad

Confinado al mod `curriculum-mapping`: los campos son `string` en BD y requieren parseo explícito en cada punto de consumo (frontend, validaciones, reportes). Riesgo de bugs de formato/locale si el parseo no es consistente. Reversibilidad: alta una vez resuelto [[BUG-platform-022]]. Migrar de `string` a un `fieldType` decimal correcto es un cambio de tipo de columna con backfill, no arquitectónico.
