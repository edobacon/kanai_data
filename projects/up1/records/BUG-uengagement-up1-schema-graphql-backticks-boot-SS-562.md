---
id: BUG-uengagement-up1-schema-graphql-backticks-boot-SS-562
project: up1
type: bug
module: uengagement-up1
tags:
  - SS-562
  - sp10
  - graphql-sdl
  - boot
  - gotcha
---

Backticks de markdown (ej. `status`, `Completed`, `Cancelled`) dentro del texto de descripcion de una mutation en logic/finish-offering.schema.graphql rompian el parseo del SDL y crasheaban object-manager AL ARRANCAR (no en runtime). Fix: quitar los backticks de la descripcion (4daf2455, 3 lineas). Gotcha transversal: las descripciones de los .schema.graphql que aportan los mods no deben usar backticks de markdown, porque object-manager los concatena al SDL global y un backtick sin cerrar tumba el boot. Modulo del archivo: uengagement-up1; efecto: boot de object-manager. sourceRef: 4daf2455.
