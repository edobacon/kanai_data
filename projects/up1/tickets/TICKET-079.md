---
id: TICKET-079
project: up1
type: ticket
status: closed
work_type: tactic
external: UPONE-1261
module: object-manager
autopilot: manual
---

# Edicion de Curriculum rota por updatedById (PLAT-12) — schema local stale tras merge de develop

## Request

> Tras mergear develop (PLAT-12 / UPONE-1194) en la rama UPONE-1261, editar un Plan de Estudios
> (Curriculum) en la UI falla con "Valor invalido proporcionado. Ubicacion: > UpdatedById".
> Revisar por que, si hay que actualizar modelo/seed/resolver, y si pasa en otros casos. Resolverlo
> mod-only si se puede. Registrar como tactic (sin alta profundidad) y cerrar.

## KB consulted

> DET-11 — lookup obligatorio antes de tocar codigo.

- **Rules**: [RULE-curriculum-design-005](../rules/curriculum-design/rule-curriculum-design-005.md) — friendly-error del flujo de Curriculum; mismo patron "Valor invalido — <Campo>" ya visto con `institutionId` en UPONE-1261 (stripeado en el adapter del update)
- **Bugs**: n/a — sin bugs abiertos de curriculum-design/object-manager para este sintoma
- **Specs**: [SPEC-curriculum-design-fix-orgunit-reduced-adapt](../specs/SPEC-curriculum-design-fix-orgunit-reduced-adapt.md) — adaptacion org-spine reducido (UPONE-1261 / TICKET-076), mismo flujo de edicion de Curriculum via `updateCurriculumWithRecordType` -> `updateInstance(alias)`

## Discoveries / decisions

- D1: PLAT-12 (commit `d46d280`, UPONE-1194) hace que el resolver generico create/updateInstance inyecte `updatedById` via `auditUpdatedBy(context)` en TODO write de usuario autenticado (instance.resolver.js:2818 / 3314 / 3656 / 3900), de forma incondicional.
- D2: `updatedById` es un common field (`objects/business/common.json`) que el codegen emite como columna escalar `Int?` SIN registrarlo en `core_FieldDefinition` (mismo rail que `createdAt`/`updatedAt`) -> system-managed, no settable por el cliente. NO requiere declararse por objeto.
- D3 (CAUSA RAIZ): el schema LOCAL estaba **stale**. El codegen incremental (`sync` / `codegen --schema-only`) mergea sobre el schema existente y **preserva los cuerpos de modelos viejos** (insertion-point) -> los business objects (Curriculum, AcademicProgram, Offering, etc.) quedaban sin la columna pese a estar en common.json. Solo los 17 tenant-Base la tenian (su schema de tenant se regenera fresco). El resolver inyecta -> Prisma `Unknown argument updatedById` -> friendly "Valor invalido — UpdatedById".
- D4 (DESCARTADO): NO es gap del codegen, NO requiere fix de codigo/mod/seed, NO requiere escalar a UPONE-1194. Hipotesis previa de "declarar la property en el mod" descartada: habria registrado el campo en `core_FieldDefinition` -> editable/settable por cliente (spoofing del editor en create por el guard `if updatedById === undefined`).
- M1 (resolucion): regen completo. `tenant:create --recreate` reconstruye el schema desde cero -> materializa la columna comun en todos los business objects.
- M2 (infra, pre-requisito): el `db push` del recreate corre `CREATE EXTENSION vector`; el Postgres compartido de `q/db` era `postgres:17.4` SIN pgvector -> cambiado a `pgvector/pgvector:pg17` (pg17 + pgvector, volumen pg17 compatible).
- D5 (propagacion, DET-16): un common field NUEVO **no se propaga a business objects existentes via sync incremental** — exige regen/reset completo. Otros tenants locales (demos, ucpln, uceng, ucasmt) y entornos (staging/prod) seguiran stale -> romperan al editar Curriculum hasta un regen completo.

## Sessions

### Session 1 — 2026-06-23 — diagnostico + resolucion operativa updatedById [phase: tactic]

**Objetivo**: diagnosticar el error de edicion de Curriculum tras el merge de PLAT-12 y resolverlo.

**Tasks completadas**:

