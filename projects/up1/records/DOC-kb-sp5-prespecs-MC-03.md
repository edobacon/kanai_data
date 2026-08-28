---
id: DOC-kb-sp5-prespecs-MC-03
project: up1
type: doc
---

# Pre-spec MC-03 — Objeto `requirement` (Composite, 3 RecordTypes) + bloque electivo

> **Qué es:** borrador de spec + intake para el ticket **MC-03** (agrupa A3 + A4), listo para transcribir al spec DKC. Espeja la forma de un spec DKC. **No es un record DKC** — referencia en `sp5/`.
> **Épica:** A (objetos · BE) · **Tier:** 🅼 Must (bloque electivo 🆂 Should) · **SP:** 7 · **Repo:** `up1/mods/curriculum-design`
> **Historia (PM):** ver `SP5-historias-usuario.md` → MC-03.

---

## ⚠️ Nota de calibración (leer antes de estimar)
Este es el **objeto más complejo del sprint** y el **riesgo de estimación #1**. Su análogo histórico (`ticket-009`, primer objeto multi-RecordType del mod, `CurricularSection`) se estimó en 2 y **ejecutó 7 (×3.5)** — fue el pionero que estrenó layouts-por-RT y modelado polimórfico. **A favor de MC-03=7:** ese costo pionero **ya está pagado** (H-4 resuelto; FK polimórfica y árbol ya en producción en `CurricularSection`). **Trato:** 7 SP es **piso, no techo**; si se infla, recortar Should (B5/B9) antes que el núcleo. Ver `SP5-alcance-y-justificacion.md §5`.

---

## 1. Intake (contexto para el design)

### 1.1 KB del módulo que aplica
- **Reglas:** mod-only; **layouts por RecordType ya soportados** (patrón `CurricularSection`, `resolveDefaultLayout` resuelve por convención — H-4 resuelto); **FK polimórfica `ownerType/ownerId`** se modela como convención (sin integridad referencial en DB), validar en capa app; MCP-ready (enums + FK refs + labels).
- **Bugs:** ninguno directo (H-3/H-7 = versionado → SP6).
- **Decisiones:** solo modelar/persistir `requirement` (sin motor de evaluación — handoff §1); 3 RecordTypes este incremento.

### 1.2 Necesidad y reuso (DET-32)
| Artifact | Veredicto | Razón |
|---|---|---|
| Objeto `requirement` (base + 3 RT) | **build** | No existe; es el motor de reglas (prereqs, electivos, umbrales) — handoff §2.3. |
| FK polimórfica `ownerType/ownerId` | **reuse** (patrón) | Igual que `Curriculum.ownerId` y `CurricularSection.ownerId`; resuelta por convención. |
| Self-FK `parentId` (árbol) | **reuse** (patrón) | Igual que `CurricularSection.parentId` (+ `directChildren`). |
| Multi-RecordType (3 RT) | **reuse** (patrón) | `CurricularSection` ya tiene 7 RT en producción. |
| Layouts por RT | **reuse** (patrón) | 19 layouts `default_rt__*__curricularsection_*` ya committeados; copiar. |
| Bloque electivo (A4) | **reduce** | No es objeto nuevo: es un `requirement(Group)` + derivación sobre `planEntry.blockId`. |

### 1.3 Supuestos y preguntas
- **Confirmado:** solo **persistencia/lectura** del árbol — **sin motor de evaluación** (degree-audit) en SP5.
- **Confirmado:** 3 RecordTypes (`RecordState`, `Group`, `MetricThreshold`); `recordType` es enum **extensible** (futuros `AttributeMatch`, etc. → documentar, no implementar).
- **Confirmado:** `RecordState.targetType` solo `activity`; `MetricThreshold.metric` solo `Credits` (este incremento).

---

## 2. Requisitos (REQ)

### REQ-01 · Objeto `requirement` base (Composite)
> **Qué cambia:** se crea el objeto de reglas, patrón Composite (árbol). **Por qué:** modela prerrequisitos, electivos y umbrales de forma legible y recursiva.

**Certeza:** `confirmed` · **source_ref:** handoff §2.3

**DEBE** tener la base: `id`, `ownerType` enum `{curriculum, activity, offering}` (req), `ownerId` (FK polimórfica, req), `parentId` (self FK, opcional), `recordType` enum `{Group, RecordState, MetricThreshold}` (req), `effect` enum `{EligibilityToEnroll, ProgressGate, Completion, DiplomaAward}` (req), `label` (string, req), `isHardRule` (bool, def `true`), `negate` (bool, def `false`), `overrideMode` enum `{Replaces, Adds}` (opcional, solo `ownerType=offering`), `position` (number, req), timestamps.

### REQ-02 · Tres RecordTypes con sus campos propios
> **Qué cambia:** 3 variantes tipadas del requirement. **Por qué:** cada familia (curso / grupo / umbral) tiene campos distintos.

