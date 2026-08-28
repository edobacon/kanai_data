---
id: RULE-dev-005
project: up1
type: rule
module: dev
tags:
  - specs
  - storage
  - dkc
  - workflow
  - versioning
  - symlink
---

# Los specs que crea DKC viven DENTRO del repo deckard (tracked); el symlink externo es solo-lectura

## What

Todo spec **creado por el flujo DKC** (cualquier `design-{tipo}` que produce `SPEC-{id}` ligado a un ticket) DEBE vivir como **archivo real versionado dentro del repo deckard**, bajo `projects/{project}/specs/` (con sus subdirectorios por modulo: `core/`, `curriculum-design/`, `features/`, `_archive/`, etc.).

NO se permite que `projects/{project}/specs/` sea un **symlink** a una ubicacion fuera del repo git de deckard. Si existe material de referencia externo (docs importados de Confluence, PDFs, snapshots de modelado, recetas de terceros), va en un symlink **separado y explicitamente read-only**: `projects/{project}/specs-external/` → ubicacion externa. Ese contenido NO es spec DKC: es info externa de consulta, no se edita desde DKC y no se indexa como spec del proyecto.

Discriminador operativo: un spec es **DKC-created** si su frontmatter tiene `ticket:` poblado (`TICKET-{id}` o id externo). Esos migran/viven dentro de deckard. Los `SPEC-*` sin `ticket:` que provienen de imports externos (confluence, pdf, data dumps) son info externa read-only.

## Why

Si `projects/{project}/specs/` es un symlink a una carpeta fuera del repo deckard (caso real up1 pre-2026-06-01: `specs → /Users/edobacon/Workspace/uplanner/specs/up1`, que no era repo git), los specs que DKC produce **no quedan versionados**: `git status`/`git add` en deckard no los ve (git no sigue symlinks hacia un no-repo), y la unica copia vive en una zona scratch sin historial. Un `design-feature` "exitoso" deja el spec fuera de control de versiones — se pierde la trazabilidad que el resto del flujo DKC asume (commits DET-27 incluyen "records DKC" pero el spec no estaba entre ellos).

El spec es **fuente de verdad del trabajo**: requirements, tasks, decisiones. Debe versionarse junto al resto de records DKC (tickets, learns, rules) para que el grafo sea reconstruible y auditable. La info externa de referencia (Confluence, PDFs) tiene otra naturaleza —  read-only, upstream, no editable desde DKC — y por eso vive aparte, sin contaminar el almacen de specs ni el index.

## Where

- **Specs DKC** (con `ticket:`): `deckard/projects/{project}/specs/{modulo}/SPEC-{id}.md` — archivo real, tracked.
- **Info externa read-only**: `deckard/projects/{project}/specs-external/` → symlink a la ubicacion upstream (ej. `/Users/edobacon/Workspace/uplanner/specs/up1`). Solo lectura.
- **Anti-patron**: `projects/{project}/specs` como symlink (lo que rompe el versionado).

## When

- **Aplica** a todo `design-{tipo}` que produce un spec ligado a un ticket DKC, en cualquier proyecto.
- **Aplica** al inicializar un proyecto nuevo (`dkc-init`): `specs/` se crea como directorio real, nunca symlink.
- **Migracion** (caso up1, TICKET-036): los specs DKC con `ticket:` que vivian en el symlink se copiaron al dir real `projects/up1/specs/`; el resto (info externa) quedo accesible via `projects/up1/specs-external/` read-only.

## Interaccion con DETs

- **DET-27** (commits al cierre de session): el spec ahora SI entra en el commit de "records DKC" del repo deckard. Antes (symlink) quedaba silenciosamente fuera.
- **DET-11** (KB-first): el index de DKC (reindex) solo indexa specs reales bajo `specs/`; la info externa de `specs-external/` no se indexa como spec del proyecto (es consulta manual).
- **DET-13** (cierre con evidencia): el spec versionado es parte de la evidencia del cierre; sin versionar, la evidencia era incompleta.

## Enforcement

La respeta el LLM al ejecutar `design-{tipo}` (crear el spec bajo el dir real) y `dkc-init` (crear `specs/` real). Para enforcement duro se puede agregar un check en `dkc-reindex`/`dkc-validate` que falle si `projects/{project}/specs` es un symlink. Hoy es convencion respetada + esta migracion correctiva.
