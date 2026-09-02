---
id: BUG-workflow-edit-boundary-duplicate-003
project: horadric
type: bug
module: workflow
status: fixed
severity: low
tags:
  - edit-tool
  - boundary
  - duplicate-section
  - llm-error-pattern
---

# Edit tool duplica seccion al usar `old_string` que no termina en boundary correcto

## Symptom

Al usar la tool `Edit` para reemplazar contenido, si el `old_string` no captura el separador entre la seccion editada y la siguiente, el resultado tiene la seccion siguiente **duplicada**. Ejemplo concreto: editar "## Backlog" sin incluir la linea en blanco previa a "## Sessions" → resultado tiene "## Sessions" dos veces seguidas.

## Expected behavior

El `Edit` deberia reemplazar `old_string` exacto por `new_string`, sin afectar contenido fuera del rango. Si el LLM intenta reemplazar el final de una seccion, el comportamiento esperado es que la siguiente seccion se mantenga UNA vez.

## Root cause

Patron de error del LLM al construir `old_string` y `new_string` para Edit:
- `old_string` captura desde linea X hasta el final de la seccion
- `new_string` incluye el header de la **siguiente** seccion (ej: `## Sessions`)
- Pero `old_string` NO incluye ese header
- Resultado: la siguiente seccion queda DUPLICADA (la nueva agregada + la original que no fue tocada)

- **File**: in-session (HOR-051 ticket — `## Sessions` doble detectado)
- **Cause**: error de construccion de `old_string`/`new_string` por el LLM. NO es bug de la tool — es bug del patron de uso

## Impact

| Dimension | Impact |
|-----------|--------|
| Users affected | LLM al editar tickets/specs con multiples secciones consecutivas |
| Data affected | Archivos markdown con secciones duplicadas, parser HC interpreta mal |
| Modules affected | workflow (ticket editing), viewer (HC render con secciones repetidas) |
| Frequency | Cuando el LLM edita seccion completa sin incluir boundary con siguiente seccion |

## Reproduction

### Environment
| Campo | Valor |
|-------|-------|
| Environment | dev — LLM session |
| Browser/Client | N/A |
| Data conditions | Ticket markdown con secciones `## A` y `## B` consecutivas, LLM intenta reemplazar fin de A |

### Steps
1. Ticket markdown contiene `## A\n\ncontenido A\n\n## B\n\ncontenido B`
2. LLM construye `Edit` con `old_string="contenido A"` y `new_string="contenido A modificado\n\n## B"` (error: incluye `## B` en new sin removerlo de old)
3. Resultado: `## A\n\ncontenido A modificado\n\n## B\n\n## B\n\ncontenido B` — duplicado

## Workaround

**Aplicado in-session**: detectar el duplicado via `grep -n "^## Sessions"` y aplicar Edit para colapsar la duplicacion.

**Patron preventivo para el LLM**: al editar **final** de una seccion, incluir SIEMPRE en `old_string` hasta el siguiente header (inclusive) para evitar la duplicacion. O bien, NO incluir el siguiente header en `new_string` y dejar que Edit solo reemplace lo que esta DENTRO de la seccion actual.

Heuristica robusta: si `new_string` contiene `## ` (header), el `old_string` tambien debe contener ese mismo `## ` (mismo header en la misma posicion relativa).

## Solution

**Inmediato**: post-Edit, verificar via `grep -c "^## {header_potencialmente_duplicado}"` que retorne `1`, no `2+`. Si detecta duplicado, edit correctivo.

**Sistemico** (HOR-055 Gap 7 + Gap 8): el audit script `dkc-audit-validators` puede agregar check "duplicate H2 headers in same artifact" — detecta drift post-hoc. Para prevencion in-the-loop, el validator `Ticket` y `Spec full` (HOR-055 Gap 1) pueden incluir check de "headers H2 unicos" como assertion.

**RULE candidata**: cuando el LLM edita finales de seccion en markdown con multiples H2 consecutivas, default a incluir el siguiente header en `old_string` como boundary delimiter explicit.

## Related

- **Rules**: (a crear) RULE-workflow-edit-boundary-pattern-* — patron preventivo para LLM al editar markdown
- **Decisions**: (ninguna)
- **Specs**: (ninguno directo — HOR-055 Gap 7 cubre detection post-hoc)
- **Tickets**: HOR-051 (lugar de descubrimiento), HOR-055 (Gap 7 audit incluye check de duplicados)