- [x] T1: Diagnostico de causa raiz del error "Valor invalido — UpdatedById" al editar Curriculum (cadena resolver mod -> `updateInstance` generico -> inyeccion PLAT-12).
      Cambio: hipotesis inicial (gap codegen / fix core / escalar) -> causa real = schema local stale (codegen incremental preserva cuerpos viejos); la columna comun no materializo en business objects ·
      Validado: grep de schemas (UPU 17 / BASEMODEL 0 pre-reset) + lectura de `generatePrismaSchema.js` (generateBaseModel / syncBaseFieldsToRegistry) + diff de PLAT-12 `d46d280` ·
      -> sin commit (diagnostico)
- [x] T2: Habilitar pgvector en el Postgres compartido `q/db` (pre-requisito del recreate).
      Cambio: `q/db/docker-compose.yml` image `postgres:17.4` -> `pgvector/pgvector:pg17`; `docker pull` + recreate del contenedor `pg` (volumen named `postgres_data` preservado) ·
      Validado: pg 17.10 up, `pg_available_extensions` -> `vector 0.8.3`, 17 bases `uplanner_*` intactas (cero data loss) ·
      -> sin commit (q/db NO es repo git; el cambio queda persistido local en el archivo, fuera de version control)
- [x] T3: Reset del tenant UPU (operacional, ejecutado por el dev) -> regen limpio del schema.
      Cambio: `tenant:create --recreate` regenero BASEMODEL + UPU desde cero -> `updatedById` materializado (UPU 17->70, BASEMODEL 0->53) ·
      Validado: `model Curriculum` (UPU) con `updatedById Int?`; columna fisica `updatedById integer` en `uplanner_upu.Curriculum`; 70 tablas con la columna; edicion de Curriculum en UI OK (confirmado por el dev) ·
      -> sin commit (operacional; artefactos de schema no se commitean — RULE up1 sync/seed)

#### Commits

| Hash | Tasks | Mensaje | Archivos |
|------|-------|---------|----------|
| 1a119ce (dkc) | T1-T3 | UPONE-1261-tactic docs(dkc): TICKET-079 updatedById schema stale + resolucion | projects/up1/tickets/TICKET-079.md |

> Nota: el cambio de infra de T2 (`q/db/docker-compose.yml` -> pgvector/pgvector:pg17) NO se commitea: `q/db` no es repo git. Queda persistido local en el archivo.

## Teaching — Intake

**Status**: skipped
**Razon**: backfill retroactivo (HOR-134) — este ticket se cerro sin registrar la razon del skip, y la razon original no quedo en ningun lado. No es una justificacion: es la constancia de que falta.

## Teaching — Close

**Status**: skipped
**Razon**: backfill retroactivo (HOR-134) — este ticket se cerro sin registrar la razon del skip, y la razon original no quedo en ningun lado. No es una justificacion: es la constancia de que falta.

## Summary

**Que se hizo**:

- T1: diagnostico — el error de edicion de Curriculum tras el merge de PLAT-12 era **schema local stale**, NO un bug de codigo. El codegen incremental preserva cuerpos de modelos existentes, asi que el common field `updatedById` (PLAT-12) no materializo en los business objects (solo en los 17 tenant-Base).
- T2 + `{hash-qdb}`: habilitado pgvector en `q/db` (`postgres:17.4` -> `pgvector/pgvector:pg17`) — pre-requisito para que el recreate corra `CREATE EXTENSION vector`. Cero data loss (volumen named preservado).
- T3: reset del tenant UPU -> regen limpio -> columna materializada en todos los business objects (UPU 17->70, BASEMODEL 0->53). Edicion de Curriculum OK.

**Como se valido**: columna fisica `updatedById integer` en `uplanner_upu.Curriculum`; 70 tablas con la columna en la DB; `model Curriculum` (UPU) con `updatedById Int?`; pgvector `0.8.3` disponible; el dev confirmo la edicion en la UI.

**Que NO se hizo** (out-of-scope):

- Sin fix de codigo/mod/seed ni escalamiento a UPONE-1194 — no hacian falta (la hipotesis previa de fix core/mod quedo descartada).
- Otros tenants locales (demos, ucpln, uceng, ucasmt) y entornos staging/prod **siguen stale** -> necesitan regen/reset completo cuando despliegue PLAT-12 (D5, DET-16). No se abordan aca.
- Learn registrable: "un common field nuevo NO se propaga a business objects existentes via sync incremental de up1 — requiere regen/reset completo (el codegen preserva los cuerpos de modelos existentes)".
