---
id: BUG-platform-021
project: up1
type: bug
module: platform
tags:
  - up1_suite_app
  - orphan
  - mod
  - sync
  - cleanup
  - app-role
  - desactivar-mod
---

# Apps de mods desactivados quedan huérfanas en up1_suite_app sin limpieza automática

## Symptom

Al desactivar o eliminar un mod de up1, las entradas correspondientes en las tablas `up1_suite_app` y `up1_suite_app_role` de la DB del tenant persisten indefinidamente. La siguiente ejecución de sync no las limpia. Puede causar inconsistencias en el menú de la suite (entradas de apps de mods que ya no existen) o errores de integridad si el id del mod se reutiliza.

## Expected behavior

El pipeline de sync (o el comando de desactivación del mod) elimina las entradas de `up1_suite_app` y `up1_suite_app_role` correspondientes al mod desactivado.

## Root cause

El mecanismo de sync de up1 (mod → object-manager → DB) no incluye una fase de cleanup de apps huerqfanas: solo aplica upserts, no deletes. Cuando se borra el directorio `mods/<mod>/` o se desactiva el mod en la config, el sync siguiente no compara el estado esperado contra el estado actual de `up1_suite_app` para detectar entradas extra. Documentado en TICKET-006 L10.

## Impact

Entradas huérfanas en `up1_suite_app`/`up1_suite_app_role`. Bajo impacto en desarrollo; en producción puede generar items inválidos en el menú de la suite o errores de FK si los ids se reutilizan.

## Reproduction

1. Activar un mod (e.g., `curriculum-design`) y correr sync → se crean entradas en `up1_suite_app`. 2. Eliminar/desactivar el mod (`rm -rf mods/<mod>/` o remover de la lista de mods activos). 3. Correr `npm run sync`. 4. `SELECT * FROM up1_suite_app` → la entrada del mod sigue presente.

## Workaround

Limpieza manual en la DB del tenant:\n1. Obtener el id del app: `SELECT id FROM up1_suite_app WHERE name = '<mod-name>'`\n2. Eliminar roles: `DELETE FROM up1_suite_app_role WHERE "appId" = '<app-id>'`\n3. Eliminar app: `DELETE FROM up1_suite_app WHERE id = '<app-id>'`\n4. Si quedan archivos residuales del mod: `rm -rf mods/<mod>/`

## Solution

Pendiente.

## Related

- **Specs**: —
- **Tickets**: TICKET-006
