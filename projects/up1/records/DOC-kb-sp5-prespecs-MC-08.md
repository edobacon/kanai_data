---
id: DOC-kb-sp5-prespecs-MC-08
project: up1
type: doc
---

# Pre-spec MC-08 — Malla: filtros + interacciones avanzadas

> Borrador de spec + intake para **MC-08** (agrupa B9 + B6 + B8). Referencia en `sp5/`, no record DKC.
> **Épica:** B (malla · FE) · **Tier:** 🆂 Should (filtros) + 🅲 Could (bloqueo, drag&drop) · **SP:** 7 · **Repo:** `up1/mods/curriculum-design`

---

## 1. Intake
- **KB:** `sortablejs` ya es dependencia del mod (drag&drop). Bloqueo por prereqs lee `requirement(owner=activity)` (MC-03). Alerta informativa, no corrección automática (reunión `00:31:01`).
- **Necesidad/reuso (DET-32):** filtros = build (lógica de resaltado); drag&drop = **reuse** de `sortablejs` (la lógica cross-columna es nueva); checker de prereqs = build (lógica de dominio nueva, no existe en ningún componente).
- **Supuesto/delta clave:** el requisito de **créditos mínimos NO alerta** (solo cursos y K-de-N) — reunión `00:29:22`.

## 2. Requisitos (REQ)

### REQ-01 · Filtros de la malla  *(🆂 Should)*
**Certeza:** `confirmed` · **source_ref:** handoff MC-CMP-9 + reunión `00:01:30`/`00:03:22`

**DEBE** ofrecer chips de **líneas de formación** (desde `requirementCategory`) que resaltan/atenúan tarjetas por `categoryId`, y chips de **bloques electivos** derivados de los `blockId` presentes. Con botón limpiar.

Cada chip de línea **DEBE** mostrar un **rollup de créditos por línea** — créditos asignados vs. mínimo/objetivo (`{current}/{min} créd`) con barra de progreso, ícono y nombre de la línea (maqueta `mockup_v10.html` líneas 726-740: `c.current/c.min créd`). Hoy el componente solo tiene una **leyenda estática** (punto de color + nombre) como placeholder; este REQ la reemplaza por la barra interactiva con rollup. El rollup se calcula sumando `credits` (efectivo) de las entries por `categoryId`; el `min` sale de `requirementCategory.minCredits` (MC-07/MC-02).

### REQ-02 · Bloqueo por prerrequisitos al agregar  *(🅲 Could)*
> **Qué cambia:** al agregar un curso, si falta un prereq antes, se bloquea. **Por qué:** mantener la malla coherente (alerta informativa).

**Certeza:** `confirmed` · **source_ref:** handoff MC-CMP-6 + reunión `00:29:22`

<details><summary>Escenario</summary>

```gherkin
WHEN agrego un curso y un prereq-curso (RecordState, timing Before) NO está en un período anterior
OR un Group(K-de-N de cursos) tiene cursos miembros ausentes de la malla
THEN se bloquea: modal lista los faltantes, ofrece solo Cancelar o Volver
GIVEN el requisito es MetricThreshold(Credits)
THEN NO dispara alerta (son créditos cursados, no ubicación)
GIVEN no faltan prereqs
THEN se completa el alta
```
</details>

### REQ-03 · Drag&drop + agregar período  *(🅲 Could)*
**Certeza:** `confirmed` · **source_ref:** handoff MC-CMP-8 + reunión `00:36:38` (period/position)

Drag&drop entre columnas **DEBE** actualizar `period` y `position` (recalcular orden de hermanos), persistido. Botón "Agregar período".

Al **agregar/quitar períodos**, si la cantidad de períodos de la malla **difiere** de la configurada en el plan (`Curriculum.totalPeriods`), el sistema **DEBE** mostrar una **alerta informativa (no bloqueante)**: es un estado de trabajo válido durante el diseño, pero el usuario **debe estar al tanto** de la discrepancia. La alerta indica la cantidad actual vs. la configurada (`{actual} períodos · configurado {totalPeriods}`). No impide seguir editando.

<details><summary>Escenario (conteo de períodos)</summary>

```gherkin
GIVEN un plan con totalPeriods=10 y la malla tiene 10 columnas
WHEN el usuario agrega un período (queda en 11) o elimina uno (queda en 9)
THEN se muestra una alerta informativa: "La malla tiene {actual} períodos · el plan está configurado con {totalPeriods}"
AND el usuario puede seguir editando (no bloqueante — estado de trabajo)
GIVEN la malla vuelve a coincidir con totalPeriods
THEN la alerta desaparece
```
</details>

