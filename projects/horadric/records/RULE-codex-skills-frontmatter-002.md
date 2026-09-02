---
id: RULE-codex-skills-frontmatter-002
project: horadric
type: rule
module: codex
level: must
tags:
  - codex
  - skills
  - frontmatter
  - yaml
  - silent-failure
  - host-integration
---

# Skills de Codex: description SIEMPRE entre comillas, o la skill se descarta en silencio

## What

Al escribir una skill de Codex (`.agents/skills/{name}/SKILL.md`):

- **La `description` va entre comillas.** Un `: ` sin comillas hace que YAML lo lea como mapping anidado, el frontmatter no parsea y **Codex descarta la skill sin emitir ningun warning**.
- **Verificar siempre que la skill se inyecta**, no asumirlo:
  ```bash
  codex debug prompt-input "x" | grep -oE "\- {nombre}: .{0,60}"
  ```
- Rutas de discovery repo-local validas: **`.agents/skills/{name}/SKILL.md`** y `.codex/skills/{name}/SKILL.md`. Un `skills/` pelado se ignora.
- La inyeccion es **progressive disclosure**: solo `name`, `description` y el path absoluto entran al prompt. El cuerpo se abre on-demand, asi que la `description` es lo unico que decide si la skill se usa.

Delimitado empiricamente en HOR-129 S3.T1 con 8 probes: description de hasta 600 caracteres pasa, el bloque `metadata` pasa, `: ` sin comillas rompe, `: ` entre comillas pasa.

## Why

Es el modo de falla mas caro del pack: escribis la skill, la commiteas, y nunca se ejecuta. No hay error en el arranque, no aparece en el listado, y el sintoma que ves es que el modelo "no usa la skill", que se confunde facil con una description mal escrita o con el modelo ignorandola.

Precedente de la misma causa raiz en otro consumidor: `BUG-workflow-yaml-mapping-colon-002` (HOR-051), donde un `:` sin quotes en frontmatter rompio el parser de records de DKC. Mismo error, dos sistemas distintos, dos años de distancia.

## Where

- `.agents/skills/*/SKILL.md` de cualquier repo
- `docs/codex-pack.md`, seccion de troubleshooting

## When

Al crear o editar cualquier skill, y al diagnosticar una skill que "el modelo no usa".
