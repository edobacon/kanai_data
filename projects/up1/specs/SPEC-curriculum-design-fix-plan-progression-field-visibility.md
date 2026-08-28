---
id: SPEC-curriculum-design-fix-plan-progression-field-visibility
project: up1
ticket: TICKET-119
status: done
---

# Fix: la visibilidad de los campos de periodo del Plan depende de la progresion (Secuencial vs Modular)

# Fix: la visibilidad de los campos de periodo del Plan depende de la progresion (Secuencial vs Modular)

## Executive summary — lo que estas aprobando

> Revision rapida. El detalle vive en Requirements / Fix scope / Tasks.

**Que se quiere**: en el formulario del Plan de estudio (`Curriculum` tipo `Plan`), los campos de periodo deben depender del **tipo de progresion**, no solo del tipo de registro. Hoy Total de creditos, Total de periodos y Tipo de periodo se muestran siempre que el registro sea `Plan`. Se quiere: creditos **siempre** visible en un Plan; total de periodos visible **solo si la progresion es Secuencial**; tipo de periodo **se conserva visible en todo Plan** (DECISION-027, escenario B: es cadencia de inscripcion/oferta, no estructura de la malla). El Minor no ofrece ninguno. Es **mod-only, config de layout** — sin nuevo campo, sin migracion, sin backend.

**Decisiones criticas**:

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | **`periodType` se conserva visible en todo Plan (escenario B)** — RESUELTA, DECISION-027 | `periodType` es la cadencia de inscripcion/oferta y aplica tambien al plan Modular; no es estructura de la malla como `totalPeriods`. Consecuencia: `periodType` no cambia (mantiene `recordType==Plan`), como `totalCredits`. El unico delta de codigo del ticket queda en `totalPeriods` |
| 2 | Resolver la visibilidad solo con la sintaxis nativa `conditions` de Vueform (no tocar el motor `useFieldConditions`) | Es el mecanismo soportado; `visibleWhen`/`showIf` no existen. Mantiene el cambio mod-only |

**Riesgos principales y como los mitigamos**:

- **Modo VIEW y el bug de enum-vs-etiqueta**: histórico riesgo alto (BUG sp7). **Descartado en este intake**: el fix de core UPONE-1515 (Opcion A) ya esta en develop — en view los enums se renderizan como `select` con el valor crudo (`RecordDetail.vue:3231-3270`), asi que `conditions` sobre `progression` en view comparan valor-contra-valor. TC-7 lo verifica en runtime.
- **Rotura de render en view sin red unit** (leccion UPONE-1353): esta zona no tiene test unit que atrape una rotura de render → **smoke runtime obligatorio** (DET-36), no solo revision estatica.
- **Cambiar progresion con periodos cargados y guardar**: Vueform excluye del `required` los campos ocultos por `conditions`; TC-6 lo verifica.
- **Colision con UPONE-1450** (versionamiento, ya toco estos layouts): revisar su diff antes de editar.

**Que NO se hace**: cambio de modelo/migracion/backend; la malla modular (UPONE-1539); `rotationConfig`; valores del catalogo de `periodType` (heredan `[NEEDS CLARIFICATION]` de SP5, no bloquean este cambio de visibilidad).

**Tamano estimado**: 1 session (S1), ~2-3h. El peso esta en la verificacion runtime (3 modos x 2 progresiones + Minor + cambio-y-guarda), no en el diff.

**Como vas a saber que funciona**:
- Plan Secuencial: se ven creditos, periodos y tipo de periodo (en create/edit/view).
- Plan Modular: se ven creditos y tipo de periodo; se oculta total de periodos.
- Minor: no se ve ninguno de los 4 campos.
- Cambiar Secuencial→Modular con periodos cargados y guardar no falla.

---

## Purpose

Corregir una regla de visibilidad de layout incompleta: los campos de periodo del Plan condicionan hoy solo por `recordType==Plan`, cuando el negocio exige que dependan de la `progression` (Secuencial vs Modular). Materializa la intencion con la que se cerro el enum `progression` en SP5/MC-01 (discriminador del modo). Mod-only, aditivo sobre las `conditions` existentes. Referencia: UPONE-1538 (epic UPONE-1267).

## Diagnostico

- **Sintoma**: en un Plan con progresion Modular, el formulario sigue pidiendo Total de periodos y Tipo de periodo, datos que en un plan modular no aplican (la progresion depende de la inscripcion del estudiante).
- **Causa** (no es bug de dato ni de backend): la condicion de visibilidad de `totalPeriods`/`periodType` es `[["recordType","==","Plan"]]`; le falta la clausula de progresion.
- **Hipotesis**: H1, H2, H4 confirmadas; **H3 descartada** (el bug de enum-en-view ya esta resuelto en core, UPONE-1515). Ver tabla en el ticket.
- **Impacto**: solo el layout de detalle de `Curriculum` tipo Plan en el mod. Minor no afectado (no ofrece los campos).

