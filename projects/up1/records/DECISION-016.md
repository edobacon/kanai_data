---
id: DECISION-016
project: up1
type: decision
module: core
tags:
  - core
  - object-manager
  - codegen
  - schema
  - prisma
  - uengagement-up1
  - schema-drift
  - baseline
  - sp3
---

# DECISION-016: Consolidar la baseline de schema en UPONE-1206 (eliminar ejemplo colisionante + regenerar 17 schemas)

## Contexto

Durante el merge-up de SP3 (poner `UPONE-1206` al día con `develop`), validar el entorno desde 0 (`tenant:create UPU`) destapó que el `develop` de object-manager tiene la baseline de schema **drifteada** respecto a la fuente (ver [BUG-core-001](../bugs/core/bug-core-001.md)):

- Colisión de título `Student` (ejemplo `rt__Student__core_user.json` vs modelo de uengagement-up1) → no se genera `model Student` → seed falla.
- ~150 modelos `ext__uplanner__uc*` huérfanos committeados sin source.
- uengagement-up1 existe como mod en develop pero nunca se integró al core (`business/`, schemas, seeds generados sin él).

## Decisión

**Consolidar la baseline en la rama `UPONE-1206`** (commit `0166bd4`): eliminar el RecordType de ejemplo `rt__Student__core_user.json`, mergear uengagement-up1 a `business/` y **regenerar los 17 schemas vía codegen** — integrando uengagement + curriculum-design, eliminando los `uc*` huérfanos, e incorporando `@@unique`/enums/relations desde la fuente.

## Drivers

- El seed no funciona desde 0 con uengagement (bloquea levantar el entorno).
- La baseline committeada no refleja la fuente → cualquier regen futura produce diffs destructivos sorpresivos.
- La fuente (JSON de objetos) es la verdad; los generados deben derivar de ella (schema-driven).

## Alternativas consideradas

- **A — Fix mínimo**: commitear solo el delete del ejemplo RT y dejar los schemas stale, regenerando en CI/deploy. *Descartada*: deja la baseline inconsistente y el seed seguiría roto en local.
- **B — Consolidación completa (elegida)**: delete + full codegen de los 17 tenants. Pro: baseline correcta y validada end-to-end (UPU → TENANT READY, tests verdes). Contra: diff grande que altera la baseline de develop.
- **C — Escalar aparte**: dejar las ramas SP3 sin tocar el schema y abrir un trabajo de baseline separado. *Descartada por ahora*: el seed roto bloquea la validación del propio SP3.

## Impacto y reversibilidad

- **Archivos**: 31 en object-manager (17 schemas + 9 objetos uengagement + 3 business + dynamic.js + 1 delete).
- **Riesgo**: el drop de ~150 `uc*` huérfanos, en un `db push`/deploy real (no en dev), **dropearía esas tablas donde existan**. Para dev/sandbox es correcto (confirmado sin source); fuera de dev requiere validación del team antes de mergear a develop.
- **Reversibilidad**: alta a nivel de commit (revertible); el fix es regenerable desde la fuente. Existe backup `backup/UPONE-1206-premerge-*`.

## Confirmación

- Validado: `tenant:create -- UPU --recreate` → "✅ TENANT READY"; tests object-manager 1870 / uengagement-up1 34 / curriculum-design 639, todos verdes.
- **Pendiente**: revisión del team up1 en el PR de `UPONE-1206 → develop` (gate por RULE-dev-004), con foco en el impacto del drop de `uc*` en tenants no-dev.
