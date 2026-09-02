---
id: RULE-codex-sandbox-enforcement-006
project: horadric
type: rule
module: codex
level: must
tags:
  - codex
  - sandbox
  - delegation
  - enforcement
  - roles
  - containment
---

# El sandbox del host destino es el enforcement de un rol delegado; el scope por archivo lo verifica el parent

## What

Al delegar un rol, las restricciones las impone el **sandbox del sistema operativo**, no el prompt:

- `read-only`: lee todo el disco (los `kb_refs` de DET-34 de otro repo viajan sin problema) y **cualquier** escritura se rechaza.
- `workspace-write`: escribe dentro del workspace declarado con `-C`, y escribir afuera devuelve `operation not permitted`.

Lo que el sandbox **no** puede garantizar es "solo estos archivos". Eso lo verifica el parent comparando **hashes de contenido** antes y despues, con dos precisiones que costaron un hallazgo cada una:

1. El snapshot incluye lo que git ignora (`--ignored=matching`). Sin eso, modificar un archivo gitignoreado no se detecta.
2. Compara **hashes**, no lineas de `git status`. Un archivo que ya estaba sucio y se modifica **de nuevo** no cambia su linea de porcelain.

Y si el workspace **no es un repo git**, la delegacion de un rol que escribe se **rechaza**: un check que se autodesactiva en silencio reporta verde sin haber mirado nada, que es peor que no tenerlo.

Limite declarado: un cambio dentro de un **directorio** ignorado no se puede hashear. El comando lo dice en la corrida (`NOTA: N entrada(s) son directorios...`) en vez de reportar verde.

## Why

En el host local las restricciones de `reviewer`/`tester` se sostienen con prompt-guard sobre `general-purpose` (`prompts/agent-tiers.md`, columna "Restrictions enforcement"), y `developer`/`scribe` quedan inline **porque ese guard no alcanza para un rol que escribe**. Delegando, esa limitacion desaparece: el SO no negocia.

Eso mueve la linea de que se puede delegar, y por eso `developer` paso a ser delegable en HOR-130 S7 con scope declarado. Pero la contencion por archivo sigue siendo responsabilidad del parent: **pedirle al modelo que no toque algo es una intencion, verificarlo es un hecho**. En la prueba adversarial el delegado obedecio; el detector se probo aparte, con fixtures, justamente porque su obediencia no es garantia.

## Where

- `commands/dkc-delegate` (funcion `snapshot_tree` y el bloque de verificacion de scope)
- `prompts/agents/contracts.yaml` (`sandbox` y `requires: [files_scope]` por rol)
- `prompts/agent-tiers.md`, seccion "Con backend externo el criterio cambia"

## When

Al delegar cualquier rol, y siempre al delegar uno que escribe.

## Verificacion

```bash
./commands/dkc-delegate --role developer --ticket <ID> --files "a.ts" --cwd <repo> --dry-run
codex sandbox macos -c 'sandbox_mode="workspace-write"' -- /bin/sh -c 'touch /fuera/del/workspace'
```
