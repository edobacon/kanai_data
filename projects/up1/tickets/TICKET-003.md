---
id: TICKET-003
project: up1
type: ticket
status: closed
work_type: implement
module: mods
autopilot: manual
---

# Agregar navegacion con dropdowns por objeto al mod curriculum-mapping

## Request

Replicar el patron de navegacion de la app Engagement (menu con dropdowns por objeto + subSections) en el mod curriculum-mapping. Cada objeto (Matrices, Competencias, Tributacion) debe tener su dropdown con multiples vistas filtradas.

## Classification

| Campo | Valor |
|-------|-------|
| Tipo de trabajo | implement |
| Tipo de cambio | single |
| Modulo principal | mods |
| Modulos afectados | — (solo layouts JSON, sin codigo nuevo) |

## Triage

Quick-ish: es solo configuracion JSON (layouts + app.json). No requiere codigo nuevo, solo entender el patron de `applicationId` y `subSection`. Creamos ticket por trazabilidad con TICKET-002.

### Context found

- **Patron de referencia**: app Engagement (retention-wellbeing) usa `objectName` para agrupar y `subSection` para sub-agrupar
- **Mecanismo**: sync asigna `applicationId` automaticamente a layouts que NO tienen `applicationId: null` explicito
- **Rules**: RULE-layout-010 (id, name, tenants), RULE-layout-011 (labels texto directo)

## Setup

### Environment
| Campo | Valor |
|-------|-------|
| Branch | USUITE-POC-mods-pipeline |
| Base branch | develop |
| DB state | ya migrado (TICKET-002) |
| Services | object-manager (:4000), suite (:3000) |

## Learns

| # | Learn | Detected by | Session | Status | Promoted to |
|---|-------|-------------|---------|--------|-------------|
| L1 | El sync asigna `applicationId` automaticamente a layouts que NO tienen `applicationId: null` explicito. Para que un layout aparezca en el nav, simplemente omitir el campo `applicationId` | developer | 1 | refined | RULE-mods-009 |
| L2 | `subSection` en el layout JSON agrupa opciones dentro del dropdown bajo un header. El campo es opcional — layouts sin subSection aparecen como items sueltos | developer | 1 | discarded | — |
| L3 | `defaultObjects` en app.json NO controla que objetos aparecen en el nav — solo afecta layouts con patron `default_{Object}_list`. Los layouts del mod aparecen por el `applicationId` asignado por sync | developer | 1 | refined | RULE-mods-010 |

## Failed approaches

| # | Approach | Why it failed | Learned |
|---|----------|---------------|---------|

## Sessions

### Session 1 — 2026-04-16

**Objetivo**: Agregar navegacion con dropdowns por objeto al mod curriculum-mapping

| Timestamp | Agent | Accion | Referencia | Detalle |
|-----------|-------|--------|------------|---------|
| 10:12 | researcher | gather-context | retention-wellbeing | Analisis del patron de nav de Engagement |
| 10:15 | researcher | gather-context | SPEC-learning-assurance-003 | Busqueda de caso en Learning Assurance |
| 10:25 | developer | implement | app.json + 9 layouts | defaultObjects expandido, 3 layouts modificados, 5 nuevos con filtros |
| 10:35 | developer | implement | sync + restart | Sync OK, servicios reiniciados |
| 10:36 | reviewer | validate | TC-1 | Nav con 3 dropdowns visible — PASS |
| 10:36 | reviewer | validate | TC-2 | Dropdown Matrices: Todas, Publicadas, Borradores — PASS |
| 10:36 | reviewer | validate | TC-3 | Dropdown Competencias: Todas + subSection "Por Tipo" — PASS |
| 10:37 | reviewer | validate | TC-4 | "Matrices Publicadas" filtra correctamente — PASS |
| 10:38 | scribe | commit | 0a68562 | nav con dropdowns commiteado |

**Tasks completadas**: todas
**Resultado**: Patron de nav con dropdowns replicado exitosamente

## Testing

### Coverage map

| REQ | Test cases | Type | Status |
|-----|-----------|------|--------|
| REQ-01: Nav muestra 3 dropdowns (Matrices, Competencias, Tributacion) | TC-1 | manual | **pass** |
| REQ-02: Dropdown Matrices tiene 3 opciones | TC-2 | manual | **pass** |
| REQ-03: Dropdown Competencias tiene 3 opciones con subSection | TC-3 | manual | **pass** |
| REQ-04: Click en opcion filtrada carga RecordList correcto | TC-4 | manual | **pass** |

### Test cases

| # | Case | REQ | Type | Evidence | Status |
|---|------|-----|------|----------|--------|
| TC-1 | Nav muestra Matrices, Competencias, Tributacion | REQ-01 | manual | screenshots/cm-nav-dropdowns.png | **pass** |
| TC-2 | Dropdown Matrices: Todas, Publicadas, Borradores | REQ-02 | manual | screenshots/cm-matrix-dropdown.png | **pass** |
| TC-3 | Dropdown Competencias: Todas + subSection Por Tipo | REQ-03 | manual | screenshots/cm-competency-dropdown.png | **pass** |
| TC-4 | Click en "Matrices Publicadas" filtra correctamente | REQ-04 | manual | screenshots/cm-matrices-publicadas-filtered.png | **pass** |

## Summary

### What was requested
Replicar patron de nav con dropdowns de Engagement en curriculum-mapping.

### What was done
- `defaultObjects` expandido a 3 objetos
- 3 layouts existentes modificados (quitar applicationId null, renombrar labels)
- 5 layouts nuevos con filtros: Publicadas, Borradores, Genericas, Especificas, Disciplinares
- `subSection: "Por Tipo"` para agrupar competencias por tipo en el dropdown
- Validado: nav con 3 dropdowns, filtros funcionando, subSections con headers

### What was discovered
- L1: applicationId se asigna automaticamente omitiendo el campo (no poner null)
- L2: subSection agrupa items bajo headers en el dropdown
- L3: defaultObjects no controla el nav — lo controla applicationId del sync

### Metrics
| Metric | Value |
|--------|-------|
| Sessions | 1 |
| Tasks completed | 4 |
| Commits | 1 (0a68562) |
| Learns captured | 3 |
| Rules created | 0 |