### REQ-04 · Display de la línea de formación en la tarjeta  *(🆂 Should)*
> **Qué cambia:** cada tarjeta de la malla muestra su línea de formación con **ícono + abreviación + color** (hoy solo pinta el borde de color). Además el **badge "electivo" pasa a la DERECHA** de la tarjeta (hoy está a la izquierda). **Por qué:** fidelidad con la maqueta UPONE-1272 — el detalle se perdió en el paso maqueta→prespec de MC-05 (que redujo la línea a "solo color").

**Certeza:** `confirmed` · **source_ref:** maqueta UPONE-1272 (tarjeta) + feedback dev en TICKET-086 (MC-06, sesión 2026-07-01) — diferido a MC-08 por dueño del tratamiento visual de líneas (REQ-01).

<details><summary>Escenario</summary>

```gherkin
GIVEN una tarjeta con categoryId de la línea "Núcleo" (icon bi-diagram-3, code NUC, color primary)
THEN la tarjeta muestra un chip con el ícono + la abreviación ("NUC") coloreado con el color de la línea
GIVEN una tarjeta electiva (blockId != null)
THEN el badge "electivo" se ubica a la DERECHA de la tarjeta (no a la izquierda)
GIVEN una tarjeta sin categoryId
THEN no se muestra chip de línea (solo el borde neutro)
```
</details>

**Datos:** `requirementCategory` ya tiene `icon` (`bi-*`) y la abreviación. Hoy la abreviación se sembra como `code` (NUC/HAB/ELP/PRG); al existir MC-07 usar la **"etiqueta corta"** administrable. `CategoryVM`/`toCategoryVM` (useCurriculumMesh) deben exponer `icon` + abreviación (hoy solo `name`/`color`/`minCredits`).

### REQ-05 · Corrección UI · botón "Agregar asignatura" con doble ícono `+`  *(🅼 Must, fix)*
> **Qué cambia:** el botón de alta por período muestra **dos `+`** ("＋ + Asignatura"): uno del `icon="bi bi-plus-lg"` del atom `Button` y otro del **texto i18n** (`addSubject = '+ Asignatura'`). Debe quedar **un solo `+`**. **Por qué:** bug visual detectado en TICKET-086 (MC-06).

**Certeza:** `confirmed` · **source_ref:** feedback dev en TICKET-086 (2026-07-01, screenshot).

**Fix:** quitar el `+ ` literal del texto i18n en los 3 locales (`curriculumMesh.buttons.addSubject`: `'+ Asignatura'` → `'Asignatura'`, `'+ Subject'` → `'Subject'`, `'+ Disciplina'` → `'Disciplina'`) y **conservar el ícono** del `Button` (consistencia con el design system). Verificar también que el botón "Agregar período" no repita el patrón.

## 3. Tasks (con rollback)
| # | Task | Rollback |
|---|---|---|
| T1 | Chips de líneas + bloques + lógica de resaltado (REQ-01) en `.ts` + `.spec.ts` | quitar filtros |
| T2 | Checker de prereqs faltantes (cursos + K-de-N; excluye créditos) + modal de bloqueo (REQ-02) | revertir |
| T3 | Drag&drop con `sortablejs` + recálculo period/position + "Agregar período" + **alerta de discrepancia de conteo de períodos vs `totalPeriods`** (REQ-03) | desactivar DnD |
| T4 | Chip de línea en la tarjeta (ícono + abreviación + color) + mover badge electivo a la derecha (REQ-04); exponer `icon`/abreviación en `CategoryVM` | revertir a solo-borde + badge izquierda |
| T5 | Fix doble `+` en "Agregar asignatura": quitar `+ ` de `buttons.addSubject` (3 locales), conservar ícono (REQ-05) | restaurar texto con `+` |

## 4. Test cases
| TC | REQ | Caso | Esperado |
|---|---|---|---|
| TC-01 | REQ-01 | clic en chip de la línea "Núcleo" | tarjetas de Núcleo resaltadas, resto atenuado |
| TC-08 | REQ-01 | línea "Núcleo" con 12 créd asignados y min 180 | chip muestra "12/180 créd" + barra de progreso proporcional |
| TC-09 | REQ-03 | plan `totalPeriods=10`, agregar un período (queda 11) | alerta informativa "11 períodos · configurado 10"; edición sigue disponible (no bloquea) |
| TC-10 | REQ-03 | volver a 10 períodos (coincide con `totalPeriods`) | la alerta desaparece |
| TC-11 | REQ-05 | render del botón de alta por período | un solo `+` (ícono del Button); el texto no incluye `+` |
| TC-02 | REQ-02 | agregar EST200 (prereq MAT110) sin MAT110 en período anterior | bloqueado; modal lista MAT110 |
| TC-03 | REQ-02 | agregar curso cuyo único requisito es MetricThreshold(≥60 cr) | NO bloquea |
| TC-04 | REQ-02 | agregar EST200 con MAT110 en período anterior | se completa |
| TC-05 | REQ-03 | arrastrar una tarjeta del período 2 al 1 | period=1, position recalculada, persistido |
| TC-06 | R
