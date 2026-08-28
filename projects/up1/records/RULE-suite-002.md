---
id: RULE-suite-002
project: up1
type: rule
module: suite
tags:
  - i18n
  - multi-tenant
  - pattern
---

# i18n: BD almacena keys, nunca texto hardcodeado

## What

La BD almacena claves de traduccion, no texto. En templates usar $t('key'). Nunca hardcodear strings visibles al usuario. La jerarquia de override es: Object+Layout > Object > Layout > Institution > Country > Language base.

## Why

El sistema es multi-idioma y multi-tenant. Cada tenant puede tener traducciones custom por institucion o pais. Texto hardcodeado no participa de esta jerarquia y no se puede traducir.

## Where

suite/, layout/src/components/, mods/*/modsComponents/, mods/*/lang/

## When

Al crear cualquier texto visible al usuario en la UI.

## Verification

Grep por strings literales en templates de componentes (excluyendo logs, attrs tecnicos). Deben usar $t() o equivalente.

## Source

- **Discovered in**: —
