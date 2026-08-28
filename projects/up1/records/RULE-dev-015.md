---
id: RULE-dev-015
project: up1
type: rule
module: dev
tags:
  - git
  - ls-tree
  - glob
  - discovery
  - dredd
---

# Para descubrir archivos por convencion en subdirectorios via git, usar `ls-tree -r --name-only | grep`, nunca `ls-tree '**/x'`

## What

Para buscar todos los archivos que matchean un patron (ej. `.ai/COMMANDMENTS.md`) en cualquier subdirectorio de un repo git, sin asumir en que nivel viven, usar:

```
git -C <clone> ls-tree -r --name-only <ref> | grep -E '(^|/)patron$'
```

Nunca un pathspec `**` directo contra `ls-tree` (ej. `git ls-tree '**/.ai/COMMANDMENTS.md'`): no funciona.

## Why

El magic `**` de git (cruzar cualquier cantidad de niveles de directorio) solo esta disponible con el pathspec magic `:(glob)`, y `ls-tree` **no soporta** ese magic. Un comando como `git ls-tree '**/.ai/COMMANDMENTS.md'` no lanza error: simplemente no matchea nunca, silenciosamente. En la skill Dredd, la Fase 2.55 (adherencia a mandamientos) usaba ese patron para descubrir `.ai/COMMANDMENTS.md` en la base del repo, y como nunca matcheaba, la fase concluia siempre "no hay archivo" y se auto-omitia sin que nadie lo notara hasta una revision puntual.

## Where

- `.claude/skills/dredd/SKILL.md:1114` (comando corregido: `git -C $CLONE ls-tree -r --name-only origin/$BASE | grep -E '(^|/)\.ai/COMMANDMENTS\.md$'`)
- Aplica a cualquier script o skill que descubra archivos por convencion de nombre en un repo git, no solo a Dredd.

## When

Al escribir cualquier comando de descubrimiento de archivos por patron/convencion sobre un repo git (comandos de skills, scripts de CI, hooks). Si el objetivo es "encontrar todos los `X.md` en cualquier subdirectorio", usar `ls-tree -r --name-only | grep`, no un pathspec `**` pasado directo a `ls-tree`.
