---
id: RULE-mods-011
project: up1
type: rule
module: mods
tags:
  - sync
  - modsComponents
  - i18n
  - constraint
---

# Sync constraints para modsComponents e i18n

## What

El sync de layout impone restricciones sobre la estructura de modsComponents/ y los archivos i18n de mods: (1) Cada carpeta en modsComponents/ debe tener exactamente un .vue — subcarpetas y multiples .vue son rechazados. (2) Las keys de i18n en el global (lang/{locale}.json) bajo object.{ObjectName} deben ser strings planos, no objetos nested. Usar {singular, plural} causa 'deep leaf conflict' en sync porque el namespace object.* ya existe como strings.

## Why

El mecanismo de sync (8 fases) copia archivos de mods/ a core workspaces. La fase Mirror espera un .vue por carpeta para mapear componente→destino. La fase Merge de i18n hace deep merge y detecta conflictos cuando un path tiene tanto un string como un objeto.

## Where

mods/{mod}/modsComponents/, mods/{mod}/lang/

## When

Al crear custom Vueform elements o archivos de traduccion en un mod

## Verification

npm run sync completa sin errores. Verificar que el componente aparece en layout/src/modsComponents/ y las traducciones en suite/lang/

## Source

- **Discovered in**: TICKET-005
