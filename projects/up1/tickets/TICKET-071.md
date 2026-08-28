---
id: TICKET-071
project: up1
type: ticket
status: closed
work_type: tactic
external: UPONE-1260
module: curriculum-design
autopilot: manual
---

# Retirar el campo `externalId` de Curriculum (Plan) y AcademicProgram

## Request

Plan de estudios (`Curriculum`) y `AcademicProgram` tienen un campo `externalId` (ID en sistema externo SIS/ERP) que no es necesario. Retirarlo de los objetos y de los layouts, y eliminar el dato del seed si estuviera. Ejecutar como tactic, referenciando un ticket SP4 existente (UPONE-1260) para el commit.

## KB consulted

> DET-11 — lookup antes de tocar codigo.

- **Rules**: [RULE-dev-004](../rules/dev/rule-dev-004.md) — este trabajo es `layer: mod` (solo `mods/curriculum-design/`); no toca core, no usa rama de épica core. n/a normativo sobre `externalId`. No hay RULE que exija el campo.
- **Bugs**: n/a — ningún bug abierto referencia `externalId` de estos objetos.
- **Specs**: [SPEC-021](../specs/curriculum-design/SPEC-021-academic-program-object.md) y [SPEC-024](../specs/curriculum-design/SPEC-024-curriculum-plan-minor-object.md) documentan la definición de estos objetos **incluyendo** `externalId`. Quedan levemente stale al retirar el campo → ver Discoveries (propagación DET-16, follow-up doc).

## Discoveries / decisions

- D1: La DB del tenant UPU tiene **0 filas** con `externalId` no-null en Curriculum (6 filas) y AcademicProgram (5 filas) → el drop de columna es **cero data-loss**. Verificado vía GraphQL `listInstances` (2026-06-17).
- D2: El seed **no setea** `externalId` en Curriculum ni AcademicProgram. Las únicas líneas de seed con `externalId` (`_data-aiep.js:165`, `_data-univalle.js:174`) son sobre **Activity** (`prisma.activity`, recordType Course) y **BibliographyReference** (`br-uv-*`, join key real) — ambos **fuera de scope**. No se toca el seed.
- M1 (micro-decision): scope estricto a Curriculum + AcademicProgram. NO se toca `externalId` de Activity ni de BibliographyReference (este último lo usa el seed como clave de join — borrarlo rompería la bibliografía).
- D3 (handoff): retirar el campo del objeto es un cambio de schema → requiere `codegen` + sync/reset del tenant para dropear la columna en Prisma. Por el guard AI de Prisma + convención up1 (cambios estructurales de mod = reset-tenant), **lo aplica el dev** interactivo. Cero data-loss (columnas vacías).
- D4 (propagación DET-16): SPEC-021 y SPEC-024 listan `externalId` en sus tablas de campos. Follow-up documental: quitar esa fila de ambas specs (no funcional; no bloquea este tactic).
- **D5 (el hallazgo grande — el modelo de up1 es ADITIVO + VERSIONADO en cada capa)**: quitar un campo NO se logra con sync/reset solos. Capas que hubo que limpiar: (1) mod source ✓; (2) `objects/business/Base/*.json` — merge **append-only** (`fileSync.js:488` `mergeObjectFromMods` carga el Base existente y solo agrega) → un Base **local stale** no se limpia con sync; (3) `prisma/BASEMODEL/schema.prisma` — solo se limpia con `codegen -- BASEMODEL` (build fresco), NO con `codegen -- UPU` (que solo **copia** BASEMODEL, `generatePrismaSchema.js:1389`); (4) baseline migration `_init/migration.sql` (gitignored) — el reset re-aplica la stale → hubo que **borrarla** y regenerar fresca (§7 del doc de reset); (5) DB column — vía reset-tenant desde baseline limpia; (6) typeDefs GraphQL (gitignored) — regenera con sync pero el **OM proceso** servía schema stale → **restart** del OM. Drop real de columna = `db push --accept-data-loss`/reset, **bloqueado por guard AI de Prisma** → consentimiento explícito del dev.
- **D6 (qué se committea vs qué se regenera)**: lo único que se committea como fuente es el **mod source** (`0ba93ea`). `business/Base/{curriculum,academicprogram}.json` están **untracked** → en checkout limpio el sync los reconstruye limpios desde el mod (mi edición a mano fue workaround de estado local stale). migrations + typeDefs **gitignored** (regeneran). Solo `prisma/{BASEMODEL,UPU}/schema.prisma` están **tracked**, y los regenera+committea el **flujo core en rama de épica** (RULE-dev-004), no en `develop`.
- **D7 (escalamiento — excedió tactic)**: el cambio creció de mod-only a **core/plataforma** (regen de BASEMODEL compartido por 15 tenants + reset de DB con data loss). Por DET-12 debió escalar a full-path/core; se ejecutó por dirección explícita del dev. Aplicar/persistir para el equipo es follow-up core (commit de BASEMODEL regenerado vía `model:bump` + rama de épica + review).

