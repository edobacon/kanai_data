---
id: DOC-kb-general-README
project: tao-v2
type: doc
tags:
  - general
  - indice
  - tao-v2
---

# General: archivos generales del proyecto Tao v2

Esta carpeta reúne los archivos generales del proyecto Tao v2 (`tao-v2`, tickets `TV2-`): lo que aplica a todo el proyecto y no a un ticket, una épica o un sprint concreto.

## Qué va aquí
- Visión, alcance y enfoque de la v2.
- Decisiones transversales de arquitectura y de proceso.
- Glosario y convenciones del proyecto.
- Mapa de lo heredado de la v1 y de lo que cambia.
- Referencias estables: repos, ambientes, personas y enlaces.

## Qué no va aquí
- Análisis o detalle de un ticket: va en la carpeta de su épica o sprint.
- Documentos que el código lee como fuente (catálogos, contrato): viven en el repo, en `docs/`.

## Contexto de origen
- `tao-v2` se duplicó el 2026-10-12 desde `main` de `taomangalam` (commit `1e828ca`), con el historial completo.
- `taomangalam` sigue vivo como respaldo de consulta, no se congeló. Sus tickets cerrados se leen en vivo con `projectId=taomangalam` y están indexados en `historico-v1/tickets-cerrados-taomangalam.md`.
- Los planes de la v1 quedaron archivados en `docs/archivo-v1/` del repo.
- Los chequeos de calidad corren solo en local (GitHub Actions está desactivado en `tao-v2`).