## Requirements

### REQ-FIX-01: Los campos de periodo dependen de la progresion; los creditos no

> **Que cambia**: en un Plan, Total de periodos pasa a mostrarse solo con progresion Secuencial; Total de creditos permanece visible con cualquier progresion.
> **Por que**: un plan Modular no fija periodos (la progresion depende de la inscripcion); los creditos son independientes del modo.

El sistema MUST, en los layouts `default_Curriculum_{create,edit,view}`, mostrar `totalPeriods` solo cuando `recordType==Plan` AND `progression==Sequential`, y MUST mantener `totalCredits` visible cuando `recordType==Plan` con cualquier valor de `progression`. El comportamiento MUST ser identico en los 3 modos (crear, editar, ver).

**Actor**: user (Disenador Curricular) sobre el formulario del Plan
**Layers**: frontend (config de layout del mod)

<details><summary>Scenarios de validacion</summary>

#### Scenario: Plan Secuencial ve periodos
- **GIVEN** un Plan con `progression=Sequential`
- **WHEN** se abre create/edit/view
- **THEN** se ven Total de creditos y Total de periodos

#### Scenario: Plan Modular oculta periodos, conserva creditos
- **GIVEN** un Plan con `progression=Modular`
- **WHEN** se abre create/edit/view
- **THEN** Total de creditos visible; Total de periodos oculto

</details>

### REQ-FIX-02: Tipo de periodo se conserva visible en todo Plan (DECISION-027)

> **Que cambia**: nada en `periodType` — se confirma que mantiene su condicion `recordType==Plan` y NO se condiciona por progresion.
> **Por que**: `periodType` es la cadencia de inscripcion/oferta del Plan, no la estructura de su malla; la inscripcion y la oferta ocurren en un periodo academico exista o no una secuencia fija, asi que aplica tambien al plan Modular (DECISION-027).

El sistema MUST mantener `periodType` visible cuando `recordType==Plan` con cualquier valor de `progression` (incluido Modular), en los 3 layouts `default_Curriculum_{create,edit,view}`. El sistema MUST NOT agregar la clausula `["progression","==","Sequential"]` a la condicion de `periodType`. `periodType` recibe el mismo tratamiento que `totalCredits`: dato general del Plan, independiente de la progresion.

**Actor**: user (Disenador Curricular)
**Layers**: frontend (config de layout del mod)

<details><summary>Scenarios de validacion</summary>

#### Scenario: tipo de periodo visible en Plan Modular
- **GIVEN** un Plan con `progression=Modular`
- **WHEN** se abre create/edit/view
- **THEN** Tipo de periodo visible (misma condicion que en Secuencial)

</details>

### REQ-REGRESSION-01: Minor intacto, VIEW correcto, guardado tras cambio de progresion

> **Que cambia**: nada para el Minor ni para el Plan Secuencial existente; el guardado sigue funcionando al cambiar de progresion.
> **Por que**: DET-7 — el fix es aditivo y no debe romper lo existente.

El sistema MUST:
- No mostrar progresion/creditos/periodos/tipo de periodo en un `Curriculum` Minor (sin regresion).
- En modo VIEW, evaluar la condicion `progression==Sequential` sobre el **valor crudo** del enum (garantizado por el render `select` de core, UPONE-1515), no sobre la etiqueta traducida.
- Permitir guardar un Plan tras cambiar de Secuencial a Modular con periodos ya cargados, sin que los campos ocultos bloqueen el envio por obligatoriedad.

**Actor**: system / user
**Layers**: frontend

<details><summary>Scenarios de validacion</summary>

#### Scenario: Minor sin campos
- **GIVEN** un Curriculum Minor
- **WHEN** se abre cualquier modo
- **THEN** no aparece ninguno de los 4 campos

#### Scenario: view sobre valor crudo
- **GIVEN** un Plan Secuencial en view
- **THEN** Total de periodos visible (la condicion da true contra el valor `Sequential`, no contra "Secuencial")

#### Scenario: cambio de progresion y guardado
- **GIVEN** un Plan Secuencial con periodos cargados
- **WHEN** se cambia a Modular y se guarda
- **THEN** guarda sin error; los campos ocultos no bloquean por required

</details>

## Necessity assessment (DET-32 — light)

| Item | Veredicto | Razon |
|------|-----------|-------|
| Clausula `progression==Sequential` en `totalPeriods` (3 layouts) | **reduce** | No es codigo nuevo: se agrega una condicion al `conditions` ya existente. Mecanismo nativo de Vueform |
| Clausula en `periodType` | **drop** | DECISION-027 (escenario B): `periodType` no se condiciona por progresion; mantiene `recordType==Plan`. Sin cambio |
| Campo espejo para view (patron BUG sp7) | **drop** | Innecesario: core UPONE-1515 ya hace que las conditions sobre enum en view comparen el valor crudo |
| Tocar core (`layout/`) u object-manager | **drop** | Restriccion mod-only; el modelo ya soporta todo |