## Sessions

### Session 1 — 2026-06-17 — Retirar externalId de objetos + layouts [phase: tactic]

**Objetivo**: Quitar el campo `externalId` de las definiciones de objeto `Curriculum` y `AcademicProgram` y de sus 6 layouts (create/edit/view). Sin seed (no aplica). Schema apply (codegen+reset) queda para el dev.

**Tasks completadas**:

- [x] T1: Retirar `externalId` de Curriculum + AcademicProgram (objetos + 6 layouts create/edit/view + 2 i18n).
      Cambio: el campo (ID SIS/ERP externo) ya no existe en objetos/layouts/forms; tras regen+reset desde objetos limpios tampoco en GraphQL ni en la columna DB ·
      Validado: forms sin el campo (confirmado por el dev en UI) + introspección GraphQL `Curriculum`/`AcademicProgram` → `externalId` AUSENTE, `Activity`/`BibliographyReference` lo conservan ✓ + create Plan en vivo OK ·
      → commit `0ba93ea` (mod source). Core regen (BASEMODEL/schema/baseline/DB) aplicado LOCAL en UPU; no committeado a `develop` (ver D6/D7).

#### Commits

| Hash | Tasks | Mensaje | Archivos |
|------|-------|---------|----------|
| `0ba93ea` | T1 | UPONE-1260-tactic chore(curriculum-design): retirar campo externalId de Curriculum y AcademicProgram | objects/{Curriculum,AcademicProgram}.json, config/layouts/default_{Curriculum,AcademicProgram}_{create,edit,view}.json, lang/es_CL@{Curriculum,AcademicProgram}.json |

> Repo `mods/curriculum-design`, rama `UPONE-1261-academic-program`. Core (object-manager): cambios LOCALES regenerables (D6) — no committeados a `develop`.

## Teaching — Intake

**Status**: skipped
**Razon**: backfill retroactivo (HOR-134) — este ticket se cerro sin registrar la razon del skip, y la razon original no quedo en ningun lado. No es una justificacion: es la constancia de que falta.

## Teaching — Close

**Status**: skipped
**Razon**: backfill retroactivo (HOR-134) — este ticket se cerro sin registrar la razon del skip, y la razon original no quedo en ningun lado. No es una justificacion: es la constancia de que falta.

## Summary

**Qué se hizo**:
- T1 + `0ba93ea`: `externalId` (ID SIS/ERP externo, no usado) retirado de los objetos `Curriculum` y `AcademicProgram`, sus 6 layouts (create/edit/view) y 2 i18n. Activity y BibliographyReference lo conservan (fuera de scope; el de BibliographyReference es clave de join del seed).
- Para que el drop llegara a GraphQL + columna DB hubo que limpiar TODAS las capas aditivas del modelo de up1 (ver D5) y hacer un **reset-tenant UPU desde 0** con baseline fresca (data loss aceptado por el dev — datos de prueba, los reales se reseedean).

**Cómo se validó**: forms sin `externalId` (UI, dev) · GraphQL `Curriculum`/`AcademicProgram` → `externalId` AUSENTE, `Activity`/`BibliographyReference` PRESENTE ✓ · create Plan en vivo OK · baseline migration nueva sin la columna (no se recrea).

**Qué NO se hizo / follow-up** (out-of-scope de este tactic, ver D7):
- **Core**: persistir el cambio para el equipo (regen de `BASEMODEL/schema.prisma` vía `model:bump` + commit en rama de épica core con review — RULE-dev-004). Mis cambios en object-manager quedaron LOCALES (regenerables desde el mod committeado, D6); no se committearon a `develop`.
- **Doc**: quitar la fila `externalId` de SPEC-021 y SPEC-024 (D4).
- **Nota**: este "tactic" excedió su envelope (creció a core/plataforma + DB reset). Por DET-12 correspondía full-path/core; se ejecutó por dirección explícita del dev.
