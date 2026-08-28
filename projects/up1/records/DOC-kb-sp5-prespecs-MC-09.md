---
id: DOC-kb-sp5-prespecs-MC-09
project: up1
type: doc
---

# Pre-spec MC-09 — Validación restrictiva de requisitos en planes publicados

> Borrador de spec + intake para **MC-09** (= D2). Referencia en `sp5/`, no record DKC.
> **Épica:** D · **Tier:** 🅲 Could *(candidato a Must — fue próximo paso explícito de la reunión; ver historias §dec)* · **SP:** 3 · **Repo:** `up1/mods/curriculum-design` (BE+FE)

---

## 1. Intake
- **KB:** mod-only; lee `planEntry` + `Curriculum.status`. "Mejor restrictivo antes que permitir el error" (reunión `00:51:07`).
- **Necesidad/reuso (DET-32):** regla en el resolver de mutación de `requirement(owner=activity)` = build; reusa la lectura de `planEntry`/`Curriculum.status`.
- **Matiz de alcance:** en SP5 **no hay editor de requisitos** (la UI es S7-01); por lo tanto la regla de bloqueo de **requisitos** (REQ-01/02) actúa a nivel de **mutación (API/MCP/seed)**, no desde una pantalla. La UI de edición de requisitos + su modal de impacto llegan en SP6. **Excepción (REQ-04):** la **alerta de malla no editable** SÍ es FE en SP5 — la malla ya tiene su gate de edición (`canEdit`, MC-05/06); este ticket agrega la alerta que la explica.
- **Estado "publicado" =** `Curriculum.status = Active` (audit C-2).
- **Fuente única de verdad (dev, TICKET-086):** el criterio de "qué estados de `Curriculum` son editables" NO debe hardcodearse en dos lados (gate + texto de alerta). Hoy `canEdit(status, mode)` hardcodea `status === 'Draft'`; REQ-04 lo extrae a una config/constante compartida.

## 2. Requisitos (REQ)

### REQ-01 · Bloqueo restrictivo en planes publicados
> **Qué cambia:** no se puede editar/crear requisitos de una asignatura que ya está en planes publicados. **Por qué:** evitar invalidar mallas existentes; obliga a versionar el programa.

**Certeza:** `confirmed` · **source_ref:** reunión `00:48:06`–`00:51:07` (próximo paso de Esteban)

<details><summary>Escenario</summary>

```gherkin
GIVEN una Activity referenciada por planEntry de un Curriculum(Plan) con status=Active
WHEN se intenta crear/editar sus requirement(owner=activity)
THEN se rechaza (restrictivo) con mensaje accionable que sugiere versionar el programa
GIVEN la Activity solo está en planes status=Draft (o no asignada)
THEN la creación/edición de requisitos funciona normal
```
</details>

### REQ-02 · Mensaje / alerta de impacto (FE)
**Certeza:** `confirmed` · **source_ref:** reunión `00:46:27`/`00:49:38`

El rechazo **DEBE** entregar un mensaje accionable; en contexto FE, un modal que explique el impacto y sugiera crear nueva versión del programa de asignatura.

### REQ-03 · Análisis de impacto colateral (obligatorio)
**Certeza:** `confirmed` · **source_ref:** regla global (impacto colateral)

**DEBE** identificarse qué resolvers de `requirement` y de Activity se tocan, confirmando que la regla **no** rompe la creación en planes Draft ni otros flujos.

### REQ-04 · Alerta "malla no editable" en la vista de malla — dinámica, fuente única  *(🆂 Should)*
> **Qué cambia:** la vista de malla muestra una **alerta** cuando el plan **no es editable** (hoy = publicado/`Active`), explicando que **solo se pueden modificar mallas de planes en borrador**. **Por qué:** hoy la malla queda en solo-lectura **en silencio** (sin botones de alta/edición) y el usuario no sabe por qué.

**Certeza:** `confirmed` · **source_ref:** feedback del dev en TICKET-086 (MC-06, 2026-07-01)

La alerta **DEBE** ser informativa (no bloqueante) y **DEBE** aparecer solo cuando el plan no es editable. El criterio de "qué `status` son editables" y sus etiquetas **DEBEN** provenir de una **única fuente de verdad** compartida con el gate `canEdit` (MC-05/06) — **NO** texto hardcodeado duplicado. Si cambia la configuración de estados editables, **tanto el gate como el mensaje de la alerta se actualizan sin tocar dos lados**.

<details><summary>Escenario</summary>

```gherkin
GIVEN un Plan con status NO editable (hoy Active/publicado)
THEN la vista de malla muestra una alerta: "El plan está {statusLabel}. Solo se pueden editar mallas de planes en {editableStatusLabels}." (labels dinámicos desde la config)
AND no se muestran las acciones de alta/edición (gate canEdit ya vigente)
GIVEN un Plan con status editable (hoy Draft)
THEN no se muestra la alerta y las acciones están disponibles
GIVEN se cambia la config de estados editables (p.ej. agregar 'Review')
THEN el gate canEdit y el texto de la alerta reflejan el cambio (mismo origen, sin editar dos lugares)
```
</details>

**Detalle técnico:** extraer `EDITABLE_STATUSES` (+ labels i18n) a una constante/config del mod; `canEdit(status, mode)` y el mensaje de la alerta la consumen. Hoy `canEdit` hardcodea `status === 'Draft'` en `curriculumMesh.logic.ts`.

## 3. Tasks (con rollback)
| # | Task | Rollback |
|---|---|---|
| T1 | BE: en la mutación de `requirement(owner=activity)`, verificar `planEntry` con `Curriculum.status=Active` → rechazar (REQ-01) | feature-gate (desactivar regla) |
| T2 | FE: modal de alerta de impacto (REQ-02) | quitar modal |
| T3 | Análisis de impacto colateral documentado (REQ-03) | — |
| T4 | FE: extraer `EDITABLE_STATUSES` (+ labels) a fuente única consumida por `canEdit` y el mensaje; alerta "malla no editable" en la vista de malla (REQ-04) | quitar alerta + inline el status en `canEdit` |

## 4. Test cases
| TC | REQ | Caso | Esperado |
|---|---|---|---|
| TC-01 | REQ-01 | Activity en plan `Active` → crear requirement | rechazado, mensaje sugiere versionar |
| TC-02 | REQ-01 | Activity solo en plan `Draft` → crear requirement | permitido |
| TC-03 | REQ-01 | Activity sin planes → crear requirement | permitido |
| TC-04 | REQ-04 | abrir malla de plan `Active` | alerta visible con el status y los estados editables; sin acciones de alta/edición |
| TC-05 | REQ-04 | abrir malla de plan `Draft` | sin alerta; acciones disponibles |
| TC-06 | REQ-04 | agregar `'Review'` a `EDITABLE_STATUSES` | `canEdit` y el texto de la alerta reflejan el cambio sin editar dos lugares (test de fuente única) |

## 5. Dependencias
- **Depende de:** MC-02 (planEntry) + MC-03 (requirement) + **MC-05 (gate `canEdit` + vista de malla, para REQ-04)**.
- **Nota de tier:** clasificado Could, pero **recomendado subir a Must** (compromiso explícito de la reunión que protege integridad de datos). El **editor** de requisitos (UI) es S7-01 (SP6).