## Fix scope

### Antes (comportamiento actual)
En los 3 layouts, `totalCredits`/`totalPeriods`/`periodType` llevan `conditions: [["recordType","==","Plan"]]`. En un Plan Modular se muestran igual que en uno Secuencial.

### Despues (comportamiento esperado)
- `totalCredits`: sin cambio — `[["recordType","==","Plan"]]`.
- `totalPeriods`: `[["recordType","==","Plan"],["progression","==","Sequential"]]` (AND). **Unico delta de codigo.**
- `periodType`: sin cambio — `[["recordType","==","Plan"]]` (DECISION-027, escenario B).
- `progression`: sin cambio.

### Archivos afectados
| File | Change | Impact |
|------|--------|--------|
| `mods/curriculum-design/config/layouts/default_Curriculum_create.json` | AND `["progression","==","Sequential"]` en `totalPeriods` | Solo visibilidad de total de periodos en el form de create del Plan |
| `mods/curriculum-design/config/layouts/default_Curriculum_edit.json` | idem | Solo edit del Plan |
| `mods/curriculum-design/config/layouts/default_Curriculum_view.json` | idem | Solo view del Plan; verificado que view compara valor crudo (UPONE-1515) |

> Tras editar: `npm run sync` (o `sync:layouts`) para publicar al tenant; hard reload por cache-first de Apollo. **No** editar los archivos sincronizados en `suite/`/`object-manager/`.

## Tasks

> DET-20: 1 session (S1), tier T3 (user-facing visible + view mode sin red unit → smoke DET-36). Cadena T1→T2. Tasks copiadas al ticket al abrir S1 (DET-28).

### S1.T1 — Condicionar `totalPeriods` a progresion Secuencial (unico delta de codigo)
- **source_ref**: REQ-FIX-01
- **agent**: developer
- **contract**: en los 3 layouts, agregar `["progression","==","Sequential"]` (AND) a la condicion de `totalPeriods`. Dejar `totalCredits` y `periodType` sin tocar (DECISION-027). Revisar antes el diff de UPONE-1450 sobre estos layouts (evitar choque). `npm run sync`.
- **validation**: TC-1, TC-2, TC-3 (Plan Seq ve periodos; Plan Modular oculta total de periodos; creditos siempre visible).
- **rollback**: git revert del JSON.
- **rules**: [DET-5, DET-40]

### S1.T2 — Verificacion runtime + regresion
- **source_ref**: REQ-FIX-01, REQ-FIX-02, REQ-REGRESSION-01
- **agent**: developer (smoke-runner si el proyecto lo tiene habilitado)
- **depends_on**: S1.T1
- **contract**: smoke en la suite (tenant UPU): recorrer los 3 modos x 2 progresiones, el Minor, el cambio de progresion con campos cargados + guardar, el modo view sobre valor crudo, y `periodType` visible en Modular (REQ-FIX-02 / DECISION-027). Evidencia runtime real (screenshots por modo/progresion) — no referencia a test file (DET-36).
- **validation**: TC-1..TC-7 con evidencia.
- **rollback**: n/a (verificacion).
- **rules**: [DET-7, DET-13, DET-36]

### S1.GATE
- Persistir sessions/tasks, validar tier T3 (10 dimensiones DET-23; smoke DET-36), commits DET-27 (id `UPONE-1538`), decidir continue/close. El close pregunta al dev (DET-30).

## Open questions

| # | Pregunta | Owner | Bloquea | Estado |
|---|----------|-------|---------|--------|
| 1 | `periodType` escenario A (solo Secuencial) vs B (todo Plan) | Esteban | — | **RESUELTA**: escenario B (DECISION-027). `periodType` se conserva en todo Plan; sin cambio de condicion |
| 2 | Valores del catalogo de `periodType` (heredan `[NEEDS CLARIFICATION]` de SP5) | — | No bloquea este ticket (visibilidad, no valores) | abierta (fuera de alcance) |

## Acceptance

- [x] TC-1..TC-3 verdes (REQ-FIX-01) con evidencia runtime (smoke UPU, create/edit/view).
- [x] TC-4 verde (REQ-FIX-02): `periodType` visible en Plan Modular (DECISION-027).
- [x] TC-5..TC-7 verdes (REQ-REGRESSION-01): Minor intacto, view sobre valor crudo, guardado tras cambio de progresion.
- [x] Sin regresion: config-only en el mod; paridad MCP con vitest 174/174 (sin regresion).
- [x] Artefactos de sync/seed no commiteados; en commits se usa `UPONE-1538` (DET-19).

## Status

| Task | Status |
|------|--------|
| S1.T1 | done |
| S1.T2 | done |
| S2.T1 | done (paridad MCP, ampliacion pedida por el dev) |
| S2.T2 | done |
