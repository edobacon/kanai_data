---
id: DOC-kb-sp5-prespecs-MC-04
project: up1
type: doc
---

# Pre-spec MC-04 — Registro del mod + cobertura MCP de los objetos

> Borrador de spec + intake para **MC-04** (agrupa A5 + F1). Referencia en `sp5/`, no record DKC.
> **Épica:** A + F · **Tier:** 🅼 Must · **SP:** 5 · **Repos:** `up1/mods/curriculum-design` (registro) + `uplanner/mcp` (contratos)

---

## 1. Intake
- **KB:** mod-only para el registro; el MCP es repo separado (política §1.7: lo desarrollado va al MCP en el mismo SP). MCP-ready = enums + FK `references` + labels (los entrega MC-02/03).
- **Necesidad/reuso (DET-32):**
  - Registro del mod → **build** (capabilities/layouts/lang de los 3 objetos).
  - Contratos MCP → **reduce/reuse**: declarativos (~40 líneas/objeto), patrón de los 11 `ObjectContract` existentes; FK polimórfica vía `resolveReference` (precedente `Curriculum`, `curriculum-write.ts`).
  - `cd_*` de dominio → **drop en SP5** (opcional → F2/SP6; las tools genéricas ya cubren CRUD).
- **Supuestos:** la malla en la UI consume **GraphQL nativo del mod** (no requiere MCP); el MCP es la vía conversacional/programática.

## 2. Requisitos (REQ)

### REQ-01 · Registro en config del mod
**Certeza:** `confirmed` · **source_ref:** handoff MC-OBJ-5

**DEBE** actualizar `capabilities.json` (CRUD de los 3 objetos + guard de borrado de categoría), layouts (RecordList/RecordDetail) y `lang/es_CL` completos.

### REQ-02 · Objetos consumibles por el componente (smoke)
**Certeza:** `confirmed` · **source_ref:** handoff MC-OBJ-5

Los 3 objetos **DEBEN** ser visibles en object-manager y consumibles por el componente de malla vía **GraphQL del mod** (verificado con smoke real, no solo build).

### REQ-03 · Allowlist + `ObjectContract` en el MCP
> **Qué cambia:** los 3 objetos quedan operables vía el MCP. **Por qué:** política §1.7 — lo desarrollado va al MCP en el mismo SP.

**Certeza:** `confirmed` · **source_ref:** política §1.7 + auditoría (cómo opera el MCP)

`planEntry`, `requirementCategory`, `requirement` **DEBEN** agregarse al allowlist (`src/mods/index.ts`) y tener su `ObjectContract` (`src/contracts/registry.ts`): `fieldDocs`, `enums`, FK con `references`, validaciones espejo (minCredits≤maxCredits, label requerido, period requerido, guard de borrado).

### REQ-04 · `describe_object`/`get_create_guide` auto-derivan
**Certeza:** `confirmed` · **source_ref:** auditoría (guide.ts auto-deriva del contrato)

Con el contrato, `describe_object` y `get_create_guide` **DEBEN** describir cada objeto (enums + FKs) sin recetas a mano; `create_object`/`query_records` operan con validaciones espejo.

### REQ-05 · Resolución de FK (incl. polimórfica)
**Certeza:** `confirmed` · **source_ref:** patrón `Curriculum` (`curriculum-write.ts`, `resolveReference`)

Las FK (planId, activityId, categoryId, blockId, y el `ownerId` polimórfico de `requirement`) **DEBEN** resolverse por nombre/código vía `resolveReference` (ownerId condicional a `ownerType`).

## 3. Tasks (con rollback)
| # | Task | Repo | Rollback |
|---|---|---|---|
| T1 | capabilities + layouts + lang de los 3 objetos (REQ-01) | mod | revertir entradas |
| T2 | Smoke E2E: objetos en object-manager + consumibles vía GraphQL (REQ-02) | mod | — |
| T3 | `ObjectContract` de los 3 objetos en `registry.ts` (REQ-03,04,05) | MCP | quitar contratos |
| T4 | Allowlist en `src/mods/index.ts` (REQ-03) | MCP | quitar del allowlist |
| T5 | Tests de contrato (validaciones, resolución FK) | MCP | — |

## 4. Test cases
| TC | REQ | Caso | Esperado |
|---|---|---|---|
| TC-01 | REQ-02 | crear `planEntry` vía GraphQL del mod | creado; visible en object-manager |
| TC-02 | REQ-04 | `describe_object("requirement")` | devuelve enums (recordType, effect…) + FKs |
| TC-03 | REQ-04 | `create_object("requirementCategory")` con min>max | rechazado (validación espejo) |
| TC-04 | REQ-05 | crear `requirement` con `ownerType=activity`, `ownerId="EST200"` (nombre) | resuelve al id real de la Activity |
| TC-05 | REQ-03 | `create_object` sobre objeto NO en allowlist | rechazado (no expuesto) |

## 5. Dependencias
- **Depende de:** MC-02 + MC-03 (objetos existentes y MCP-ready).
- **Cierra:** la Épica A (objetos operables UI + MCP). F2 (`cd_*` ergonómicos) → opcional/SP6.
