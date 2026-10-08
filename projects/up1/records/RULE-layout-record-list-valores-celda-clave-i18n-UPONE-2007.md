---
id: RULE-layout-record-list-valores-celda-clave-i18n-UPONE-2007
project: up1
type: rule
module: layout/record-list
level: should
tags:
  - UPONE-2007
  - record-list
  - i18n
---

isI18nValue es estricto a propósito: solo key (con forma de clave i18n, al menos un punto y sin espacios) y params opcional objeto, para no confundirlo con un campo JSON que tenga su propia key. translateI18nValue traduce primero los params que también son { key, params } y devuelve null si la clave no resuelve, para seguir con el render normal. renderJsonValue y getDisplayValue lo aplican solo cuando reciben t.

Fuente: b144808f src/utils/recordListFormatters.ts:138 y :152.
