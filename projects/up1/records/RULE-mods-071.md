---
id: RULE-mods-071
project: up1
type: rule
module: mods
tags:
  - i18n
  - mods
  - sync
  - namespace
  - colision
  - suite
---

# Claves i18n compartidas entre mods no son seguras: el merge resuelve por orden alfabético

## What

Un mod **no** debe declarar una clave de traducción con un nombre que otro mod pudiera declarar
también. El merge de i18n del sync resuelve las colisiones **por orden alfabético del origen**: si
dos mods declaran la misma clave, gana el que quede después en ese orden, **en silencio** y sin
error. Cada mod declara sus claves en **su propio namespace** (prefijo del mod), que es lo que
garantiza que dos mods montados sobre el mismo objeto Base no se pisen.

## Why

La colisión no falla de forma visible: no hay excepción, no hay drift, el build queda verde. El
síntoma es un texto equivocado en la UI (el de otro mod) o, cuando la clave declarada no existe en el
catálogo, la **caída al nombre técnico del objeto** en vez del texto esperado. Es un fallo silencioso
que se confunde con "no funciona" y cuesta rastrear porque el origen está en el orden de merge, no en
el código del mod. Namespacing propio elimina la clase de bug entera.

## Where

- Merge i18n del sync: `suite/scripts/lib/i18n-source-map.mjs`.
- Fallback al nombre técnico cuando la clave no existe: `suite/composables/useObjectManager.ts:625-633`.
- Caso que lo destapó: dos apps (Curriculum Design y Engagement) declarando vistas sobre el mismo
  objeto Base, donde el nombre de vista se indexaba por objeto y no por app.

## Origen

sp9 up1, análisis `PRECONDICION-core-nombre-de-vista-por-app.md` y `UPONE-1645-detalle.md`: el orden
alfabético de merge fue una de las vías de workaround que fallaba de forma completamente silenciosa,
y motivó la capacidad de declarar el nombre de vista por aplicación (UPONE-1645, Core Extension
Change Type 3).
