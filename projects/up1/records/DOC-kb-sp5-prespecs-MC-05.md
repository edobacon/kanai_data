---
id: DOC-kb-sp5-prespecs-MC-05
project: up1
type: doc
---

# Pre-spec MC-05 — Malla: ver, modo edición y resumen

> Borrador de spec + intake para **MC-05** (agrupa B1 + B2 + B3). Referencia en `sp5/`, no record DKC.
> **Épica:** B (malla · FE) · **Tier:** 🅼 Must · **SP:** 5 · **Repo:** `up1/mods/curriculum-design` (modsComponents)

---

## 1. Intake
- **KB:** componente autorado en el mod (`modsComponents/`), sincroniza a `layout/`. **Mod-only**: entrypoint vía config del mod, **NO** registrar layoutType nuevo en core (auditoría §1.6). Modales/UI siguen el patrón `CompositeSectionTree`.
- **Necesidad/reuso (DET-32):** el componente es **build**, pero **reusa** el precedente `CompositeSectionTree` (full-page Vueform element + GraphQL + lógica extraída a `.ts`). Carga de datos = `useTenantApolloClient` + `listInstances` (patrón `useCompositeSectionTree`).
- **Supuestos:** la pestaña "Malla curricular" se declara en `default_Curriculum_view.json` (config del mod); la acción del listado navega a esa pestaña. `status` editable = `Draft`.

## 2. Requisitos (REQ)

### REQ-01 · Ver la malla por período (solo lectura)
> **Qué cambia:** se muestra la malla en columnas por semestre. **Por qué:** es la vista base del diseño del plan.

**Certeza:** `confirmed` · **source_ref:** handoff MC-CMP-1 + mockup 685–921

<details><summary>Escenario</summary>

```gherkin
GIVEN un Curriculum(Plan) con planEntries
WHEN abro la pestaña "Malla curricular" (modo Ver)
THEN veo las asignaturas agrupadas en columnas por `period`
AND cada tarjeta muestra código, créditos, línea de formación (color) y badge "electivo" si blockId != null
```
</details>

Columnas = `totalPeriods`/`periodType` del plan.

### REQ-02 · Puntos de entrada (mod-only)
> **Qué cambia:** se entra a la malla desde el detalle y el listado. **Por qué:** acceso natural sin tocar core.

**Certeza:** `confirmed` · **source_ref:** handoff MC-CMP-1 + auditoría §1.6 (frontera)

**DEBE** ser accesible como **pestaña del RecordDetail** (config del mod, `associatedLayout`/Vueform element) y desde la **acción "Malla curricular"** del RecordList (navega a la pestaña). **NO DEBE** registrarse un `layoutType` nuevo en `LayoutOrchestrator` de core.

### REQ-03 · Barra de resumen del plan
**Certeza:** `confirmed` · **source_ref:** handoff MC-CMP-3 + mockup 718–725

**DEBE** mostrar, a ancho completo sobre los filtros: créditos del diseño / requeridos, n.º de períodos, n.º de asignaturas, carga máx. por período (calculados desde los `planEntry` + `totalCredits`/`totalPeriods`).

### REQ-04 · Modo edición gated por estado
> **Qué cambia:** la edición solo aparece si corresponde. **Por qué:** proteger planes que no deben cambiar.

**Certeza:** `confirmed` · **source_ref:** handoff MC-CMP-2 + reunión `00:38:02`

Las acciones de alta/edición **DEBEN** mostrarse solo en modo edición + `Curriculum.status` editable (`Draft`); en solo lectura, ocultas.

## 3. Tasks (con rollback)
| # | Task | Rollback |
|---|---|---|
| T1 | Componente malla en `modsComponents/` (grid por período, tarjetas) + carga GraphQL (REQ-01) | eliminar componente |
| T2 | Lógica pura a `.ts` (agrupación por período, derivación badge) + `.spec.ts` | revertir |
| T3 | Entrypoint: pestaña en `default_Curriculum_view.json` + acción en `default_Curriculum_list.json` (REQ-02) | revertir config |
| T4 | Barra de resumen + cálculos (REQ-03) | quitar sección |
| T5 | Gating de modo edición (REQ-04) + stories | revertir |

## 4. Test cases
| TC | REQ | Caso | Esperado |
|---|---|---|---|
| TC-01 | REQ-01 | plan con entries en períodos 1 y 2 | tarjetas agrupadas en 2 columnas |
| TC-02 | REQ-01 | entry con `blockId != null` | tarjeta con badge "electivo" |
| TC-03 | REQ-03 | plan con 3 entries (6+4+5 cr) | resumen: 15 cr de diseño, 3 asignaturas |
| TC-04 | REQ-04 | plan `status=Draft` en edición / en Ver | acciones visibles / ocultas |
| TC-05 | REQ-04 | plan `status=Active` | acciones de edición ocultas |

## 5. Dependencias
- **Depende de:** MC-02 (planEntry/requirementCategory) + seed.
- **Habilita:** MC-06 (alta/edición usan el componente), MC-08 (filtros sobre la vista).
- **Patrón:** `CompositeSectionTree`.
