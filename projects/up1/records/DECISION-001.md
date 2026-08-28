---
id: DECISION-001
project: up1
type: decision
module: curriculum-design
tags:
  - curriculum-design
  - mod
  - arquitectura
---

# DECISION-001: Un solo mod `curriculum-design` para los 4 objetos del agregado Programa de asignatura

## Contexto

UPONE-1033 pide configurar 4 objetos de negocio (`AcademicActivity`, `CurricularSection`, `CurricularLink`, `BibliographyReference`) como base de la funcionalidad "Programa de asignatura" (modulo Curriculum Design, epica UPONE-1038). UPONE-1034 y UPONE-1035 montan vistas (listado + detalle) sobre ese agregado.

La pregunta arquitectonica: ¿un mod, varios mods, o ubicar objetos en core?

## Drivers

1. **Acoplamiento de dominio**: los 4 objetos forman un agregado coherente que no tiene sentido fuera del Programa de asignatura.
2. **Capacidades futuras de la epica** (versionamiento, workflow, clonacion, export PDF/Word, OpenForEdit) operan sobre el agregado completo, no objetos sueltos.
3. **Patron de mods existente** en up1: `hello-world-mod` agrupa 3 objetos relacionados, `retention-wellbeing` agrupa 2+. No hay precedente de "1 mod = 1 objeto".
4. **MADS y herencia template→syllabus**: el syllabus replica el agregado completo, no objetos individuales.
5. **Mantenibilidad**: cross-mod orchestration agrega complejidad innecesaria (i18n, sync, capabilities, RBAC).

## Alternativas evaluadas

| Opcion | Pro | Contra |
|--------|-----|--------|
| **A. Un solo mod `curriculum-design`** (elegida) | Refleja el agregado, alineado con patrones existentes, capacidades futuras viven en un solo lugar | El mod sera grande con el tiempo (workflow, versionamiento, export), pero manejable |
| B. Mods separados por objeto | Cada objeto evolucionable independiente | Rompe el agregado, requiere coordinar releases entre mods, los layouts del programa necesitarian agregar datos cross-mod |
| C. Objetos core (no en mod) | Disponibles para multiples mods futuros | No hay objetos "core de dominio" en up1 — los core son infra (Institution, User). Curriculum Design es dominio especifico, no infra. |
| D. Mod base + extensiones por sub-mod | Flexibilidad maxima | Complejidad de orquestacion, no justificada por scope actual |

## Decision

**Crear un solo mod `up1/mods/curriculum-design/`** que contenga los 4 objetos del agregado, con la estructura estandar de mods up1:

```
mods/curriculum-design/
├── config/
│   ├── app.json                   # name, label, icon, defaultObjects
│   └── layouts/                   # default_AcademicActivity_list, _detail, etc.
├── objects/
│   ├── AcademicActivity.json
│   ├── CurricularSection.json
│   ├── CurricularLink.json
│   └── BibliographyReference.json
├── (RecordTypes en up1/object-manager/objects/business/RecordTypes/
│   por convencion de plataforma — fuera del mod)
├── seed/
├── lang/
├── css/
├── tests/
└── modsComponents/                # si requiere componentes Vue custom
```

**Nota sobre RecordTypes**: los RecordTypes de `CurricularSection` (LearningOutcome, EvaluationComponent, Content, Session, Modality, ApprovalCondition, Bibliography, GeneralData) viven en `up1/object-manager/objects/business/RecordTypes/rt__<RT>__curricularsection.json` por convencion de plataforma (UPONE-940). NO viven dentro del mod, pero conceptualmente pertenecen a este dominio. Documentar la asociacion logica en el README del mod.

## Consecuencias positivas

- Una sola unidad de release para el SP1 y siguientes
- Los layouts del programa (UPONE-1034/1035) se ubican naturalmente
- Capacidades futuras (UPONE-1038 epica) se agregan al mismo mod sin reestructurar
- Aplica reglas existentes de mods: [RULE-mods-007](../../rules/mods/rule-mods-007.md) para app.json, [RULE-mods-008](../../rules/mods/rule-mods-008.md) para FKs lowercase, etc.

## Consecuencias negativas

- El mod crecera con el tiempo (todas las capacidades CAP-CUR-014..022 viven aqui). Mitigacion: organizar por subdirectorios cuando supere ~20 archivos por carpeta.
- Si en el futuro Curriculum Mapping necesita objetos de Curriculum Design (ej: tributacion via CompetencyAlignment apunta a LearningOutcome), accedera via FK cross-mod — patron normal en up1.

## Confirmacion

Eduardo confirmo en sesion 2026-04-27: "vamos con mod unico, segun aplica el patron de hello-world-mod".

## Referencias

- Modelo: [specs/curriculum-design/programa-de-asignatura.md](../../specs/curriculum-design/programa-de-asignatura.md)
- Rules de mods aplicables: [rules/mods/](../../rules/mods/)
- Tickets: [UPONE-1033](https://u-planner.atlassian.net/browse/UPONE-1033), [UPONE-1034](https://u-planner.atlassian.net/browse/UPONE-1034), [UPONE-1035](https://u-planner.atlassian.net/browse/UPONE-1035)
