---
id: RULE-dev-003
project: up1
type: rule
module: dev
tags:
  - dkc
  - hc-viewer
  - parser
  - workaround
  - platform-bug
---

# Indentar comments `#` en fenced code blocks de tickets DKC (workaround HC parser body.ts)

## What

Cualquier fenced code block (` ```bash `, ` ```sh `, ` ```shell `, ` ```python `, ` ```ruby `, ` ```yaml `, ` ```dockerfile `, ` ```makefile `, etc.) dentro de tickets DKC markdown que contenga comentarios estilo `# texto` en columna 0 SHOULD indentar esos comentarios con 2 espacios para evitar mal-interpretacion del parser HC viewer.

### Patron preventivo

**Anti-patron** (rompe HC parser):

```markdown
\`\`\`bash
# Pre-experimento: object-manager en branch local
cd up1/object-manager
git status
# Otro comentario en columna 0
npm run sync
\`\`\`
```

**Patron correcto** (indent 2 espacios):

```markdown
\`\`\`bash
  # Pre-experimento: object-manager en branch local
  cd up1/object-manager
  git status
  # Otro comentario en columna 0
  npm run sync
\`\`\`
```

Sintaxis alternativas (si la indentacion es engorrosa):
- `: # comment` — operador `:` no-op de bash, despues `#` queda como comment valido. La linea ya no empieza con `#` directo.
- `// comment` para lenguajes que lo soporten (no bash).
- Eliminar el comentario y reemplazar con prosa fuera del code block.

## Why

Caso TICKET-019 HU4 S14 → S15 (2026-05-15): mi `<details>` colapsado de S14 contenia un bloque ` ```bash ` con 9 comments shell estilo `# Pre-experimento:`, `# Estado verificado:`, `# Resultado verificado:` en columna 0. HC parser `horadric-cube/server/deckard/body.ts` linea 24 usa regex `/^(#{1,6})\s+(.+?)\s*$/` para extraer headings markdown — **NO trackea fenced code blocks**. Cada comment bash fue interpretado como H1 markdown heading. Al encontrar el primer `# Pre-experimento`, el parser hizo pop del stack hasta level >= 1 (cerrando `## Sessions`), creando un H1 falso en root. Resultado: `### Session 15` (linea 868) quedo como sub-seccion de ese H1 falso, FUERA de `## Sessions`. HC marco S15 como `projected` (planificada, no ejecutada) pese a tener gate decision `continue → S16` registrada.

Bug platform en `horadric-cube/server/deckard/body.ts:extractSections`:

- Regex `/^(#{1,6})\s+(.+?)\s*$/` matchea cualquier linea con 1-6 hashes + espacio + texto.
- Ancla `^` requiere que el hash este al inicio de linea (columna 0).
- Indentacion (whitespace previo al hash) rompe el match → no se interpreta como heading.

## Where

- Tickets DKC en cualquier proyecto que use HC viewer (`projects/{proyecto}/tickets/*.md`).
- Aplica a TODOS los lenguajes con `#` como caracter de comentario: bash, sh, zsh, shell, python, ruby, perl, yaml, dockerfile, makefile, ini, conf, toml (parcial), Rscript, php (con `#`).
- NO aplica a code blocks con sintaxis diferente: js, ts, java, c, cpp, go, rust, swift (todos usan `//` o `/* */`).

## When

- **Siempre** al escribir/editar code blocks con `#` comments en tickets DKC.
- **Especialmente** al colapsar bloques bajo `<details>` (HC sigue parseando contenido dentro de details).
- **Validacion preventiva** antes de cerrar session/ticket: `grep -E "^# " tickets/ticket-{N}.md` despues de extraer el contenido entre ` ``` ` y ` ``` ` — si hay matches, indentar.

## Validation

```bash
# Identifica code blocks con comments # en columna 0
awk '
  /^```/ { in_block = !in_block; next }
  in_block && /^#/ { print FILENAME ":" NR ": " $0 }
' projects/up1/tickets/ticket-*.md
```

Si el output muestra lineas con `#`, indentar 2 espacios. Si el output esta vacio, OK.

### Validacion empirica con parser HC

```bash
# Reproduce extractSections + parseSessionsSection del backend HC
node --experimental-strip-types /tmp/hc-parse-ticket.mjs tickets/ticket-{N}.md

# Espera: sessions count en parser == count `### Session N` en grep del markdown
grep -c "^### Session [0-9]" tickets/ticket-{N}.md
```

Si los counts NO coinciden, hay un comment `#` mal ubicado dentro de un code block.

## Related

- TICKET-019 HU4 S15 (caso ejemplar) — L19 documenta el caso completo.
- Memory entry `~/.claude/.../memory/feedback_hc_fenced_code.md`.
- RULE-dev-002 (formato canonico de session) — pueden activarse juntos para que HC vea sessions cerradas correctamente.
- Bug platform en `horadric-cube/server/deckard/body.ts:24` — `extractSections` no trackea fenced code blocks.

## Promote considerations

**Workaround temporal hasta que se arregle el bug platform en horadric-cube.** Promoverlo a `must` si el bug no se arregla en N sprints o si nuevos tickets DKC siguen rompiendose. Spawn task creada para fix permanente:

- Archivo: `horadric-cube/server/deckard/body.ts:8` (funcion `extractSections`)
- Fix sugerido: trackear estado `isInsideCodeFence: boolean` que toggle al encontrar lineas con regex ` ``` ` o `~~~`. Mientras `isInsideCodeFence === true`, saltar match de heading (linea 24).
- Tests: agregar caso en `body.test.ts` con un fenced code block con comments `# ...` adentro + verificar que extractSections NO los extrae como headings.

Cuando el bug se arregle, esta rule puede archivarse o downgradearse a `may` (defensiva).
