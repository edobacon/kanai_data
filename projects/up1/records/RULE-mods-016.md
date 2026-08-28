---
id: RULE-mods-016
project: up1
type: rule
module: mods
---

# CSS del mod vive en subcarpetas numeradas (1-theme, 2-objectName, 3-component)

## What

Todo archivo `.css` de un mod DEBE residir en una subcarpeta numerada dentro de `css/`: `css/1-theme/` (tokens del mod y overrides de `--up1-*`), `css/2-objectName/{ObjectName}.css` (estilos por objeto), o `css/3-component/{component}.css` (estilos de componentes custom del mod). NO se permiten archivos `.css` en la raíz de `css/`.

## Why

El sync respeta el orden de carpetas por prefijo numérico al concatenar CSS en el bundle final. Un archivo en la raíz queda en posición indeterminada: puede cargar antes de los tokens (rompiendo cascada) o después de los overrides (siendo sobreescrito). El orden numérico garantiza que tokens → objeto → componente aplique en la secuencia correcta.

## Where

En la estructura `mods/{mod}/css/`.

## When

Al crear o mover archivos CSS dentro de un mod.

## Verification

Revisar `mods/{mod}/css/` — todos los `.css` bajo subcarpetas numeradas. Lint pre-sync candidato: rechazar `.css` en la raíz de `css/`.

## Source

- **Discovered in**: TICKET-005
