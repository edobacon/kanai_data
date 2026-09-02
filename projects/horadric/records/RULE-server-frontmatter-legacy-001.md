---
id: RULE-server-frontmatter-legacy-001
project: horadric
type: rule
module: server
level: must
tags:
  - frontmatter
  - legacy
  - defensive
  - types
  - consumer
  - compatibility
---

# Consumers del frontmatter de tickets deben declarar campos nuevos como opcionales y usar guard explicito al leerlos

## What

Cualquier codigo de horadric-cube que lea el frontmatter de un ticket (output de `parseFile(raw).frontmatter`) debe cumplir **tres invariantes**:

1. **Tipo opcional**: el tipo que describe el frontmatter — hoy `TicketFrontmatter` en [shared/types.ts](../../../../../horadric-cube/shared/types.ts) — marca como opcional (`?`) cualquier campo que pueda no existir en tickets legacy. Solo `id` es requerido. Esto aplica a los 5 campos introducidos con HOR-001/HOR-002 (`creates_visual`, `creates_data`, `draft_approved`, `draft_version`, `external`) Y a cualquier campo nuevo que se agregue en el futuro.

2. **Guard explicito al leer**: el acceso desde codigo NO puede asumir presencia. Los patrones aceptados son:
   - `fm.creates_visual === true` (boolean strict) → `undefined` se convierte en `false`
   - `fm.status ?? 'open'` (coalesce con default semantico)
   - `typeof fm.description === 'string' ? fm.description : ''` (chequeo de tipo)
   - `Array.isArray(fm.tags) ? fm.tags : []` (narrowing sobre arrays)

   No se aceptan:
   - `fm.creates_visual` usado como expresion booleana (truthy/falsy) — `{}` vacio es truthy, `null` es falsy
   - `fm.status.toUpperCase()` sin verificar string — crashea con `undefined`
   - Destructuring sin default: `const { creates_visual } = fm` seguido de uso directo

3. **Test de regresion obligatorio al agregar un campo nuevo**: si se introduce `fm.nuevo_campo` en cualquier lector, agregar en la misma PR un test con fixture legacy (ticket que NO tiene el campo) que demuestre que el consumer no rompe.

## Why

`RULE-index-001` establecio el precedente para `records.file_path`: el consumer normaliza en lugar de migrar los datos. Este patron debe extenderse al frontmatter porque los mismos proyectos legacy (up1, bayley) tambien carecen de campos nuevos introducidos despues.

Observado en HOR-003 task #2: el flow inference [funcionaba por accidente](../../../../../horadric-cube/server/deckard/flowInference.ts) — `fm.creates_visual === true` convierte `undefined` en `false`, saltando el gate del draft para tickets legacy. Sin tests que lo documenten como contrato, un refactor futuro (ej: reemplazar `=== true` por `!!` o cambiar el default) romperia silenciosamente a bayley y up1.

Ademas, el codigo actual tiene **tres patrones defensivos distintos** para el mismo proposito:
- `=== true` en flowInference.ts:22-23
- `?? null` en tickets.ts:97-98
- `typeof === 'string'` en workflow.ts:31-32

La inconsistencia no rompe hoy pero dificulta el mantenimiento. Esta regla la acepta (son todos validos) pero exige eleccion consciente.

## Where

- **Files (tipado)**: `horadric-cube/shared/types.ts` — interface `TicketFrontmatter` con campos opcionales
- **Files (consumers)**:
  - `horadric-cube/server/deckard/flowInference.ts` — lectura de flags de draft
  - `horadric-cube/server/routes/tickets.ts` — summary de ticket para listing
  - `horadric-cube/server/deckard/workflow.ts` — description/produces de nodos
  - `horadric-cube/server/deckard/frontmatter.ts` — parser base (ya tolera por disenio)
- **Layers**: backend (consumers del markdown parseado) y shared/types (contrato cross-layer).

## When

Aplica en dos momentos:

1. **Al escribir codigo que lee frontmatter de ticket**: siempre — nunca asumir presencia.
2. **Al agregar un campo nuevo al template `templates/records/ticket.md` de deckard**: actualizar `TicketFrontmatter` como opcional, elegir patron defensivo consciente en consumers, agregar test de regresion con fixture legacy.

## Verification

Automatizable:

```bash
# 1. Grep: todo acceso a fm.{creates_visual|creates_data|draft_approved|draft_version|external}
# debe usar uno de los guards aceptados
grep -rn "fm\.\(creates_visual\|creates_data\|draft_approved\|draft_version\|external\)" \
  /Users/edobacon/Workspace/horadric-cube/server/ \
  /Users/edobacon/Workspace/horadric-cube/shared/

# 2. Type check explicito
cd /Users/edobacon/Workspace/horadric-cube && npx tsc --noEmit

# 3. Tests de regresion con fixtures legacy
cd /Users/edobacon/Workspace/horadric-cube && npm test -- flowInference tickets
```

Manual:

- Abrir `http://localhost:3016/tickets/bayley/BLY-002` y verificar que flow render no muestra errores ni nodos vacios.
- Abrir `http://localhost:3016/tickets/up1/TICKET-001` y verificar que ID legacy funciona.

## Source

- **Discovered in**: HOR-003, Session #3 (execute task #2 y #3).
- **Evidence**: snapshot baseline task #1 muestra `design-draft.status === "skip"` para BLY-002 legacy y `done` para HOR-001 moderno — confirmando que el patron `=== true` ya ejerce tolerancia, pero sin tests la garantia es accidental. Tests nuevos en `flowInference.test.ts` y `tickets.test.ts` (HOR-003) formalizan el contrato.
- **Related**:
  - `RULE-index-001` (module=index) — precedente directo: normalizacion en consumer, no migracion de .md.
  - Backlog HOR-003 L2 — candidato a ticket separado para unificar los 3 patrones defensivos.
