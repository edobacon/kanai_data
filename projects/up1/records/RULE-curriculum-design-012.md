---
id: RULE-curriculum-design-012
project: up1
type: rule
module: curriculum-design
tags:
  - layouts
  - recordtype
  - curriculum-design
  - sp5
---

# Layouts por RecordType se resuelven por convencion de nombre (patron en produccion)

## What

Los layouts específicos por RecordType se declaran como `default_rt__<RT>__<baseObjectLower>_<mode>.json` con `objectName: "rt__<RT>__<base>"`. `resolveDefaultLayout` (layout/logic/layout.resolver.js) los resuelve por la convención `default_{objectName}_{mode}` — el objectName completo carga el discriminador; NO se necesita parámetro recordType ni columna indexada.

## Why

Permite layouts diferenciados por variante tipada sin tocar core. Ya está en PRODUCCIÓN: CurricularSection tiene 19 layouts `default_rt__*__curricularsection_*` committeados (UPONE-1216). Supersede el RISK-curriculum-design-001 (que asumía que ningún mod lo usaba).

## Where

mods/<mod>/config/layouts/ — un set {view, edit, create} por cada RecordType del objeto. Ej. requirement: default_rt__RecordState__requirement_{view,edit,create}.json.

## When

Al modelar un objeto con RecordTypes que requiere layouts diferenciados por tipo (ej. requirement con RecordState/Group/MetricThreshold).

## Verification

Abrir el RecordDetail de una instancia del RT y confirmar que usa el layout del RT, no el base. Precedente real: default_rt__Modality__curricularsection_view.json.

## Source

- **Discovered in**: —