**Certeza:** `confirmed` · **source_ref:** handoff §2.3

**DEBE** crear:
- `rt__RecordState__requirement` (Curso): `targetType {activity}`, `targetId`, `mustBe {Approved, Taken}`, `threshold{minGrade}?`, `timing {Before, Concurrent, Either}?`.
- `rt__Group__requirement` (Electivos K de N): `combinator {AND, OR}`, `minToSatisfy?`, `creditsRequired?`.
- `rt__MetricThreshold__requirement` (Créditos mínimos): `metric {Credits}`, `scope {plan, category}?`, `scopeId?`, `operator {>=,>,=,<,<=}`, `value`.

### REQ-03 · Enums cerrados y acotados al incremento
**Certeza:** `confirmed` · **source_ref:** handoff §2.3 (acotaciones)

`RecordState.targetType` **DEBE** limitarse a `activity`; `MetricThreshold.metric` **DEBE** limitarse a `Credits`; todos los enums son cerrados.

### REQ-04 · `label` obligatorio
**Certeza:** `confirmed` · **source_ref:** handoff §2.3 + transcript `00:18:24`

`label` **DEBE** ser requerido (etiqueta de dominio legible; también es el nombre del bloque electivo).

### REQ-05 · Árbol persiste y se reconstruye
> **Qué cambia:** el árbol se guarda y se vuelve a leer con su estructura. **Por qué:** la lógica ES la estructura del árbol (AND/OR anidados).

**Certeza:** `confirmed` · **source_ref:** handoff §2.3 + §2.5 (ejemplo EST200)

El sistema **DEBE** persistir y reconstruir el árbol por `parentId` (anidamiento solo en `Group`). El seed **DEBE** incluir el ejemplo EST200 (§2.5).

<details><summary>Escenario EST200 (GIVEN/WHEN/THEN)</summary>

```gherkin
GIVEN el seed EST200: Group[AND]{ Group[OR]{ Group[AND]{MAT110, MAT120}, MAT210 }, MetricThreshold(≥60cr), RecordState(PROG101, advisory) }
WHEN se lee el requirement raíz de act_EST200
THEN se reconstruye el árbol completo con esa jerarquía y combinadores
```
</details>

### REQ-06 · FK polimórfica con validación en capa app
> **Qué cambia:** `ownerId` apunta a distinto objeto según `ownerType`, sin constraint en DB. **Por qué:** la plataforma modela polimorfismo por convención (igual que Curriculum/CurricularSection).

**Certeza:** `confirmed` · **source_ref:** auditoría H-5 + patrón `Curriculum.ownerId`

`ownerId` **DEBE** modelarse sin integridad referencial en DB (convención). El resolver **DEBERÍA** validar la coherencia `ownerType ↔ ownerId` en la capa de aplicación.

### REQ-07 · Layouts por RecordType (patrón existente)
**Certeza:** `confirmed` · **source_ref:** auditoría H-4 (precedente `CurricularSection`, 19 layouts)

**DEBE** declarar `default_rt__RecordState__requirement_{view,edit,create}.json` (y para Group/MetricThreshold), **copiando el patrón** de `CurricularSection`. `resolveDefaultLayout` los resuelve por convención `default_{objectName}_{mode}` (no requiere fix de core).

### REQ-08 · `recordType` extensible (documentar, no implementar)
**Certeza:** `confirmed` · **source_ref:** handoff §2.3 (iteraciones futuras)

**DEBE** documentarse que `recordType` es un enum extensible (futuros `AttributeMatch`, más targets/métricas) **sin implementarlos** en SP5.

### REQ-09 · Bloque electivo = `requirement(Group)` sobre el plan  *(🆂 Should)*
> **Qué cambia:** un bloque electivo se representa con un Group. **Por qué:** reusa el motor de reglas; el nombre del bloque = `label`.

**Certeza:** `confirmed` · **source_ref:** handoff §2.4 + §2.6

Un bloque electivo **DEBE** ser `requirement(recordType=Group, ownerType=curriculum, combinator=OR, minToSatisfy/creditsRequired)`. El seed **DEBE** incluir §2.6 ("Electivo de Especialización", OR, minToSatisfy=4, creditsRequired=24).

### REQ-10 · Electividad derivada de la membresía  *(🆂 Should)*
**Certeza:** `confirmed` · **source_ref:** handoff §2.4

La derivación obligatorio-vs-electivo **DEBE** documentarse y verificarse: `planEntry.blockId == null` → obligatorio; `!= null` → electivo (miembro de ese Group). "Electivos de una línea" = `blockId != null` agrupados por `categoryId`.

---

## 3. Tasks (con rollback)

| # | Task | Rollback |
|---|---|---|
| T1 | `objects/requirement.json` (base, REQ-01,03,04,06) | eliminar archivo + `reset-mods` |
| T2 | 3 × `objects/RecordTypes/rt__*__requ
