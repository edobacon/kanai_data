---
id: RULE-mods-067
project: up1
type: rule
module: mods
tags:
  - recordtypes
  - codegen
  - prisma
  - hard-delete
  - cascade
  - curriculum-mapping
---

# No declarar archivos `rt__<X>__<base>` cuando ningun RecordType tiene campos propios

## What

Si un objeto Composite del mod no necesita campos especificos por tipo en sus hijos (todos los
RecordTypes comparten exactamente los campos de la base), NO declarar los archivos
`objects/RecordTypes/rt__<X>__<base>.json`. Declararlos generaria tablas satelite `rt__<X>__<base>`
vacias (sin columnas propias) que solo agregan modelo Prisma y superficie de mantenimiento sin aportar
datos. El `recordType` del hijo se resuelve como campo/discriminador en la base.

## Why

Es la decision D-imp-5 registrada en el `CLAUDE.md` de `curriculum-mapping`. Ademas de evitar tablas
vacias, reduce la superficie expuesta a los hazards conocidos del ciclo base <-> RT del codegen (ver
[[BUG-object-manager-002]]: cuando un campo migra base <-> RT el codegen no reconcilia `isBaseField` y
puede dejar orphans del RT). Sin `rt__` declarado, el delete del scheme opera sobre la base y su
extension `ext__<tenant>__<obj>` con un delete custom en transaccion FK-safe (ver el
`deleteCoverageScheme` de `curriculum-mapping`), en vez de depender del borrado por entrypoint de
RecordType.

Nota de verificacion: la afirmacion "el hard-delete por entrypoint de RecordType no cascadea bien" es
la motivacion documentada en el mod, pero no esta respaldada por un bug record propio en el KB. Si se
confirma en el codigo del core, conviene capturarlo como bug dedicado y enlazarlo aca.

Contraste con [[RULE-mods-032]] (rt__ con `baseObject` inyecta base fields) y [[RULE-mods-019]]
(convencion de sync de RecordTypes): esas aplican cuando el RT SI tiene campos propios que justifican
la tabla satelite. Esta regla cubre el caso inverso: cuando no los tiene, no crear el archivo.

## Where

- Objetos del mod: `mods/<m>/objects/RecordTypes/` (omitir los `rt__<X>__<base>.json` sin campos
  propios).
- Precedente: `CoverageScheme` en `curriculum-mapping` (PR #9 / UPONE-1455) no declara `rt__` para sus
  niveles; el delete custom del resolver borra hijos + raiz + `ext__uplanner__coveragescheme` en
  transaccion.

## When

Al disenar un objeto Composite (o cualquier objeto con RecordTypes) y evaluar si cada tipo necesita
columnas propias. Si un tipo agrega campos, declarar su `rt__` con `baseObject` (RULE-mods-032); si no
agrega ninguno, no declararlo.
